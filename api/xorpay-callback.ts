import { timingSafeEqual } from 'node:crypto';
import CryptoJS from 'crypto-js';
import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'nodejs' };

/**
 * 虎皮椒支付回调处理
 * 文档: https://xorpay.com/doc/api.html
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  const XORPAY_APP_SECRET = process.env.XORPAY_APP_SECRET;
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!XORPAY_APP_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('[XorPay Callback] Missing configuration');
    return res.status(500).send('fail');
  }

  try {
    // 获取回调参数 (根据文档)
    const {
      aoid,        // XorPay 平台订单唯一标识
      order_id,    // 你的订单号
      pay_price,   // 实际支付金额
      pay_time,    // 支付时间
      detail,      // 订单详情 (JSON)
      sign         // 签名
    } = req.body;

    if (!aoid || !order_id || !pay_price || !pay_time || !sign) {
      console.error('[XorPay Callback] Missing callback fields');
      return res.status(400).send('fail');
    }

    console.info('[XorPay Callback] Received:', {
      aoid,
      order_id,
      pay_price,
      pay_time
    });

    // 验证签名: MD5(aoid + order_id + pay_price + pay_time + app_secret)
    const signString = `${aoid}${order_id}${pay_price}${pay_time}${XORPAY_APP_SECRET}`;
    const expectedSign = CryptoJS.MD5(signString).toString();

    if (typeof sign !== 'string' || !/^[a-f0-9]{32}$/i.test(sign) || !timingSafeEqual(Buffer.from(sign,'hex'), Buffer.from(expectedSign,'hex'))) return res.status(400).send('fail');

    // 初始化 Supabase 客户端(使用 service key 绕过 RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const paidAmount = Number(pay_price);
    const paidAt = new Date(Number(pay_time) * 1000);
    if (!Number.isFinite(paidAmount) || Number.isNaN(paidAt.getTime())) return res.status(400).send('fail');
    const { error } = await supabase.rpc('apply_xorpay_payment', {
      p_order_id: order_id, p_trade_no: aoid, p_amount: paidAmount, p_paid_at: paidAt.toISOString()
    });
    if (error) { console.error('[XorPay Callback] Atomic payment reconciliation failed', error.code); return res.status(500).send('fail'); }

    // 返回 success 给虎皮椒
    return res.status(200).send('success');

  } catch (error: any) {
    console.error('[XorPay Callback] Error:', error);
    return res.status(500).send('fail');
  }
}

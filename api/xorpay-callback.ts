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

  const XORPAY_APP_SECRET = process.env.VITE_XORPAY_APP_SECRET;
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // 使用你的环境变量名

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

    console.log('[XorPay Callback] Received:', {
      aoid,
      order_id,
      pay_price,
      pay_time
    });

    // 验证签名: MD5(aoid + order_id + pay_price + pay_time + app_secret)
    const signString = `${aoid}${order_id}${pay_price}${pay_time}${XORPAY_APP_SECRET}`;
    const expectedSign = CryptoJS.MD5(signString).toString();

    if (sign !== expectedSign) {
      console.error('[XorPay Callback] Invalid signature');
      console.error('[XorPay Callback] Expected:', expectedSign);
      console.error('[XorPay Callback] Received:', sign);
      return res.status(400).send('fail');
    }

    // 初始化 Supabase 客户端(使用 service key 绕过 RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 更新订单状态
    const { error: orderError } = await supabase
      .from('payment_orders')
      .update({
        payment_status: 'paid',
        paid_at: new Date(parseInt(pay_time) * 1000).toISOString(), // 时间戳转 ISO
        xorpay_trade_no: aoid
      })
      .eq('id', order_id);

    if (orderError) {
      console.error('[XorPay Callback] Order update error:', orderError);
      return res.status(500).send('fail');
    }

    // 获取订单信息
    const { data: order, error: fetchError } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (fetchError || !order) {
      console.error('[XorPay Callback] Order not found:', fetchError);
      return res.status(404).send('fail');
    }

    // 计算订阅到期时间
    const periodEnd = calculatePeriodEnd(order.billing_cycle);

    // 创建或更新订阅 (onConflict: user_id 确保同一用户只有一条记录)
    const { error: subError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: order.user_id,
        plan: order.plan,
        status: 'active',
        current_period_end: periodEnd,
        payment_method: order.payment_method,
        payment_status: 'paid',
        amount: order.amount,
        currency: order.currency
      }, { onConflict: 'user_id' });

    if (subError) {
      console.error('[XorPay Callback] Subscription update error:', subError);
      return res.status(500).send('fail');
    }

    console.log('[XorPay Callback] Payment processed successfully:', order_id);

    // 返回 success 给虎皮椒
    return res.status(200).send('success');

  } catch (error: any) {
    console.error('[XorPay Callback] Error:', error);
    return res.status(500).send('fail');
  }
}

/**
 * 计算订阅到期时间
 */
function calculatePeriodEnd(billingCycle: string): string {
  const now = new Date();
  switch (billingCycle) {
    case 'monthly':
      now.setMonth(now.getMonth() + 1);
      break;
    case 'yearly':
      now.setFullYear(now.getFullYear() + 1);
      break;
    case 'lifetime':
      now.setFullYear(now.getFullYear() + 100);
      break;
  }
  return now.toISOString();
}

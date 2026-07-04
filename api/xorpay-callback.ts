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

    if (sign !== expectedSign) {
      console.error('[XorPay Callback] Invalid signature');
      console.error('[XorPay Callback] Expected:', expectedSign);
      console.error('[XorPay Callback] Received:', sign);
      return res.status(400).send('fail');
    }

    // 初始化 Supabase 客户端(使用 service key 绕过 RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: order, error: fetchError } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (fetchError || !order) {
      console.error('[XorPay Callback] Order not found:', fetchError);
      return res.status(404).send('fail');
    }

    if (order.payment_status === 'paid') {
      if (order.xorpay_trade_no && order.xorpay_trade_no !== aoid) {
        console.error('[XorPay Callback] Paid order trade number mismatch');
        return res.status(409).send('fail');
      }
      return res.status(200).send('success');
    }

    if (order.payment_status !== 'pending') {
      console.error('[XorPay Callback] Invalid order state:', order.payment_status);
      return res.status(409).send('fail');
    }

    const paidAmount = Number(pay_price);
    const expectedAmount = Number(order.amount);
    if (!Number.isFinite(paidAmount) || Math.abs(paidAmount - expectedAmount) >= 0.01) {
      console.error('[XorPay Callback] Amount mismatch:', { paidAmount, expectedAmount });
      return res.status(400).send('fail');
    }

    const paidAt = new Date(Number(pay_time) * 1000);
    if (Number.isNaN(paidAt.getTime())) {
      console.error('[XorPay Callback] Invalid pay_time:', pay_time);
      return res.status(400).send('fail');
    }

    const { data: paidOrder, error: orderError } = await supabase
      .from('payment_orders')
      .update({
        payment_status: 'paid',
        paid_at: paidAt.toISOString(),
        xorpay_trade_no: aoid,
        callback_data: req.body
      })
      .eq('id', order_id)
      .eq('payment_status', 'pending')
      .select('id')
      .maybeSingle();

    if (orderError || !paidOrder) {
      console.error('[XorPay Callback] Order update error:', orderError);
      return res.status(500).send('fail');
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
        currency: order.currency,
        xorpay_order_id: order.xorpay_order_id,
        xorpay_trade_no: aoid,
        paid_at: paidAt.toISOString()
      }, { onConflict: 'user_id' });

    if (subError) {
      console.error('[XorPay Callback] Subscription update error:', subError);
      return res.status(500).send('fail');
    }

    console.info('[XorPay Callback] Payment processed successfully:', order_id);

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

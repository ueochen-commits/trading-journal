import CryptoJS from 'crypto-js';
import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'nodejs' };

const PRICE_TABLE: Record<string, Record<string, number>> = {
  CNY: {
    'pro:monthly': 29,
    'pro:yearly': 199,
    'elite:monthly': 79,
    'elite:yearly': 599,
    'elite:lifetime': 1999,
    'lifetime:lifetime': 1999
  },
  USD: {
    'pro:monthly': 5,
    'pro:yearly': 29,
    'elite:monthly': 12,
    'elite:yearly': 89
  }
};

const getBearerToken = (authorization?: string) => {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
};

const amountsMatch = (actual: number, expected: number) => Math.abs(actual - expected) < 0.01;

/**
 * 虎皮椒支付 - 创建订单 API
 * 文档: https://xorpay.com/doc/api.html
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const XORPAY_APP_ID = process.env.XORPAY_APP_ID;
  const XORPAY_APP_SECRET = process.env.XORPAY_APP_SECRET;
  const XORPAY_API_URL = process.env.XORPAY_API_URL || 'https://xorpay.com';
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!XORPAY_APP_ID || !XORPAY_APP_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({
      error: 'XorPay not configured',
      message: '支付服务未配置,请联系管理员'
    });
  }

  try {
    const { orderId, paymentMethod } = req.body;

    if (!orderId || !paymentMethod) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: '缺少必要参数'
      });
    }

    if (!['alipay', 'wechat'].includes(paymentMethod)) {
      return res.status(400).json({
        error: 'Invalid payment method',
        message: '支付方式无效'
      });
    }

    const accessToken = getBearerToken(req.headers.authorization);
    if (!accessToken) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: '请先登录'
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    const user = authData?.user;
    if (authError || !user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: '登录状态无效'
      });
    }

    const { data: order, error: orderFetchError } = await supabase
      .from('payment_orders')
      .select('id, user_id, plan, billing_cycle, amount, currency, payment_status')
      .eq('id', orderId)
      .single();

    if (orderFetchError || !order) {
      return res.status(404).json({
        error: 'Order not found',
        message: '订单不存在'
      });
    }

    if (order.user_id !== user.id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: '无权访问该订单'
      });
    }

    if (order.payment_status !== 'pending') {
      return res.status(409).json({
        error: 'Invalid order state',
        message: '订单状态不可支付'
      });
    }

    const currency = order.currency || 'CNY';
    const expectedAmount = PRICE_TABLE[currency]?.[`${order.plan}:${order.billing_cycle}`];
    if (expectedAmount == null || !amountsMatch(Number(order.amount), expectedAmount)) {
      return res.status(400).json({
        error: 'Invalid order amount',
        message: '订单金额或套餐配置无效'
      });
    }

    // 准备回调 URL
    const baseUrl = req.headers.origin || `https://${req.headers.host}`;
    const notifyUrl = `${baseUrl}/api/xorpay-callback`;
    const returnUrl = `${baseUrl}/payment/success`;

    // 根据虎皮椒文档准备请求参数
    const requestParams = {
      name: 'TradeGrail Membership', // 改成纯英文测试
      pay_type: paymentMethod === 'wechat' ? 'wxpay' : 'alipay',
      price: Number(order.amount).toFixed(2), // 确保是两位小数
      order_id: orderId,
      notify_url: notifyUrl,
      return_url: returnUrl
    };

    // 生成签名: MD5(name + pay_type + price + order_id + notify_url + app_secret)
    const signString = `${requestParams.name}${requestParams.pay_type}${requestParams.price}${requestParams.order_id}${requestParams.notify_url}${XORPAY_APP_SECRET}`;
    const sign = CryptoJS.MD5(signString).toString();

    console.info('[XorPay] Creating order:', {
      orderId,
      amount: requestParams.price,
      paymentMethod: requestParams.pay_type,
      notifyUrl,
      returnUrl
    });

    // 调用虎皮椒 API
    const apiUrl = `${XORPAY_API_URL}/api/pay/${XORPAY_APP_ID}`;
    const formBody = new URLSearchParams({
      ...requestParams,
      sign
    }).toString();

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody
    });

    const responseText = await response.text();
    console.info('[XorPay] Response status:', response.status);

    if (!response.ok) {
      return res.status(500).json({
        error: 'XorPay API error',
        message: `虎皮椒API请求失败: ${response.status}`,
      });
    }

    // 解析响应
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      return res.status(500).json({
        error: 'Invalid response format',
        message: '支付接口返回格式错误',
      });
    }

    // 检查虎皮椒返回的状态
    if (result.status !== 'ok') {
      return res.status(400).json({
        error: 'XorPay order creation failed',
        message: `创建支付订单失败: ${result.status}`,
        xorpayStatus: result.status,
        info: result.info
      });
    }

    // 返回支付信息
    return res.status(200).json({
      success: true,
      order_id: orderId,
      pay_url: result.info?.qr,  // 文档中是 info.qr
      qr_code: result.info?.qr,
      xorpay_order_id: result.aoid,  // 文档中是 aoid
      expires_in: result.expires_in
    });

  } catch (error: any) {
    console.error('[XorPay] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: '服务器内部错误',
      details: error.message
    });
  }
}

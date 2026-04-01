import CryptoJS from 'crypto-js';

export const config = { runtime: 'nodejs' };

/**
 * 虎皮椒支付 - 创建订单 API
 * 文档: https://xorpay.com/doc/api.html
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 从环境变量获取配置
  const XORPAY_APP_ID = process.env.VITE_XORPAY_APP_ID;
  const XORPAY_APP_SECRET = process.env.VITE_XORPAY_APP_SECRET;
  const XORPAY_API_URL = process.env.VITE_XORPAY_API_URL || 'https://xorpay.com';

  console.log('[XorPay] Environment check:', {
    hasAppId: !!XORPAY_APP_ID,
    hasAppSecret: !!XORPAY_APP_SECRET,
    appIdLength: XORPAY_APP_ID?.length,
    appSecretLength: XORPAY_APP_SECRET?.length,
    apiUrl: XORPAY_API_URL
  });

  if (!XORPAY_APP_ID || !XORPAY_APP_SECRET) {
    return res.status(500).json({
      error: 'XorPay not configured',
      message: '支付服务未配置,请联系管理员'
    });
  }

  try {
    const { orderId, amount, paymentMethod, productName } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: '缺少必要参数'
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
      price: amount.toFixed(2), // 确保是两位小数
      order_id: orderId,
      notify_url: notifyUrl,
      return_url: returnUrl
    };

    // 生成签名: MD5(name + pay_type + price + order_id + notify_url + app_secret)
    const signString = `${requestParams.name}${requestParams.pay_type}${requestParams.price}${requestParams.order_id}${requestParams.notify_url}${XORPAY_APP_SECRET}`;
    const sign = CryptoJS.MD5(signString).toString();

    console.log('[XorPay] Creating order:', {
      orderId,
      amount: requestParams.price,
      paymentMethod: requestParams.pay_type,
      notifyUrl,
      returnUrl
    });
    console.log('[XorPay] Sign details:', {
      signStringLength: signString.length,
      signStringPreview: signString.substring(0, 50) + '...',
      sign: sign,
      requestParams: {
        name: requestParams.name,
        pay_type: requestParams.pay_type,
        price: requestParams.price,
        order_id: requestParams.order_id,
        notify_url: requestParams.notify_url
      }
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
    console.log('[XorPay] Response status:', response.status);
    console.log('[XorPay] Response body:', responseText);

    if (!response.ok) {
      return res.status(500).json({
        error: 'XorPay API error',
        message: `虎皮椒API请求失败: ${response.status}`,
        details: responseText
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
        details: responseText
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

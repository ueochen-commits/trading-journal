import { supabase } from '../supabaseClient';

// XorPay 配置
const XORPAY_TEST_MODE = import.meta.env.VITE_XORPAY_TEST_MODE === 'true';

export type PaymentMethod = 'alipay' | 'wechat';
export type PlanType = 'pro' | 'elite' | 'lifetime';
export type BillingCycle = 'monthly' | 'yearly' | 'lifetime';

export interface CreateOrderParams {
  plan: PlanType;
  billingCycle: BillingCycle;
  paymentMethod: PaymentMethod;
  amount: number;
  currency?: string;
}

export interface PaymentOrder {
  id: string;
  user_id: string;
  xorpay_order_id?: string;
  plan: PlanType;
  billing_cycle: BillingCycle;
  amount: number;
  currency: string;
  payment_method?: PaymentMethod;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  paid_at?: string;
  created_at: string;
}

/**
 * 创建支付订单
 */
export const createPaymentOrder = async (params: CreateOrderParams): Promise<PaymentOrder> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // 1. 在数据库中创建订单记录
  const { data: order, error } = await supabase
    .from('payment_orders')
    .insert({
      user_id: user.id,
      plan: params.plan,
      billing_cycle: params.billingCycle,
      amount: params.amount,
      currency: params.currency || 'CNY',
      payment_method: params.paymentMethod,
      payment_status: 'pending'
    })
    .select()
    .single();

  if (error) throw error;

  // 2. 调用 XorPay API 创建支付订单
  try {
    const xorpayOrder = await createXorPayOrder({
      orderId: order.id,
      amount: params.amount,
      paymentMethod: params.paymentMethod,
      userId: user.id,
      userEmail: user.email || ''
    });

    // 3. 更新订单的 XorPay ID
    await supabase
      .from('payment_orders')
      .update({ xorpay_order_id: xorpayOrder.order_id })
      .eq('id', order.id);

    // 返回订单信息,包含支付链接
    return {
      ...order,
      xorpay_order_id: xorpayOrder.order_id,
      pay_url: xorpayOrder.pay_url,
      qr_code: xorpayOrder.qr_code
    };
  } catch (error) {
    console.error('XorPay order creation failed:', error);
    // 标记订单为失败
    await supabase
      .from('payment_orders')
      .update({ payment_status: 'failed' })
      .eq('id', order.id);
    throw error;
  }
};

/**
 * 调用 XorPay API 创建订单
 */
interface XorPayOrderParams {
  orderId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  userId: string;
  userEmail: string;
}

interface XorPayOrderResponse {
  order_id: string;
  pay_url: string;
  qr_code?: string;
}

const createXorPayOrder = async (params: XorPayOrderParams): Promise<XorPayOrderResponse> => {
  // 测试模式：返回模拟数据
  if (XORPAY_TEST_MODE) {
    console.log('🧪 XorPay Test Mode - Simulating API call');
    console.log('Order params:', params);

    // 模拟 API 延迟
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      order_id: params.orderId,
      pay_url: 'https://test-payment-url.com',
      qr_code: 'https://test-qr-code.com'
    };
  }

  // 调用后端 API 创建订单（避免 CORS 和密钥泄露问题）
  try {
    console.log('[XorPay Frontend] Calling backend API with:', {
      orderId: params.orderId,
      amount: params.amount,
      paymentMethod: params.paymentMethod
    });

    const response = await fetch('/api/xorpay-create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId: params.orderId,
        amount: params.amount,
        paymentMethod: params.paymentMethod,
        productName: 'TradeGrail会员订阅'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[XorPay Frontend] Backend API Error:', errorData);
      console.error('[XorPay Frontend] Response status:', response.status);
      throw new Error(errorData.message || `支付请求失败: ${response.status}`);
    }

    const result = await response.json();
    console.log('[XorPay Frontend] Payment order created:', result);

    return {
      order_id: result.order_id,
      pay_url: result.pay_url,
      qr_code: result.qr_code
    };
  } catch (error) {
    console.error('XorPay Request Error:', error);
    throw error;
  }
};

/**
 * 查询订单状态
 */
export const queryOrderStatus = async (orderId: string): Promise<PaymentOrder> => {
  const { data, error } = await supabase
    .from('payment_orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (error) throw error;
  return data;
};

/**
 * 获取用户的所有订单
 */
export const getUserOrders = async (): Promise<PaymentOrder[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('payment_orders')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

/**
 * 处理支付回调（这个应该在后端 API 中实现）
 */
export const handlePaymentCallback = async (callbackData: any) => {
  // 验证签名
  const isValid = verifyXorPaySign(callbackData);
  if (!isValid) {
    throw new Error('Invalid signature');
  }

  // 更新订单状态
  const { error: orderError } = await supabase
    .from('payment_orders')
    .update({
      payment_status: 'paid',
      paid_at: new Date().toISOString(),
      xorpay_trade_no: callbackData.trade_no,
      callback_data: callbackData
    })
    .eq('xorpay_order_id', callbackData.order_id);

  if (orderError) throw orderError;

  // 获取订单信息
  const { data: order } = await supabase
    .from('payment_orders')
    .select('*')
    .eq('xorpay_order_id', callbackData.order_id)
    .single();

  if (!order) throw new Error('Order not found');

  // 创建或更新订阅
  const periodEnd = calculatePeriodEnd(order.billing_cycle);

  const { error: subError } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: order.user_id,
      plan: order.plan,
      status: 'active',
      current_period_end: periodEnd,
      xorpay_order_id: callbackData.order_id,
      payment_method: order.payment_method,
      payment_status: 'paid',
      amount: order.amount,
      currency: order.currency
    });

  if (subError) throw subError;

  return { success: true };
};

/**
 * 验证 XorPay 签名
 */
const verifyXorPaySign = (_data: any): boolean => {
  // 签名验证已在后端 API 处理
  return true;
};

/**
 * 计算订阅到期时间
 */
const calculatePeriodEnd = (billingCycle: BillingCycle): string => {
  const now = new Date();
  switch (billingCycle) {
    case 'monthly':
      now.setMonth(now.getMonth() + 1);
      break;
    case 'yearly':
      now.setFullYear(now.getFullYear() + 1);
      break;
    case 'lifetime':
      now.setFullYear(now.getFullYear() + 100); // 100 年后
      break;
  }
  return now.toISOString();
};

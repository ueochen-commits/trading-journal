import React, { useState } from 'react';
import { X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { createPaymentOrder, queryOrderStatus, PaymentMethod, PlanType, BillingCycle } from '../services/xorpayService';
import { useLanguage } from '../LanguageContext';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: PlanType;
  billingCycle: BillingCycle;
  amount: number;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, plan, billingCycle, amount }) => {
  const { language } = useLanguage();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('alipay');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');

  if (!isOpen) return null;

  const handlePayment = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // 创建支付订单
      const order = await createPaymentOrder({
        plan,
        billingCycle,
        paymentMethod,
        amount,
        currency: 'CNY'
      });

      setOrderId(order.id);
      setPaymentStatus('pending');

      // 这里需要根据 XorPay 返回的数据处理
      // 如果是支付宝，可能返回支付 URL
      // 如果是微信，可能返回二维码

      // 临时处理：打开支付页面
      // 实际需要根据 XorPay API 返回的数据处理

      // 开始轮询订单状态
      startPollingOrderStatus(order.id);

    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || (language === 'cn' ? '支付失败，请重试' : 'Payment failed, please try again'));
      setPaymentStatus('failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // 轮询订单状态
  const startPollingOrderStatus = (orderId: string) => {
    const interval = setInterval(async () => {
      try {
        const order = await queryOrderStatus(orderId);
        if (order.payment_status === 'paid') {
          setPaymentStatus('success');
          clearInterval(interval);
          setTimeout(() => {
            onClose();
            window.location.reload(); // 刷新页面以更新会员状态
          }, 2000);
        } else if (order.payment_status === 'failed') {
          setPaymentStatus('failed');
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Query order status error:', err);
      }
    }, 3000); // 每 3 秒查询一次

    // 5 分钟后停止轮询
    setTimeout(() => clearInterval(interval), 300000);
  };

  const getPlanName = () => {
    if (plan === 'lifetime') return language === 'cn' ? '终身会员' : 'Lifetime';
    if (plan === 'elite') return 'Elite';
    return 'Pro';
  };

  const getBillingCycleName = () => {
    if (billingCycle === 'lifetime') return language === 'cn' ? '终身' : 'Lifetime';
    if (billingCycle === 'yearly') return language === 'cn' ? '年付' : 'Yearly';
    return language === 'cn' ? '月付' : 'Monthly';
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
            {language === 'cn' ? '完成支付' : 'Complete Payment'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order Info */}
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {language === 'cn' ? '订阅方案' : 'Plan'}
            </span>
            <span className="font-bold text-slate-900 dark:text-white">
              {getPlanName()} - {getBillingCycleName()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {language === 'cn' ? '支付金额' : 'Amount'}
            </span>
            <span className="text-2xl font-black text-indigo-600">
              ¥{amount}
            </span>
          </div>
        </div>

        {/* Payment Method Selection */}
        {paymentStatus === 'idle' && (
          <>
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                {language === 'cn' ? '选择支付方式' : 'Payment Method'}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentMethod('alipay')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    paymentMethod === 'alipay'
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">💳</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {language === 'cn' ? '支付宝' : 'Alipay'}
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setPaymentMethod('wechat')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    paymentMethod === 'wechat'
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">💚</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {language === 'cn' ? '微信支付' : 'WeChat Pay'}
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
              </div>
            )}

            {/* Pay Button */}
            <button
              onClick={handlePayment}
              disabled={isProcessing}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {language === 'cn' ? '处理中...' : 'Processing...'}
                </>
              ) : (
                language === 'cn' ? '立即支付' : 'Pay Now'
              )}
            </button>
          </>
        )}

        {/* Payment Pending */}
        {paymentStatus === 'pending' && (
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
            <p className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              {language === 'cn' ? '等待支付...' : 'Waiting for payment...'}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {language === 'cn' ? '请在新窗口完成支付' : 'Please complete payment in the new window'}
            </p>
          </div>
        )}

        {/* Payment Success */}
        {paymentStatus === 'success' && (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <p className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {language === 'cn' ? '支付成功！' : 'Payment Successful!'}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {language === 'cn' ? '正在更新您的会员状态...' : 'Updating your membership...'}
            </p>
          </div>
        )}

        {/* Payment Failed */}
        {paymentStatus === 'failed' && (
          <div className="text-center py-8">
            <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
            <p className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {language === 'cn' ? '支付失败' : 'Payment Failed'}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {language === 'cn' ? '请重试或联系客服' : 'Please try again or contact support'}
            </p>
            <button
              onClick={() => setPaymentStatus('idle')}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors"
            >
              {language === 'cn' ? '重试' : 'Retry'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;

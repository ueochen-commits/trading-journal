import QRCode from 'qrcode';
import React, { useEffect, useRef, useState } from 'react';
import { X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { createPaymentOrder, queryOrderStatus, PaymentMethod, PlanType, BillingCycle } from '../services/xorpayService';
import { useLanguage } from '../LanguageContext';
import { useUser } from './UserContext';
import CreemCheckoutModal from './CreemCheckoutModal';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: PlanType;
  billingCycle: BillingCycle;
  amount: number;
  currency?: 'CNY' | 'USD';
}

const CnyPaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, plan, billingCycle, amount }) => {
  const { language } = useLanguage();
  const { refreshUser, closePricing } = useUser();
  const paymentMethod: PaymentMethod = 'alipay';
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const polling = useRef<ReturnType<typeof setInterval> | null>(null);
  const deadline = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(true);
  useEffect(() => {
    active.current=true;
    return () => {active.current=false;if(polling.current)clearInterval(polling.current);if(deadline.current)clearTimeout(deadline.current);if(closeTimer.current)clearTimeout(closeTimer.current);};
  }, []);
  useEffect(() => {let alive=true;setQrDataUrl(null);if(qrCode)void QRCode.toDataURL(qrCode,{width:240,margin:2}).then(value=>{if(alive)setQrDataUrl(value);}).catch(()=>{if(alive)setError(language === 'cn' ? '二维码生成失败，请稍后重试。' : 'Unable to create the QR code. Please retry.');});return()=>{alive=false;};}, [qrCode,language]);
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


      if(!active.current)return;
      setOrderId(order.id);

      // 设置支付 URL 和二维码
      const payUrl = order.pay_url || order.qr_code;

      setPaymentUrl(payUrl || null);
      setQrCode(payUrl || null);
      setPaymentStatus('pending');


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
    if(polling.current)clearInterval(polling.current);
    const interval = setInterval(async () => {
      try {
        const order = await queryOrderStatus(orderId);
        if(!active.current)return;
        if (order.payment_status === 'paid') {
          setPaymentStatus('success');
          clearInterval(interval);
          // 立刻刷新用户会员状态,不依赖页面刷新
          await refreshUser();
          closeTimer.current=setTimeout(() => {
            onClose();
            closePricing();
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
    polling.current=interval;
    deadline.current=setTimeout(() => {clearInterval(interval);if(active.current)setError(language === 'cn' ? '查询已暂停。若已付款，请勿重复支付，稍后重新打开页面或联系客服核对。' : 'Status polling paused. If paid, do not pay again; reopen the app or contact support to check.');}, 300000);
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
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true" aria-label={language === 'cn' ? '完成支付' : 'Complete payment'}>
      <div className="tg-module bg-white dark:bg-slate-900 rounded-2xl p-8 max-w-md w-full border border-slate-200 dark:border-[var(--tg-border)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
            {language === 'cn' ? '完成支付' : 'Complete Payment'}
          </h3>
          <button
            autoFocus
            aria-label={language === 'cn' ? '关闭付款窗口' : 'Close payment'}
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order Info */}
        <div className="tg-module bg-slate-50 dark:bg-slate-800 rounded-xl p-4 mb-6">
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
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-300">
              ¥{amount}
            </span>
          </div>
        </div>

        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">{language === 'cn' ? '这是预付费方案，一次付款，到期不自动扣款。付款后七天内可申请退款。' : 'Prepaid access: one payment, no automatic debit at expiry. Refund requests are accepted within seven days.'} <a className="text-indigo-500 dark:text-indigo-300" href="https://www.tradegrail.net/terms" target="_blank" rel="noreferrer">{language === 'cn' ? '服务条款' : 'Terms'}</a> · <a className="text-indigo-500 dark:text-indigo-300" href="https://www.tradegrail.net/refunds" target="_blank" rel="noreferrer">{language === 'cn' ? '退款说明' : 'Refunds'}</a></p>

        {/* Payment Method Selection */}
        {paymentStatus === 'idle' && (
          <>
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                {language === 'cn' ? '支付方式' : 'Payment Method'}
              </label>
              <div className="flex justify-center">
                <div className="p-4 rounded-xl border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 w-48">
                  <div className="text-center">
                    <div className="text-3xl mb-2">💳</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {language === 'cn' ? '支付宝' : 'Alipay'}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 dark:text-slate-400">
                      {language === 'cn' ? '唯一支持的支付方式' : 'Only supported method'}
                    </div>
                  </div>
                </div>
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
          <div className="text-center py-6">
            {error && <p role="alert" className="mb-4 text-sm text-rose-600 dark:text-rose-300">{error}</p>}
            {qrCode && qrDataUrl ? (
              <>
                <p className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                  {language === 'cn' ? '请扫码支付' : 'Scan to Pay'}
                </p>

                {/* QR Code */}
                <div className="tg-module bg-white p-4 rounded-xl inline-block mb-4 dark:bg-slate-900">
                  <img
                    src={qrDataUrl || undefined}
                    alt="Payment QR Code"
                    className="w-48 h-48"
                  />
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                  {language === 'cn' ? '使用支付宝扫描二维码完成支付' : 'Scan with Alipay to complete payment'}
                </p>

                {/* 或者直接跳转 */}
                <button
                  onClick={() => {const url=new URL(qrCode);if(url.protocol==='https:')window.open(url.href, '_blank', 'noopener,noreferrer');}}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium dark:text-indigo-300 dark:hover:text-indigo-300"
                >
                  {language === 'cn' ? '或点击此处在新窗口打开' : 'Or click here to open in new window'}
                </button>

                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {language === 'cn' ? '等待支付确认...' : 'Waiting for payment confirmation...'}
                </div>
              </>
            ) : (
              <>
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4 dark:text-indigo-300" />
                <p className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  {language === 'cn' ? '正在生成支付二维码...' : 'Generating payment QR code...'}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {language === 'cn' ? '请稍候' : 'Please wait'}
                </p>
              </>
            )}
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

export default function PaymentModal(props: PaymentModalProps) {
  if (!props.isOpen) return null;
  if (props.currency === 'USD') return <CreemCheckoutModal plan={props.plan} billingCycle={props.billingCycle} onClose={props.onClose}/>;
  return <CnyPaymentModal {...props}/>;
}

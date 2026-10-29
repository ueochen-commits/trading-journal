import BillingSupport from './BillingSupport';
import React, { useEffect, useState } from 'react';
import { X, Check } from 'lucide-react';
import { useUser } from './UserContext';
import { useLanguage } from '../LanguageContext';
import PaymentModal from './PaymentModal';
import { ManageUsdSubscription } from './CreemBilling';
import { getCreemCatalog } from '../services/creemService';
import { getBillingMarket, type BillingMarket } from '../services/billingMarket';

const PricingModal: React.FC = () => {
  const { isPricingOpen, closePricing, user } = useUser();
  const { language } = useLanguage();
  const cn = language === 'cn';
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [market, setMarket] = useState<BillingMarket | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [usdEnabled, setUsdEnabled] = useState(false);
  const [purchase, setPurchase] = useState<{ plan: 'pro' | 'elite'; amount: number; currency: 'CNY' | 'USD'; billingCycle: 'monthly' | 'yearly' } | null>(null);
  useEffect(() => {
    let alive = true;
    if (isPricingOpen) {
      setMarket(null); setError(false); setUsdEnabled(false); setPurchase(null);
      void getBillingMarket().then(async value => {
        if (!alive) return;
        setMarket(value);
        if (value.currency === 'USD') {
          const catalog = await getCreemCatalog();
          if (alive) setUsdEnabled(catalog.enabled && ['pro', 'elite'].every(plan => ['monthly', 'yearly'].every(period => catalog.offers.some(o => o.plan === plan && o.cycle === period && o.amount === value.prices[plan][period]))));
        }
      }).catch(() => { if (alive) setError(true); });
    }
    return () => { alive = false; };
  }, [isPricingOpen, retry]);
  if (!isPricingOpen) return null;
  const sign = market?.currency === 'CNY' ? '¥' : 'US$';
  const features = {
    free: cn ? ['1 个真实交易账户', '最多 100 条交易记录', '每笔交易最多 2 张截图', 'AI 每月 30 次，每日最多 5 次'] : ['1 personal trading account', 'Up to 100 trade records', 'Up to 2 screenshots per trade', '30 AI requests/month, up to 5/day'],
    pro: cn ? ['最多 3 个真实交易账户', '最多 1,000 条交易记录', '多张截图、复盘笔记与统计', 'AI 每月 300 次，每日最多 30 次'] : ['Up to 3 personal accounts', 'Up to 1,000 trade records', 'Multiple screenshots, notes and analytics', '300 AI requests/month, up to 30/day'],
    elite: cn ? ['包含 Pro 功能', '不限交易账户与记录条数', 'AI 每月 600 次，每日最多 60 次'] : ['Everything in Pro', 'No account or trade record count limit', '600 AI requests/month, up to 60/day'],
  };
  return <><div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl overflow-y-auto p-5 md:p-12" role={purchase ? undefined : "dialog"} aria-modal={purchase ? undefined : true} aria-hidden={purchase ? true : undefined} inert={purchase ? true : undefined} aria-labelledby="pricing-title">
    <div className="max-w-6xl mx-auto relative text-slate-100">
      <button onClick={closePricing} aria-label={cn ? '关闭' : 'Close'} className="absolute right-0 top-0 p-2 rounded-lg hover:bg-slate-800"><X /></button>
      <header className="text-center pt-10 mb-8"><h2 id="pricing-title" className="text-3xl font-bold">{cn ? '先免费体验，再按需要升级' : 'Start free. Upgrade when you need more.'}</h2><p className="text-slate-400 mt-4">{cn ? '记录、分析和复盘你的交易。' : 'Record, analyze and review your trades.'}</p></header>
      {/* Existing subscriptions remain manageable while travelling, regardless of checkout market. */}
      <ManageUsdSubscription />
      <BillingSupport />
      {!market ? <div className="text-center py-16 text-slate-300">{error ? <><p>{cn ? '暂时无法确认支付地区，请重试。' : 'Unable to determine your payment region. Please retry.'}</p><button className="mt-4 px-5 py-2 bg-indigo-600 rounded-xl" onClick={() => setRetry(x => x + 1)}>{cn ? '重试' : 'Retry'}</button></> : (cn ? '正在确认当地支付方案…' : 'Loading local payment plans…')}</div> : <>
        <p className="text-center text-sm text-slate-400 mb-6">{market.currency === 'CNY' ? '当前网络地区：人民币 · 支付宝 · 预付费，到期不自动扣款' : (cn ? '当前网络地区：美元 · Creem 支付 · 自动续费，可随时取消后续续费' : 'USD · Creem checkout · Auto-renews; cancel future renewals anytime')}</p>
        <div className="flex justify-center gap-3 mb-8">{(['monthly','yearly'] as const).map(period => <button key={period} aria-pressed={cycle === period} onClick={() => setCycle(period)} className={`rounded-xl px-6 py-3 border ${cycle === period ? 'bg-indigo-600 border-indigo-500' : 'border-slate-700'}`}>{period === 'monthly' ? (cn ? '月付' : 'Monthly') : (cn ? '年付 · 约省两个月' : 'Yearly · save about 2 months')}</button>)}</div>
        <div className="grid md:grid-cols-3 gap-6">{(['free','pro','elite'] as const).map(plan => {
          const amount = plan === 'free' ? 0 : market.prices[plan][cycle];
          const current = user.tier === plan;
          const disabled = plan === 'free' || user.tier === 'elite' || (plan === 'pro' && user.tier === 'pro') || (market.currency === 'USD' && !usdEnabled);
          return <section key={plan} className={`tg-module rounded-2xl bg-slate-900 p-7 border ${plan === 'pro' ? 'border-indigo-500' : 'border-slate-800'}`}><h3 className="text-2xl font-bold mb-5">{plan === 'free' ? 'Free' : plan === 'pro' ? 'Pro' : 'Elite'}</h3><p className="text-4xl font-bold">{sign}{amount}<span className="text-sm font-normal text-slate-400"> / {plan === 'free' || cycle === 'monthly' ? (cn ? '月' : 'month') : (cn ? '年' : 'year')}</span></p>
            <p className="text-sm text-slate-400 mt-3 min-h-10">{plan !== 'free' && cycle === 'yearly' ? (cn ? '一次收取全年费用；平均每月 ' : 'Charged annually; monthly equivalent ') + sign + (amount / 12).toFixed(2) : (plan === 'free' ? (cn ? '可持续免费使用' : 'Keep using the free plan') : '')}</p>
            <ul className="space-y-4 my-7 min-h-40">{features[plan].map(text => <li className="flex items-start gap-2 text-sm text-slate-300" key={text}><Check size={16} className="text-emerald-400 shrink-0 mt-0.5" />{text}</li>)}</ul>
            <button disabled={disabled} onClick={() => plan !== 'free' && setPurchase({ plan, amount, currency: market.currency, billingCycle: cycle })} className="w-full rounded-xl py-3 bg-indigo-600 disabled:bg-slate-800 disabled:text-slate-400">{current ? (cn ? '当前方案' : 'Current plan') : plan === 'free' ? (cn ? '免费版' : 'Free plan') : user.tier === 'elite' ? (cn ? '已有更高等级方案' : 'Higher tier active') : (market.currency === 'USD' && !usdEnabled) ? (cn ? '美元支付准备中' : 'USD checkout coming soon') : (cn ? '选择方案' : 'Choose plan')}</button>
          </section>;
        })}</div>
        <p className="text-sm text-slate-400 mt-7 text-center">{cn ? 'AI 额度按 UTC 自然月重置，年付也按月发放，不结转。原有已购买权益按原方案保留。' : 'AI quotas reset each UTC calendar month, including annual plans, without rollover. Existing paid entitlements retain their original plan.'}</p>
        <p className="text-sm text-slate-400 mt-3 text-center">{cn ? '付款前显示最终税费和总额。七天内可申请退款。' : 'Final taxes and total appear before payment. Refund requests are accepted within seven days.'} <a className="text-indigo-300" href="https://www.tradegrail.net/terms" target="_blank" rel="noreferrer">{cn ? '服务条款' : 'Terms'}</a> · <a className="text-indigo-300" href="https://www.tradegrail.net/refunds" target="_blank" rel="noreferrer">{cn ? '退款说明' : 'Refund policy'}</a></p>
      </>}
    </div>
  </div>{purchase && <PaymentModal isOpen onClose={() => setPurchase(null)} {...purchase} />}</>;
};
export default PricingModal;

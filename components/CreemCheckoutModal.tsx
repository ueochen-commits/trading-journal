import BillingSupport from './BillingSupport';
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { billingMessage, creemRequest, getCreemCatalog, goToCreem, type CreemOffer } from '../services/creemService';

export default function CreemCheckoutModal({ plan, billingCycle, onClose }: {plan:string; billingCycle:string; onClose:()=>void}) {
  const { language } = useLanguage(), cn = language === 'cn';
  const [offer, setOffer] = useState<CreemOffer | null>(null), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [test, setTest] = useState(false);
  useEffect(() => {
    let alive = true;
    getCreemCatalog().then(catalog => {
      if (!alive) return;
      setOffer(catalog.enabled ? catalog.offers.find(o => o.plan === plan && o.cycle === billingCycle) || null : null);
      setTest(catalog.mode === 'test');
    }).catch(() => {}).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [plan,billingCycle]);
  const checkout = async () => {
    setBusy(true); setError('');
    try {
      const result = await creemRequest<{checkoutUrl:string; attemptId:string}>('checkout', {plan,billingCycle});
      goToCreem(result.checkoutUrl);
    } catch (e) { setError(billingMessage((e as Error).message,language)); setBusy(false); }
  };
  return <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70" role="dialog" aria-modal="true" aria-label={cn?'美元订阅':'USD subscription'}>
    <div className="tg-module rounded-2xl p-7 w-full max-w-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 space-y-5">
      <div className="flex justify-between items-center"><h3 className="text-xl font-bold">{cn?'美元订阅':'USD subscription'}</h3><button autoFocus onClick={onClose} aria-label={cn?'关闭':'Close'}><X size={22}/></button></div>
      {loading ? <p role="status">{cn?'正在核对套餐…':'Checking plan…'}</p> : !offer ? <p role="status">{cn?'此美元套餐尚未开放。你可以继续使用免费版，稍后再试。':'This USD plan is not available yet. You can continue with the free plan and check back later.'}</p> : <>
        {test && <p className="text-amber-600 dark:text-amber-300">{cn?'测试环境，不会真实扣款或开通正式会员。':'Test mode. No real charges or live membership.'}</p>}
        <div className="rounded-xl p-4 bg-slate-50 dark:bg-slate-800"><p className="font-bold capitalize">{offer.plan} · {billingCycle==='yearly'?(cn?'年付':'Yearly'):(cn?'月付':'Monthly')}</p><p className="text-3xl font-bold mt-2">US${offer.amount}<span className="text-sm font-normal"> / {billingCycle==='yearly'?(cn?'年':'year'):(cn?'月':'month')}</span></p></div>
        <p className="text-sm text-slate-600 dark:text-slate-300">{cn?'这是自动续费订阅，可在会员页面取消下次续费。已付款的有效期内仍可使用。':'This subscription renews automatically. Cancel future renewals from your billing portal; access continues through your paid period.'}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{offer.taxMode==='exclusive'?(cn?'税费将在 Creem 结账时根据所在地计算，付款前会显示最终金额。':'Applicable taxes are calculated by Creem at checkout. You will see the total before paying.'):(cn?'最终金额、税费及续费信息以 Creem 结账页面为准。':'Review the final total, taxes and renewal details on the Creem checkout page.')}</p>
        {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-300">{error}</p>}
        <button disabled={busy} onClick={checkout} className="w-full py-3 rounded-xl bg-indigo-600 text-white disabled:opacity-50">{busy?(cn?'正在前往…':'Opening…'):(cn?'前往 Creem 安全结账':'Continue to Creem checkout')}</button>
      </>}
      <BillingSupport />
      <div className="flex flex-wrap gap-4 text-xs text-indigo-600 dark:text-indigo-300"><a href="https://www.tradegrail.net/terms" target="_blank" rel="noreferrer">{cn?'服务条款':'TradeGrail terms'}</a><a href="https://www.tradegrail.net/refunds" target="_blank" rel="noreferrer">{cn?'退款与取消':'Refunds & cancellation'}</a><a href="https://www.creem.io/buyer-terms" target="_blank" rel="noreferrer">{cn?'Creem 付款条款':'Creem buyer terms'}</a><a href="https://www.creem.io/privacy" target="_blank" rel="noreferrer">{cn?'Creem 隐私政策':'Creem privacy notice'}</a></div>
    </div>
  </div>;
}

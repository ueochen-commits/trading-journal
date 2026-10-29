import React, { useEffect, useState } from 'react';
import { useLanguage } from '../LanguageContext';
import { useUser } from './UserContext';
import { billingMessage, creemRequest, goToCreem, getCreemCatalog } from '../services/creemService';
import { supabase } from '../supabaseClient';

export function ManageUsdSubscription() {
  const { language } = useLanguage();
  const { user } = useUser();
  const [hasSubscription,setHasSubscription] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => {
    let alive=true;setHasSubscription(false);
    if (user.id) void getCreemCatalog().then(c => supabase.from('creem_memberships').select('subscription_id').eq('user_id',user.id).eq('mode',c.mode).limit(1)).then(({data}) => { if(alive) setHasSubscription(Boolean(data?.length)); }).catch(()=>{});
    return () => {alive=false;};
  },[user.id]);
  const manage = async () => {
    setBusy(true); setError('');
    try { const data = await creemRequest<{ portalUrl: string }>('portal'); goToCreem(data.portalUrl); }
    catch (e) { setError(billingMessage((e as Error).message, language)); }
    finally { setBusy(false); }
  };
  if (!hasSubscription) return null;
  return <div className="text-center"><button onClick={manage} disabled={busy} className="text-sm text-indigo-300 underline disabled:opacity-50">{busy ? (language === 'cn' ? '正在打开…' : 'Opening…') : (language === 'cn' ? '管理美元订阅、取消续费或下载发票' : 'Manage USD subscription, cancellation & invoices')}</button>{error && <p role="alert" className="mt-2 text-sm text-rose-300">{error}</p>}</div>;
}

// A return URL is only an instruction to check the server, never proof of payment.
export function CreemBillingReturn() {
  const { language } = useLanguage(); const { user, refreshUser } = useUser();
  const [attemptId, setAttemptId] = useState(() => new URLSearchParams(location.search).get('billing_return'));
  const [state, setState] = useState<'pending' | 'active' | 'expired' | 'error'>('pending');
  const [testMode, setTestMode] = useState(false), [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!attemptId || !user.id) return;
    let stopped = false, timer: ReturnType<typeof setTimeout>; let checks = 0;
    const check = async () => {
      try {
        const result = await creemRequest<{state:'pending'|'active'|'expired'; mode?:string}>('status', { attemptId });
        if (stopped) return;
        setTestMode(result.mode === 'test'); setState(result.state);
        if (result.state === 'active') { await refreshUser(); return; }
        if (result.state === 'expired' || ++checks >= 12) return;
        timer = setTimeout(check, 4000);
      } catch { if (!stopped) setState('error'); }
    };
    setState('pending'); void check();
    return () => { stopped = true; clearTimeout(timer); };
  }, [attemptId, user.id, retry]);
  if (!attemptId || !user.id) return null;
  const cn = language === 'cn';
  const dismiss = () => { const url = new URL(location.href); url.searchParams.delete('billing_return'); history.replaceState({}, '', url.pathname + url.search + url.hash); setAttemptId(null); };
  return <div className="fixed inset-0 z-[150] bg-black/60 p-5 flex items-center justify-center" role="dialog" aria-modal="true" aria-label={cn ? '核对支付状态' : 'Payment status'}>
    <div className="tg-module rounded-2xl p-7 max-w-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 space-y-4">
      <h2 className="text-xl font-bold">{state === 'active' ? (testMode ? (cn ? '测试支付已验证' : 'Test payment verified') : (cn ? '会员已开通' : 'Membership activated')) : (cn ? '核对支付状态' : 'Checking payment status')}</h2>
      <p className="text-sm text-slate-600 dark:text-slate-300">{state === 'active' ? (testMode ? (cn ? '这是测试订单，不会开通正式会员。' : 'This sandbox order does not grant live membership.') : (cn ? '已核实付款，会员状态已刷新。你可以继续使用了。' : 'Payment verified and membership refreshed. You can continue.')) : state === 'expired' ? (cn ? '本次结账已过期，可以重新选择套餐。' : 'This checkout expired. You can choose a plan again.') : (cn ? '正在向支付平台核实。若已扣款，请不要重复付款；稍后可再次查询。' : 'Verifying with the payment provider. If charged, do not pay again. You can check again shortly.')}</p>
      {state !== 'active' && <button onClick={() => setRetry(n => n + 1)} className="bg-indigo-600 text-white rounded-lg px-4 py-2">{cn ? '重新查询' : 'Check again'}</button>}
      <button onClick={dismiss} className="ml-3 px-4 py-2 border rounded-lg border-slate-300 dark:border-slate-700">{cn ? '返回使用' : 'Continue to app'}</button>
    </div>
  </div>;
}

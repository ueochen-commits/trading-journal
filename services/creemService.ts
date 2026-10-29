import { supabase } from '../supabaseClient';

export type CreemOffer = { plan: 'pro' | 'elite'; cycle: 'monthly' | 'yearly'; amount: number; currency: 'USD'; taxMode: string };
export type CreemCatalog = { enabled: boolean; mode: 'test' | 'prod'; offers: CreemOffer[] };
export function billingMessage(code: string, language: string): string {
  const cn = language === 'cn';
  switch (code) {
    case 'payment_market_changed': return cn ? '网络地区已变化，请关闭并重新打开套餐页面。' : 'Your network region changed. Please reopen the plans page.';
    case 'authentication_required': return cn ? '请重新登录后再试。' : 'Please sign in again.';
    case 'checkout_in_progress': return cn ? '上一笔结账正在创建，请稍后重试，不要重复付款。' : 'Your checkout is still being created. Please retry shortly; do not pay twice.';
    case 'subscription_already_exists': return cn ? '你已有有效订阅，请通过“管理美元订阅”进行管理。' : 'You already have a subscription. Use Manage USD subscription.';
    case 'checkout_already_exists': return cn ? '还有一笔未完成的结账，请先完成或关闭原结账。' : 'An earlier checkout is still open. Please finish that checkout first.';
    case 'subscription_not_found': return cn ? '没有找到美元订阅；原有会员权益不受影响。' : 'No USD subscription found. Existing membership is unchanged.';
    default: return cn ? '美元支付暂时无法使用，请稍后重试。若已扣款，请勿重复付款。' : 'USD billing is temporarily unavailable. Please try again later. If charged, do not pay again.';
  }
}
export async function creemRequest<T>(action: 'checkout' | 'status' | 'portal', body: object = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw Error('authentication_required');
  const res = await fetch(`/api/creem/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw Error(data.error || 'billing_request_failed');
  return data as T;
}
let catalogPromise: Promise<CreemCatalog> | undefined;
let catalogExpires = 0;
export function getCreemCatalog(): Promise<CreemCatalog> {
  if (!catalogPromise || Date.now() > catalogExpires) {
    catalogExpires = Date.now() + 30_000;
    catalogPromise = fetch('/api/creem/catalog').then(async res => {
      if (!res.ok) { catalogExpires = 0; return { enabled:false,mode:'prod',offers:[] } as CreemCatalog; }
      return res.json();
    }).catch(() => { catalogExpires=0;return {enabled:false,mode:'prod',offers:[]} as CreemCatalog; });
  }
  return catalogPromise;
}
export function goToCreem(value: string) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !['creem.io','www.creem.io','checkout.creem.io','test-checkout.creem.io','test.creem.io'].includes(url.hostname) || url.username || url.password) throw Error('invalid_provider_url');
  window.location.assign(url.href);
}

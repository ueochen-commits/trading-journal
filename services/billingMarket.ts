export type BillingMarket = {
  country: string | null; currency: 'CNY' | 'USD'; provider: 'xorpay' | 'creem'; version: string;
  prices: Record<'pro' | 'elite', Record<'monthly' | 'yearly', number>>;
};
export async function getBillingMarket(): Promise<BillingMarket> {
  const response = await fetch('/api/billing-market', { cache: 'no-store' });
  if (!response.ok) throw Error('payment_region_unavailable');
  const value = await response.json();
  if (!['CNY','USD'].includes(value.currency) || !value.prices?.pro?.monthly || !value.prices?.elite?.yearly) throw Error('payment_region_unavailable');
  return value;
}

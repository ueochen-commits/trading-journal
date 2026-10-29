import { PRICES } from '../shared/billing-market.mjs';
// Match the exact configured amount before opening a payable invoice. Rounding an
// almost-matching client amount could otherwise create a charge the callback rejects.
export function domesticPrice(order) {
  if(order.currency !== 'CNY' || order.payment_method !== 'alipay') return null;
  const expected=PRICES.CNY[order.plan]?.[order.billing_cycle];
  return typeof expected === 'number' && Number(order.amount) === expected ? expected : null;
}

// Provider redirect query values are hints, never payment proof. Remove them from
// the address bar once captured; keep unrelated product parameters and the hash.
export function cleanBillingReturn(value, keepAttempt = false) {
  const url=new URL(value);
  for(const key of ['request_id','checkout_id','order_id','customer_id','subscription_id','product_id','signature'])url.searchParams.delete(key);
  if(!keepAttempt)url.searchParams.delete('billing_return');
  return url.pathname+url.search+url.hash;
}

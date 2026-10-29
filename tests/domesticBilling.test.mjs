import test from 'node:test';
import assert from 'node:assert/strict';
import { domesticPrice } from '../server/domestic-billing.mjs';
test('domestic invoices accept only the configured CNY Alipay plan and exact amount',()=>{
 const order={currency:'CNY',payment_method:'alipay',plan:'pro',billing_cycle:'monthly',amount:29};
 assert.equal(domesticPrice(order),29);assert.equal(domesticPrice({...order,amount:'29.00'}),29);
 for(const patch of [{currency:'USD'},{currency:null},{payment_method:'wechat'},{plan:'lifetime',billing_cycle:'lifetime',amount:1999},{amount:29.009},{amount:28.999},{amount:'NaN'},{amount:null},{plan:'pro',billing_cycle:'yearly',amount:199}])assert.equal(domesticPrice({...order,...patch}),null);
 assert.equal(domesticPrice({...order,plan:'elite',billing_cycle:'yearly',amount:690}),690);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { billingMarket, PRICES } from '../shared/billing-market.mjs';
import { limitAiMessages } from '../server/ai-budget.mjs';
import { readFile } from 'node:fs/promises';
test('payment market follows hosting geo only, independent of language, query and client prices',()=>{
  for(const country of ['CN','US','GB','HK','SG','ZZ',null,'cn','CN,US']) {
    const headers={'x-vercel-ip-country':country,'cf-ipcountry':'CN','accept-language':'zh-CN'};
    const value=billingMarket(headers,{VERCEL:'1'});
    assert.equal(value.currency,country==='CN'?'CNY':'USD');
    assert.equal(value.provider,country==='CN'?'xorpay':'creem');
    assert.ok(!JSON.stringify(value).includes(country==='CN'?'USD':'CNY'));
  }
  assert.equal(billingMarket({'x-vercel-ip-country':'CN'},{}).currency,'USD');
  assert.equal(billingMarket(new Headers({'x-vercel-ip-country':'CN'}),{VERCEL:'1'}).currency,'CNY');
});
test('annual price is ten monthly payments and only recurring launch offers are sold',()=>{
  for(const prices of Object.values(PRICES))for(const plan of Object.values(prices)){assert.equal(plan.yearly,plan.monthly*10);assert.deepEqual(Object.keys(plan),['monthly','yearly']);}
});
test('large untrusted AI context has a deterministic byte cap while retaining the question and output format',()=>{
  for(const count of [1,2,10,15]) {
    const result=limitAiMessages(Array.from({length:count},()=>({role:'user',content:'开始'+'复盘🦁'.repeat(50000)+'结束'})));
    assert.ok(result.length<=10);assert.ok(result.reduce((n,m)=>n+Buffer.byteLength(m.content),0)<=12000);
    assert.ok(result.every(m=>m.content.includes('Context shortened')&&m.content.endsWith('结束')));
  }
});
test('landing and app share the exact market and price definition',async()=>{
  assert.equal(await readFile(new URL('../shared/billing-market.mjs',import.meta.url),'utf8'),await readFile(new URL('../../tradegrail-landingpage/shared/billing-market.mjs',import.meta.url),'utf8'));
});
test('Cloudflare-proxied requests use visitor country rather than the proxy location',()=>{
 for(const ip of ['173.245.48.1','104.16.1.2','2606:4700::1234','::ffff:104.16.1.2']) {
  const market=billingMarket({'x-forwarded-for':ip,'cf-ipcountry':'CN','x-vercel-ip-country':'SG'},{VERCEL:'1'});
  assert.equal(market.currency,'CNY');
 }
 for(const ip of ['1.2.3.4','104.15.255.255','invalid','173.245.48.1,1.2.3.4']) {
  assert.equal(billingMarket({'x-forwarded-for':ip,'cf-ipcountry':'CN','x-vercel-ip-country':'US'},{VERCEL:'1'}).currency,'USD');
 }
 assert.throws(()=>billingMarket({'x-forwarded-for':'104.16.1.2','x-vercel-ip-country':'SG'},{VERCEL:'1'}),/payment_region_unavailable/);
});
test('payment return removes provider IDs and signatures without losing unrelated settings',async()=>{
 const {cleanBillingReturn}=await import('../utils/billingReturn.mjs');
 const value='https://dashboard.tradegrail.net/settings?billing_return=attempt&request_id=attempt&checkout_id=checkout&order_id=order&customer_id=customer&subscription_id=sub&product_id=product&signature=sig&tab=billing#details';
 assert.equal(cleanBillingReturn(value,true),'/settings?billing_return=attempt&tab=billing#details');
 assert.equal(cleanBillingReturn(value),'/settings?tab=billing#details');
});

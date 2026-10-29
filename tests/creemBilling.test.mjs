import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { Readable } from 'node:stream';
import { createBillingHandlers, billingConfig, verifySignature, membershipSnapshot, validateProduct, plans, trustedCreemUrl, rawRequest } from '../server/creem.mjs';

const attemptId='11111111-1111-4111-8111-111111111111';
const env={CREEM_MODE:'test',CREEM_API_KEY:'creem_test_fixture',CREEM_WEBHOOK_SECRET:'fixture-secret',CREEM_CHECKOUT_ENABLED:'true',CREEM_APP_ORIGIN:'http://127.0.0.1:3017',CREEM_PRO_MONTHLY_PRODUCT_ID:'prod_pro_month'};
const offer=plans['pro:monthly'];
const product={id:'prod_pro_month',mode:'test',status:'active',currency:'USD',price:500,billingType:'recurring',billingPeriod:'every-month',taxMode:'exclusive'};
function fixture() {
  const attempt={id:attemptId,user_id:'user-1',mode:'test',product_id:product.id,plan:'pro',billing_cycle:'monthly',is_new:true};
  const sub={id:'sub_fixture',mode:'test',product:product.id,customer:'cust_fixture',status:'active',lastTransactionId:'txn_current',currentPeriodEndDate:new Date('2030-02-01'),updatedAt:new Date('2030-01-01'),metadata:{app:'tradegrail',tradegrail_checkout_id:attemptId}};
  const checkout={id:'ch_fixture',mode:'test',requestId:attemptId,product:product.id,subscription:sub.id,status:'completed',order:{status:'paid'},checkoutUrl:'https://www.creem.io/test/payment/ch_fixture'};
  const writes=[], seen=new Set(); let membership;
  const repo={
    reserve:async()=>attempt,
    checkout:async(id,mode,userId)=>id===attempt.id && mode===attempt.mode && (!userId||userId===attempt.user_id)?attempt:null,
    attach:async(id,fields)=>{writes.push(['attach',fields]);Object.assign(attempt,fields)},
    markUnknown:async()=>{attempt.state='unknown';writes.push(['unknown'])},
    eventSeen:async id=>seen.has(id),
    sync:async args=>{writes.push(['sync',args]);seen.add(args.eventId);membership={...args.snapshot,checkout_id:attemptId}},
    membership:async()=>membership,
    forUser:async userId=>userId==='user-1'?membership:null,
  };
  const provider={products:{get:async()=>product},checkouts:{create:async args=>{writes.push(['create',args]);return checkout},retrieve:async()=>checkout},subscriptions:{get:async()=>sub},customers:{generateBillingLinks:async args=>{writes.push(['portal',args]);return{customerPortalLink:'https://www.creem.io/my-orders/login/fixture'}}}};
  const handlers=createBillingHandlers({env,repo,provider,authenticate:async token=>token==='valid'?{id:'user-1',email_confirmed_at:'2026-01-01'}:null,now:()=>Date.parse('2030-01-01')});
  const req=(body={})=>({headers:{authorization:'Bearer valid',origin:env.CREEM_APP_ORIGIN},body});
  const webhook=event=>{
    const raw=Buffer.from(JSON.stringify({id:'evt_fixture',eventType:'checkout.completed',object:{...checkout,request_id:attemptId,metadata:{app:'tradegrail',tradegrail_checkout_id:attemptId}},...event}));
    return{headers:{'creem-signature':createHmac('sha256',env.CREEM_WEBHOOK_SECRET).update(raw).digest('hex')},body:raw};
  };
  return{attempt,sub,checkout,handlers,req,webhook,writes,provider,repo};
}
test('test/prod keys and production deployments cannot be mixed; unconfigured checkout fails closed',()=>{
  assert.throws(()=>billingConfig({...env,CREEM_MODE:'prod'}));
  assert.throws(()=>billingConfig({...env,VERCEL_ENV:'production'}));
  assert.throws(()=>billingConfig({...env,CREEM_WEBHOOK_SECRET:''}));
  assert.equal(billingConfig({...env,CREEM_CHECKOUT_ENABLED:'false'}).enabled,false);
});
test('product must match server price, currency, cadence and environment; trials/metering rejected',()=>{
  validateProduct(product,offer,product.id,'test');
  for(const patch of [{currency:'EUR'},{price:1},{billingPeriod:'every-year'},{mode:'prod'},{trialPeriodDays:7},{usagePrices:[{}]},{status:'archived'}])assert.throws(()=>validateProduct({...product,...patch},offer,product.id,'test'));
});
test('raw bytes are signed and malformed or altered signatures cannot pass',async()=>{
  const raw=Buffer.from('{"x": 1}');const sig=createHmac('sha256','secret').update(raw).digest('hex');
  assert.equal(verifySignature(raw,sig,'secret'),true);
  assert.equal(verifySignature(Buffer.from('{"x":1}'),sig,'secret'),false);
  for(const s of ['',null,'a','ff'.repeat(100)]) assert.equal(verifySignature(raw,s,'secret'),false);
  await assert.rejects(rawRequest({body:{x:1}}),/raw_body_required/);
});
test('webhook raw reader never invokes Vercel lazy JSON body getter',async()=>{
  const req=Readable.from([Buffer.from('{"space":  "preserved"}')]);
  Object.defineProperty(req,'body',{get(){throw Error('must not parse body')}});
  assert.equal((await rawRequest(req)).toString(),'{"space":  "preserved"}');
});
test('checkout validates authentication and origin before creating provider checkout',async()=>{
  const f=fixture();await assert.rejects(f.handlers.checkout({headers:{},body:{}}),/authentication_required/);
  await assert.rejects(f.handlers.checkout({...f.req({plan:'pro',billingCycle:'monthly'}),headers:{authorization:'Bearer valid',origin:'https://attacker.invalid'}}),/invalid_origin/);
  await assert.rejects(f.handlers.checkout(f.req({plan:'lifetime',billingCycle:'lifetime'})),/invalid_plan/);
  assert.equal(f.writes.length,0);
});
test('client amounts, user IDs, product IDs and return URLs are ignored',async()=>{
  const f=fixture();await f.handlers.checkout(f.req({plan:'pro',billingCycle:'monthly',amount:1,userId:'victim',productId:'other',successUrl:'https://attacker.invalid'}));
  const args=f.writes.find(w=>w[0]==='create')[1];
  assert.equal(args.productId,product.id);assert.equal(args.requestId,attemptId);assert.equal(args.customer,undefined);
  assert.equal(args.successUrl,env.CREEM_APP_ORIGIN+'/?billing_return='+attemptId);
  assert.deepEqual(args.metadata,{app:'tradegrail',tradegrail_checkout_id:attemptId});assert.equal(args.customPrice,undefined);
});
test('retry reuses existing checkout and does not open a second subscription',async()=>{
  const f=fixture();const first=await f.handlers.checkout(f.req({plan:'pro',billingCycle:'monthly'}));
  const again=await f.handlers.checkout(f.req({plan:'pro',billingCycle:'monthly'}));
  assert.equal(first.checkoutUrl,again.checkoutUrl);assert.equal(f.writes.filter(w=>w[0]==='create').length,1);
});
test('ambiguous provider failure leaves checkout locked for reconciliation',async()=>{
  const f=fixture();f.provider.checkouts.create=async()=>{throw Error('timeout')};
  await assert.rejects(f.handlers.checkout(f.req({plan:'pro',billingCycle:'monthly'})));assert.equal(f.attempt.state,'unknown');
});
test('a definite provider validation rejection releases the checkout for retry',async()=>{
  const f=fixture();f.provider.checkouts.create=async()=>{throw Object.assign(Error('invalid URL'),{statusCode:400})};
  await assert.rejects(f.handlers.checkout(f.req({plan:'pro',billingCycle:'monthly'})));assert.equal(f.attempt.state,'expired');
});
test('redirect/status cannot grant access for another user or an unpaid checkout',async()=>{
  const f=fixture();f.attempt.user_id='other';await assert.rejects(f.handlers.status(f.req({attemptId})),/checkout_not_found/);
  f.attempt.user_id='user-1';f.attempt.checkout_id=f.checkout.id;f.checkout.order.status='pending';
  assert.deepEqual(await f.handlers.status(f.req({attemptId})),{state:'pending'});assert.equal(f.writes.length,0);
});
test('paid return reconciles from provider and expired checkout permits a new attempt',async()=>{
  const f=fixture();f.attempt.checkout_id=f.checkout.id;
  assert.deepEqual(await f.handlers.status(f.req({attemptId})),{state:'active',mode:'test'});
  f.checkout.status='expired';assert.deepEqual(await f.handlers.status(f.req({attemptId})),{state:'expired'});assert.equal(f.attempt.state,'expired');
});
test('verified webhook is idempotent and no state is granted on bad signature or wrong mode',async()=>{
  const f=fixture();const req=f.webhook();await f.handlers.webhook(req);await f.handlers.webhook(req);
  assert.equal(f.writes.filter(w=>w[0]==='sync').length,1);
  await assert.rejects(f.handlers.webhook({...req,headers:{'creem-signature':'00'.repeat(32)}}),/invalid_signature/);
  await assert.rejects(f.handlers.webhook(f.webhook({id:'evt_prod',object:{mode:'prod'}})),/environment_mismatch/);
});
test('out-of-order subscription event fetches latest subscription and never trusts payload status',async()=>{
  const f=fixture();await f.handlers.webhook(f.webhook({eventType:'subscription.canceled',object:{id:f.sub.id,mode:'test',status:'canceled'}}));
  assert.equal(f.writes.find(w=>w[0]==='sync')[1].snapshot.status,'active');
});
test('scheduled cancellation keeps paid period; unpaid, paused and trialing never grant access',()=>{
  const f=fixture();f.sub.status='scheduled_cancel';assert.equal(membershipSnapshot(f.sub,f.attempt,'test').access_allowed,true);
  for(const status of ['unpaid','paused','trialing'])assert.equal(membershipSnapshot({...f.sub,status},f.attempt,'test').access_allowed,false);
  assert.equal(membershipSnapshot({...f.sub,lastTransactionId:undefined},f.attempt,'test').access_allowed,false);
});
test('partial refunds retain access and full refunds/disputes block only their own transaction',async()=>{
  const f=fixture();
  const event={eventType:'refund.created',object:{id:'ref_fixture',mode:'test',status:'succeeded',subscription:f.sub.id,transaction:{id:'txn_old',amount_paid:500,refunded_amount:100}}};
  await f.handlers.webhook(f.webhook({...event,id:'evt_partial'}));assert.equal(f.writes.find(w=>w[0]==='sync')[1].block,null);
  event.object.transaction.refunded_amount=500;await f.handlers.webhook(f.webhook({...event,id:'evt_full'}));assert.equal(f.writes.filter(w=>w[0]==='sync').at(-1)[1].block,'txn_old');
});
test('billing portal uses authenticated membership mapping, never a client customer ID',async()=>{
  const f=fixture();await assert.rejects(f.handlers.portal(f.req({customerId:'victim'})),/subscription_not_found/);
  await f.handlers.webhook(f.webhook());await f.handlers.portal(f.req({customerId:'victim'}));
  assert.deepEqual(f.writes.find(w=>w[0]==='portal')[1],{customerId:'cust_fixture'});
});
test('provider redirects cannot escape allowlisted HTTPS hosts',()=>{
  for(const url of ['http://creem.io/pay','https://creem.io.attacker.invalid','https://user:pass@creem.io/pay','javascript:alert(1)'])assert.throws(()=>trustedCreemUrl(url));
});

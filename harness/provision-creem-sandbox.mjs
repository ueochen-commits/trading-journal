import { readFile, writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { Creem } from 'creem';
import { PRICE_VERSION } from '../shared/billing-market.mjs';
import { plans, validateProduct } from '../server/creem.mjs';

// Explicitly sandbox-only. Secrets stay in an ignored, mode-0600 file.
const file=new URL('../.env.creem.test.local',import.meta.url);
const env=parseEnv(await readFile(file,'utf8'));
if(env.CREEM_MODE!=='test'||!env.CREEM_API_KEY?.startsWith('creem_test_'))throw Error('Sandbox credentials required');
const api=new Creem({apiKey:env.CREEM_API_KEY,server:'test',timeoutMs:15000,retryConfig:{strategy:'none'}});
const write=process.argv.includes('--write');
try {
  const page=await api.products.search(1,100);
  const existing=page.result.items;
  for(const offer of Object.values(plans)){
    const name=`TradeGrail ${offer.plan==='pro'?'Pro':'Elite'} ${offer.cycle==='monthly'?'Monthly':'Yearly'} ${PRICE_VERSION}`;
    let product=existing.find(p=>p.name===name&&p.price===offer.cents&&p.billingPeriod===offer.period);
    // New prices create new versioned sandbox SKUs; existing products and subscriptions are untouched.
    if(!product&&write)product=await api.products.create({name,description:`TradeGrail ${offer.plan} trading journal software subscription. ${offer.cycle} billing. AI allowance: ${offer.plan==='pro'?300:600} per UTC calendar month, up to ${offer.plan==='pro'?30:60} per day, no rollover. No trade execution or investment signals.`,price:offer.cents,currency:'USD',billingType:'recurring',billingPeriod:offer.period,taxMode:'exclusive',taxCategory:'saas',abandonedCartRecoveryEnabled:false},`tradegrail-test-${offer.plan}-${offer.cycle}-${PRICE_VERSION}`);
    if(!product){console.log(name,'missing');continue;}
    validateProduct(product,offer,product.id,'test');env[offer.env]=product.id;
    console.log(name,product.price,product.currency,'verified');
  }
  if(write){
    const hooks=await api.webhooks.list(1,100);
    let hook=hooks.result.items.find(h=>h.name==='TradeGrail local sandbox verification'&&h.deliveryMode==='cli');
    if(!hook)hook=await api.webhooks.create({name:'TradeGrail local sandbox verification',deliveryMode:'cli',events:[]});
    if(hook.mode!=='test')throw Error('Webhook environment mismatch');
    const secret=hook.secret||(await api.webhooks.getSecret(hook.id)).secret;
    env.CREEM_WEBHOOK_ID=hook.id;env.CREEM_WEBHOOK_SECRET=secret;
    await writeFile(file,Object.entries(env).map(([k,v])=>`${k}=${JSON.stringify(v)}`).join('\n')+'\n',{mode:0o600});
    console.log('Sandbox products and local webhook configured; secrets saved privately.');
  }
}catch(error){console.error('Sandbox setup failed:',error?.statusCode||error?.constructor?.name||'unknown');process.exitCode=1;}

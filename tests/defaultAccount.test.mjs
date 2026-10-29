import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../services/userDataService.ts', import.meta.url), 'utf8');
let moduleId = 0;
async function loadService(supabase) {
  globalThis.__accountTestFixture = { supabase, MOCK_TRADES: [{symbol:'QA',entryDate:'2026-10-01',pnl:10,mistakes:[]}], normalizeTagCategories: value => value };
  const input = `const {supabase, MOCK_TRADES, normalizeTagCategories} = globalThis.__accountTestFixture;\n` + source.replace(/^import .*;\n/gm, '');
  const { outputText } = ts.transpileModule(input, {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
  return (await import(`data:text/javascript;base64,${Buffer.from(outputText + `\n// fixture ${moduleId++}`).toString('base64')}`)).userDataService;
}
const account = { id:'demo-qa',name:'My renamed demo',account_type:'demo',currency:'USD',balance:10000 };
const auth = {getUser:async()=>({data:{user:{id:'user-qa'}}})};

test('concurrent initialization shares one RPC and seeds demo trades once',async()=>{
  let calls=0,seeds=0;
  const service=await loadService({auth,rpc:async()=>{calls++;await new Promise(resolve=>setTimeout(resolve,10));return {data:{account,is_new:true},error:null};},from:name=>{assert.equal(name,'trading_journals');return {insert:async()=>{seeds++;return {error:null};}};}});
  const results=await Promise.all(Array.from({length:6},()=>service.ensureDefaultAccount()));
  assert.equal(calls,1);assert.equal(seeds,1);assert.ok(results.every(r=>r.account.id==='demo-qa'));
});
test('renamed demo is returned without a name lookup or new sample trades',async()=>{
  const service=await loadService({auth,rpc:async name=>{assert.equal(name,'ensure_default_trading_account');return {data:{account,is_new:false},error:null};},from:()=>assert.fail('Existing demo must not be inserted or seeded')});
  const result=await service.ensureDefaultAccount();assert.equal(result.account.name,'My renamed demo');assert.equal(result.isNew,false);
});
test('failed RPC is not cached and a later attempt can recover',async()=>{
  let calls=0;
  const service=await loadService({auth,rpc:async()=>++calls===1?{error:new Error('temporary failure')}:{data:{account,is_new:false},error:null}});
  await assert.rejects(service.ensureDefaultAccount(),/temporary failure/);
  assert.equal((await service.ensureDefaultAccount()).account.id,'demo-qa');assert.equal(calls,2);
});
test('signed-out initialization creates no account',async()=>{
  const service=await loadService({auth:{getUser:async()=>({data:{user:null}})},rpc:()=>assert.fail('No RPC expected')});
  assert.equal(await service.ensureDefaultAccount(),null);
});

test('account read failure is visible rather than an empty list',async()=>{
 const service=await loadService({auth,from:()=>({select(){return this},eq(){return this},order:async()=>({data:null,error:{message:'network down'}})})});
 await assert.rejects(service.loadTradingAccounts(),/network down/);
});
test('one failed table read rejects the complete user load, not empty first-user state',async()=>{
 const service=await loadService({auth,from:name=>{const q={select(){return q},eq(){return q},order(){return q},maybeSingle(){return q},then(resolve,reject){return Promise.resolve(name==='trading_accounts'?{error:{message:'accounts unavailable'}}:{data:[],error:null}).then(resolve,reject)}};return q;}});
 await assert.rejects(service.loadUserData(),/accounts unavailable/);
});
test('default account save checks ownership and preserves settings and risk settings',async()=>{
 let payload;
 const service=await loadService({auth,from:name=>{const q={select(){return q},eq(){return q},upsert(value){payload=value;return q},single:async()=>({data:name==='trading_accounts'?{id:'own'}:{user_id:'user-qa'},error:null}),maybeSingle:async()=>({data:{settings:{weeklyGoal:{value:3}},risk_settings:{maxDailyLoss:500}},error:null})};return q;}});
 await service.saveDefaultTradingAccount('own');
 assert.deepEqual(payload.settings,{weeklyGoal:{value:3},defaultTradingAccountId:'own'});assert.deepEqual(payload.risk_settings,{maxDailyLoss:500});assert.equal(payload.user_id,'user-qa');
});

test('writes started by a previous identity cannot save into the newly signed-in user',async()=>{
 const service=await loadService({auth,from:()=>assert.fail('A stale identity must never reach persistence')});
 await assert.rejects(service.saveTradingAccount({name:'stale'},'previous-user'),/登录用户已变化/);
 await assert.rejects(service.saveExchangeConnection({exchange:'Binance',apiKey:'qa',apiSecret:'qa'},'previous-user'),/登录用户已变化/);
 await assert.rejects(service.importTradesWithAccount([],'previous-account','previous-user'),/登录用户已变化/);
 await assert.rejects(service.savePlan({id:'stale'},'previous-user'),/登录用户已变化/);
 await assert.rejects(service.saveFeeTemplates([],'previous-user'),/登录用户已变化/);
});

test('full account bootstrap and connection refresh both work with metadata-only exchange privileges',async()=>{
 const calls=[];
 const connection={id:'legacy-connection',user_id:'user-qa',exchange:'binance',label:'Legacy account',is_active:true};
 const service=await loadService({auth,from:table=>{
  let denied=false,single=false;
  const builder={select(fields){calls.push({table,fields});denied=table==='exchange_connections'&&(fields==='*'||/api_key|api_secret/.test(fields));return this;},eq(){return this;},order(){return this;},maybeSingle(){single=true;return this;},then(ok,fail){return Promise.resolve({data:single?null:table==='exchange_connections'?[connection]:[],error:denied?{message:'permission denied'}:null}).then(ok,fail);}};
  return builder;
 }});
 const loaded=await service.loadUserData();assert.equal(loaded.exchangeConnections.length,1);assert.equal(loaded.exchangeConnections[0].apiKey,'');assert.equal(loaded.exchangeConnections[0].apiSecret,'');assert.equal(loaded.exchangeConnections[0].isConnected,false);
 const refreshed=await service.loadExchangeConnections();assert.equal(refreshed[0].label,'Legacy account');assert.equal(calls.filter(c=>c.table==='exchange_connections').length,2);
});

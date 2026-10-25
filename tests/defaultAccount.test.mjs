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

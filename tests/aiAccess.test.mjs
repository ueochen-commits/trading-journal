import test from 'node:test';
import assert from 'node:assert/strict';
import { checkAiAccess } from '../server/ai-access.mjs';
test('AI cannot consume a paid quota without a verified session or by spoofing userId',async()=>{
  const calls=[];const client={auth:{getUser:async token=>token==='valid'?{data:{user:{id:'actual',email_confirmed_at:'2026-01-01'}}}:{error:Error('invalid')}},rpc:async(name,args)=>{calls.push([name,args]);return{data:{allowed:true}}}};
  assert.equal((await checkAiAccess({headers:{},body:{userId:'victim'}},client)).status,401);
  assert.equal((await checkAiAccess({headers:{authorization:'Bearer invalid'}},client)).status,401);assert.equal(calls.length,0);
  assert.equal(await checkAiAccess({headers:{authorization:'Bearer valid'},body:{userId:'victim'}},client),null);
  assert.deepEqual(calls,[['consume_ai_quota',{p_user_id:'actual'}]]);
});
test('quota denial and database errors fail closed before any AI call',async()=>{
  const req={headers:{authorization:'Bearer valid'}};const client={auth:{getUser:async()=>({data:{user:{id:'actual',email_confirmed_at:'2026-01-01'}}})},rpc:async()=>({data:{allowed:false}})};
  assert.equal((await checkAiAccess(req,client)).status,429);
  client.rpc=async()=>({error:Error('offline')});assert.equal((await checkAiAccess(req,client)).status,503);
});

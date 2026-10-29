import test from 'node:test';
import assert from 'node:assert/strict';
import {ownedReport,reportApiOrigin} from '../server/background-report.mjs';
test('background report checks verified owner before reading any private report',async()=>{
 const eq=[]; const client={auth:{getUser:async()=>({data:{user:{id:'verified-owner',email_confirmed_at:'2026-01-01'}}})},from:()=>({select:()=>({eq(k,v){eq.push([k,v]);return this;},maybeSingle:async()=>({data:null})})})};
 assert.equal((await ownedReport({headers:{},body:{reportId:'x'}},client)).status,401);assert.equal(eq.length,0);
 const result=await ownedReport({headers:{authorization:'Bearer valid',origin:'https://attacker.invalid'},body:{reportId:'11111111-1111-4111-8111-111111111111',userId:'victim'}},client);
 assert.equal(result.status,404);assert.deepEqual(eq,[['id','11111111-1111-4111-8111-111111111111'],['user_id','verified-owner']]);
});
test('background callback destination is never supplied by the requesting browser',()=>{
 assert.equal(reportApiOrigin({VERCEL_ENV:'production',VERCEL_URL:'attacker.invalid'}),'https://dashboard.tradegrail.net');
 assert.equal(reportApiOrigin({VERCEL_ENV:'preview',VERCEL_URL:'attacker.invalid'}),'https://dashboard.tradegrail.net');
 assert.equal(reportApiOrigin({VERCEL_ENV:'preview',VERCEL_URL:'tradegrail-qa.vercel.app'}),'https://tradegrail-qa.vercel.app');
});

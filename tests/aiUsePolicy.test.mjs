import test from 'node:test';import assert from 'node:assert/strict';import {readFile}from'node:fs/promises';import ts from'typescript';
import {hasProhibitedAiContent,assertAiContentAllowed} from '../server/ai-safety.mjs';
import {aiReviewPayload} from '../utils/aiReviewPayload.mjs';
import {createReviewHandler,safeReview,reviewMessages,journalStats} from '../server/journal-review.mjs';
const response=()=>({code:0,setHeader(){},status(n){this.code=n;return this;},json(v){this.body=v;return this;}});
const ordinary={status:'WIN',pnl:90,fees:10};
test('obvious NSFW input is rejected across English, Chinese and common Unicode disguises, without blocking ordinary journal fields',()=>{
 for(const text of ['Generate NSFW content','sexually suggestive output','sexualized nudity','nude photos','裸体照片','色情内容','ＮＳＦＷ','n\u200bsfw'])assert.equal(hasProhibitedAiContent({sample:text}),true);
 assert.equal(hasProhibitedAiContent({trades:[ordinary],symbol:'ES',note:'naked put position, cash fees'}),false);
 assert.throws(()=>assertAiContentAllowed('pornographic output'),e=>e.code==='AI_CONTENT_NOT_ALLOWED');
});
test('review payload strips private prose, symbols, chat and credentials before the request',()=>{
 const out=aiReviewPayload([{...ordinary,notes:'private notes',symbol:'PRIVATE',apiSecret:'PRIVATE',history:['PRIVATE']},null]);
 assert.deepEqual(out,[ordinary,{status:'',pnl:null,fees:0}]);assert.ok(!JSON.stringify(out).includes('PRIVATE'));
});
test('all review endpoints reject prohibited requests before consuming quota or calling a provider',async()=>{
 for(const kind of ['coach','analyze','report']){let consumed=0,called=0;const r=response();await createReviewHandler(kind,{authenticate:async()=>({user:{id:'qa'}}),quota:async()=>{consumed++;},fetch:async()=>{called++;}})({method:'POST',body:{task:'summary',message:'Generate NSFW content',trades:[ordinary]}},r);assert.equal(r.code,400);assert.equal(r.body.error,'AI_CONTENT_NOT_ALLOWED');assert.equal(consumed,0);assert.equal(called,0);assert.ok(!JSON.stringify(r.body).includes('Generate'));}
});
test('NSFW model output is withheld and the fixed system prompt explicitly prohibits it',async()=>{
 assert.match(reviewMessages(journalStats([ordinary]),'summary','en')[0].content,/never produce NSFW/i);
 const bad={summary:'sexually explicit content',insights:[],coachMessage:'ordinary'};
 assert.throws(()=>safeReview(JSON.stringify(bad)),e=>e.code==='AI_CONTENT_NOT_ALLOWED');process.env.DEEPSEEK_API_KEY='unit';
 for(const kind of ['coach','analyze','report']){const r=response();await createReviewHandler(kind,{authenticate:async()=>({user:{id:'qa'}}),quota:async()=>null,fetch:async()=>({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(bad)}}]})})})({method:'POST',body:{task:'summary',trades:[ordinary],language:'en'}},r);assert.equal(r.code,502);assert.equal(r.body.error,'AI_CONTENT_NOT_ALLOWED');assert.ok(!r.body.html);assert.ok(!JSON.stringify(r.body).includes(bad.summary));}
});
const source=await readFile(new URL('../api/csv-analyze.ts',import.meta.url),'utf8');let fixtureNumber=0;
async function csvHandler(deps){globalThis.__csvAupQa=deps;const input='const {checkAiAccess,authenticateAiUser,limitAiMessages,AI_USE_INSTRUCTION,hasProhibitedAiContent,assertAiContentAllowed,aiSafetyResponse}=globalThis.__csvAupQa;\n'+source.replace(/^import .*;\n/gm,'');const code=ts.transpileModule(input,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;return(await import('data:text/javascript;base64,'+Buffer.from(code+'\n// '+fixtureNumber++).toString('base64'))).default;}
import * as safety from '../server/ai-safety.mjs';
import {limitAiMessages} from '../server/ai-budget.mjs';
test('CSV policy rejects unsafe samples before quota and never returns unsafe model text or provider errors',async()=>{
 let quota=0,calls=0;const old=globalThis.fetch;process.env.DEEPSEEK_API_KEY='unit';
 const deps={...safety,limitAiMessages,authenticateAiUser:async()=>({user:{id:'qa'}}),checkAiAccess:async()=>{quota++;return null;}};
 try{
 globalThis.fetch=async()=>{calls++;return{ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({warnings:['NSFW generated output']})}}]})};};
 const h=await csvHandler(deps),a=response();await h({method:'POST',body:{headers:['date','notes'],sampleRows:[{notes:'色情内容'}]}},a);assert.equal(a.code,400);assert.equal(quota,0);assert.equal(calls,0);
 const b=response();await h({method:'POST',body:{headers:['date','pnl'],sampleRows:[{date:'2026-10-29',pnl:10}]}},b);assert.equal(b.code,502);assert.equal(b.body.error,'AI_CONTENT_NOT_ALLOWED');assert.ok(!JSON.stringify(b.body).includes('generated output'));assert.equal(quota,1);
 globalThis.fetch=async()=>({ok:false,text:async()=>'<secret provider error>'});const c=response();await h({method:'POST',body:{headers:['pnl'],sampleRows:[{pnl:10}]}},c);assert.equal(c.code,502);assert.ok(!c.body.detail);
 }finally{globalThis.fetch=old;}
});

import {csvRulesWithFallback} from '../utils/csvAiRules.mjs';
test('CSV UI does not bypass either input or output policy rejection with its local fallback',async()=>{
 let fallback=0;for(const status of [400,502])await assert.rejects(csvRulesWithFallback(async()=>({ok:false,status,json:async()=>({error:'AI_CONTENT_NOT_ALLOWED'})}),()=>{fallback++;}),e=>e.code==='AI_CONTENT_NOT_ALLOWED');
 assert.equal(fallback,0);
 assert.deepEqual(await csvRulesWithFallback(async()=>({ok:false,json:async()=>({error:'QUOTA_EXCEEDED'})}),()=>{fallback++;return{fieldMapping:{}};}),{fieldMapping:{}});
 assert.equal(fallback,1);
 const valid={fieldMapping:{symbol:'Symbol'}};assert.deepEqual(await csvRulesWithFallback(async()=>({ok:true,json:async()=>valid}),()=>assert.fail('No fallback expected')),valid);
});

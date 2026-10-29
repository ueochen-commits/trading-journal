import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../utils/noteAutosave.ts',import.meta.url),'utf8');
const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {createNoteAutosave}=await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
test('typing updates the local draft immediately but coalesces network writes',async()=>{
 const saved=[];const q=createNoteAutosave(d=>saved.push(d),()=>{},15);
 for(const content of ['a','ab','abc','中文'])q.stage({id:'a',content});
 assert.equal(saved.length,0);assert.equal(q.drafts()[0].content,'中文');
 await pause(30);assert.deepEqual(saved,[{id:'a',content:'中文'}]);assert.equal(q.status('a'),'saved');
});
test('slow saves never acknowledge or replace a newer draft and writes remain ordered',async()=>{
 const first=deferred(),second=deferred(),saved=[];const q=createNoteAutosave(async d=>{saved.push(d);await (saved.length===1?first.promise:second.promise);},()=>{},60000);
 q.stage({id:'a',content:'old'});const flush=q.flush('a');q.stage({id:'a',content:'new',title:'最新标题'});
 assert.equal(saved.length,1);first.resolve();await pause(0);
 assert.equal(q.drafts()[0].content,'new');assert.equal(q.status('a'),'saving');assert.equal(saved.length,2);
 second.resolve();await flush;assert.equal(q.status('a'),'saved');assert.equal(saved.at(-1).title,'最新标题');
 await q.flushAll();assert.equal(saved.length,2);
});
test('failed saves retain the latest text and metadata until retry succeeds',async()=>{
 let fail=true;const saved=[];const q=createNoteAutosave(d=>{if(fail)throw Error('offline');saved.push(d);},()=>{},60000);
 q.stage({id:'a',content:'保留输入',title:'标题'});await q.flush('a');
 assert.equal(q.status('a'),'error');assert.equal(q.drafts()[0].content,'保留输入');
 fail=false;await q.flush('a');assert.equal(q.status('a'),'saved');assert.equal(saved[0].title,'标题');
});
test('switching documents flushes each draft to its own ID',async()=>{
 const saved=[];const q=createNoteAutosave(d=>saved.push(d),()=>{},60000);
 q.stage({id:'a',content:'A'});q.stage({id:'b',content:'B'});await q.flushAll();
 assert.deepEqual(saved.map(d=>[d.id,d.content]),[['a','A'],['b','B']]);assert.equal(q.drafts().length,0);
});
test('unchanged blur/save notifications do not issue duplicate writes',async()=>{
 let calls=0;const q=createNoteAutosave(()=>{calls++},()=>{},60000);
 const draft={id:'a',content:'<p>same</p>'};q.stage(draft);await q.flush('a');q.stage({...draft});await q.flush('a');assert.equal(calls,1);
});

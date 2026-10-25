import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../utils/tradeScreenshots.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
const {readTradeScreenshots, validateScreenshotCount, persistTradeScreenshots} = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
test('free accounts can attach two screenshots; third rejected, paid unaffected',()=>{
  assert.doesNotThrow(()=>validateScreenshotCount('free',2));
  assert.throws(()=>validateScreenshotCount('free',3),/2/);
  assert.doesNotThrow(()=>validateScreenshotCount('pro',3));
  assert.doesNotThrow(()=>validateScreenshotCount('elite',8));
});
test('legacy screenshot survives, gallery reads both, explicit removal stays removed',()=>{
  assert.deepEqual(readTradeScreenshots({screenshot_url:'old.jpg'}),['old.jpg']);
  assert.deepEqual(readTradeScreenshots({screenshot_urls:['one.jpg','two.jpg'],screenshot_url:'one.jpg'}),['one.jpg','two.jpg']);
  assert.deepEqual(readTradeScreenshots({screenshot_urls:[],screenshot_url:'old.jpg'}),[]);
});
test('uploads every new screenshot once, and retains previously stored URLs',async()=>{
  const calls=[];
  const urls=await persistTradeScreenshots(['data:image/jpeg;base64,one','data:image/jpeg;base64,two'],async image=>{calls.push(image);return `https://images/${calls.length}.jpg`;});
  assert.equal(calls.length,2);
  assert.deepEqual(readTradeScreenshots({screenshot_urls:urls,screenshot_url:urls[0]}),['https://images/1.jpg','https://images/2.jpg']);
  await persistTradeScreenshots(urls,async()=>{throw Error('Already uploaded');});
});
test('upload failure rejects the entire save instead of silently losing an attachment',async()=>{
  let calls=0;
  await assert.rejects(persistTradeScreenshots(['data:one','data:two'],async()=>++calls===1?'one.jpg':null),/upload failed/);
});

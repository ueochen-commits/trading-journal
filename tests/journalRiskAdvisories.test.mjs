import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const options={module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022};
const asModule=source=>`data:text/javascript;base64,${Buffer.from(ts.transpileModule(source,{compilerOptions:options}).outputText).toString('base64')}`;
const typesUrl=asModule(await readFile(new URL('../types.ts',import.meta.url),'utf8'));
const {TradeStatus}=await import(typesUrl);
const source=(await readFile(new URL('../utils/journalRiskAdvisories.ts',import.meta.url),'utf8')).replace("from '../types';",`from '${typesUrl}';`);
const {getJournalRiskAdvisories,exceedsTradeRiskReference,countNonDemoJournalTrades}=await import(asModule(source));
const now=new Date('2026-10-25T08:00:00Z');
const accounts=[{id:'demo',type:'demo'},{id:'real',type:'manual'},{id:'empty',type:'manual'}];
const settings={maxDailyLoss:500,maxTradeRisk:100,maxConsecutiveLosses:3};
const loss=(id,accountId='real',exitDate=`2026-10-25T07:${id}0:00Z`)=>({id:String(id),accountId,entryDate:'2026-10-24T01:00:00Z',exitDate,pnl:-200,status:TradeStatus.LOSS});
const advise=(trades,account='all',config=settings,timezone='Asia/Shanghai')=>getJournalRiskAdvisories(trades,config,accounts,account,now,timezone);
test('a new user with three seeded demo losses has no real-account warning',()=>{
  const demos=[loss(1,'demo'),loss(2,'demo'),loss(3,'demo')];
  assert.deepEqual(advise(demos),[]);
  assert.deepEqual(advise(demos,'empty'),[]);
  assert.deepEqual(advise(demos,'demo'),[]);
});
test('real loss streak and daily drawdown are advice scoped to the chosen account',()=>{
  const trades=[loss(1),loss(2),loss(3)];
  assert.deepEqual(advise(trades,'real').map(a=>a.kind),['daily_loss','consecutive_loss']);
  assert.deepEqual(advise(trades,'empty'),[]);
});
test('backfilled historical losses never produce a current-day warning',()=>{
  assert.deepEqual(advise([loss(1,'real','2025-10-01T01:00:00Z'),loss(2,'real','2025-10-02T01:00:00Z'),loss(3,'real','2025-10-03T01:00:00Z')]),[]);
});
test('closed time and configured timezone determine the day, not entry date',()=>{
  const trade=loss(1,'real','2026-10-24T17:00:00Z');
  const config={...settings,maxDailyLoss:100};
  assert.equal(advise([trade],'real',config).length,1);
  assert.deepEqual(advise([trade],'real',config,'UTC'),[]);
});
test('open, future, malformed and unknown-account records do not become loss warnings',()=>{
  assert.deepEqual(advise([{...loss(1),status:TradeStatus.OPEN},loss(2,'unknown'),loss(3,'real','2026-10-26T01:00:00Z'),loss(4,'real','invalid')]),[]);
});
test('a closed breakeven breaks the loss streak; zero/disabled limits do not warn',()=>{
  const trades=[loss(1),loss(2),loss(3),{...loss(4),pnl:0,status:TradeStatus.BE}];
  assert.deepEqual(advise(trades).map(a=>a.kind),['daily_loss']);
  assert.deepEqual(advise(trades,'all',{maxDailyLoss:0,maxConsecutiveLosses:0}),[]);
  assert.deepEqual(getJournalRiskAdvisories(trades,undefined,accounts),[]);
});
test('risk amounts exceeding 100 produce only an informational signal',()=>{
  assert.equal(exceedsTradeRiskReference(150,settings),true);
  assert.equal(exceedsTradeRiskReference(100,settings),false);
  assert.equal(exceedsTradeRiskReference(150,{maxTradeRisk:0}),false);
});

test('demo samples do not consume a new user real-journal allowance',()=>{
  const demos=Array.from({length:180},(_,id)=>loss(id,'demo'));
  assert.equal(countNonDemoJournalTrades(demos,accounts),0);
  assert.equal(countNonDemoJournalTrades([...demos,loss(1),{...loss(2),accountId:undefined}],accounts),2);
});
test('real and legacy rows still consume the normal allowance',()=>{
  assert.equal(countNonDemoJournalTrades(Array.from({length:100},(_,id)=>loss(id)),accounts),100);
});

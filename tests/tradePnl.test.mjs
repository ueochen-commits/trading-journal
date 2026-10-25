import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const compile=source=>`data:text/javascript;base64,${Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64')}`;
const pnlUrl=compile(await readFile(new URL('../utils/tradePnl.ts',import.meta.url),'utf8'));
const {tradePnlBreakdown,displayTradePnl,inferPnlInputMode}=await import(pnlUrl);
const typesUrl=compile(await readFile(new URL('../types.ts',import.meta.url),'utf8'));
const {TradeStatus}=await import(typesUrl);
const csvSource=await readFile(new URL('../components/CsvImportPage.tsx',import.meta.url),'utf8');
const parser=csvSource.slice(csvSource.indexOf('function parseDate('),csvSource.indexOf('// ─── Main Component'));
const {convertRows,normalizeImportPnl}=await import(compile(`import {Direction,TradeStatus} from '${typesUrl}';import {tradePnlBreakdown} from '${pnlUrl}';\n${parser}\nexport {convertRows,normalizeImportPnl};`));
const rules={recordType:'paired_trades',fieldMapping:{openTime:'date',closeTime:'close',symbol:'symbol',side:'side',quantity:'qty',openPrice:'entry',closePrice:'exit',netPnl:'pnl',grossPnl:null,commission:'fees'},sideValues:{long:['buy'],short:['sell']}};
const row={date:'2026-10-25 09:00:00',close:'2026-10-25 09:10:00',symbol:'GC',side:'buy',qty:'1',entry:'4050',exit:'4055',pnl:'500',fees:'4'};
test('gross 500 less 4 becomes one canonical net 496 everywhere',()=>{
 const r=tradePnlBreakdown(500,4,'gross');assert.deepEqual(r,{net:496,fees:4,gross:500});
 assert.equal(displayTradePnl({pnl:r.net,fees:4}),496);assert.equal(displayTradePnl({pnl:r.net,fees:4},'gross'),500);
});
test('already-net 500 is never charged another 4, including edits and old rows',()=>{
 const old={pnl:500,fees:4};assert.deepEqual(tradePnlBreakdown(500,4,'net'),{net:500,fees:4,gross:504});assert.equal(displayTradePnl(old),500);assert.deepEqual(old,{pnl:500,fees:4});
});
test('losses, breakeven, decimals and fee-induced losses reconcile',()=>{
 for(const [amount,fees,net] of [[-500,4,-504],[4,4,0],[2,4,-2],[0.3,0.1,0.2]])assert.equal(tradePnlBreakdown(amount,fees,'gross').net,net);
 for(const value of [NaN,Infinity])assert.throws(()=>tradePnlBreakdown(value,4));
 assert.throws(()=>tradePnlBreakdown(4,-1));assert.throws(()=>tradePnlBreakdown(4,Infinity));
 assert.equal(displayTradePnl({pnl:100,fees:-2},'gross'),98);
});
test('generic P&L and realized P&L require a human basis choice',()=>{
 for(const name of ['PnL','Realized PnL','Profit','仓位盈亏','盈亏'])assert.equal(inferPnlInputMode(name),null);
 for(const name of ['Net P&L','net_pnl','净盈亏'])assert.equal(inferPnlInputMode(name),'net');
 assert.equal(inferPnlInputMode('Gross P&L'),'gross');
});
test('CSV preview and final records normalize once from immutable source rows',()=>{
 const source=convertRows([row],rules);const gross=normalizeImportPnl(source,'gross'),net=normalizeImportPnl(source,'net');
 assert.equal(gross[0].pnl,496);assert.equal(net[0].pnl,500);assert.equal(source[0].pnl,500);
 assert.equal(normalizeImportPnl(source,'gross')[0].pnl,496);
});
test('CSV fee-induced loss is classified from net P&L',()=>{
 const result=normalizeImportPnl(convertRows([{...row,pnl:'2'}],rules),'gross')[0];assert.equal(result.pnl,-2);assert.equal(result.status,TradeStatus.LOSS);
});
test('raw paired orders include opening and closing fees',()=>{
 const rawRules={...rules,recordType:'raw_orders',fieldMapping:{...rules.fieldMapping,netPnl:null}};
 const source=convertRows([{...row,symbol:'BTCUSDT',entry:'100',fees:'2'}, {...row,date:'2026-10-25 09:10:00',symbol:'BTCUSDT',side:'sell',entry:'110',fees:'3'}],rawRules);
 assert.equal(source[0].fees,5);assert.equal(normalizeImportPnl(source,'gross')[0].pnl,5);
});
test('raw futures do not silently use a unit multiplier of one',()=>{
 const rawRules={...rules,recordType:'raw_orders',fieldMapping:{...rules.fieldMapping,netPnl:null}};
 assert.throws(()=>convertRows([row,{...row,side:'sell',entry:'4055'}],rawRules),/期货/);
});
test('all downstream statistics consume saved net P&L without subtracting fees twice',async()=>{
 const files=['Reports','CalendarView','PlaybookPage','TradingPlans','ReviewSession','GoalsPage','TradeShareModal','TradeGrailDailyCard','MentorWidget','dashboard/SymbolMatrixCard','dashboard/TimeHeatmapCard','dashboard/DrawdownCard','dashboard/RMultipleCard'];
 for(const file of files){const source=await readFile(new URL(`../components/${file}.tsx`,import.meta.url),'utf8');assert.doesNotMatch(source,/\b(\w+)\.pnl\s*-\s*\1\.fees\b/,file);}
});

test('new Binance imports convert separate realized P&L and commissions once',async()=>{
 const source=(await readFile(new URL('../services/exchangeService.ts',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
 const {mapBinanceTrade}=await import(compile(`import {Direction,TradeStatus} from '${typesUrl}';import {tradePnlBreakdown} from '${pnlUrl}';\n${source}\nexport {mapBinanceTrade};`));
 const trade=mapBinanceTrade({pnl:500,fees:4,entryTime:Date.now(),exitTime:Date.now(),direction:'LONG',quantity:1});
 assert.equal(trade.pnl,496);assert.equal(trade.fees,4);assert.equal(trade.status,TradeStatus.WIN);
});

test('saved fee-induced loss and breakeven stay closed without an exit price',async()=>{
 const source=await readFile(new URL('../App.tsx',import.meta.url),'utf8');
 const formatter=source.slice(source.indexOf('const formatTradeFromDB ='),source.indexOf('// Wrapper to use context'));
 const {formatTradeFromDB}=await import(compile(`import {Direction,TradeStatus} from '${typesUrl}';const readTradeScreenshots=()=>[];\n${formatter}\nexport {formatTradeFromDB};`));
 const base={id:'qa',date:'2026-10-25T09:00:00Z',exit_date:'2026-10-25T09:10:00Z',symbol:'GC',pnl:-2,fees:4,exit_price:0};
 assert.equal(formatTradeFromDB(base).status,TradeStatus.LOSS);
 assert.equal(formatTradeFromDB({...base,pnl:0}).status,TradeStatus.BE);
 assert.equal(formatTradeFromDB({...base,exit_date:null,pnl:-4}).status,TradeStatus.OPEN);
});

test('raw partial fills are surfaced instead of allocating an entire opening fee to a partial close',()=>{
 const rawRules={...rules,recordType:'raw_orders',fieldMapping:{...rules.fieldMapping,netPnl:null}};
 assert.throws(()=>convertRows([{...row,symbol:'BTCUSDT',qty:'2'}, {...row,symbol:'BTCUSDT',side:'sell',qty:'1'}],rawRules),/分批/);
});

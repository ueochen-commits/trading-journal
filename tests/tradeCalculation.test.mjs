import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../utils/tradeCalculation.ts',import.meta.url),'utf8');
const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {tradeNotional,tradePnlPercent,futuresSpec,futuresGrossPnl,validateFeeTemplates,matchingFeeTemplate,estimateTradeFee}=await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
const own={id:'own',type:'manual',currency:'USD'}, other={id:'other',type:'manual',currency:'USD'}, demo={id:'demo',type:'demo',currency:'USD'};
const template={accountId:'own',symbol:'GC',currency:'USD',basis:'contract_side',rate:2.22};
test('GC, NQ and ES calculate long/short P&L using standard contract multipliers',()=>{
 for(const [symbol,entryPrice,exitPrice,quantity,direction,gross] of [['GC',4050,4055,1,'long',500],['GC',4055,4050,2,'做空',1000],['NQ',20000,20000.25,3,'做多',15],['ES',6000,6000.25,2,'long',25],['ES',6000,5999,1,'long',-50],['GC',4000.1,4000.3,1,'long',20],['GC',4050,4050,1,'short',0]]) {
  assert.equal(futuresGrossPnl({symbol,entryPrice,exitPrice,quantity,direction}).gross,gross);
 }
});
test('weighted-average prices are supported but unmatched/fractional contracts are not silently invented',()=>{
 assert.equal(futuresGrossPnl({symbol:'ES',entryPrice:6000.125,exitPrice:6001,quantity:2,direction:'short'}).gross,-87.5);
 for(const change of [{quantity:0.5},{quantity:0},{exitPrice:0},{entryPrice:NaN},{symbol:'MNQ'},{direction:'unknown'},{entryPrice:1,exitPrice:1e308}])assert.throws(()=>futuresGrossPnl({symbol:'GC',entryPrice:4050,exitPrice:4055,quantity:1,direction:'long',...change}));
});
test('contract recognition respects micro symbols and explicit venues',()=>{
 for(const symbol of ['GC','/GC','GCZ6','COMEX:GCZ2026','GC1!'])assert.equal(futuresSpec(symbol)?.symbol,'GC');
 for(const symbol of ['MNQ','MES','MGC','GCUSDT','XAUUSD','BINANCE:GC1!','COMEX:NQ1!'])assert.equal(futuresSpec(symbol),null);
 assert.equal(futuresSpec('CME_MINI:NQ1!')?.multiplier,20);
});
test('fee templates distinguish per-side, round-trip and total without double charging',()=>{
 assert.equal(estimateTradeFee(template,1,true),4.44);
 assert.equal(estimateTradeFee(template,3,true),13.32);
 assert.equal(estimateTradeFee({...template,basis:'contract_roundtrip',rate:4.44},3,true),13.32);
 assert.equal(estimateTradeFee({...template,basis:'trade_total',rate:4.44},3,true),4.44);
 assert.equal(estimateTradeFee(template,1,false),null);
 assert.equal(estimateTradeFee(template,-1,true),null);
 assert.equal(estimateTradeFee({...template,rate:0},1,true),0);
});
test('template matching scopes by account, root symbol and currency',()=>{
 assert.equal(matchingFeeTemplate([template],own,'COMEX:GCZ2026'),template);
 for(const [account,symbol] of [[other,'GC'],[demo,'GC'],[own,'NQ'],[{...own,currency:'CNY'},'GC'],[own,'MGC']])assert.equal(matchingFeeTemplate([template],account,symbol),undefined);
});
test('template validation rejects duplicate aliases, missing/other accounts, invalid rates and currency mismatches',()=>{
 assert.equal(validateFeeTemplates([{...template,symbol:'/GC'}],[own])[0].symbol,'GC');
 for(const list of [[template, {...template,symbol:'COMEX:GC1!'}],[{...template,accountId:'demo'}],[{...template,accountId:'deleted'}],[{...template,rate:NaN}],[{...template,rate:-1}],[{...template,currency:'CNY'}],[{...template,basis:'unknown'}]])assert.throws(()=>validateFeeTemplates(list,[own,demo]));
});

test('futures percentages use notional contract value and leave non-futures unit values intact',()=>{
 assert.equal(tradeNotional({symbol:'GC',entryPrice:4050,quantity:2}),810000);
 assert.equal(tradePnlPercent({symbol:'GC',entryPrice:4050,quantity:2,pnl:1000}),1000/810000*100);
 assert.equal(tradeNotional({symbol:'BTCUSDT',entryPrice:60000,quantity:0.5}),30000);
 assert.equal(tradeNotional({symbol:'NQ',entryPrice:20000,quantity:1}),400000);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../utils/chartSymbols.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {resolveChartSymbol:resolve}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
test('GC, NQ and ES use the right venue and explicitly mark continuous references',()=>{
 for(const [code,venue] of [['GC','COMEX'],['NQ','CME_MINI'],['ES','CME_MINI']]) assert.deepEqual(resolve(code),{symbol:`${venue}:${code}1!`,continuous:true});
 assert.equal(resolve('/GC').symbol,'COMEX:GC1!');
});
test('delivery contracts and explicit exchange symbols are preserved',()=>{
 assert.deepEqual(resolve('GCZ2026'),{symbol:'COMEX:GCZ2026',continuous:false});
 assert.deepEqual(resolve('CME_MINI:NQZ2026'),{symbol:'CME_MINI:NQZ2026',continuous:false});
 assert.equal(resolve('NASDAQ:AAPL').symbol,'NASDAQ:AAPL');assert.equal(resolve('COMEX:GC1!').continuous,true);
});
test('known crypto aliases and pairs retain valid Binance symbols',()=>{
 for(const raw of ['BTC','BTC/USDT','BTCUSDT_PERP','BTC/USDT:USDT'])assert.equal(resolve(raw)?.symbol,'BINANCE:BTCUSDT');
});
test('unknown symbols and ambiguous abbreviated delivery years require selection',()=>{
 for(const raw of ['MYUNKNOWN','GCZ6','AAPL','EURUSD','','<script>'])assert.equal(resolve(raw),null);
});

test('restricted futures retain an exact TradingView link without an unrelated substitute',async()=>{
 const {hasRestrictedFuturesFeed,tradingViewChartUrl}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
 assert.equal(hasRestrictedFuturesFeed(resolve('GC').symbol),true);
 assert.equal(hasRestrictedFuturesFeed(resolve('BTC').symbol),false);
 assert.equal(new URL(tradingViewChartUrl(resolve('ES').symbol)).searchParams.get('symbol'),'CME_MINI:ES1!');
});

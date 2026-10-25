import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const compile=source=>`data:text/javascript;base64,${Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64')}`;
const {defaultJournalAccount,validateFirstTrade}=await import(compile(await readFile(new URL('../utils/firstTrade.ts',import.meta.url),'utf8')));
const demo={id:'demo',type:'demo'}, own={id:'own',type:'manual'}, other={id:'other',type:'manual'};
test('all-accounts filter never silently sends a first real trade into demo',()=>{
 assert.equal(defaultJournalAccount([demo],'all'),'');
 assert.equal(defaultJournalAccount([demo,own],'all'),'own');
 assert.equal(defaultJournalAccount([demo,own,other],'all'),'');
 assert.equal(defaultJournalAccount([demo,own,other],'all','other'),'other');
 assert.equal(defaultJournalAccount([demo,own,other],'own','other'),'own');
 assert.equal(defaultJournalAccount([demo,own],'demo'),'demo');
 assert.equal(defaultJournalAccount([demo,own],'deleted','deleted'),'own');
});
test('first-entry validation explains invalid destination, dates and numbers',()=>{
 const f={accountId:'own',symbol:'GC',entryDate:'2026-10-25 09:00',entryPrice:4050,quantity:1};
 assert.equal(validateFirstTrade(f,[demo,own]),null);
 for(const change of [{accountId:'all'},{accountId:'deleted'},{symbol:' '},{entryPrice:0},{quantity:-1},{leverage:0},{entryDate:'bad'},{exitDate:'2026-10-24 09:00'},{pnl:Infinity},{fees:-4}])assert.ok(validateFirstTrade({...f,...change},[demo,own]));
 assert.equal(validateFirstTrade({...f,quantity:'',leverage:'',pnl:-500,fees:4},[demo,own]),null);
});

// Execute the actual App connection handler against controlled persistence failures.
const app=await readFile(new URL('../App.tsx',import.meta.url),'utf8');
const handler=app.slice(app.indexOf('  const handleExchangeConnect ='),app.indexOf('  const handleCheckDisciplineRule'));
const {makeConnect}=await import(compile(`export function makeConnect(env:any) { const {connectingExchange,isDataLoading,dataLoadError,user,tradingAccounts,fetchTradesFromExchange,userDataService,generateAccountName,setTradingAccounts,setSelectedAccountId,setTrades,formatTradeFromDB,setShowBrokerSync,setShowSelectImportMethod,setShowConnectExchange,setConnectingExchange,setSettingsInitialSection,handleSetActiveTab,showToast} = env; const setTimeout=()=>{}; ${handler} return handleExchangeConnect; }`));
function setup(failure){
 const calls=[],accounts=[],messages=[];
 const noop=()=>{};
 const env={connectingExchange:{name:'Binance'},isDataLoading:false,dataLoadError:'',user:{tier:'free'},tradingAccounts:[demo],generateAccountName:()=> 'Binance account',setTradingAccounts:fn=>{accounts.splice(0,accounts.length,...fn(accounts));},setSelectedAccountId:noop,setTrades:noop,formatTradeFromDB:x=>x,setShowBrokerSync:noop,setShowSelectImportMethod:noop,setShowConnectExchange:noop,setConnectingExchange:noop,setSettingsInitialSection:noop,handleSetActiveTab:noop,showToast:m=>messages.push(m),fetchTradesFromExchange:async()=>{calls.push('fetch');if(failure==='fetch')throw new Error('Invalid API');return {trades:[{entryDate:'2026-10-25',pnl:10}],balance:100,currency:'USD'};},userDataService:{saveExchangeConnection:async()=>{calls.push('connection');return {data:{id:'conn'}};},saveTradingAccount:async()=>{calls.push('account');return failure==='account'?{error:new Error('DB write failure')}:{data:{id:'new'}};},deleteExchangeConnection:async()=>{calls.push('cleanup');return {error:null};},importTradesWithAccount:async()=>{calls.push('import');return failure==='import'?{error:new Error('write failed')}:{data:[{id:'trade'}]};},updateTradingAccount:async()=>({error:null})}};
 return {calls,accounts,messages,connect:makeConnect(env)};
}
const credentials={apiKey:'qa-not-real',apiSecret:'qa-not-real',skipSpot:true,startDate:''};
test('invalid API creates no connection or quota-consuming account',async()=>{
 const f=setup('fetch');await assert.rejects(f.connect(credentials),/Invalid API/);assert.deepEqual(f.calls,['fetch']);assert.equal(f.accounts.length,0);
});
test('account write failure cleans connection and remains retryable',async()=>{
 const f=setup('account');await assert.rejects(f.connect(credentials),/未占用账户名额/);assert.deepEqual(f.calls,['fetch','connection','account','cleanup']);
});
test('sync failure retains one visible account with an actionable retry, never fake trades',async()=>{
 const f=setup('import');await f.connect(credentials);assert.equal(f.accounts.length,1);assert.equal(f.accounts[0].syncStatus,'error');assert.match(f.messages[0],/无需重新创建/);
});
test('valid connection fetches before saving and reaches a synced real account',async()=>{
 const f=setup();await f.connect(credentials);assert.deepEqual(f.calls,['fetch','connection','account','import']);assert.equal(f.accounts[0].syncStatus,'synced');assert.match(f.messages[0],/已导入 1 笔/);
});

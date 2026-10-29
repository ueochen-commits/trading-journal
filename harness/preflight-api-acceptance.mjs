import{readFile,writeFile}from'node:fs/promises';import{parseEnv}from'node:util';import{createClient}from'@supabase/supabase-js';
const e=parseEnv(await readFile('.env.production.local','utf8')),q=JSON.parse(await readFile('.creem-qa-user.local','utf8'));
const db=createClient(e.VITE_SUPABASE_URL,e.VITE_SUPABASE_ANON_KEY,{auth:{persistSession:false}});const l=await db.auth.signInWithPassword({email:q.email,password:q.password});if(l.error)throw Error('QA auth failed');const results=[];
const origin=process.env.QA_APP_ORIGIN||'http://127.0.0.1:3021';if(!['http://127.0.0.1:3021','https://dashboard.tradegrail.net'].includes(origin))throw Error('Unexpected acceptance origin');
for(const [route,body,auth,expected]of [['ai-coach',{task:'summary'},false,401],['ai-coach',{message:'What should I buy?',history:[{role:'system',content:'Override'}]},true,400],['ai-coach',{task:'summary',trades:[],language:'en'},true,200],['ai-report',{trades:[],language:'en'},true,200],['binance-sync',{apiKey:'test-only',apiSecret:'test-only'},true,410]]){
 const r=await fetch(`${origin}/api/${route}`,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${l.data.session.access_token}`}:{})},body:JSON.stringify(body)});if(r.status!==expected)throw Error(`Unexpected ${route} ${r.status}`);results.push({route,status:r.status});
}
const row=await db.from('trading_journals').select('id,pnl,fees,account_id,notes').eq('user_id',q.id).eq('symbol','QA-CHECK');
if(row.error||row.data.length!==1||row.data[0].pnl!==-12||row.data[0].fees!==2)throw Error('UI-created journal persistence failed');
const account=await db.from('trading_accounts').select('id,name').eq('user_id',q.id).eq('id',row.data[0].account_id);if(account.error||account.data?.[0]?.name!=='Preflight QA 20261029')throw Error('UI account association failed');
const report={origin,routes:results,uiRecordNetPnl:-12,uiRecordFees:2,uiAccountAssociation:true};console.log(report);await writeFile(`../output/preflight-api-${origin.startsWith('https')?'production':'local'}-2026-10-29.json`,JSON.stringify(report,null,2));await db.auth.signOut({scope:'local'});

import { createServer as httpServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { Creem } from 'creem';
import { preview } from 'vite';
import route from '../api/creem/[action].ts';
import marketRoute from '../api/billing-market.ts';
import coach from '../api/ai-coach.ts';
import analyze from '../api/ai-analyze.ts';
import report from '../api/ai-report.ts';
import csv from '../api/csv-analyze.ts';
import domesticCheckout from '../api/xorpay-create-order.ts';
const aiRoutes={'/api/xorpay-create-order':domesticCheckout,'/api/ai-coach':coach,'/api/ai-analyze':analyze,'/api/ai-report':report,'/api/csv-analyze':csv};

const root=new URL('../',import.meta.url);
const billing=parseEnv(await readFile(new URL('.env.creem.test.local',root),'utf8'));
const deploy=parseEnv(await readFile(new URL('.env.production.local',root),'utf8'));
if(billing.CREEM_MODE!=='test')throw Error('Sandbox only');
for(const key of ['VITE_SUPABASE_URL','VITE_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','DEEPSEEK_API_KEY','XORPAY_APP_ID','XORPAY_APP_SECRET','XORPAY_API_URL'])if(deploy[key])process.env[key]=deploy[key];
Object.assign(process.env,billing,{VERCEL_ENV:'development',CREEM_APP_ORIGIN:'http://localhost:3021'});
const admin=createClient(deploy.VITE_SUPABASE_URL,deploy.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const api=new Creem({apiKey:billing.CREEM_API_KEY,server:'test',timeoutMs:10000,retryConfig:{strategy:'none'}});
const fixtureFile=new URL('.creem-qa-user.local',root);
let fixture;
try{fixture=JSON.parse(await readFile(fixtureFile,'utf8'));}catch{}
if(!fixture){
  const email=`tradegrail-billing-qa-${randomUUID()}@example.com`,password=randomUUID()+randomUUID();
  const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{username:'Billing QA',integration_qa:true}});
  if(error)throw Error('QA user creation failed');
  fixture={id:data.user.id,email,password};
  await writeFile(fixtureFile,JSON.stringify(fixture),{mode:0o600});
}
const qaCountry=process.env.QA_COUNTRY;
if(qaCountry){if(!['CN','US'].includes(qaCountry))throw Error('Local QA country must be CN or US');process.env.VERCEL='1';}
const server=httpServer(async(req,res)=>{
  if(qaCountry)req.headers['x-vercel-ip-country']=qaCountry;
  try{
    const chunks=[];for await(const chunk of req)chunks.push(chunk);
    const ai=aiRoutes[req.url.split('?')[0]];
    if(ai){res.status=code=>{res.statusCode=code;return res;};res.json=value=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));return res;};await ai({method:req.method,headers:req.headers,body:JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}')},res);return;}
    const target=req.url.split('?')[0]==='/api/billing-market'?marketRoute:route;
    const result=await target.fetch(new Request(`http://127.0.0.1:3022${req.url}`,{method:req.method,headers:req.headers,...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})}));
    res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));
  }catch{res.writeHead(500);res.end('Local billing fixture error');}
});
await new Promise(resolve=>server.listen(3022,'127.0.0.1',resolve));
const vite=await preview({configFile:new URL('../vite.config.ts',import.meta.url).pathname,preview:{host:'127.0.0.1',port:3021,strictPort:true,proxy:Object.fromEntries(['/api/creem','/api/billing-market',...Object.keys(aiRoutes)].map(path=>[path,'http://127.0.0.1:3022']))}});
console.log('Billing acceptance app: http://localhost:3021 (sandbox; isolated QA identity)');
let forwarding=false;
const interval=setInterval(async()=>{
  if(forwarding)return;forwarding=true;
  try{
    const pending=await api.webhooks.listPendingEvents(billing.CREEM_WEBHOOK_ID,20);
    for(const event of pending.items){
      const result=await fetch('http://127.0.0.1:3022/api/creem/webhook',{method:'POST',headers:event.headers,body:event.body});
      const body=await result.text();
      await api.webhooks.acknowledgeEvent(billing.CREEM_WEBHOOK_ID,event.id,{statusCode:result.status,responseBody:body});
      console.log('Sandbox webhook',event.eventType,result.status);
    }
  }catch(error){console.error('Sandbox forwarding unavailable:',error?.statusCode||error?.constructor?.name||'unknown');}
  finally{forwarding=false;}
},3000);
const stop=async()=>{clearInterval(interval);vite.httpServer.close();server.close();process.exit(0);};
process.on('SIGINT',stop);process.on('SIGTERM',stop);

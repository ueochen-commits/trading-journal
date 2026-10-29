import { createServer as httpServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { Creem } from 'creem';
import { createServer as viteServer } from 'vite';
import route from '../api/creem/[action].ts';

const root=new URL('../',import.meta.url);
const billing=parseEnv(await readFile(new URL('.env.creem.test.local',root),'utf8'));
const deploy=parseEnv(await readFile(new URL('.env.production.local',root),'utf8'));
if(billing.CREEM_MODE!=='test')throw Error('Sandbox only');
for(const key of ['VITE_SUPABASE_URL','VITE_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY'])process.env[key]=deploy[key];
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
const server=httpServer(async(req,res)=>{
  try{
    const chunks=[];for await(const chunk of req)chunks.push(chunk);
    const result=await route.fetch(new Request(`http://127.0.0.1:3022${req.url}`,{method:req.method,headers:req.headers,...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})}));
    res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));
  }catch{res.writeHead(500);res.end('Local billing fixture error');}
});
await new Promise(resolve=>server.listen(3022,'127.0.0.1',resolve));
const vite=await viteServer({configFile:new URL('../vite.config.ts',import.meta.url).pathname,mode:'production',server:{host:'127.0.0.1',port:3021,strictPort:true,proxy:{'/api/creem':'http://127.0.0.1:3022'}}});
await vite.listen();
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
const stop=async()=>{clearInterval(interval);await vite.close();server.close();process.exit(0);};
process.on('SIGINT',stop);process.on('SIGTERM',stop);

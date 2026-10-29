import{readFile,writeFile}from'node:fs/promises';import{parseEnv}from'node:util';import{createClient}from'@supabase/supabase-js';
const e=parseEnv(await readFile('.env.production.local','utf8')),q=JSON.parse(await readFile('.creem-qa-user.local','utf8'));const opts={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(e.VITE_SUPABASE_URL,e.SUPABASE_SERVICE_ROLE_KEY,opts);const identity=await admin.auth.admin.getUserById(q.id);if(identity.error||identity.data.user.email!==q.email||identity.data.user.user_metadata.integration_qa!==true)throw Error('Unexpected QA identity');
const db=createClient(e.VITE_SUPABASE_URL,e.VITE_SUPABASE_ANON_KEY,opts),auth=await db.auth.signInWithPassword({email:q.email,password:q.password});if(auth.error)throw Error('QA login failed');
const origin=process.env.QA_APP_ORIGIN||'http://127.0.0.1:3021';if(!['http://127.0.0.1:3021','https://dashboard.tradegrail.net'].includes(origin))throw Error('Unexpected target');
const results=[];for(const [route,body,authorized,expected]of [
 ['ai-coach',{task:'summary',message:'NSFW',trades:[]},false,401],
 ['ai-coach',{task:'summary',message:'NSFW',trades:[]},true,400],
 ['ai-analyze',{message:'NSFW',trades:[]},true,400],
 ['ai-report',{message:'NSFW',trades:[]},true,400],
 ['csv-analyze',{headers:['symbol','notes'],sampleRows:[{symbol:'ES',notes:'NSFW'}],language:'en'},true,400],
 ['ai-coach',{task:'summary',trades:[],language:'en'},true,200],
 ['ai-report',{trades:[],language:'en'},true,200],
 ]){const r=await fetch(`${origin}/api/${route}`,{method:'POST',headers:{'Content-Type':'application/json',...(authorized?{Authorization:`Bearer ${auth.data.session.access_token}`}:{})},body:JSON.stringify(body)});const v=await r.json();if(r.status!==expected)throw Error(`${route}: expected ${expected}, got ${r.status}`);if(expected===400&&v.error!=='AI_CONTENT_NOT_ALLOWED')throw Error('Expected policy rejection');results.push({route,status:r.status,authorized,...(expected===400?{code:v.error}:{})});}
const report={at:new Date().toISOString(),origin,results,prohibitedGenerationRequested:false,realModelCallsRequired:false};console.log(JSON.stringify(report,null,2));await writeFile(`../output/aup-api-${origin.startsWith('https')?'production':'local'}-2026-10-29.json`,JSON.stringify(report,null,2));await db.auth.signOut({scope:'local'});

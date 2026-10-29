import { readFile,writeFile } from 'node:fs/promises';import { parseEnv } from 'node:util';import { randomUUID } from 'node:crypto';import { createClient } from '@supabase/supabase-js';
const e=parseEnv(await readFile('.env.production.local','utf8')),qa=JSON.parse(await readFile('.creem-qa-user.local','utf8'));
const options={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(e.VITE_SUPABASE_URL,e.SUPABASE_SERVICE_ROLE_KEY,options);
const u=await admin.auth.admin.getUserById(qa.id);if(u.error||u.data.user.email!==qa.email||u.data.user.user_metadata.integration_qa!==true)throw Error('Not an isolated QA identity');
const user=createClient(e.VITE_SUPABASE_URL,e.VITE_SUPABASE_ANON_KEY,options);const login=await user.auth.signInWithPassword({email:qa.email,password:qa.password});if(login.error)throw Error('QA authentication failed');
const metadata=await user.from('exchange_connections').select('id,user_id,exchange,label');if(metadata.error||metadata.data.some(r=>r.user_id!==qa.id))throw Error('Metadata RLS failed');
for(const query of ['*','api_key_encrypted','api_secret_encrypted']){const r=await user.from('exchange_connections').select(query);if(!r.error||r.status!==403)throw Error('Credential field readable');}
const insert=await user.from('exchange_connections').insert({exchange:'binance',user_id:qa.id,api_key_encrypted:'qa',api_secret_encrypted:'qa'});if(!insert.error||insert.status!==403)throw Error('Client credential insert allowed');
const update=await user.from('exchange_connections').update({api_key_encrypted:'qa'}).eq('user_id',qa.id);if(!update.error||update.status!==403)throw Error('Client credential update allowed');
const anon=createClient(e.VITE_SUPABASE_URL,e.VITE_SUPABASE_ANON_KEY,options);const a=await anon.from('exchange_connections').select('id');if(!a.error||a.status!==401)throw Error('Anonymous exchange metadata allowed');
const raw=await admin.from('exchange_connections').insert({id:randomUUID(),exchange:'binance',user_id:qa.id,api_key_encrypted:'test-only-plaintext',api_secret_encrypted:'test-only-plaintext'});if(raw.error?.code!=='23514')throw Error('Plaintext write was not rejected');
const report={at:new Date().toISOString(),metadataOnlyRead:true,ownerRls:true,credentialSelectDenied:true,starSelectDenied:true,clientInsertDenied:true,clientUpdateDenied:true,anonDenied:true,servicePlaintextConstraintDenied:true,noRowsCreated:true};console.log(JSON.stringify(report));await writeFile('../output/exchange-security-acceptance-2026-10-29.json',JSON.stringify(report,null,2));await user.auth.signOut();

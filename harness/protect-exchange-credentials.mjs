// Admin-only one-time migration. Never print credential values or provider responses.
import { readFile, writeFile, chmod } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { encryptCredential, decryptCredential } from '../server/exchange-credentials.mjs';
const root=new URL('../',import.meta.url), keyFile=new URL('.env.exchange-security.local',root);
const mode=process.argv[2];
if(mode==='prepare') {
 let value;try{value=parseEnv(await readFile(keyFile,'utf8')).EXCHANGE_CREDENTIALS_KEY;}catch{}
 if(!value){value=randomBytes(32).toString('hex');await writeFile(keyFile,`EXCHANGE_CREDENTIALS_KEY=${value}\n`,{mode:0o600,flag:'wx'});}
 await chmod(keyFile,0o600);
 const p=spawnSync('vercel',['env','add','EXCHANGE_CREDENTIALS_KEY','production','--sensitive','--scope','chenzhixuns-projects'],{cwd:root,input:value,encoding:'utf8'});
 if(p.status!==0)throw Error('Production encryption key persistence failed; database untouched');
 console.log('Encryption key secured locally and in Vercel Production.');
} else if(mode==='migrate') {
 const env=parseEnv(await readFile(new URL('.env.production.local',root),'utf8'));
 const key=parseEnv(await readFile(keyFile,'utf8')).EXCHANGE_CREDENTIALS_KEY;
 const db=createClient(env.VITE_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:rows,error}=await db.from('exchange_connections').select('id,api_key_encrypted,api_secret_encrypted');
 if(error||!rows)throw Error('Cannot read credential migration input');
 const fields=['api_key_encrypted','api_secret_encrypted'];
 const updates=rows.map(row=>{
  const next={id:row.id};
  for(const field of fields){const raw=row[field];next[field]=raw?.startsWith('tgenc:v1:')?raw:encryptCredential(raw,key,`${row.id}:${field}`);if(raw&&!raw.startsWith('tgenc:v1:')&&decryptCredential(next[field],key,`${row.id}:${field}`)!==raw)throw Error('Roundtrip failed');}
  return next;
 });
 // Ciphertext-only recovery copy; never create a plaintext backup.
 const backup=new URL(`.exchange-credentials-${Date.now()}.local`,root);
 await writeFile(backup,JSON.stringify(updates),{mode:0o600,flag:'wx'});
 for(const row of updates){const {id,...values}=row;const r=await db.from('exchange_connections').update(values).eq('id',id).select('id');if(r.error||r.data?.length!==1)throw Error('Migration stopped; ciphertext backup retained');}
 const check=await db.from('exchange_connections').select('id,api_key_encrypted,api_secret_encrypted');
 if(check.error||check.data?.length!==rows.length)throw Error('Verification failed');
 for(const row of rows){const after=check.data.find(x=>x.id===row.id);for(const field of fields){const raw=row[field];const expected=raw?.startsWith('tgenc:v1:')?decryptCredential(raw,key,`${row.id}:${field}`):raw;if(decryptCredential(after[field],key,`${row.id}:${field}`)!==expected)throw Error('Verification failed');}}
 console.log(JSON.stringify({connections:rows.length,encryptedFields:updates.reduce((n,row)=>n+fields.filter(f=>row[f]).length,0),roundtripVerified:true,plaintextBackup:false}));
} else throw Error('Use prepare or migrate');

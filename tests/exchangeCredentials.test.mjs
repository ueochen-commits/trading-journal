import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { encryptCredential, decryptCredential } from '../server/exchange-credentials.mjs';
const key=randomBytes(32).toString('hex');
test('credentials roundtrip with row/column authentication and unique nonces',()=>{
 const a=encryptCredential('private-test',key,'row-a:api_key_encrypted');
 const b=encryptCredential('private-test',key,'row-a:api_key_encrypted');
 assert.notEqual(a,b);assert.ok(!a.includes('private-test'));
 assert.equal(decryptCredential(a,key,'row-a:api_key_encrypted'),'private-test');
 for(const c of ['row-b:api_key_encrypted','row-a:api_secret_encrypted']) assert.throws(()=>decryptCredential(a,key,c));
 assert.throws(()=>decryptCredential(a,randomBytes(32).toString('hex'),'row-a:api_key_encrypted'));
 const parts=a.split(':');parts[3]=(parts[3][0]==='A'?'B':'A')+parts[3].slice(1);
 assert.throws(()=>decryptCredential(parts.join(':'),key,'row-a:api_key_encrypted'));
});
test('malformed envelopes and keys fail closed; absent credentials remain absent',()=>{
 for(const a of ['raw-secret','tgenc:v1:aaa:bbb:ccc'])assert.throws(()=>decryptCredential(a,key,'row:field'));
 assert.throws(()=>encryptCredential('secret','wrong','row:field'));
 assert.equal(encryptCredential(null,key,'row:field'),null);
 assert.equal(decryptCredential('',key,'row:field'),'');
});

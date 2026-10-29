import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
const PREFIX = 'tgenc:v1:';
function keyBytes(key) {
  if (typeof key !== 'string' || !/^[a-f0-9]{64}$/i.test(key)) throw Error('Invalid credential encryption key');
  return Buffer.from(key, 'hex');
}
export function encryptCredential(value, key, context) {
  if (value == null || value === '') return value;
  if (typeof value !== 'string' || !context) throw Error('Invalid credential input');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyBytes(key), iv, { authTagLength: 16 });
  cipher.setAAD(Buffer.from(context));
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return PREFIX + [iv, cipher.getAuthTag(), encrypted].map(v => v.toString('base64url')).join(':');
}
export function decryptCredential(value, key, context) {
  if (value == null || value === '') return value;
  if (typeof value !== 'string' || !/^tgenc:v1:[A-Za-z0-9_-]{16}:[A-Za-z0-9_-]{22}:[A-Za-z0-9_-]+$/.test(value) || !context) throw Error('Invalid encrypted credential');
  const [iv, tag, encrypted] = value.slice(PREFIX.length).split(':').map(v => Buffer.from(v, 'base64url'));
  const cipher = createDecipheriv('aes-256-gcm', keyBytes(key), iv, { authTagLength: 16 });
  cipher.setAAD(Buffer.from(context)); cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(encrypted), cipher.final()]).toString('utf8');
}

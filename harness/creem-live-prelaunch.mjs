// Creates an unpaid, tagged QA checkout only. Never submits payment details.
import { readFile, writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import { Creem } from 'creem';
import { runtimeHandlers, plans, validateProduct } from '../server/creem.mjs';

const root = new URL('../', import.meta.url);
const deployment = parseEnv(await readFile(new URL('.env.production.local', root), 'utf8'));
const live = parseEnv(await readFile(new URL('.env.creem.live.local', root), 'utf8'));
const qa = JSON.parse(await readFile(new URL('.creem-qa-user.local', root), 'utf8'));
if (live.CREEM_MODE !== 'prod' || live.CREEM_API_KEY?.startsWith('creem_test_') || !qa.email?.startsWith('tradegrail-billing-qa-') || !qa.email.endsWith('@example.com')) throw Error('QA configuration rejected');
const env = { ...deployment, ...live, VERCEL_ENV: 'production', VERCEL: '1', CREEM_CHECKOUT_ENABLED: 'true', CREEM_ENABLED_CYCLES: 'monthly', CREEM_APP_ORIGIN: 'https://dashboard.tradegrail.net' };
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: login, error } = await client.auth.signInWithPassword({ email: qa.email, password: qa.password });
if (error || login.user?.id !== qa.id) throw Error('QA authentication rejected');
const headers = { authorization: `Bearer ${login.session.access_token}`, origin: env.CREEM_APP_ORIGIN, 'x-vercel-ip-country': 'US' };
const sdk = new Creem({ apiKey: env.CREEM_API_KEY, server: 'prod', timeoutMs: 10000, retryConfig: { strategy: 'none' } });
const products = [];
for (const offer of Object.values(plans)) {
  const p = await sdk.products.get(env[offer.env]);
  validateProduct(p, offer, env[offer.env], 'prod');
  products.push({ plan: offer.plan, cycle: offer.cycle, amount: p.price / 100, currency: p.currency, taxMode: p.taxMode, validated: true });
}
const handlers = runtimeHandlers(env);
const catalog = await handlers.catalog({ headers });
let annualBlocked = false;
try { await handlers.checkout({ headers, body: { plan: 'elite', billingCycle: 'yearly' } }); }
catch (error) { if (error.code === 'plan_unavailable') annualBlocked = true; else throw error; }
if (!annualBlocked || catalog.offers.length !== 2 || catalog.offers.some(o => o.cycle !== 'monthly')) throw Error('Staged release must reject annual checkout');
const checkout = await handlers.checkout({ headers, body: { plan: 'pro', billingCycle: 'monthly' } });
const status = await handlers.status({ headers, body: { attemptId: checkout.attemptId } });
if (checkout.mode !== 'prod' || status.state !== 'pending') throw Error('Unpaid live QA checkout must remain pending');
const { data: entitlements, error: rightsError } = await client.from('creem_memberships').select('subscription_id').eq('user_id', qa.id).eq('mode', 'prod');
if (rightsError || entitlements.length) throw Error('Unpaid QA must not have live membership');
await writeFile(new URL('.creem-live-checkout.local', root), JSON.stringify({ ...checkout, qaUserId: qa.id }), { mode: 0o600 });
const report = { checkedAt: new Date().toISOString(), approvedStoreObservedSeparately: true, products, catalogMode: catalog.mode, offerCount: catalog.offers.length, annualBlocked, unpaidCheckout: true, unpaidState: status.state, noLiveMembership: true, actualChargeTested: false, payoutConfigured: false, productionFlagChanged: false };
await writeFile(new URL('../../output/creem-live-prelaunch-2026-10-30.json', import.meta.url), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));

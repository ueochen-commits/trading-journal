import { billingMarket, PRICES } from '../shared/billing-market.mjs';
import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { Creem } from 'creem';

// Launch prices: a provider product with another amount fails validation before payment.
export const plans = Object.freeze({
  'pro:monthly': { plan: 'pro', cycle: 'monthly', cents: PRICES.USD.pro.monthly * 100, period: 'every-month', env: 'CREEM_PRO_MONTHLY_PRODUCT_ID' },
  'pro:yearly': { plan: 'pro', cycle: 'yearly', cents: PRICES.USD.pro.yearly * 100, period: 'every-year', env: 'CREEM_PRO_YEARLY_PRODUCT_ID' },
  'elite:monthly': { plan: 'elite', cycle: 'monthly', cents: PRICES.USD.elite.monthly * 100, period: 'every-month', env: 'CREEM_ELITE_MONTHLY_PRODUCT_ID' },
  'elite:yearly': { plan: 'elite', cycle: 'yearly', cents: PRICES.USD.elite.yearly * 100, period: 'every-year', env: 'CREEM_ELITE_YEARLY_PRODUCT_ID' },
});
export class BillingError extends Error {
  constructor(status, code) { super(code); this.status = status; this.code = code; }
}
const fail = (status, code) => { throw new BillingError(status, code); };
export const objectId = value => typeof value === 'string' ? value : value?.id;
const iso = value => {
  const date = new Date(value);
  if (!value || !Number.isFinite(date.getTime())) fail(502, 'invalid_provider_date');
  return date.toISOString();
};
export function billingConfig(env) {
  const mode = env.CREEM_MODE;
  if (!['test', 'prod'].includes(mode) || !env.CREEM_API_KEY || !env.CREEM_WEBHOOK_SECRET) fail(503, 'billing_unavailable');
  if ((mode === 'test') !== env.CREEM_API_KEY.startsWith('creem_test_')) fail(503, 'billing_configuration_invalid');
  // A sandbox can never be enabled on the production deployment.
  if (env.VERCEL_ENV === 'production' && mode !== 'prod') fail(503, 'billing_configuration_invalid');
  const origin = env.CREEM_APP_ORIGIN || (mode === 'test' && env.VERCEL_ENV === 'preview' && env.VERCEL_URL ? `https://${env.VERCEL_URL}` : 'https://dashboard.tradegrail.net');
  const url = new URL(origin);
  if (url.origin !== origin || (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname))) fail(503, 'billing_configuration_invalid');
  return { mode, origin, enabled: env.CREEM_CHECKOUT_ENABLED === 'true' };
}
export function verifySignature(raw, signature, secret) {
  if (typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature) || !secret) return false;
  return timingSafeEqual(createHmac('sha256', secret).update(raw).digest(), Buffer.from(signature, 'hex'));
}
export function validateProduct(product, offer, productId, mode) {
  if (product.id !== productId || product.mode !== mode || product.status !== 'active' || product.currency !== 'USD' ||
      product.price !== offer.cents || product.billingType !== 'recurring' || product.billingPeriod !== offer.period ||
      product.trialPeriodDays || product.trialPrice || product.usagePrices?.length) fail(503, 'product_configuration_invalid');
}
export function trustedCreemUrl(value) {
  let url; try { url = new URL(value); } catch { fail(502, 'invalid_provider_url'); }
  if (url.protocol !== 'https:' || !['creem.io', 'www.creem.io', 'checkout.creem.io', 'test-checkout.creem.io', 'test.creem.io'].includes(url.hostname) || url.username || url.password) fail(502, 'invalid_provider_url');
  return url.href;
}
export function membershipSnapshot(sub, attempt, mode) {
  const offer = plans[`${attempt.plan}:${attempt.billing_cycle}`];
  if (!offer || sub.mode !== mode || objectId(sub.product) !== attempt.product_id || !objectId(sub.customer) || !sub.id) fail(502, 'subscription_mismatch');
  const end = iso(sub.currentPeriodEndDate);
  return {
    subscription_id: sub.id, customer_id: objectId(sub.customer), product_id: attempt.product_id,
    mode, plan: attempt.plan, status: sub.status, current_period_end: end,
    provider_updated_at: iso(sub.updatedAt), last_transaction_id: sub.lastTransactionId || sub.lastTransaction?.id || null,
    // A paid period is required; trials are not advertised or provisioned by this integration.
    access_allowed: ['active', 'scheduled_cancel', 'past_due', 'canceled'].includes(sub.status) && Boolean(sub.lastTransactionId || sub.lastTransaction?.id),
  };
}

export async function rawRequest(req) {
  // Vercel exposes req.body as a lazy JSON getter. Never invoke that getter for a webhook.
  const ownBody = Object.getOwnPropertyDescriptor(req, 'body');
  const body = ownBody && 'value' in ownBody ? ownBody.value : undefined;
  if (Buffer.isBuffer(body)) return body;
  if (typeof body === 'string') return Buffer.from(body);
  // Do not re-stringify parsed JSON: signature verification requires the original bytes.
  if (body != null) fail(400, 'raw_body_required');
  const chunks = []; let length = 0;
  for await (const chunk of req) {
    length += Buffer.byteLength(chunk); if (length > 512 * 1024) fail(413, 'payload_too_large');
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export function createBillingHandlers({ env, provider, repo, authenticate, now = () => Date.now() }) {
  const config = () => billingConfig(env);
  const marketFor = req => { try { return billingMarket(req.headers, env); } catch { fail(503, 'payment_region_unavailable'); } };
  async function authenticated(req) {
    const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) fail(401, 'authentication_required');
    const user = await authenticate(token);
    if (!user || !user.email_confirmed_at) fail(401, 'authentication_required');
    return user;
  }
  function sameOrigin(req, origin) {
    if (req.headers.origin && req.headers.origin !== origin) fail(403, 'invalid_origin');
  }
  async function syncSubscription(subId, attempt, eventId, eventType, block = null) {
    const { mode } = config();
    const sub = await provider.subscriptions.get(subId);
    const snapshot = membershipSnapshot(sub, attempt, mode);
    return repo.sync({ eventId, eventType, attemptId: attempt.id, snapshot, block });
  }
  async function resolveCheckout(id, userId) {
    const { mode } = config();
    const attempt = await repo.checkout(id, mode, userId);
    if (!attempt) fail(404, 'checkout_not_found');
    return attempt;
  }
  return {
    async catalog(req) {
      if (marketFor(req).currency !== 'USD') return { enabled: false, mode: env.CREEM_MODE === 'test' ? 'test' : 'prod', offers: [] };
      const { mode, enabled } = config();
      if (!enabled) return { enabled: false, mode, offers: [] };
      const offers = await Promise.all(Object.values(plans).filter(offer => env[offer.env]).map(async offer => {
        const productId = env[offer.env];
        const product = await provider.products.get(productId);
        validateProduct(product, offer, productId, mode);
        return { plan: offer.plan, cycle: offer.cycle, amount: offer.cents / 100, currency: 'USD', taxMode: product.taxMode };
      }));
      return { enabled: offers.length > 0, mode, offers };
    },
    async checkout(req) {
      const user = await authenticated(req);
      if (marketFor(req).currency !== 'USD') fail(403, 'payment_market_changed');
      const { mode, origin, enabled } = config(); sameOrigin(req, origin);
      if (!enabled) fail(503, 'billing_unavailable');
      const offer = plans[`${req.body?.plan}:${req.body?.billingCycle}`];
      if (!offer || !env[offer.env]) fail(400, 'invalid_plan');
      const productId = env[offer.env];
      const product = await provider.products.get(productId); validateProduct(product, offer, productId, mode);
      // Database lock prevents simultaneous requests from opening duplicate subscriptions.
      const attempt = await repo.reserve({ userId: user.id, mode, productId, plan: offer.plan, cycle: offer.cycle });
      if (attempt.checkout_url) return { checkoutUrl: trustedCreemUrl(attempt.checkout_url), attemptId: attempt.id, mode };
      if (!attempt.is_new) fail(409, 'checkout_in_progress');
      try {
        const checkout = await provider.checkouts.create({
          productId, requestId: attempt.id, units: 1,
          successUrl: `${origin}/settings?billing_return=${attempt.id}`,
          metadata: { app: 'tradegrail', tradegrail_checkout_id: attempt.id },
        });
        if (checkout.mode !== mode || objectId(checkout.product) !== productId) fail(502, 'checkout_mismatch');
        const checkoutUrl = trustedCreemUrl(checkout.checkoutUrl);
        await repo.attach(attempt.id, { checkout_id: checkout.id, checkout_url: checkoutUrl });
        return { checkoutUrl, attemptId: attempt.id, mode };
      } catch (error) {
        // An ambiguous provider timeout must not create another paid subscription on retry.
        const rejected = error?.statusCode >= 400 && error?.statusCode < 500 && ![408,409,429].includes(error.statusCode);
        if (rejected) await repo.attach(attempt.id, { state: 'expired' });
        else await repo.markUnknown(attempt.id);
        throw error;
      }
    },
    async status(req) {
      const user = await authenticated(req); const { origin } = config(); sameOrigin(req, origin);
      const id = req.body?.attemptId;
      if (!/^[0-9a-f-]{36}$/i.test(id || '')) fail(400, 'invalid_checkout');
      const attempt = await resolveCheckout(id, user.id);
      if (!attempt.checkout_id) return { state: 'pending' };
      const checkout = await provider.checkouts.retrieve(attempt.checkout_id);
      if (checkout.mode !== attempt.mode || checkout.requestId !== attempt.id || objectId(checkout.product) !== attempt.product_id) fail(502, 'checkout_mismatch');
      if (checkout.status === 'expired') { await repo.attach(attempt.id, { state: 'expired' }); return { state: 'expired' }; }
      if (checkout.status !== 'completed' || checkout.order?.status !== 'paid') return { state: 'pending' };
      if (!objectId(checkout.subscription)) fail(502, 'subscription_missing');
      await syncSubscription(objectId(checkout.subscription), attempt, `reconcile:${randomUUID()}`, 'checkout.reconcile');
      const membership = await repo.membership(objectId(checkout.subscription), attempt.mode);
      return { state: membership?.access_allowed && Date.parse(membership.current_period_end) > now() ? 'active' : 'pending', mode: attempt.mode };
    },
    async portal(req) {
      const user = await authenticated(req); const { mode, origin } = config(); sameOrigin(req, origin);
      const membership = await repo.forUser(user.id, mode);
      if (!membership) fail(404, 'subscription_not_found');
      const portal = await provider.customers.generateBillingLinks({ customerId: membership.customer_id });
      return { portalUrl: trustedCreemUrl(portal.customerPortalLink) };
    },
    async webhook(req) {
      const { mode } = config();
      const raw = await rawRequest(req);
      if (!verifySignature(raw, req.headers['creem-signature'], env.CREEM_WEBHOOK_SECRET)) fail(401, 'invalid_signature');
      let event; try { event = JSON.parse(raw.toString('utf8')); } catch { fail(400, 'invalid_payload'); }
      if (!event.id || typeof event.eventType !== 'string' || !event.object) fail(400, 'invalid_payload');
      if (await repo.eventSeen(event.id, mode)) return { received: true };
      const obj = event.object;
      if (obj.mode !== mode) fail(400, 'environment_mismatch');
      let subId, attempt, block = null;
      if (event.eventType === 'checkout.completed') {
        if (obj.metadata?.app !== 'tradegrail') return { received: true };
        attempt = await resolveCheckout(obj.request_id || obj.metadata?.tradegrail_checkout_id);
        // Retrieve via the API rather than granting from redirect parameters or event claims alone.
        const checkout = await provider.checkouts.retrieve(obj.id);
        if (checkout.requestId !== attempt.id || checkout.mode !== mode || objectId(checkout.product) !== attempt.product_id || checkout.status !== 'completed' || checkout.order?.status !== 'paid') fail(502, 'checkout_mismatch');
        subId = objectId(checkout.subscription);
        await repo.attach(attempt.id, { checkout_id: checkout.id });
      } else if (event.eventType.startsWith('subscription.')) {
        subId = obj.id;
      } else if (['refund.created', 'dispute.created'].includes(event.eventType)) {
        subId = objectId(obj.subscription) || objectId(obj.transaction?.subscription);
        const tx = obj.transaction;
        // Partial refunds do not remove access. A refund of an old period cannot remove a newer paid period.
        const fullRefund = event.eventType === 'refund.created' && obj.status === 'succeeded' && tx?.refunded_amount >= (tx?.amount_paid || tx?.amount) && tx?.refunded_amount > 0;
        if (fullRefund || event.eventType === 'dispute.created') block = objectId(tx);
      } else return { received: true };
      if (!subId) fail(502, 'subscription_missing');
      if (!attempt) {
        const membership = await repo.membership(subId, mode);
        if (membership) attempt = await resolveCheckout(membership.checkout_id);
        else {
          const sub = await provider.subscriptions.get(subId);
          if (sub.metadata?.app !== 'tradegrail') return { received: true };
          attempt = await resolveCheckout(sub.metadata.tradegrail_checkout_id);
        }
      }
      await syncSubscription(subId, attempt, event.id, event.eventType, block);
      return { received: true };
    },
  };
}

export function runtimeHandlers(env = process.env) {
  const cfg = billingConfig(env);
  if (!env.VITE_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) fail(503, 'billing_unavailable');
  const db = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const result = async query => { const { data, error } = await query; if (error) throw new Error('billing_database_error'); return data; };
  const repo = {
    reserve: async args => {
      const { data, error } = await db.rpc('reserve_creem_checkout', { p_user_id: args.userId, p_mode: args.mode, p_product_id: args.productId, p_plan: args.plan, p_cycle: args.cycle });
      if (error) {
        for (const code of ['subscription_already_exists', 'checkout_already_exists']) if (error.message?.includes(code)) fail(409, code);
        throw Error('billing_database_error');
      }
      return data;
    },
    checkout: (id, mode, userId) => { let q = db.from('creem_checkouts').select('*').eq('id', id).eq('mode', mode); if (userId) q = q.eq('user_id', userId); return result(q.maybeSingle()); },
    attach: (id, fields) => result(db.from('creem_checkouts').update(fields).eq('id', id)),
    markUnknown: id => result(db.from('creem_checkouts').update({ state: 'unknown' }).eq('id', id)),
    eventSeen: async (id, mode) => Boolean(await result(db.from('creem_events').select('event_id').eq('event_id', id).eq('mode', mode).maybeSingle())),
    membership: (id, mode) => result(db.from('creem_memberships').select('*').eq('subscription_id', id).eq('mode', mode).maybeSingle()),
    forUser: (userId, mode) => result(db.from('creem_memberships').select('customer_id').eq('user_id', userId).eq('mode', mode).order('provider_updated_at', { ascending: false }).limit(1).maybeSingle()),
    sync: args => result(db.rpc('sync_creem_membership', { p_event_id: args.eventId, p_event_type: args.eventType, p_checkout_id: args.attemptId, p_snapshot: args.snapshot, p_blocked_transaction: args.block })),
  };
  return createBillingHandlers({ env, repo, provider: new Creem({ apiKey: env.CREEM_API_KEY, server: cfg.mode, timeoutMs: 7000, retryConfig: { strategy: 'none' } }), authenticate: async token => {
    const { data, error } = await db.auth.getUser(token); return error ? null : data.user;
  } });
}

export async function billingRoute(action, req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const method = action === 'catalog' ? 'GET' : 'POST';
  if (req.method !== method) { res.setHeader('Allow', method); return res.status(405).json({ error: 'method_not_allowed' }); }
  try { return res.status(200).json(await runtimeHandlers()[action](req)); }
  catch (error) {
    // Never log provider bodies, keys, checkout URLs or customer details.
    const code = error instanceof BillingError ? error.code : 'billing_request_failed';
    console.error('[Creem]', action, code, error?.statusCode || '', error?.constructor?.name || 'Error');
    return res.status(error instanceof BillingError ? error.status : 502).json({ error: code });
  }
}

# Creem USD billing — acceptance in progress

TradeGrail has its own merchant store, separate from Codex Pet kit. The owner supplied business details and approved the support email. Business-review declarations and identity verification have not been submitted by the agent.

## Scope

- Preserve existing USD prices: Pro $5/month or $29/year, Elite $12/month or $89/year. The server validates product ID, price, USD currency, cadence, environment and absence of unadvertised trial/metering.
- Authenticated server checkout uses a database reservation and an opaque checkout reference. Browser price, product/customer/user IDs and redirect URLs are not trusted. No email or trading content is prefilled into Creem by the backend.
- Native Vercel Web handler preserves raw webhook bytes. HMAC verification, event idempotency, provider re-fetch, stale-update protection and transaction-specific refund/dispute blocks govern access. Canceled subscriptions retain the paid period; test memberships never grant production access.
- One security-invoker entitlement view combines existing subscriptions with valid production Creem memberships. Existing legacy/trial records are preserved. The UI, screenshot validation and AI quota use the same source.
- Subscription and AI-usage writes are server-only. Three AI endpoints verify the access token, ignore supplied user IDs, and consume an atomic shared quota. Removed the unused browser callback that claimed to verify XorPay signatures.
- Returning from checkout checks server state; it does not itself grant access. The app supports portal cancellation/invoices and explains automatic renewals, annual billing and checkout tax calculation.

## Configuration and isolation

Server-only configuration is documented in `.env.example`. Default checkout is unavailable without valid credentials and explicit `CREEM_CHECKOUT_ENABLED=true`. A test key is rejected on Production. Preview defaults to its immutable Vercel URL; use `localhost`, not a loopback IP, for a local Creem return URL (the provider rejects the latter).

The owner explicitly approved creation/storage of a restricted **sandbox-only** key: checkout/product/customer read+write, subscription read, webhook read+write. Full access, refunds, subscription writes and other scopes are off. Secrets remain in ignored `.local` files (0600), never source or logs. Preview configuration is to be scoped to `codex/creem-usd-billing`; production credentials and live checkout remain absent.

Four sandbox products were created and checked through the official SDK. A CLI-delivery webhook supports authenticated local forwarding without opening a public tunnel or disabling Vercel protection. `harness/provision-creem-sandbox.mjs` is sandbox-only and opt-in for mutations. `harness/creem-local-acceptance.mjs` runs the real app/API against an isolated QA identity; its credentials are ignored. Use `node --use-env-proxy` on this host so requests follow its configured network proxy. Production does not need that local network option.

## Verification so far

- Node regression suite: 77 tests pass, including authentication, origin/ownership, price tampering, webhook bytes/signatures/replays, cancellations, refunds, checkout retries and AI access.
- Production Vite build passes. TypeScript has 43 existing diagnostics; no new billing-module diagnostics (two old payment-order type diagnostics were fixed).
- Database migration `20261029031817_creem_billing.sql` was dry-run with rolled-back fixtures, then applied to the existing `tradegrail` project. SQL checks verify RLS owner visibility, denied anonymous/cross-user access, denied client writes/private RPC execution, event/stale-state/refund behavior and test/live separation. No existing subscription was overwritten or removed.
- Security advisors: event/block tables deliberately have RLS with no public policies and no client grants (service role only). Existing mutable `update_updated_at_column` and disabled leaked-password protection remain baseline findings. References: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy and https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable .
- Actual sandbox catalog returns all four validated offers. Authenticated checkout creation succeeds. Browser completion, webhook settlement, cancellation, failure-path acceptance and Preview deployment are still being exercised.

## Before real collection

Complete sandbox acceptance, owner review of the prepared public terms/privacy/refund pages and prices, accessible matching support contact, Creem business/identity approval, and separate restricted live credentials/products/HTTPS webhook. Creem requests branded support email; Gmail is the owner's selected inbox, but `tradegrail.net` currently has no MX. Do not assert that a domain mailbox or forwarder works until it is configured and verified. Do not check the merchant-review declarations while website requirements remain incomplete. No live payment, payout or bank-account action is authorized to be performed by the agent.

GSC/analytics configuration remains a separate outstanding request. No measured traffic, signup or conversion baseline is claimed by this billing work.

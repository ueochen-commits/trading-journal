# Creem USD billing — acceptance in progress

TradeGrail has its own merchant store, separate from Codex Pet kit. The owner supplied business details and approved the support email. Business-review declarations and identity verification have not been submitted by the agent.

## Scope

- New unpublished launch prices: Pro $9/month or $90/year, Elite $19/month or $190/year. The owner superseded the earlier preserve-price instruction; old purchased entitlements remain intact. The server validates product ID, price, USD currency, cadence, environment and absence of unadvertised trial/metering.
- Authenticated server checkout uses a database reservation and an opaque checkout reference. Browser price, product/customer/user IDs and redirect URLs are not trusted. No email or trading content is prefilled into Creem by the backend.
- Native Vercel Web handler preserves raw webhook bytes. HMAC verification, event idempotency, provider re-fetch, stale-update protection and transaction-specific refund/dispute blocks govern access. Canceled subscriptions retain the paid period; test memberships never grant production access.
- One security-invoker entitlement view combines existing subscriptions with valid production Creem memberships. Existing legacy/trial records are preserved. The UI, screenshot validation and AI quota use the same source.
- Subscription and AI-usage writes are server-only. Four AI endpoints verify the access token, ignore supplied user IDs, and consume an atomic shared quota. Removed the unused browser callback that claimed to verify XorPay signatures.
- Returning from checkout checks server state; it does not itself grant access. The app supports portal cancellation/invoices and explains automatic renewals, annual billing and checkout tax calculation.

## Configuration and isolation

Server-only configuration is documented in `.env.example`. Default checkout is unavailable without valid credentials and explicit `CREEM_CHECKOUT_ENABLED=true`. A test key is rejected on Production. Preview defaults to its immutable Vercel URL; use `localhost`, not a loopback IP, for a local Creem return URL (the provider rejects the latter).

The owner explicitly approved creation/storage of a restricted **sandbox-only** key: checkout/product/customer read+write, subscription read, webhook read+write. Full access, refunds, subscription writes and other scopes are off. Secrets remain in ignored `.local` files (0600), never source or logs. Preview configuration is to be scoped to `codex/creem-usd-billing`; production credentials and live checkout remain absent.

Four sandbox products were created and checked through the official SDK. A CLI-delivery webhook supports authenticated local forwarding without opening a public tunnel or disabling Vercel protection. `harness/provision-creem-sandbox.mjs` is sandbox-only and opt-in for mutations. `harness/creem-local-acceptance.mjs` runs the real app/API against an isolated QA identity; its credentials are ignored. Use `node --use-env-proxy` on this host so requests follow its configured network proxy. Production does not need that local network option.

## Verification so far

- Node regression suite: 85 tests pass, including authentication, origin/ownership, price tampering, webhook bytes/signatures/replays, cancellations, refunds, checkout retries and AI access.
- Production Vite build passes. TypeScript has 43 existing diagnostics; no new billing-module diagnostics (two old payment-order type diagnostics were fixed).
- Database migration `20261029031817_creem_billing.sql` was dry-run with rolled-back fixtures, then applied to the existing `tradegrail` project. SQL checks verify RLS owner visibility, denied anonymous/cross-user access, denied client writes/private RPC execution, event/stale-state/refund behavior and test/live separation. No existing subscription was overwritten or removed.
- Security advisors: event/block tables deliberately have RLS with no public policies and no client grants (service role only). Existing mutable `update_updated_at_column` and disabled leaked-password protection remain baseline findings. References: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy and https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable .
- Actual sandbox catalog returns all four validated offers. Authenticated checkout creation succeeds. Browser completion, webhook settlement, cancellation, failure-path acceptance and Preview deployment are still being exercised.

## Before real collection

Complete sandbox acceptance, owner review of the prepared public terms/privacy/refund pages and prices, accessible matching support contact, Creem business/identity approval, and separate restricted live credentials/products/HTTPS webhook. Creem requests branded support email; Gmail is the owner's selected inbox, but `tradegrail.net` currently has no MX. Do not assert that a domain mailbox or forwarder works until it is configured and verified. Do not check the merchant-review declarations while website requirements remain incomplete. No live payment, payout or bank-account action is authorized to be performed by the agent.

GSC/analytics configuration remains a separate outstanding request. No measured traffic, signup or conversion baseline is claimed by this billing work.


## Owner steering: local adjustments only, 2026-10-29

The owner paused policy publication/merchant review and then requested IP-selected single-currency billing, profitable affordable prices and removal of personal identity from public pages. Public-name approval is revoked. The website drafts now use TradeGrail and the approved support email; private legal details remain solely in the merchant verification draft. Do not publish the private address or old personal-name preview screenshot.

New regional prices are versioned in shared/billing-market.mjs, mirrored byte-for-byte in the landing repo. CN uses prepaid CNY 29/290 Pro, 69/690 Elite; others use USD 9/90, 19/190. Both UI and creation endpoints check the market independently of language. Existing USD portal/status and webhooks continue to work across regions. New lifetime purchase offers are removed. Cloudflare proxy country handling validates the Vercel-controlled forwarding IP against official published CDN ranges; production country forwarding still needs acceptance. API responses are no-store and contain no IP address.

The initial Creem migration **20261029031817** has already been applied to the production database (service-only billing tables/RPCs, read-only user entitlements/AI usage, canonical entitlement view); existing memberships were preserved. The new policy migration **20261029090000_launch_billing_policy.sql is not applied**. It adds bounded monthly/daily quotas for new plans while preserving existing paid legacy rights, and atomic domestic payment acknowledgement/membership insertion. It was executed only in isolated PGlite PostgreSQL and asserts callback rollback/idempotency, transaction reuse rejection, renewal extension, UTC quota boundaries, sandbox exclusion and legacy preservation. Deploy its server and migration together.

The draft also bounds AI context/output, uses currently available deepseek-flash with thinking disabled, verifies AI CSV access, and authenticates/owner-filters background reports before reading content or forwarding to the fixed first-party AI endpoint. Browser Origin cannot receive report content/bearer credentials. Native model listing confirmed current IDs; model generation quality remains to be accepted. The report/CSV clients forward verified sessions.

Four new versioned sandbox products were created and their catalog verified at 9/90/19/190 USD. Old sandbox products/subscriptions were not modified. Private local test configuration now points to the new IDs; the branch-scoped Vercel Preview configuration still has the earlier IDs and must be synchronized at the next Preview release. No Production Creem key/configuration exists. The last protected Preview (before these revisions) is https://trading-journal-o8uax5ymp-chenzhixuns-projects.vercel.app; it is not acceptance of this latest version.

The old $5 sandbox hosted checkout correctly displayed a declined-card error. No successful sandbox payment/webhook round trip, actual model generation or real charge is claimed. The local payment/webhook bridge was stopped to avoid using a stale build during draft changes. The fake QA identity and ignored private fixture files are retained for completion and must be cleaned up with identity/metadata verification when the complete billing acceptance is finished. No real user data was edited by these tests.

Local verification: 85 app tests, 9 public-site tests, production builds and landing TypeScript pass; dashboard has 43 pre-existing TypeScript diagnostics and none in new billing/AI modules. Local country-fixture browser checks verified English UI with CNY monthly/yearly, Chinese UI with USD, and terms without private identity. New pricing/policy changes are local, not merged to main or published. Profit assumptions and remaining release tasks are in ../tradegrail-landingpage/growth/PRICING-2026-10-29.md. Search Console and real funnel analytics are still outstanding.

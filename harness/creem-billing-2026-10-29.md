# TradeGrail billing acceptance — 2026-10-29

The owner approved the regional prices, public brand-only policies and software release. The earlier publication pause is lifted. Public support is the approved ueochen@gmail.com; private legal identity/address remain in Creem only. This record supersedes the earlier draft status.

## Accepted implementation

- CN IP: prepaid Alipay Pro CNY29/290, Elite69/690. Other countries: Creem USD9/90 and19/190. One currency follows server-derived country, independently of UI language. Vercel-controlled forwarding IP must match an official Cloudflare proxy range before accepting its country header. Real public www/apex requests returned SG/USD with countrySource=cloudflare. Mainland behavior was verified with explicit local fixtures, not an actual mainland connection.
- Server authentication, validated catalog/amount/currency/cadence, same-origin creation, opaque checkout reservations, exact raw-byte HMAC verification, duplicate-event protection, provider reconciliation and transaction-specific refund blocks. Canceled subscriptions keep their paid period. Sandbox never grants live paid rights. Reconciliation now checks authoritative cumulative refund totals even when the event snapshot is stale. Fully refunded returns show inactive, not indefinitely pending.
- Return URLs remove provider order/customer/subscription/signature parameters; only the opaque attempt remains during verification and is removed on dismiss. Both payment dialogs link terms/refunds. Domestic QR is generated locally, timers are cleared on unmount, and errors/expiry are visible. Only the actually verified Alipay method is offered; WeChat returned pay_type_error and is not advertised. No external QR generation or mock-payment shortcut remains.
- The service-only atomic domestic callback validates amounts and transaction reuse, acknowledges payment and inserts a new entitlement in one transaction. It preserves old purchased rights and extends same-plan renewals. Applied migrations: 20261029031817_creem_billing and 20261029040343_launch_billing_policy. The latter was renamed to its actual recorded database version. RLS/grants and rollback-only production-schema assertions passed; no existing membership was overwritten or deleted.
- New AI quotas: Free30/month5/day, Pro300/month30/day, Elite600/month60/day, UTC calendar month/no rollover. Existing active legacy paid quotas remain. Four AI routes verify sessions and share atomic quota; background reports enforce ownership and a fixed first-party destination. Flash non-thinking input/output are bounded. Ordinary manual trade entry is unaffected.
- Removed static, unsupported $15 referral rewards, fake earnings/leaderboard and the unverified invite domain. Sharing now copies the real public website without promising cash or points.

## Verification

88 Node tests and production Vite build pass. Final TypeScript count is 41 pre-existing diagnostics, down from43 after replacing the static referral page; no new payment/AI diagnostics. Isolated PGlite validates SQL syntax, grants, atomic rollback, idempotency, amount/transaction integrity, renewal, quota/month boundaries, sandbox separation and legacy rights.

Actual sandbox browser checkout: USD9 Pro monthly andUSD190 Elite annual both paid using official fake cards; signed completed/paid webhooks returned200. Return verification and URL cleanup passed; duplicate active checkout was rejected. Product customer portal opened and Pro cancellation preserved the paid end date. USD1 thenUSD8 refunds succeeded; authoritative reconciliation now disables the fully refunded Pro membership and records its transaction block.

Annual USD190 full refund was attempted but rejected for insufficient TEST available balance. Provider displays -USD9 available, USD190.43 incoming, expected2026-11-05. This test is NOT passed. Annual test subscription is now scheduled to cancel at its paid period end2027-10-29, with no renewal. No real charge, transfer, payout or deposit occurred.

Actual Alipay API and app dialog produced a valid unpaid CNY29 invoice/QR for a tagged fake QA identity; it was not scanned or paid. Signed-callback transactional behavior was checked with rollback-only SQL fixtures. No real domestic money/refund round trip is claimed. Four authenticated AI feature endpoints returned200 with expected shapes using synthetic content; fifth daily request succeeded and sixth returned429. No real user quota/content was used.

Restricted sandbox key scopes remain checkout/product/customer read+write, subscription read, webhook read+write. No write/refund scopes were expanded. Ignored0600 local files hold test fixtures/secrets. Branch-scoped protected Preview uses only sandbox configuration. Production rejects test keys and has no live Creem configuration, so real USD checkout remains unavailable.

## Remaining external gates

Cloudflare login remains IP-rate-limited after a cooled-down retry. No bypass or repeated refresh loop; support@tradegrail.net is not configured. Keep the working approved Gmail visible and do not claim a branded mailbox exists. Creem review draft has correct prices/limits/policies but all final declarations remain unchecked. Branded email, remaining annual refund test, owner merchant declarations/identity/payout requirements, approval and separately authorized live keys/SKUs/HTTPS webhook must be complete before real USD collection. No review submission or live USD activation is claimed.

Search Console and real traffic/signup/activation/conversion analytics remain a separate outstanding request; signup-click hooks alone are not live reporting. Final source/deployment identities and public smoke checks are recorded in parent STATUS.md.

## Merchant readiness follow-up

Four LIVE products are now prepared in TradeGrail's own merchant store at9/90/19/190USD, with no trial or metered add-on, automatic-renewal/full-annual-charge descriptions and correct quotas. No checkout links are published. Production credentials/webhook and real collection are still absent/disabled until separately confirmed and ready. Live catalog UI shows4active products,0sales. Business draft had stale old prices on re-open; corrected it again and verified new9/90,19/190 text survives a complete browser reload. Final declarations remain unchecked.

Visible working support contact is now available directly in the in-app plan and both payment dialogs, including error/unavailable states, as required by the merchant checklist. This uses the already-approved Gmail until branded mailbox delivery is actually verified. Build passes and TypeScript stays at41existing diagnostics, none in changed components. Cloudflare existing Google-profile sign-in still hits the rate limit; owner login handoff is pending. A restricted live-key dialog is prepared, not submitted: checkouts/customers read+write, products/subscriptions read; all other permissions off. Action-time owner confirmation is pending; do not create the key from vague approval.

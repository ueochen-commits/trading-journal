# Creem approval and monthly release preparation

## Verified provider state

Authenticated TradeGrail LIVE home explicitly says the store is live and can accept payments. This is positive approval evidence after the AUP re-review, rather than an inference from a disappeared review banner. The Payout Account tab still has no account linked to TradeGrail. The read-only verification center offers an existing approved payout account for linking; that final financial-account action belongs to the owner. No account detail, linking or financial transaction was performed.

All four existing LIVE SKUs validate at USD9/90/19/190 with the approved recurring cadence, exclusive tax and no trial or metering. An unpaid Pro monthly checkout tied to an existing isolated QA identity reaches the real payment-method step. In the observed Singapore billing context it shows USD9 plus GST0.81, total9.81, with cards, Apple Pay and Google Pay. Alipay is absent in this observed recurring checkout. This does not establish worldwide Alipay availability or supported renewal behavior. No card, wallet authorization or payment was submitted. Provider status stays pending; no live membership is granted.

## Staged release control

`CREEM_ENABLED_CYCLES=monthly` limits catalog and authenticated new purchases to the monthly offers. The server rejects annual requests before reservation/provider creation. Pricing checks the individual offer/cycle rather than requiring every cycle to be available. Existing subscription status, webhooks and portal management remain available when new purchases are disabled. An empty cycle list disables all new cycles; omission retains prior monthly/yearly behavior for existing sandbox setups.

Production has the monthly-only cycle variable. Open the global checkout gate only after corresponding monthly acceptance and positive provider approval; revert it if the production checks fail. Creem explicitly says the approved store can accept payments; payout linking is a separate owner step for receiving the balance, and remains incomplete. Do not claim payout or a real-money round trip is verified. Annual USD190 full refund still awaits test-balance settlement, previously estimated 2026-11-05; do not advertise annual checkout as open or call that test passed. Preserve domestic Alipay/XorPay and IP-derived single-currency behavior.

## Validation

- 21 billing tests pass, including monthly-only catalog/purchase rejection and management of existing subscriptions with all new cycles disabled.
- Production build passes. TypeScript retains 41 existing diagnostics; no errors in changed pricing/billing modules.
- Local browser fixture uses an existing Billing QA v2 account and blocks every payment mutation. Monthly Pro9 and Elite19 are selectable; switching to annual shows both90/190 offers explicitly unavailable and disabled. This is UI acceptance, not a provider payment or real charge.
- `harness/creem-live-prelaunch.mjs` validates real products and authenticated runtime handlers with a local monthly-only configuration; secrets remain in ignored0600 files and the checkout URL is saved privately. Report is in workspace output/creem-live-prelaunch-2026-10-30.json. It does not enable the public production flag.

Live production deployment and smoke checks are recorded in shared STATUS.md after completion. No schema, credentials, prices, refund promise, entity identity or domestic payment change is included.

## Production release

Application behavior commit `da885a5` is deployed at https://trading-journal-14mtjqwqi-chenzhixuns-projects.vercel.app and aliased to https://dashboard.tradegrail.net. Production monthly checkout is enabled, with `CREEM_ENABLED_CYCLES=monthly` keeping annual checkout disabled. All16 live HTTP checks pass: real Cloudflare SG/USD market, only two monthly offers, auth/origin checks, annual rejection, unpaid checkout/retry binding, pending state without membership, signature/mode rejection, and public website/policy availability. See workspace output/creem-monthly-live-acceptance-2026-10-30.json. No real payment/refund/payout is included in those checks.

Owner handoff remains the explicit financial-account association: select the approved existing account and link it to TradeGrail in the already-open verification page, after checking the destination personally. No bank details were read or account linked by the agent. Existing heartbeat now follows remaining payout/annual/Alipay work and preserves the live monthly launch instead of treating approval as pending.

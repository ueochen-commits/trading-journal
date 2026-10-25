# Batch two: onboarding, fee templates and futures calculations

User authorized implementing findings judged reasonable after review. This branch includes batch one. Production publication remains subject to the previously agreed user review. Email providers and delivery configuration are excluded; global navigation order is unchanged.

## New-user flow

- Welcome profile names and username are optional. One-character registration usernames remain valid. A profile upsert must return a saved row; errors are visible. The welcome page scrolls on small screens and can be deferred without preventing journal entry.
- Auth callback failures explain recovery; signup confirmation UI follows the returned session. Existing Google and email registration choices remain.
- Each authenticated identity gets a fresh app state. Previous profile/subscription/stat replies are discarded on identity changes. Token refresh cannot reopen welcome or overwrite newly saved preferences. An unavailable profile is not treated as evidence of a new user. Sensitive write services accept an expected user ID, rejecting old requests after account switches.
- Initialization ensures the existing idempotent demo account before reading the complete dataset. Failed reads no longer masquerade as empty accounts. App and form show the error and a retry. Draft fields survive retries.
- Every manual record has an explicit destination. All Accounts remains a filter. One personal account is selected automatically, explicit selections take precedence, and multiple accounts require a selection or a real saved preference. Demo destinations are clearly labeled. Personal account creation from the entry form preserves the draft and selects the newly created account.
- Settings' default account is backed by actual account IDs and user_settings.settings.defaultTradingAccountId. Previously local-only currency/timezone controls now show actual preferences and explain account currency; they no longer imply a saved change.
- Validation explains invalid dates, non-positive price/quantity/leverage and invalid amounts. Quantity starts at 1. Completed trades require an explicit P&L (including explicit 0) or the contract calculator. Risk references remain informational and cannot stop Add/Save/Edit.
- Saving returns the real journal UUID. A linked review uses that UUID and reuses its existing note. A secondary note failure cannot make an already-saved trade look unsaved; review text stays in the journal record.
- Exchange credentials/data are fetched before connection/account creation, so invalid APIs do not consume a slot. Account creation failures clean the unused connection. Later import failures retain one visible account with error status and an instruction to retry Sync there. Retry propagates import and status-save errors rather than announcing false success.
- CSV destinations are explicit. Settings CSV account creation checks the real quota and reuses its confirmed account on retry; insert success no longer depends on a subsequent full-table reload. Import callbacks use actual saved UUIDs. Files and imports retain their source fees; templates do not rewrite them.

## Fees and futures

- Settings > 手续费模板 persists account + symbol + account currency + basis + rate in existing user_settings.settings JSON. No migration or new privilege is needed. Duplicate aliases, deleted/demo accounts, invalid rates and currency mismatches are rejected. Save merges unrelated preferences and preserves risk settings.
- No default monetary rate. Per-trade totals, per-contract per-side rates, and per-contract round-trip rates are distinct. Only completed matched trades get template estimates. Open-position fees remain manual. Typing or choosing manual overrides the template; editing a saved record initially preserves its saved fee and net P&L.
- GC multiplier 100, tick 0.1/$10; NQ multiplier 20, tick 0.25/$5; ES multiplier 50, tick 0.25/$12.50. Standard contracts and their delivery/continuous aliases share specifications. Micro products, unrelated venues and unknown symbols do not silently inherit a multiplier.
- The user explicitly enables contract calculation. Direction-adjusted price difference × matched integer contracts × multiplier produces gross USD P&L. Fees are then deducted once. Leverage is not multiplied again. USD accounts only; no invented FX conversion. Partial exits must be split into matched lots or entered from broker-reported P&L. Weighted-average fills may legitimately be off tick. Manual correction remains available.
- Downstream notional percentages, volumes and implied risk prices use the futures multiplier; futures notional return is labeled separately from broker margin. Inline net-P&L editing no longer invents an exit price from net profit.
- Existing database P&L/fee values are not rewritten. Editing templates cannot change prior trades.
- Journal dialogs render above navigation, fit the viewport, scroll internally, retain a visible footer, and support focus return, keyboard containment and Escape. Mobile P&L and screenshot fields stack. Mobile Settings uses a section selector.

Sources checked 2026-10-25:
- https://supabase.com/changelog.md
- https://supabase.com/docs/reference/javascript/auth-onauthstatechange
- https://supabase.com/docs/reference/javascript/upsert
- https://www.cmegroup.com/education/courses/event-contracts-underlying-markets/product-gold
- https://www.cmegroup.com/markets/metals/precious/gold.contractSpecs.html
- https://www.cmegroup.com/markets/equities/nasdaq/e-mini-nasdaq-100.contractSpecs.html
- https://www.cmegroup.com/trading/equity-index/files/emini-nasdaq-100-futures-options.pdf
- https://www.cmegroup.com/markets/equities/sp/e-mini-sandp500.contractSpecs.html
- https://www.cftc.gov/filings/orgrules/rule030416cmedcm003.pdf

## Verification

- 53 Node regressions pass: account selection/validation; failed reads; expected-identity write guards; actual App exchange handler success/failure cases; UserContext stale replies and refresh behavior; fee basis/currency/account/alias validation; GC/NQ/ES long/short/zero/decimal/weighted-average calculations, unknown/micro rejection and notional calculations; all prior risk/demo/screenshot/CSV/P&L tests.
- Vite build passes. TypeScript has 45 existing diagnostics, down from 46; normalized comparison shows no new diagnostics. Resolved the existing UserContext PromiseLike.catch error. Pre-existing bundle-size/dynamic import warnings remain.
- Actual-component local browser fixtures: failed initialization visible; fill GC/price/P&L, retry without losing input, create an unlisted/no-broker personal account from the form, automatic destination selection, first Free save; optional-name/short-username profile failure is visible and can be deferred.
- Browser: configure GC USD 2.22 per side; two contracts estimate 8.88. 4050→4055 long yields gross 1000 and net 991.12. Save/reopen preserves fee 8.88 and net 991.12. Manual override gross 500/fee 7 previews net 493. Changing the template rate to 3 previews a new 12 fee, while the saved record stays 8.88/991.12 until explicitly changed.
- Default viewport 1280×720 and mobile 390×844 inspected. Mobile document width stays 390; modal save button is inside the viewport. Formula text wraps and amount 1000 is fully readable. Mobile template settings allow editing and saving. Temporary viewport reset.
- Supabase rollback-only authenticated verification passed: profile upsert with optional blank names and one-character username; settings JSON round trip; unrelated preferences and risk unchanged; other users' settings invisible. All test writes were rolled back. Constraints and RLS inspected; no schema/policy/grant changes. Security advisors retain existing restoration-era findings (search paths, subscription trigger EXECUTE grants, leaked-password protection); no new database objects were introduced.
- No real signup/confirmation-mail delivery or live broker credential sync was executed. Local fixtures test the interface and actual handler failure paths; they do not prove an end-to-end external email/exchange service integration.
- Screenshots: ../output/batch2-fee-calculation.png and ../output/batch2-calculation-mobile.png.

## Publication

Implementation only; main and production have not changed. A review preview will be recorded after deployment. Earlier onboarding stash remains preserved as historical recovery material; its audited and completed implementation is now on this branch.

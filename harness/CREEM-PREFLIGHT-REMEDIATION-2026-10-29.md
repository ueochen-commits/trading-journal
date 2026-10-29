# Creem preflight remediation — 2026-10-29

Owner authorized remediation and publication, explicitly excluding merchant-review submission.

## Implemented scope

- Academy, mock social feed and mock leaderboard are unavailable, removed from desktop/mobile navigation. Old deep links explain availability and link to the journal. Seeded friend messages, course/instructor/rating/student claims and hardcoded market ticker are no longer presented as live product content. No user journal data was erased.
- Public-trade URL/social buttons that generated an unimplemented .com URL were removed. Actual share-image download remains. Community post FAB is removed; old notebook publishing requests explain that publishing is unavailable.
- Manual accounts, journal entry, CSV import, screenshots, notebook and historical analytics remain. Exchange API creation, sync endpoint and UI are paused; existing account metadata and records remain accessible. The previous credential-permission tutorial is removed.
- All 26 legacy connection records (52 credential fields) migrated to AES-256-GCM v1 envelopes with random 96-bit IVs, 128-bit tags and row/column AAD. Values stayed in process memory; only ciphertext recovery copies were written to ignored 0600 local files. Server key is in ignored 0600 local storage and sensitive Vercel Production environment storage. Database policy now permits owner metadata reads/deletes only to authenticated clients, denies credential reads and inserts/updates, and rejects plaintext service writes. Service role is preserved. Historical provider backups and upstream exchange key permissions are outside this migration; re-enabling integrations requires a separate reviewed server-only flow and appropriate exchange-key permissions.
- Three fixed AI tasks use only numeric aggregates from closed, valid journal rows. Caller freeform messages, role history, symbols, notes and plans never enter the review prompt. Unsupported requests require auth, return400 and spend no quota. Empty histories use factual local output without spending quota. Model JSON is constrained/validated; unsafe or malformed output returns503. Reports are server-rendered escaped HTML. Existing NET P&L is never reduced by fees a second time. This reduces functionality and injection risk; it does not guarantee every language-model response or Creem category eligibility.
- Homepage and /pricing now share the same regional currency and plan component. Pro=3 real accounts, one currency follows server country independent of language. Monthly/annual charge disclosure is shared. No new refund/price commitment is introduced. USD checkout remains disabled.
- Landing mobile prototype mockup with fake leaderboard/shared trades is removed. Copy explains actual historical reviews, paused sync and manual/CSV paths. Privacy disclosure distinguishes aggregate historical AI review from optional CSV mapping.

## Validation

- App Node tests:97 passing at current checkpoint (including full bootstrap under column privileges). Builds pass. TypeScript baseline41 existing diagnostics; no new errors from changed modules.
- Landing TypeScript/build and10 tests pass;22 public pages prerender.
- Actual database acceptance:26 encrypted connections retained; authenticated metadata works under owner RLS, SELECT * and secret fields403, credential insert/update403, anon metadata401, service plaintext write23514; no test row created.
- Actual DeepSeek synthetic summaries passed structured-output validation in Chinese summary, English fee review and Chinese record-check tasks (441/471/409 total tokens). No real journal data was used in this model check.
- Security advisor unchanged: two intentionally service-only billing tables with RLS/no client policy (info); existing mutable timestamp-function search path and leaked-password-protection warnings remain. References: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable and https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.
- Browser / deployed acceptance is recorded in the final release section after completion.

## Not approved for merchant submission yet

Creem explicitly restricts generative AI and trading/investment education/communities. Removing false educational/social placeholders does not establish eligibility of the remaining AI journal or crypto-history use case. The actual product scope needs Creem clarification before making a no-prohibited-product declaration. Do not disguise or misclassify functions.

Merchant identity/payout verification and trademark/content-rights checks are not completed by these code changes. Sandbox annual USD190 full-refund acceptance remains uncompleted because test-balance settlement was unavailable; earlier USD9 split refunds succeeded. Do not claim a full annual refund passed or enable live checkout based solely on sandbox cancellation.

Official criteria: https://docs.creem.io/merchant-of-record/account-reviews/account-reviews and https://docs.creem.io/merchant-of-record/account-reviews/ai-wrapper-compliance . Text-only historical summaries do not trigger the separate image/video-generation Moderation API requirement, but generative-AI category review can still apply.

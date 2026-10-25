# Dark mode and Settings account flow — 2026-10-25

## Changes

- Shared dark CSS roles cover page surfaces, cards, text, borders, tooltips, chart tracks/grids, heatmaps and semantic profit/loss colors. Inline colors retain original light fallbacks; Tailwind variants cover class-based UI. The theme is applied before first paint and embedded chart widgets subscribe to root theme changes.
- Settings > Broker accounts > Add account now advances from the manual import option to an account details form. The search fallback actions and prominent unlisted-platform option reach the same form; any broker label or no broker is accepted. Save errors stay visible; repeated submit is blocked.
- Demo and manual accounts can edit name, balance and currency. Manual total-asset override remains available. Synced account balance/currency remain platform-controlled.
- Authenticated `ensure_default_trading_account()` uses a per-user transaction advisory lock and looks up `account_type = demo`, rather than the editable name. Client requests share pending initialization. Only the call that creates the demo seeds sample trades.
- Migration `20261025075837_ensure_single_default_demo_account.sql` was applied to the existing Supabase project. SECURITY INVOKER, authenticated-only execution, empty search path; ownership remains governed by existing RLS. Historical duplicate accounts and journals were preserved.

## Verification

- Production Vite build succeeds; four Node regression tests pass (`node --test tests/defaultAccount.test.mjs`).
- TypeScript diagnostics compared with the original commit: 46 existing diagnostics; no new source diagnostics. The existing baseline is not a clean typecheck.
- Database transaction test (rolled back): create a synthetic auth user, initialize demo under authenticated role, edit name/balance/currency, initialize again, assert same ID and exactly one demo. Passed; no test user persisted.
- Browser QA uses the actual App/components with local mocked auth and data; no live user account was changed. Local fixtures and environment files are ignored and excluded from Vercel uploads.
- Visually inspected main pages: dashboard, charts, journal, playbook, reports, notebook, psychology/risk, calendar, community, academy, notifications, settings, referrals and leaderboard.
- Inspected reports performance/overview/comparison/calendar/insights plus date-time, symbols, risk, strategy, tags and win/loss categories. Settings profile, security, subscription, account, brokers, trading parameters, TP/SL, fees, tags and notifications checked.
- Inspected dashboard data and empty states, chart axes/radar/heatmaps, calendar P&L cells, notebook content, forms/dropdowns and account form in dark mode; verified light/dark switching reinitializes TradingView with the selected theme.
- Settings flow exercised: edit a Demo's name/balance/currency; listed platform > manual > create; unlisted broker > create; invalid currency displays error; the search dropdown's manual fallback advances to the form.

## Scope and limitations

The local browser checks validate UI against fixtures; production authenticated third-party exchange sync, payments and AI calls were not exercised. Existing security findings from the service recovery remain outside this change. Historical duplicates are preserved rather than merged or deleted. Shared Project OS paths referenced by AGENTS.md are unavailable on this machine; the workspace STATUS.md records this release.

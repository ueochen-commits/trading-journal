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

## Follow-up — empty illustrations, notebook and free screenshots

- Added SVG dark variants for the shared cards/cloud empty states and the Psychology rules illustration. Theme switching uses CSS visibility and preloaded light/dark images; verified only the selected variant is visible and loaded for a Free fixture.
- Defined the previously missing dark `--border-tertiary` token used by Journal summary cards; the win-rate track now uses the dark track token.
- NotesPanel now has a slate editing surface, rounded border, separated toolbar, content padding and focus border; verified dark and light modes.
- Free accounts can attach up to **two screenshots per trade**, through file selection or clipboard paste. The picker displays both previews, individual remove actions, count, processing and limit feedback. Removing one permits another upload. Paid accounts retain their existing uncapped picker behavior.
- Fixed persistence that previously saved only the first image: every new screenshot uploads with a unique UUID path, both URLs persist in `screenshot_urls`, and `screenshot_url` mirrors the first for compatibility. NULL galleries read the legacy single URL; empty galleries stay empty. Upload failure rejects saving instead of dropping the image; Journal awaits save completion and shows errors without closing the form.
- Migration `20261025082351_trade_screenshot_gallery.sql` applied. The invoker trigger checks the Free quota against existing subscription records under RLS, permits existing unchanged paid galleries after downgrade, and mirrors the first URL. It grants no new table/storage permissions. Existing bucket visibility is unchanged. Before/after security advisors show the same five pre-existing findings.
- Database transaction test, rolled back: authenticated Free user persists two URLs; a third raises check_violation; removal clears both fields; active Pro permits three. No synthetic user or journal persisted.
- Eight Node tests pass (account initialization plus screenshot limits, legacy/gallery readback and upload failure). Vite production build passes; no new source TypeScript diagnostics against the existing baseline.
- Browser QA uses Free local fixtures and actual App/Journal upload/save code: select three files -> two accepted; third clipboard paste rejected; save -> refresh -> reopen retains both; delete -> paste permits replacement. No real user's trading data or screenshots were uploaded during QA. Source-generated neutral PNG test images were used.
- Desktop visual checks cover dashboard/report empty states, Journal card borders and dark track, Psychology checklist, and the notebook input surface. Evidence is in workspace `output/notebook-dark-refined.png` and `output/free-two-screenshots.png`. Temporary browser viewport override was reset.

## Follow-up — consistent module borders

Dark module frames now share the Journal reference's 0.5px stroke and `#253148` color. Neutral inline frames, hardcoded dashboard widget outlines and neutral Tailwind dark border colors resolve through the shared tokens; rounded card containers use a common module class. This covers the dashboard metrics/charts/score/calendar, reports, journal, playbook, notebook, risk, community, settings and related panels. Semantic warning/selection colors and focus states retain their dedicated styles. Light mode falls back to the original widths and colors. Visual QA includes populated dashboard card frames, feature-page panels, report categories, settings and light/dark toggling. This is a styling change with no database or entitlement changes.

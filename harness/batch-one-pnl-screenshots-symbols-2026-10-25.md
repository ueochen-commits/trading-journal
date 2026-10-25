# Batch one review preview

Scope approved by the user: unify P&L and total fees, expand screenshot viewing, resolve GC/NQ/ES chart symbols. Email and navigation changes are excluded. Production publication requires a separate user review and confirmation.

## Accounting contract

Trade.pnl is saved net P&L. Gross P&L = pnl + fees. Manual entry defaults to already-net, with an explicit gross input option and a live reconciliation. Total opening/closing fees are entered per record; the previous global last-fee default is no longer reused. Existing database amounts are not rewritten. Existing rows cannot be automatically classified as historically gross or net and may need reconciliation against their original statements.

CSV preview and save consume the same normalized rows. Explicit net/gross column names provide the default interpretation; generic P&L requires the user to choose visibly in preview. Changing basis always starts from immutable source amounts. Raw paired orders include both opening and closing fees. Unmatched quantities and futures without source P&L produce an actionable error instead of invented allocation/contract-multiplier calculations. Binance's separate realized P&L/commission fields are normalized once at the import boundary. Calendar, reports, playbooks, goals, daily cards, dashboard cards, sharing and AI context use saved net amounts without subtracting fees again.

## Screenshot review

Free stays at two uploads per trade. Entry form images open a modal viewer with zoom/reset/pan, previous/next, Escape and a focus trap. Review attachments open a docked viewer in the left pane. The chart and notes on the right remain interactive: no backdrop, body lock, or focus trap in embedded mode. Arrow keys/Escape only act on the docked viewer when it has focus. Mobile uses a stacked viewer/chart layout and hides notes while that viewer is open.

## Chart mapping and data limitations

GC -> COMEX:GC1!, NQ -> CME_MINI:NQ1!, ES -> CME_MINI:ES1!. Continuous references are labeled. Explicit venue symbols and four-digit delivery years remain exact. Unknown symbols do not become Binance pairs; users can choose a reference without altering the saved trade.

Live browser verification found the correct CME/COMEX symbols are not available in TradingView's free embedded feed. The application presents the licensing limitation and a correctly encoded TradingView chart link rather than an invalid-symbol iframe or a silent spot/CFD substitute. Manually selecting an allowed reference loads the interactive widget.

Sources checked 2026-10-25:
- https://www.tradingview.com/widget-docs/faq/data/
- https://www.tradingview.com/widget-docs/markets/north-america/
- https://www.tradingview.com/symbols/COMEX-GC1%21/
- https://www.tradingview.com/symbols/CME_MINI-NQ1%21/
- https://www.tradingview.com/symbols/CME_MINI-ES1%21/
- https://developers.binance.com/docs/derivatives/usds-margined-futures/trade/rest-api/Account-Trade-List

## Verification

- Unit/regression coverage: accounting reconciliation, losses/breakeven/decimal values/invalid inputs, CSV basis inference and reversible switching, total opening+closing fees, partial-fill failure, unsupported futures calculations, Binance normalization, persisted statuses, chart aliases/delivery contracts/unknowns/restricted feed links, existing demo/risk/screenshot tests.
- Browser uses actual App/components and local fixture persistence, without writes to production users or records.
- Browser: Free gross 500 + fee 4 saves net 496 with two screenshots; reload/edit stays 496; detail gross 500/fee 4/net 496; modal zoom and image switching; docked viewer remains open at 150% while the right TradingView changes to one-hour candles; CSV ambiguous basis disables confirmation with an explanation, gross preview/save total 494 including a fee-induced loss of -2; repeated mode changes do not compound fees.
- Desktop 1440x1000 and mobile 390x844 exercised. Both themes exercised. Mobile docked screenshot and chart fit without horizontal page overflow.
- npm run build passes. TypeScript retains the repository's 46 pre-existing errors, without new diagnostics.
- No database migrations or historical data writes in this batch.

## Prior draft isolation

The earlier unapproved onboarding draft is preserved in Git stash named 'Unapproved onboarding draft preserved before batch one', on codex/new-user-first-trade. It is excluded from this branch and preview.

## Review deployment

- 34 tests passed; build passed.
- Runtime commit: 8d4c33f084c598c86ed3f4f6d683d98379ceca7d.
- Vercel preview: https://trading-journal-9slo992zc-chenzhixuns-projects.vercel.app
- Deployment dpl_6UVAeeZNrE652e8dsKURhiSBGGVJ is Ready with target preview. Vercel deployment protection remains enabled.
- Production remains at fdd2fd9, served index-D-P4QlzY.js; preview serves index-rkWDD-kn.js.
- No main push or production alias update. Await user confirmation before publishing.

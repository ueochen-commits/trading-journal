# TradeGrail Dashboard Agent Instructions

This repository is part of the TradeGrail project. Before making changes here, read the shared Project OS:

- `/Users/zhixunchen/Documents/TradeGrail/AGENTS.md`
- `/Users/zhixunchen/Documents/TradeGrail/PROJECT_CONTEXT.md`
- `/Users/zhixunchen/Documents/TradeGrail/STATUS.md`
- Relevant constraints in `/Users/zhixunchen/Documents/TradeGrail/constraints/`

## Repository Responsibility

This repo owns the authenticated dashboard app at `https://dashboard.tradegrail.net`.

It is responsible for:

- Supabase Auth login/signup/session handling
- User onboarding
- Trading journal and analytics
- Import/sync workflows
- AI analysis and reporting
- Payment, subscription, and entitlement flows
- User data persistence and access control

## Security Rules

- Never expose service-role keys, payment secrets, AI provider keys, or exchange secrets to the browser.
- Avoid `VITE_` prefixes for server-only secrets.
- Payment, Supabase RLS, auth, and deployment changes must update the shared Project OS docs when they affect behavior or risk.

## Verification

Use `/Users/zhixunchen/Documents/TradeGrail/harness/README.md` as the baseline for checks.


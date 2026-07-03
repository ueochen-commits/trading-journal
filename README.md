# TradeGrail Trading Journal

TradeGrail Trading Journal is the main application for trade review, performance analytics, account tracking, and AI-assisted coaching. It is built for traders who want a structured workflow for importing trades, reviewing execution, tracking discipline, and turning trading data into repeatable improvement.

Production app: https://dashboard.tradegrail.net

## Core Features

- Trade journal with screenshots, notes, ratings, mistakes, and review notes
- Dashboard analytics for PnL, win rate, account performance, and trading behavior
- CSV import workflow for historical trade data
- Exchange connection and sync support
- AI analysis, coaching, report generation, and CSV diagnostics
- Strategy library, playbooks, pre-trade checklists, and trading plans
- Risk management, psychology tracking, progress goals, and calendar review
- Membership, payment, referral, and account settings flows
- Supabase-backed user data, reports, account records, and access control

## Tech Stack

- React 19
- TypeScript
- Vite
- Supabase
- Vercel
- Recharts and lightweight-charts
- Tiptap editor
- CCXT exchange integration
- Gemini / AI service integrations

## Project Structure

```text
api/                 Vercel serverless API routes
components/          Application screens and shared UI components
hooks/               React hooks
lib/                 Shared utilities and export helpers
services/            Data, AI, exchange, and payment services
supabase/migrations/ Database schema and policy migrations
App.tsx              Main application shell and routing state
supabaseClient.ts    Supabase client and report helpers
types.ts             Core domain types
```

## Local Development

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Start the development server:

```bash
npm run dev
```

The Vite dev server runs on port `3000` by default.

## Environment Variables

Required variables are documented in `.env.example`.

Common variables include:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `GEMINI_API_KEY`
- `VITE_XORPAY_API_URL`
- `VITE_XORPAY_APP_ID`
- `VITE_XORPAY_APP_SECRET`
- `VITE_XORPAY_TEST_MODE`

Never commit real API keys or Supabase service-role credentials.

## Supabase

This repo keeps database changes in `supabase/migrations`.

After logging in to the Supabase CLI and linking the project, migrations can be reviewed and applied from the local machine.

```bash
supabase link --project-ref <project-ref>
supabase db push
```

## Deployment

The application is deployed on Vercel as the `trading-journal` project.

Useful commands:

```bash
vercel pull --environment=development
vercel deploy
vercel deploy --prod
```

Before production deployment, make sure the Vercel environment variables match the Supabase project and payment provider configuration.

## Scripts

```bash
npm run dev      # Start local development
npm run build    # Build production assets
npm run preview  # Preview the production build locally
```

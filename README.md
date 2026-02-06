# Orion

Production readiness analysis platform. Paste a repo, find out how many users your code can handle before it breaks.

## what it does

- scans **12 categories** of production readiness (security, database, backend, auth, testing, deployment, etc.)
- calculates your **altitude** -- the max concurrent users your code supports, from Runway (10 users) to Orbit (10M+)
- identifies your **bottleneck** category and gives specific fixes with estimated impact
- optional **compile verification** via E2B sandboxes (actually builds your code)
- **PDF export** for stakeholder reports (Pro)

## quick start

```bash
# web
npm install
cp .env.example .env.local   # fill in keys
npm run dev

# cli (no account needed)
npx orion-archi .
```

## cli

```bash
npx orion-archi .
npx orion-archi /path/to/project
```

scans local files, detects stack, scores 8 categories, outputs a ship/no-ship verdict with progress bars and blockers. no sign-up, no API key needed for the CLI.

published on npm as [`orion-archi`](https://www.npmjs.com/package/orion-archi).

## tech stack

- **Next.js 16** (App Router, Turbopack)
- **TypeScript** (strict mode)
- **Prisma** + PostgreSQL (Neon)
- **Claude** (Haiku for analysis, Sonnet for generation)
- **Stripe** for subscriptions
- **React Three Fiber** + postprocessing for 3D visuals
- **Tailwind CSS** + Framer Motion
- deployed on **Vercel** at [orion.archi](https://orion.archi)

## environment variables

see `.env.example` for the full list. required:

- `DATABASE_URL` -- PostgreSQL connection (pooled)
- `DATABASE_URL_UNPOOLED` -- PostgreSQL direct connection
- `NEXTAUTH_SECRET` -- session encryption key
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` -- GitHub OAuth app
- `ANTHROPIC_API_KEY` -- Claude API
- `STRIPE_SECRET_KEY` / `STRIPE_PRICE_ID` / `STRIPE_WEBHOOK_SECRET` -- Stripe

## tiers

| | Free | Pro ($29/mo) |
|---|---|---|
| scans/month | 3 | unlimited |
| findings shown | top 2 | all |
| PDF export | no | yes |

## license

MIT

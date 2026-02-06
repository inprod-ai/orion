# Deployment Checklist for orion.archi

## Prerequisites

- [ ] PostgreSQL database (Neon recommended, free tier works)
- [ ] Vercel account
- [ ] GitHub OAuth App
- [ ] Stripe account
- [ ] Anthropic API key
- [ ] E2B account (free, no credit card -- e2b.dev)

## Environment Variables

Create these in Vercel dashboard:

- [ ] `DATABASE_URL` - PostgreSQL connection string (pooled)
- [ ] `DATABASE_URL_UNPOOLED` - PostgreSQL direct connection
- [ ] `ANTHROPIC_API_KEY` - Claude API key
- [ ] `GITHUB_CLIENT_ID` - From GitHub OAuth app
- [ ] `GITHUB_CLIENT_SECRET` - From GitHub OAuth app
- [ ] `NEXTAUTH_URL` - Production URL (https://orion.archi)
- [ ] `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- [ ] `STRIPE_SECRET_KEY` - From Stripe dashboard
- [ ] `STRIPE_WEBHOOK_SECRET` - From Stripe webhook endpoint
- [ ] `STRIPE_PRICE_ID` - Pro plan price ID
- [ ] `NEXT_PUBLIC_URL` - Production URL (https://orion.archi)
- [ ] `E2B_API_KEY` - From E2B dashboard (e2b.dev)

## Setup Steps

### 1. Database Setup
```bash
vercel env pull .env.production.local
npx prisma db push --accept-data-loss
```

### 2. GitHub OAuth Setup
1. Go to https://github.com/settings/developers
2. Create new OAuth App
3. Set Authorization callback URL: `https://orion.archi/api/auth/callback`
4. Copy Client ID and Client Secret to Vercel

### 3. Stripe Setup
1. Create a product and price in Stripe dashboard
2. Set up webhook endpoint: `https://orion.archi/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy webhook signing secret to Vercel

### 4. E2B Setup
1. Sign up at e2b.dev (free, no credit card)
2. Get API key from dashboard
3. Add to Vercel as `E2B_API_KEY`
4. Free tier includes $100 credits (~5,000-20,000 scans)

### 5. Deploy
```bash
vercel --prod
```

### 6. Post-Deployment Verification
- [ ] GitHub auth works (sign in, sign out)
- [ ] Free tier limits enforced (3 scans/month)
- [ ] Analysis runs end-to-end (fetch files -> AI analysis -> results)
- [ ] Sandbox verification works (compile level shows build result)
- [ ] Semgrep findings appear with CWE references
- [ ] Capacity estimation returns factors from actual code
- [ ] Stripe checkout flow works
- [ ] PDF export works for Pro users

## Cost Model

per-scan costs (paid by Orion, not the user):

| component | cost/scan | notes |
|---|---|---|
| Claude Haiku (analysis) | ~$0.01 | 2-3K input tokens |
| Claude Haiku (capacity) | ~$0.01 | reads arch files |
| E2B sandbox (compile) | ~$0.005 | 30-60s, 2 vCPU |
| E2B sandbox (Semgrep) | ~$0.01 | 30-90s, pip install |
| E2B sandbox (tests) | ~$0.02 | 2-3 min |
| E2B sandbox (mutation) | ~$0.10 | 5-10 min |
| E2B sandbox (load) | ~$0.20 | 5-10 min |
| Neon database | ~$0 | free tier |

at 100 Pro users doing 30 scans/month at compile level:
- revenue: $2,900/month
- cost: ~$150/month (5% COGS)

## Security Checklist

- [ ] All API keys in environment variables (never in code)
- [ ] E2B sandbox isolates untrusted code execution
- [ ] SSRF protection on GitHub URL parsing
- [ ] Rate limiting for anonymous users (3/day)
- [ ] Session encryption (AES-256-GCM)
- [ ] Prisma prevents SQL injection
- [ ] Security headers set in next.config.js
- [ ] Error messages sanitized in production

## Maintenance

- Monitor E2B usage (dashboard.e2b.dev)
- Monitor Stripe webhook failures
- Check Neon database performance
- Review error logs in Vercel
- Update dependencies monthly

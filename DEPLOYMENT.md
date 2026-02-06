# Deployment Checklist for orion.archi

## Prerequisites

- [ ] PostgreSQL database (Supabase, Neon, or similar)
- [ ] Vercel account
- [ ] GitHub OAuth App
- [ ] Stripe account
- [ ] Anthropic API key

## Environment Variables

Create these in Vercel dashboard:

- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `ANTHROPIC_API_KEY` - Claude API key
- [ ] `GITHUB_CLIENT_ID` - From GitHub OAuth app
- [ ] `GITHUB_CLIENT_SECRET` - From GitHub OAuth app
- [ ] `NEXTAUTH_URL` - Your production URL (https://orion.archi)
- [ ] `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- [ ] `STRIPE_SECRET_KEY` - From Stripe dashboard
- [ ] `STRIPE_WEBHOOK_SECRET` - From Stripe webhook endpoint
- [ ] `STRIPE_PRICE_ID` - Your Pro plan price ID
- [ ] `NEXT_PUBLIC_URL` - Your production URL (https://orion.archi)

## Setup Steps

### 1. Database Setup
```bash
# After setting DATABASE_URL in Vercel
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

### 4. Deploy to Vercel
```bash
vercel --prod
```

### 5. Post-Deployment
- [ ] Test GitHub authentication
- [ ] Test free tier limits (3 scans/month)
- [ ] Test Stripe checkout flow
- [ ] Test PDF export for Pro users
- [ ] Monitor error logs

## Monitoring

### Error Tracking (Optional)
Consider adding:
- Sentry for error tracking
- LogRocket for session replay
- PostHog for analytics

### Performance Monitoring
- Vercel Analytics (built-in)
- Lighthouse CI for performance regression

## Security Checklist

- [ ] All API keys are in environment variables
- [ ] Database has proper indexes
- [ ] Rate limiting is active
- [ ] CORS is properly configured
- [ ] All user inputs are validated
- [ ] SQL injection prevention (Prisma handles this)

## Maintenance

### Regular Tasks
- Monitor Stripe webhook failures
- Check database performance
- Review error logs
- Update dependencies monthly

### Backup Strategy
- Database: Enable point-in-time recovery
- Code: GitHub repository
- User data: Regular database exports

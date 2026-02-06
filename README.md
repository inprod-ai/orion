# Orion

Paste a repo, find out how many users your code can handle before it breaks.

## how it works

Orion fetches your actual code, reads it, and runs it in a sandbox.

1. **fetches all files** from the GitHub repo via API
2. **reads the code** with Claude (not just metadata -- it reads your route handlers, middleware, database config)
3. **runs 12 category analyzers** on the real file contents (security, testing, backend, database, auth, deployment, etc.)
4. **estimates capacity** by analyzing your architecture -- connection pool sizes, caching layers, worker config, scaling setup -- against known infrastructure benchmarks
5. **compiles your code** in an E2B sandbox to prove it builds
6. **runs Semgrep** (AST-level security scanner) against your code with OWASP rules -- finds real vulnerabilities with CWE references and line numbers
7. **runs your test suite** in the sandbox, parses pass/fail counts and coverage
8. **mutation tests** your code with Stryker to prove your tests actually catch bugs
9. **load tests** with k6 to measure actual concurrent user capacity

each level builds on the previous. you choose how deep to go.

## verification levels

| level | what happens | cost |
|---|---|---|
| **static** | pattern analysis + Claude reads code + capacity estimation | ~$0.03 |
| **compile** | + compiles in sandbox + Semgrep AST security scan | ~$0.05 |
| **test** | + runs test suite, parses coverage | ~$0.08 |
| **mutation** | + Stryker mutation testing (proves test quality) | ~$0.20 |
| **load** | + k6 load testing (measures real user capacity) | ~$0.50 |
| **full** | all of the above | ~$0.60 |

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

scans local files, detects stack, scores 8 categories, outputs a ship/no-ship verdict. no sign-up needed.

published on npm as [`orion-archi`](https://www.npmjs.com/package/orion-archi).

## what the output looks like

for a real scan of a Node.js project:

- **score**: 39/100
- **altitude**: Runway (50 users)
- **bottleneck**: single-threaded `http.createServer()` with no clustering
- **capacity factors**: in-memory state (500 user limit), no caching (100 user limit), no container config (50 user limit)
- **compile**: builds successfully, 0 errors
- **semgrep**: 16 findings -- XSS via innerHTML, ReDoS from non-literal RegExp, hardcoded JWTs, missing subresource integrity -- each with CWE, OWASP mapping, file path, and line number

## tech stack

- **Next.js 16** (App Router, Turbopack)
- **TypeScript** (strict mode)
- **Prisma** + PostgreSQL (Neon)
- **Claude** (Haiku for analysis and capacity estimation, Sonnet for code generation)
- **E2B** sandboxes for compile/test/mutation/load verification
- **Semgrep CE** for AST-level security scanning
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
- `E2B_API_KEY` -- E2B sandbox (free tier: $100 credits, no credit card)

## tiers

| | Free | Pro ($29/mo) |
|---|---|---|
| scans/month | 3 | unlimited |
| findings shown | top 2 | all |
| verification | static only | compile + test |
| mutation/load | no | yes |
| PDF export | no | yes |

## license

MIT

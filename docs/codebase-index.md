# Codebase Index

**Generated**: 2026-01-22
**Purpose**: Technical reference for understanding system architecture, identifying gaps, and planning work.

---

## 1. Component Dependency Graph

### Page Components

```
app/page.tsx (Home)
├── components/UserMenu.tsx
├── components/RepoSelector.tsx
├── components/AnalysisScreen.tsx
│   └── @/lib/utils (extractRepoInfo, getScoreColor, getScoreGrade)
│   └── @/types/analysis (AnalysisResult, AnalysisProgress, CategoryScore, Finding)
└── @/lib/utils (extractRepoInfo)

app/upgrade/page.tsx
└── Standalone (uses fetch for /api/stripe/checkout)

app/altitude-demo/page.tsx
├── components/AltitudeDisplay.tsx
│   └── components/RocketVisualization.tsx
│   └── @/lib/orion/altitude (getAltitudeGradient, getStarsVisibility)
└── @/lib/orion/types (CategoryScore, AltitudeResult)
```

### Core Library Dependencies

```
lib/orion/analyzer.ts
├── lib/orion/stack-detector.ts
├── lib/orion/altitude.ts
├── lib/orion/types.ts
└── lib/orion/analyzers/index.ts
    ├── frontend.ts
    ├── backend.ts
    ├── database.ts
    ├── authentication.ts
    ├── api-integrations.ts
    ├── state-management.ts
    ├── design-ux.ts
    ├── testing.ts
    ├── security.ts
    ├── error-handling.ts
    ├── version-control.ts
    └── deployment.ts

lib/orion/generators/index.ts
├── security.ts (660 lines - most complete)
├── cicd.ts (374 lines)
├── testing.ts (267 lines)
└── readme.ts (126 lines)
```

### Authentication Flow

```
lib/github-auth.ts
├── lib/crypto.ts (AES-256-GCM encryption)
└── lib/prisma.ts (User lookup)

lib/github/index.ts
└── SSRF protection + repo cloning
```

---

## 2. API Endpoint Mapping

### Authentication (Custom OAuth)
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/login` | GET | None | Initiates GitHub OAuth, redirects to GitHub |
| `/api/auth/callback` | GET | None | Handles OAuth callback, creates session |
| `/api/auth/me` | GET | Session | Returns current user data |
| `/api/auth/logout` | POST/GET | Session | Clears session cookie |

### Analysis
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/analyze` | POST | Optional | AI-powered repo analysis (streaming) |
| `/api/complete` | POST | Required | Generate completion plan for gaps |
| `/api/generate` | POST | Required | Generate fix files for specific gaps |

### CLI-specific
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/cli/auth` | GET | None | CLI OAuth flow init |
| `/api/cli/auth/callback` | GET | None | CLI OAuth callback |
| `/api/cli/auth/me` | GET | Token | Verify CLI token |
| `/api/cli/analyze` | POST | Token | CLI analysis endpoint |
| `/api/cli/complete` | POST | Token | CLI completion plan |
| `/api/cli/fix` | POST | Token | CLI fix generation |

### Billing
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/stripe/checkout` | POST | Required | Create Stripe checkout session |
| `/api/stripe/webhook` | POST | Stripe sig | Handle Stripe events |

### Utilities
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/repos` | GET | Required | List user's GitHub repos |
| `/api/export/pdf` | POST | Pro | Generate PDF report |

---

## 3. Database Schema Relationships

```
┌─────────────────┐       ┌─────────────────┐
│      User       │       │    RateLimit    │
├─────────────────┤       ├─────────────────┤
│ id (cuid)       │       │ id (cuid)       │
│ email (unique)  │       │ key (unique)    │
│ name            │       │ count           │
│ image           │       │ resetAt         │
│ githubId        │       └─────────────────┘
│ tier (enum)     │
│ stripeCustomerId│
│ monthlyScans    │
│ lastResetAt     │
└────────┬────────┘
         │
    ┌────┴────┬─────────────┬──────────────┐
    │         │             │              │
    ▼         ▼             ▼              ▼
┌────────┐ ┌────────┐ ┌──────────┐ ┌──────────────┐
│Account │ │Session │ │   Scan   │ │ Subscription │
├────────┤ ├────────┤ ├──────────┤ ├──────────────┤
│userId  │ │userId  │ │userId?   │ │userId        │
│provider│ │token   │ │repoUrl   │ │stripeSubId   │
│tokens  │ │expires │ │scores    │ │stripePriceId │
└────────┘ └────────┘ │findings  │ │status (enum) │
                      │summary   │ └──────────────┘
                      │source    │
                      └──────────┘
```

### Enums
- **UserTier**: FREE, PRO, ENTERPRISE
- **SubscriptionStatus**: active, canceled, incomplete, incomplete_expired, past_due, trialing, unpaid

### Indexes
- `Scan`: userId, createdAt, source
- `RateLimit`: identifier, createdAt, resetAt

---

## 4. Test Coverage Analysis

### Current Test Files (4 files, 82 tests)

| File | Tests | Coverage Focus |
|------|-------|----------------|
| `security.test.ts` | 28 | Security analyzer: headers, secrets, XSS, SQLi |
| `altitude.test.ts` | 28 | Altitude calculations, zones, formatting |
| `analyzer.test.ts` | 20 | Main analyzer, summary, completion plan |
| `stack-detector.test.ts` | 6 | Tech stack detection |

### Coverage Gaps (Not Tested)

**Analyzers without dedicated tests:**
- [ ] `frontend.ts` - Framework detection, SSR checks
- [ ] `backend.ts` - API structure, middleware
- [ ] `database.ts` - Connection pooling, migrations
- [ ] `authentication.ts` - Auth provider detection
- [ ] `api-integrations.ts` - External API handling
- [ ] `state-management.ts` - State library detection
- [ ] `design-ux.ts` - Accessibility, responsive design
- [ ] `error-handling.ts` - Error boundaries, logging
- [ ] `version-control.ts` - Git workflow analysis
- [ ] `deployment.ts` - CI/CD detection
- [ ] `testing.ts` - Test framework detection

**Generators without tests:**
- [ ] `security.ts` - Security fix templates
- [ ] `testing.ts` - Test file generation
- [ ] `cicd.ts` - CI/CD workflow generation
- [ ] `readme.ts` - README generation

**Components without tests:**
- [ ] `AnalysisScreen.tsx`
- [ ] `UserMenu.tsx`
- [ ] `RepoSelector.tsx`
- [ ] `AltitudeDisplay.tsx`
- [ ] `RocketVisualization.tsx`

**API routes without tests:**
- [ ] All API routes (use E2E or integration tests)

---

## 5. Analyzer Completeness Matrix

| Analyzer | Lines | Score Logic | Gap Detection | Platform-aware | Status |
|----------|-------|-------------|---------------|----------------|--------|
| security.ts | 206 | ✅ 7 factors | ✅ 8 gap types | ❌ | **Complete** |
| backend.ts | 171 | ✅ 6 factors | ✅ 6 gap types | ❌ | **Complete** |
| frontend.ts | 170 | ✅ 6 factors | ✅ 5 gap types | ❌ | **Complete** |
| version-control.ts | 168 | ✅ 5 factors | ✅ 4 gap types | ❌ | **Complete** |
| api-integrations.ts | 155 | ✅ 5 factors | ✅ 4 gap types | ❌ | **Complete** |
| error-handling.ts | 152 | ✅ 5 factors | ✅ 4 gap types | ❌ | **Complete** |
| authentication.ts | 150 | ✅ 5 factors | ✅ 4 gap types | ❌ | **Complete** |
| deployment.ts | 149 | ✅ 5 factors | ✅ 4 gap types | ❌ | **Complete** |
| database.ts | 148 | ✅ 5 factors | ✅ 4 gap types | ❌ | **Complete** |
| testing.ts | 140 | ✅ 4 factors | ✅ 3 gap types | ❌ | **Complete** |
| design-ux.ts | 127 | ✅ 4 factors | ✅ 3 gap types | ❌ | **Minimal** |
| state-management.ts | 116 | ✅ 3 factors | ✅ 2 gap types | ❌ | **Minimal** |

### Platform Support Gap

All analyzers currently lack platform-specific logic. The types define `PLATFORM_CATEGORIES` and `PLATFORM_OVERRIDES` but analyzers don't use them:

```typescript
// types.ts defines this but analyzers ignore it:
PLATFORM_CATEGORIES: {
  ios: ['designUx', 'testing', 'security', 'errorHandling', ...],
  android: [...],
  cli: [...],
  library: [...]
}
```

**Required work**: Each analyzer should check `ctx.techStack.platform` and:
1. Skip non-applicable checks
2. Apply platform-specific scoring rules
3. Return platform-relevant gaps

---

## 6. Generator Completeness Matrix

| Generator | Lines | Templates | AI-powered | Categories Covered | Status |
|-----------|-------|-----------|------------|-------------------|--------|
| security.ts | 660 | ✅ 15+ templates | ✅ | security | **Production** |
| cicd.ts | 374 | ✅ 5 templates | ✅ | deployment | **Production** |
| testing.ts | 267 | ✅ 3 templates | ✅ | testing | **Production** |
| readme.ts | 126 | ✅ 1 template | ✅ | versionControl | **Minimal** |

### Missing Generators (High Priority)

| Category | Generator Needed | Suggested Templates |
|----------|------------------|---------------------|
| **authentication** | `auth.ts` | NextAuth config, session handling, CSRF |
| **database** | `database.ts` | Migration files, connection pooling, indexes |
| **errorHandling** | `error-handling.ts` | Error boundaries, Sentry setup, logging |
| **backend** | `backend.ts` | Rate limiting, validation middleware |
| **frontend** | `frontend.ts` | Performance optimizations, meta tags |
| **apiIntegrations** | `api-client.ts` | Retry logic, circuit breakers, timeouts |
| **stateManagement** | `state.ts` | Zustand/Redux setup, React Query config |
| **designUx** | `a11y.ts` | Accessibility fixes, ARIA labels |

---

## 7. Priority Fixes

### Critical (Blocking Features)

1. **Platform-aware analyzers** - iOS/Android/CLI projects get wrong scores
2. **Missing generators** - Can't auto-fix 8/12 categories
3. **E2E tests** - No API route testing

### High Priority

4. **Analyzer unit tests** - 11/12 analyzers untested
5. **Generator tests** - All 4 generators untested
6. **Component tests** - UI regression risk

### Medium Priority

7. **CLI testing** - No CLI command tests
8. **Rate limiting tests** - Security-critical untested
9. **Stripe webhook tests** - Billing-critical untested

---

## 8. File Size Analysis (Complexity Indicators)

### Largest Files (Potential Refactoring Candidates)

```
lib/orion/generators/security.ts    660 lines (OK - template-heavy)
lib/orion/generators/cicd.ts        374 lines (OK - template-heavy)
app/api/analyze/route.ts             ~590 lines (REVIEW - streaming logic)
lib/orion/types.ts                  363 lines (OK - type definitions)
lib/orion/generators/testing.ts     267 lines (OK)
```

### Suggested Refactoring

1. **`app/api/analyze/route.ts`** - Extract GitHub fetching logic into `lib/github/fetch.ts`
2. **`lib/orion/types.ts`** - Split into `types/` directory with category-specific files

---

## 9. Quick Reference

### Running Locally
```bash
npm run dev        # Start dev server
npm test           # Run Vitest tests  
npm run build      # Type check + build
npx prisma studio  # Database GUI
```

### Key Environment Variables
```
DATABASE_URL           # Neon Postgres
GITHUB_CLIENT_ID       # OAuth app ID
GITHUB_CLIENT_SECRET   # OAuth app secret
ANTHROPIC_API_KEY      # Claude API
STRIPE_SECRET_KEY      # Stripe billing
ENCRYPTION_SECRET      # Session encryption (64 chars)
```

### Adding a New Analyzer
1. Create `lib/orion/analyzers/{category}.ts`
2. Export function matching `(ctx: RepoContext) => CategoryScore`
3. Add to `lib/orion/analyzers/index.ts`
4. Add tests in `tests/orion/{category}.test.ts`

### Adding a New Generator
1. Create `lib/orion/generators/{category}.ts`
2. Export function matching `(ctx: RepoContext, gaps: Gap[]) => Promise<GeneratedFile[]>`
3. Add to `lib/orion/generators/index.ts`
4. Wire into `/api/generate/route.ts`

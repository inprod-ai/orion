# inprod.ai Codebase Index

**Generated:** January 2026
**Status:** Active Development

---

## 1. Key Directories and Their Purposes

```
inprod/
├── app/                          # Next.js 16 App Router
│   ├── api/                      # API Routes
│   │   ├── analyze/              # AI-powered repo analysis
│   │   ├── auth/                 # Custom GitHub OAuth (login, callback, me, logout)
│   │   ├── cli/                  # CLI-specific endpoints
│   │   ├── complete/             # Code generation endpoint
│   │   ├── export/pdf/           # PDF report generation
│   │   ├── generate/             # File generation
│   │   ├── repos/                # User's GitHub repositories
│   │   └── stripe/               # Billing (checkout, webhook)
│   ├── altitude-demo/            # Altitude visualization demo
│   ├── upgrade/                  # Pro upgrade page
│   └── page.tsx                  # Home page (repo input + analysis)
│
├── components/                   # React Components
│   ├── AltitudeDisplay.tsx       # Altitude visualization
│   ├── AnalysisScreen.tsx        # Analysis results display
│   ├── PDFReport.tsx             # PDF generation component
│   ├── Providers.tsx             # App providers wrapper
│   ├── RepoSelector.tsx          # GitHub repo selection UI
│   ├── RocketVisualization.tsx   # Rocket building animation
│   └── UserMenu.tsx              # Auth menu (sign in/out)
│
├── lib/                          # Core Libraries
│   ├── inprod/                   # Analysis Engine
│   │   ├── analyzer.ts           # Main orchestrator
│   │   ├── altitude.ts           # Max users calculator
│   │   ├── stack-detector.ts     # Tech stack detection
│   │   ├── types.ts              # Core type definitions
│   │   ├── analyzers/            # 12 Category Analyzers
│   │   └── generators/           # Code Generators
│   ├── github/                   # GitHub API integration
│   ├── github-auth.ts            # Custom OAuth implementation
│   ├── crypto.ts                 # AES-256-GCM encryption
│   ├── prisma.ts                 # Database client
│   ├── stripe.ts                 # Billing integration
│   └── utils.ts                  # Shared utilities
│
├── types/                        # TypeScript Definitions
│   └── analysis.ts               # API response types
│
├── tests/                        # Vitest Tests
│   └── inprod/                   # Core analyzer tests
│       ├── analyzer.test.ts      # 20 tests
│       ├── altitude.test.ts      # 28 tests
│       ├── security.test.ts      # 28 tests
│       └── stack-detector.test.ts # 6 tests
│
├── prisma/                       # Database
│   └── schema.prisma             # Data model
│
├── docs/                         # Documentation
│   ├── prd.md                    # Product Requirements
│   ├── altitude-system.md        # Altitude design
│   └── technical_spec.md         # Technical specification
│
└── scripts/                      # Automation Scripts
```

---

## 2. Core User Flows

### Flow A: Analyze Repository (Primary)

```
User Journey:
┌─────────────────────────────────────────────────────────────────────────┐
│  1. LANDING                                                             │
│     ├── Anonymous: Enter GitHub URL → [Analyze]                        │
│     └── Authenticated: Select from repo list → [Scan]                  │
│                                                                         │
│  2. ANALYSIS (Streaming)                                                │
│     ├── Fetching repository... (10%)                                   │
│     ├── Detecting tech stack... (20%)                                  │
│     ├── Analyzing categories... (30-90%)                               │
│     └── Calculating altitude... (100%)                                  │
│                                                                         │
│  3. RESULTS                                                             │
│     ├── Overall Score: 67/100                                          │
│     ├── Altitude: 10K users (Cruising)                                 │
│     ├── 12 Category Breakdown                                          │
│     └── Gap Details + Fix Suggestions                                  │
└─────────────────────────────────────────────────────────────────────────┘

Technical Flow:
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  app/page.tsx    │ → │ POST /api/analyze │ → │ lib/inprod/      │
│  AnalysisScreen  │    │ (streaming SSE)  │    │ analyzer.ts      │
└──────────────────┘    └──────────────────┘    └──────────────────┘
         │                                              │
         │                                              ▼
         │                                      ┌──────────────────┐
         │                                      │ 12 Analyzers     │
         │                                      │ + calculateAltitude
         │                                      └──────────────────┘
         │                                              │
         ▼                                              ▼
┌──────────────────┐                            ┌──────────────────┐
│ Display Results  │ ← ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │ Save to Scan DB  │
└──────────────────┘                            └──────────────────┘
```

### Flow B: Sign In with GitHub

```
┌─────────────────────────────────────────────────────────────────────────┐
│  1. Click "Sign in with GitHub"                                         │
│  2. Redirect to /api/auth/login                                         │
│  3. Redirect to GitHub OAuth (state param for CSRF)                     │
│  4. User authorizes app                                                 │
│  5. GitHub redirects to /api/auth/callback                              │
│  6. Exchange code for access token                                      │
│  7. Upsert user in database                                             │
│  8. Set encrypted session cookie                                        │
│  9. Redirect to home with ?auth=success                                 │
│  10. Fetch /api/auth/me → Display user repos                            │
└─────────────────────────────────────────────────────────────────────────┘
```

### Flow C: Upgrade to Pro

```
┌─────────────────────────────────────────────────────────────────────────┐
│  1. User on Free tier sees "Upgrade to Pro" CTA                         │
│  2. Navigate to /upgrade                                                │
│  3. Click "Upgrade Now"                                                 │
│  4. POST /api/stripe/checkout creates Stripe session                    │
│  5. Redirect to Stripe Checkout                                         │
│  6. User completes payment                                              │
│  7. Stripe webhook POST /api/stripe/webhook                             │
│  8. Update user.tier = 'PRO' in database                                │
│  9. Redirect to home with ?upgraded=true                                │
└─────────────────────────────────────────────────────────────────────────┘
```

### Flow D: Export PDF (Pro only)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  1. Pro user views analysis results                                     │
│  2. Click "Export PDF" button                                           │
│  3. POST /api/export/pdf with scanId                                    │
│  4. Verify user is Pro + owns scan                                      │
│  5. Render PDFReport component with @react-pdf/renderer                 │
│  6. Return PDF blob                                                     │
│  7. Browser downloads file                                              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. API Route Organization Pattern

All API routes follow this consistent structure:

```typescript
// =============================================================================
// API: /api/{endpoint} - Brief description
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/github-auth'
import { prisma } from '@/lib/prisma'

// Optional: Zod schema for request validation
const RequestSchema = z.object({ ... })

export async function POST(request: NextRequest) {
  try {
    // 1. Request size validation
    // 2. Authentication check (if needed)
    // 3. Input validation with Zod
    // 4. Business logic
    // 5. Database operations
    // 6. Return response
  } catch (error) {
    console.error('Route error:', error)
    return NextResponse.json({ error: 'User-friendly message' }, { status: 500 })
  }
}
```

### API Route Inventory

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/analyze` | POST | Optional | AI-powered repo analysis (streaming) |
| `/api/auth/login` | GET | No | Redirect to GitHub OAuth |
| `/api/auth/callback` | GET | No | Handle OAuth callback |
| `/api/auth/me` | GET | Optional | Get current user |
| `/api/auth/logout` | GET/POST | No | Clear session |
| `/api/repos` | GET | Required | List user's GitHub repos |
| `/api/complete` | POST | Optional | Generate completion files |
| `/api/generate` | POST | Optional | Generate specific fixes |
| `/api/export/pdf` | POST | Pro | Export analysis as PDF |
| `/api/stripe/checkout` | POST | Required | Create Stripe checkout session |
| `/api/stripe/webhook` | POST | No | Handle Stripe events |
| `/api/cli/analyze` | POST | Token | CLI analysis endpoint |
| `/api/cli/auth` | GET | No | CLI OAuth initiation |
| `/api/cli/auth/callback` | GET | No | CLI OAuth callback |
| `/api/cli/auth/me` | GET | Token | CLI user info |
| `/api/cli/complete` | POST | Token | CLI code generation |
| `/api/cli/fix` | POST | Token | CLI single fix |

---

## 4. Component Hierarchy

```
app/layout.tsx
└── Providers
    └── {children}

app/page.tsx (HomeContent)
├── UserMenu                     # Top-right auth menu
├── [Anonymous] URL Input Form
│   └── Button: "Analyze"
├── [Authenticated] RepoSelector
│   ├── User profile header
│   ├── Search input
│   ├── Filter buttons
│   └── Repo list → "Scan" buttons
└── AnalysisScreen              # When analyzing=true
    ├── Progress indicator
    ├── Category scores grid
    ├── Gaps list
    ├── Altitude display
    └── [Pro] Export PDF button

app/upgrade/page.tsx
├── Pricing cards (Free vs Pro)
└── Upgrade button → Stripe

app/altitude-demo/page.tsx
└── AltitudeDisplay
    ├── Background gradient
    ├── Stars overlay
    └── RocketVisualization
```

### Component Dependencies

| Component | Dependencies | State |
|-----------|--------------|-------|
| UserMenu | fetch /api/auth/me | user, loading |
| RepoSelector | fetch /api/repos | repos, search, filter |
| AnalysisScreen | fetch /api/analyze (streaming) | progress, result, error |
| AltitudeDisplay | props: altitude result | animated progress |

---

## 5. Database Schema Relationships

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           DATABASE SCHEMA                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐       ┌──────────────────┐                        │
│  │      User        │ 1───∞ │     Account      │                        │
│  ├──────────────────┤       ├──────────────────┤                        │
│  │ id (PK)          │       │ id (PK)          │                        │
│  │ email            │       │ userId (FK)      │                        │
│  │ name             │       │ provider         │                        │
│  │ image            │       │ access_token     │                        │
│  │ githubId         │       │ ...              │                        │
│  │ tier (enum)      │       └──────────────────┘                        │
│  │ stripeCustomerId │                                                   │
│  │ monthlyScans     │       ┌──────────────────┐                        │
│  │ lastResetAt      │ 1───∞ │     Session      │                        │
│  └──────────────────┘       ├──────────────────┤                        │
│          │                  │ id (PK)          │                        │
│          │                  │ userId (FK)      │                        │
│          │                  │ sessionToken     │                        │
│          │                  │ expires          │                        │
│          │                  └──────────────────┘                        │
│          │                                                               │
│          │ 1───∞            ┌──────────────────┐                        │
│          └─────────────────→│      Scan        │                        │
│                             ├──────────────────┤                        │
│                             │ id (PK)          │                        │
│                             │ userId (FK)?     │ Nullable for anon      │
│                             │ repoUrl          │                        │
│                             │ owner, repo      │                        │
│                             │ overallScore     │                        │
│                             │ categories (JSON)│                        │
│                             │ findings (JSON)  │                        │
│                             │ confidence (JSON)│                        │
│                             │ source           │ "web" | "cli"          │
│                             └──────────────────┘                        │
│                                                                          │
│  ┌──────────────────┐                                                   │
│  │   Subscription   │ User 1───∞ Subscription                           │
│  ├──────────────────┤                                                   │
│  │ id (PK)          │                                                   │
│  │ userId (FK)      │                                                   │
│  │ stripeSubId      │                                                   │
│  │ status (enum)    │                                                   │
│  └──────────────────┘                                                   │
│                                                                          │
│  ┌──────────────────┐                                                   │
│  │   RateLimit      │ Standalone table for rate limiting                │
│  ├──────────────────┤                                                   │
│  │ key              │ IP or user ID                                     │
│  │ count            │                                                   │
│  │ resetAt          │                                                   │
│  └──────────────────┘                                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Enums

- **UserTier:** FREE | PRO | ENTERPRISE
- **SubscriptionStatus:** active | canceled | incomplete | past_due | trialing | unpaid

---

## 6. Gap Analysis: Current Implementation vs PRD

### Implemented (Phase 1 MVP)

| PRD Requirement | Status | Files |
|-----------------|--------|-------|
| 12 Category Analyzers | ✅ Complete | lib/inprod/analyzers/*.ts |
| Security Gap Detection | ✅ Complete | analyzers/security.ts |
| Tech Stack Detection | ✅ Complete | stack-detector.ts |
| Altitude Calculation | ✅ Complete | altitude.ts |
| GitHub OAuth | ✅ Complete | github-auth.ts, app/api/auth/* |
| Stripe Billing | ✅ Complete | lib/stripe.ts, app/api/stripe/* |
| PDF Export (Pro) | ✅ Complete | app/api/export/pdf |
| CLI Auth Endpoints | ✅ Complete | app/api/cli/* |
| Repo Selector UI | ✅ Complete | components/RepoSelector.tsx |
| Altitude Visualization | ✅ Complete | components/AltitudeDisplay.tsx |

### Missing (Phase 2: Full Generation)

| PRD Requirement | Status | Priority | Estimated Effort |
|-----------------|--------|----------|------------------|
| Security Fix Generation (full) | 🟡 Partial | High | 2 days |
| Test Generation Engine | 🟡 Partial | High | 3 days |
| CI/CD Generation | 🟡 Partial | Medium | 1 day |
| README Generation | 🟡 Partial | Medium | 1 day |
| PR Creation via GitHub API | ❌ Missing | High | 2 days |
| ZIP Download | ❌ Missing | Medium | 1 day |
| Multi-file Validation | ❌ Missing | Medium | 2 days |
| Quality Scoring for Generated Files | ❌ Missing | Low | 1 day |

### Missing (Phase 3: Enterprise)

| PRD Requirement | Status | Priority |
|-----------------|--------|----------|
| Go CLI Binary | ❌ Missing | High |
| brew install inprod | ❌ Missing | High |
| GitHub App Installation Flow | ❌ Missing | High |
| Private Repo Access via GitHub App | ❌ Missing | High |
| Slopometer Deep Link Integration | ❌ Missing | Medium |
| Custom Security Policies | ❌ Missing | Low |
| Team/Org Features | ❌ Missing | Low |
| SSO | ❌ Missing | Low |

### Database Schema Gaps

PRD specifies additional tables not yet implemented:

```sql
-- Missing: completions table
CREATE TABLE completions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  scan_id UUID REFERENCES scans(id),
  completeness_score INTEGER,
  category_scores JSONB,
  gaps JSONB,
  files_generated INTEGER,
  pr_url TEXT,
  zip_url TEXT
);

-- Missing: generated_files table
CREATE TABLE generated_files (
  id UUID PRIMARY KEY,
  completion_id UUID REFERENCES completions(id),
  file_path TEXT,
  file_content TEXT,
  language TEXT,
  category TEXT,
  confidence INTEGER,
  validated BOOLEAN
);

-- Missing: generation_credits table
CREATE TABLE generation_credits (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  credits_used INTEGER,
  generation_type TEXT,
  completion_id UUID
);
```

### Generator Implementation Status

| Generator | File | Status |
|-----------|------|--------|
| Security | generators/security.ts | ✅ Implemented |
| Testing | generators/testing.ts | ✅ Implemented |
| CI/CD | generators/cicd.ts | ✅ Implemented |
| README | generators/readme.ts | ✅ Implemented |
| Database Migrations | - | ❌ Missing |
| Error Boundaries | - | ❌ Missing |
| API Docs | - | ❌ Missing |

### Platform Support Gaps

| Platform | PRD Target | Current Status |
|----------|------------|----------------|
| Web/React/Next.js | ✅ Primary | ✅ Implemented |
| Python/FastAPI | ✅ Planned | 🟡 Detection only |
| Go | ✅ Planned | 🟡 Detection only |
| iOS/SwiftUI | ✅ Planned | ❌ Missing |
| Android/Kotlin | ✅ Planned | ❌ Missing |
| Rust | ✅ Planned | ❌ Missing |

---

## 7. Recommendations

### Immediate Priorities (Week 1-2)

1. **PR Creation** - High-impact feature, enables one-click shipping
2. **ZIP Download** - Alternative output for users without GitHub
3. **Completions Table** - Track generation history for credits

### Medium-term (Week 3-4)

4. **Go CLI Binary** - Cross-platform distribution
5. **GitHub App Installation** - Private repo access
6. **Multi-file Validation** - Ensure generated code compiles

### Tech Debt

- lib/auth.ts is now unused (replaced by github-auth.ts) - delete
- Session table may be unused with custom OAuth - verify and clean
- Some generators may need testing in isolation

---

## Quick Reference

### Environment Variables Required

```env
# Database
DATABASE_URL=
DATABASE_URL_UNPOOLED=

# Auth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# AI
ANTHROPIC_API_KEY=

# Billing
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=

# Optional
E2B_API_KEY=
GITHUB_TOKEN=
```

### Key Commands

```bash
npm run dev          # Start development
npm run build        # Production build
npm test             # Run 82 tests
npm run lint         # ESLint
vercel --prod        # Deploy
```

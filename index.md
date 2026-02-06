# orion.ai Codebase Index

Production readiness analysis platform. Analyzes codebases, identifies gaps, generates fixes, and calculates **altitude** (max concurrent users your code can handle).

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ RepoSelector │  │AnalysisScreen│  │AltitudeDisplay│  │  PDFReport  │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                  │                  │                 │           │
│         └──────────────────┴─────────┬────────┴─────────────────┘           │
│                                      │                                       │
└──────────────────────────────────────┼───────────────────────────────────────┘
                                       │
┌──────────────────────────────────────┼───────────────────────────────────────┐
│                              API LAYER                                        │
├──────────────────────────────────────┼───────────────────────────────────────┤
│                                      ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐     │
│  │                         /api/analyze                                 │     │
│  │  GitHub OAuth ──► Fetch Repo ──► Stream Analysis ──► Save Scan      │     │
│  └─────────────────────────────────────────────────────────────────────┘     │
│                                      │                                        │
│                                      ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐     │
│  │                         /api/generate                                │     │
│  │  Load Gaps ──► Select Generators ──► Generate Files                 │     │
│  └─────────────────────────────────────────────────────────────────────┘     │
│                                      │                                        │
│                                      ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐     │
│  │                         /api/complete                                │     │
│  │  Full Analysis ──► Completion Plan ──► Priority Gaps                │     │
│  └─────────────────────────────────────────────────────────────────────┘     │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
                                       │
┌──────────────────────────────────────┼───────────────────────────────────────┐
│                              CORE ENGINE                                      │
├──────────────────────────────────────┼───────────────────────────────────────┤
│                                      ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐     │
│  │                     lib/orion/analyzer.ts                          │     │
│  │  analyzeRepository() ──► CategoryScore[] ──► calculateAltitude()    │     │
│  └─────────────────────────────────────────────────────────────────────┘     │
│         │                                              │                      │
│         ▼                                              ▼                      │
│  ┌──────────────────────┐                 ┌──────────────────────────┐       │
│  │      ANALYZERS       │                 │        GENERATORS        │       │
│  │  ┌────────────────┐  │                 │  ┌────────────────────┐  │       │
│  │  │ frontend.ts    │  │                 │  │ security.ts        │  │       │
│  │  │ backend.ts     │  │                 │  │ testing.ts         │  │       │
│  │  │ database.ts    │  │                 │  │ cicd.ts            │  │       │
│  │  │ auth.ts        │  │   Gap[] ──────► │  │ readme.ts          │  │       │
│  │  │ security.ts    │  │                 │  │ authentication.ts  │  │       │
│  │  │ testing.ts     │  │                 │  │ database.ts        │  │       │
│  │  │ deployment.ts  │  │                 │  │ error-handling.ts  │  │       │
│  │  │ ...8 more      │  │                 │  │ backend.ts         │  │       │
│  │  └────────────────┘  │                 │  └────────────────────┘  │       │
│  └──────────────────────┘                 └──────────────────────────┘       │
│         │                                              │                      │
│         ▼                                              ▼                      │
│  ┌──────────────────────┐                 ┌──────────────────────────┐       │
│  │   CategoryScore[]    │                 │    GeneratedFile[]       │       │
│  │   + Gap[]            │                 │    (ready to write)      │       │
│  └──────────────────────┘                 └──────────────────────────┘       │
│         │                                                                     │
│         ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐     │
│  │                     lib/orion/altitude.ts                          │     │
│  │  Score ──► CATEGORY_USER_LIMITS ──► Bottleneck ──► AltitudeZone    │     │
│  └─────────────────────────────────────────────────────────────────────┘     │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
                                       │
┌──────────────────────────────────────┼───────────────────────────────────────┐
│                              DATA LAYER                                       │
├──────────────────────────────────────┼───────────────────────────────────────┤
│                                      ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐     │
│  │                         PostgreSQL (Neon)                           │     │
│  │  User ──┬── Account ──── OAuth tokens                               │     │
│  │         ├── Session ──── Auth sessions                              │     │
│  │         ├── Scan ─────── Analysis results (JSON)                    │     │
│  │         └── Subscription ── Stripe billing                          │     │
│  │  RateLimit ─────────────── API rate limiting                        │     │
│  └─────────────────────────────────────────────────────────────────────┘     │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

## Core Data Flow

### 1. Analyze Flow

```
User clicks "Analyze" 
    │
    ▼
/api/analyze (POST)
    │
    ├── Validate session + tier limits
    ├── Fetch repo files from GitHub API
    │
    ▼
lib/orion/analyzer.ts::analyzeCompleteness()
    │
    ├── detectTechStack(files) → TechStack
    ├── Build RepoContext { files, techStack, packageJson }
    │
    ▼
analyzeRepository(ctx)
    │
    ├── Run 12 category analyzers in sequence:
    │   analyzeFrontend(ctx) → CategoryScore
    │   analyzeBackend(ctx) → CategoryScore
    │   ... 10 more analyzers
    │
    ├── Filter applicable categories (skip N/A)
    ├── Calculate overallScore (weighted average)
    │
    ▼
calculateAltitude(categories)
    │
    ├── Map each category score → max users (CATEGORY_USER_LIMITS)
    ├── Find bottleneck (lowest max users)
    ├── Determine AltitudeZone (runway → interplanetary)
    ├── Calculate potential users if gaps fixed
    │
    ▼
Return FullAnalysisResult
    │
    ├── Save to Scan table
    └── Stream to client via SSE
```

### 2. Generate Flow

```
User clicks "Generate Fixes"
    │
    ▼
/api/generate (POST)
    │
    ├── Load analysis result
    ├── Filter gaps by: gapIds, categories, or instantOnly
    │
    ▼
Group gaps by category
    │
    ├── security gaps → generateSecurityFixes(ctx, gaps)
    ├── testing gaps → generateTests(ctx, gaps)
    ├── deployment gaps → generateCICD(ctx, gaps)
    ├── ... other generators
    │
    ▼
Return GeneratedFile[]
    │
    └── { path, content, language, category, confidence }
```

### 3. Altitude Calculation

```
CategoryScore[] (12 categories)
    │
    ▼
For each category:
    score → lookup in CATEGORY_USER_LIMITS → maxUsers
    │
    Example: database score 45 → 3,200 users
             testing score 30 → 1,000 users  ← bottleneck
             security score 70 → 100,000 users
    │
    ▼
Bottleneck = category with lowest maxUsers
    │
    ▼
Map maxUsers → AltitudeZone
    │
    ├── 0-99: runway (grounded)
    ├── 100-999: troposphere
    ├── 1K-9.9K: stratosphere
    ├── 10K-99K: mesosphere
    ├── 100K-999K: thermosphere
    ├── 1M-9.9M: exosphere
    ├── 10M-99M: orbit
    ├── 100M-999M: lunar
    └── 1B+: interplanetary
```

## API Routes

### Analysis

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/analyze` | POST | Main repo analysis, streams progress via SSE |
| `/api/complete` | POST | Full analysis + completion plan |
| `/api/generate` | POST | Generate fixes for identified gaps |
| `/api/export/pdf` | POST | Generate PDF report (Pro only) |

### Authentication

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/login` | GET | Initiate GitHub OAuth |
| `/api/auth/callback` | GET | Handle OAuth callback |
| `/api/auth/logout` | GET/POST | Clear session |
| `/api/auth/me` | GET | Get current user info |

### CLI

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/cli/auth` | GET/POST | CLI authentication flow |
| `/api/cli/auth/callback` | GET | CLI OAuth callback |
| `/api/cli/auth/me` | GET | CLI user info + usage |
| `/api/cli/analyze` | POST | Analyze from CLI |
| `/api/cli/complete` | POST | Generate code from CLI |
| `/api/cli/fix` | POST | Fix specific findings |

### Billing

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/repos` | GET | List user's GitHub repos |
| `/api/stripe/checkout` | POST | Create Stripe checkout session |
| `/api/stripe/webhook` | POST | Handle Stripe events |

## Analyzers (12 categories)

Each analyzer: `(ctx: RepoContext) → CategoryScore`

| File | Category | Key Checks |
|------|----------|------------|
| `frontend.ts` | Frontend | UI framework, CSS, error boundaries, a11y |
| `backend.ts` | Backend | Input validation, rate limiting, health checks |
| `database.ts` | Database | ORM, migrations, indexes, pooling |
| `authentication.ts` | Auth | Session encryption, CSRF, secure cookies |
| `api-integrations.ts` | API | Retry logic, webhook verification, error handling |
| `state-management.ts` | State | State library, data fetching, optimistic updates |
| `design-ux.ts` | Design/UX | Component library, loading states, dark mode |
| `testing.ts` | Testing | Test framework, coverage ratio, E2E tests |
| `security.ts` | Security | Headers, secrets detection, input sanitization |
| `error-handling.ts` | Errors | Sentry, global handlers, structured logging |
| `version-control.ts` | VCS | .gitignore, README, hooks, PR templates |
| `deployment.ts` | Deployment | CI/CD, Docker, environment validation |

## Generators (8 modules)

Each generator: `(ctx: RepoContext, gaps: Gap[]) → GeneratedFile[]`

| File | Generates |
|------|-----------|
| `security.ts` | Security headers, encryption, .env.example, XSS sanitization |
| `testing.ts` | vitest.config, playwright.config, example tests |
| `cicd.ts` | GitHub Actions CI/security workflows, Dockerfile, docker-compose |
| `readme.ts` | Complete README with setup instructions |
| `authentication.ts` | Crypto utils, CSRF, secure cookies, rate limiting |
| `database.ts` | Prisma schema, client singleton, connection pooling |
| `error-handling.ts` | Sentry config, error boundaries, logger |
| `backend.ts` | Validation utils, rate limiter, health endpoint |

## Components

| Component | Purpose |
|-----------|---------|
| `RepoSelector.tsx` | GitHub repo picker with search |
| `AnalysisScreen.tsx` | Main analysis display with findings |
| `AltitudeDisplay.tsx` | Visual altitude meter + bottleneck info |
| `RocketVisualization.tsx` | Animated rocket showing altitude zone |
| `PDFReport.tsx` | React-PDF template for export |
| `UserMenu.tsx` | User dropdown with tier + logout |
| `Providers.tsx` | App-level providers (session, etc) |

## Database Schema

```
┌─────────────────────────────────────────────────────────────────┐
│                            User                                  │
├─────────────────────────────────────────────────────────────────┤
│ id              String    @id                                    │
│ email           String    @unique                                │
│ name            String?                                          │
│ image           String?                                          │
│ githubId        String?   @unique                                │
│ tier            UserTier  (FREE | PRO | ENTERPRISE)              │
│ stripeCustomerId String?  @unique                                │
│ monthlyScans    Int       (reset monthly)                        │
│ lastResetAt     DateTime                                         │
│ createdAt       DateTime                                         │
│ updatedAt       DateTime                                         │
└──────┬──────────────────────────────────────────────────────────┘
       │
       │ 1:N
       ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
│     Account      │  │     Session      │  │    Subscription      │
├──────────────────┤  ├──────────────────┤  ├──────────────────────┤
│ OAuth tokens     │  │ sessionToken     │  │ stripeSubscriptionId │
│ (GitHub)         │  │ expires          │  │ status               │
└──────────────────┘  └──────────────────┘  │ currentPeriodEnd     │
                                            └──────────────────────┘
       │
       │ 1:N
       ▼
┌─────────────────────────────────────────────────────────────────┐
│                            Scan                                  │
├─────────────────────────────────────────────────────────────────┤
│ id              String                                           │
│ repoUrl         String                                           │
│ owner           String                                           │
│ repo            String                                           │
│ overallScore    Float                                            │
│ categories      Json      (CategoryScore[])                      │
│ findings        Json      (Gap[])                                │
│ summary         Json                                             │
│ source          String    ("web" | "cli")                        │
│ createdAt       DateTime                                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         RateLimit                                │
├─────────────────────────────────────────────────────────────────┤
│ key             String    @unique (e.g., "analyze:userId")       │
│ count           Int                                              │
│ resetAt         DateTime                                         │
└─────────────────────────────────────────────────────────────────┘
```

## Key Types

```typescript
// Analysis result for one category
interface CategoryScore {
  category: Category        // 'frontend' | 'backend' | ... (12 total)
  label: string             // Display name
  score: number             // 0-100
  detected: string[]        // What was found
  gaps: Gap[]               // What's missing
  canGenerate: boolean      // Can auto-fix?
}

// A single issue/gap identified
interface Gap {
  id: string                // 'auth-no-csrf'
  category: Category
  title: string
  description: string
  severity: 'blocker' | 'critical' | 'warning' | 'info'
  confidence: 'proven' | 'verified' | 'high' | 'likely' | 'possible'
  fixType: 'instant' | 'suggested' | 'guided'
  fixTemplate?: string      // Template name for generation
  effortMinutes?: number
  file?: string             // Where the gap was found
  line?: number
}

// Input context for analyzers/generators
interface RepoContext {
  files: RepoFile[]
  techStack: TechStack
  packageJson?: Record<string, unknown>
  readme?: string
}

// Altitude calculation result
interface AltitudeResult {
  bottleneck: { category, score, maxUsers, reason }
  maxUsers: number
  zone: AltitudeLevel       // runway → interplanetary
  categoryLimits: [...]
  potentialUsers: number    // If top gaps fixed
  topUpgrades: [...]        // Suggested improvements
}
```

## File Structure

```
app/
├── api/                    # All API routes
│   ├── analyze/           # Main analysis endpoint
│   ├── auth/              # OAuth routes
│   ├── cli/               # CLI-specific routes
│   ├── generate/          # Code generation
│   └── stripe/            # Billing
├── page.tsx               # Home page
└── layout.tsx             # Root layout

lib/
├── orion/                # Core analysis engine
│   ├── analyzer.ts        # Main orchestrator
│   ├── altitude.ts        # User capacity calculation
│   ├── stack-detector.ts  # Tech stack detection
│   ├── platform.ts        # Platform applicability
│   ├── types.ts           # All type definitions
│   ├── analyzers/         # 12 category analyzers
│   └── generators/        # 8 code generators
├── github.ts              # GitHub API client
├── github-auth.ts         # OAuth + session management
├── prisma.ts              # Database client
├── stripe.ts              # Stripe client
└── crypto.ts              # Encryption utilities

components/                 # React components
tests/orion/              # Test suite
prisma/schema.prisma       # Database schema
```

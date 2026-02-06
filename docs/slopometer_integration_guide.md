# Slopometer Integration Guide for orion.ai

**Version:** 1.0  
**Last Updated:** January 2026  
**Purpose:** Complete reference for building orion.ai integration with Slopometer

---

## Table of Contents

1. [Database Schema](#1-database-schema)
2. [API Reference](#2-api-reference)
3. [Authentication & SSO](#3-authentication--sso)
4. [Tech Stack Detection](#4-tech-stack-detection)
5. [Finding Types & Detectors](#5-finding-types--detectors)
6. [Billing Integration](#6-billing-integration)
7. [Integration Protocol](#7-integration-protocol)
8. [Shared Libraries](#8-shared-libraries)

---

## 1. Database Schema

### Overview

Slopometer uses **Neon Postgres** with **Drizzle ORM**. The database is located at:
- **Production:** `DATABASE_URL` in Vercel environment
- **Local:** Defined in `.env.local`

### Core Tables

#### `users` — User accounts (shared with orion.ai)

```sql
CREATE TABLE users (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id INTEGER UNIQUE,           -- GitHub OAuth ID
  github_login TEXT,                   -- GitHub username
  github_avatar_url TEXT,              -- Avatar URL
  email TEXT,                          -- Email (from GitHub)
  access_token TEXT,                   -- ENCRYPTED GitHub access token
  
  -- Subscription (SHARED WITH ORION.AI)
  plan plan_enum DEFAULT 'free',       -- 'free' | 'pro' | 'team' | 'enterprise'
  stripe_customer_id TEXT,             -- Stripe customer ID
  stripe_subscription_id TEXT,         -- Stripe subscription ID
  plan_expires_at TIMESTAMP,           -- Expiration for non-recurring
  
  -- Usage limits (monthly reset)
  scans_this_month INTEGER DEFAULT 0,  -- Current month usage
  scans_limit INTEGER DEFAULT 5,       -- Plan limit (5 for free)
  last_reset_at TIMESTAMP DEFAULT NOW(),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX users_github_id_idx ON users(github_id);
CREATE INDEX users_stripe_customer_idx ON users(stripe_customer_id);
```

**Key Fields for orion.ai:**
- `id` — Internal UUID, use this for all auth checks
- `github_id` — External GitHub ID (don't use for auth)
- `plan` — Subscription tier (determines orion.ai features)
- `stripe_customer_id` — For unified billing
- `access_token` — ENCRYPTED, use for GitHub API calls

#### `scans` — Scan results (primary data for orion.ai handoff)

```sql
CREATE TABLE scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),   -- Can be null for anonymous scans
  
  -- Repository info
  repo_url TEXT NOT NULL,
  repo_owner TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  branch TEXT DEFAULT 'main',
  commit_hash TEXT,
  is_private BOOLEAN DEFAULT false,
  
  -- Status
  status scan_status_enum DEFAULT 'pending',
  -- Values: 'pending' | 'cloning' | 'analyzing' | 'scanning' | 
  --         'generating_fixes' | 'completed' | 'failed'
  current_step TEXT,
  progress INTEGER DEFAULT 0,          -- 0-100
  error_message TEXT,
  
  -- Tech stack (IMPORTANT FOR ORION.AI)
  tech_stack JSONB,
  -- Structure: {
  --   languages: [{ name: "typescript", percentage: 80 }, ...],
  --   frameworks: ["next.js", "react"],
  --   packageManagers: ["npm"],
  --   database: "postgres",
  --   cloudProvider: "vercel",
  --   ciCd: "github-actions",
  --   mobilePlatform: "none",
  --   projectType: "web",
  --   maturityLevel: "mvp"
  -- }
  
  -- Results summary
  overall_score INTEGER,               -- 0-100 (slopScore)
  decision decision_enum,              -- 'ship' | 'ship_with_caution' | 'do_not_ship'
  blocker_count INTEGER DEFAULT 0,
  critical_count INTEGER DEFAULT 0,
  warning_count INTEGER DEFAULT 0,
  info_count INTEGER DEFAULT 0,
  auto_fixable_count INTEGER DEFAULT 0,
  estimated_fix_time_minutes INTEGER,
  
  -- Dynamic standards applied
  dynamic_standards JSONB,
  
  -- Performance
  scan_time_seconds REAL,
  ai_cost_cents INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Indexes
CREATE INDEX scans_user_id_idx ON scans(user_id);
CREATE INDEX scans_repo_url_idx ON scans(repo_url);
CREATE INDEX scans_status_idx ON scans(status);
CREATE INDEX scans_created_at_idx ON scans(created_at);
```

#### `findings` — Individual issues found

```sql
CREATE TABLE findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
  
  -- Finding details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  file TEXT NOT NULL,                  -- File path
  line INTEGER,                        -- Line number
  column INTEGER,                      -- Column number
  code_snippet TEXT,                   -- Code context
  
  -- Classification
  severity severity_enum NOT NULL,     -- 'blocker' | 'critical' | 'warning' | 'info'
  confidence confidence_enum NOT NULL, -- 'proven' | 'verified' | 'high' | 'likely' | 'possible'
  detector TEXT NOT NULL,              -- e.g., 'secrets-scanner', 'eslint', 'production'
  category TEXT,                       -- e.g., 'security', 'performance', 'ai-slop'
  
  -- Standard violated
  standard_id TEXT,
  standard_name TEXT,
  
  -- Effort
  effort_minutes INTEGER,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX findings_scan_id_idx ON findings(scan_id);
CREATE INDEX findings_severity_idx ON findings(severity);
CREATE INDEX findings_detector_idx ON findings(detector);
```

#### `fixes` — Generated fixes for findings

```sql
CREATE TABLE fixes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id UUID REFERENCES findings(id) ON DELETE CASCADE,
  scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
  
  -- Fix details
  type fix_type_enum NOT NULL,         -- 'mechanical' | 'generated' | 'guided'
  description TEXT NOT NULL,
  file_path TEXT NOT NULL,
  
  -- Code changes
  code_before TEXT,                    -- Original code
  code_after TEXT,                     -- Fixed code
  additional_files JSONB,              -- { "path": "content" }
  commands JSONB,                      -- ["npm install x", ...]
  
  -- Validation
  validated BOOLEAN DEFAULT false,
  validation_error TEXT,
  semantic_risk BOOLEAN DEFAULT false,
  
  -- User interaction
  applied BOOLEAN DEFAULT false,
  applied_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX fixes_finding_id_idx ON fixes(finding_id);
CREATE INDEX fixes_scan_id_idx ON fixes(scan_id);
```

#### `api_keys` — API access tokens

```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,                  -- "CI/CD Key"
  key_prefix TEXT NOT NULL,            -- "slop_abc" (first 8 chars)
  key_hash TEXT NOT NULL,              -- SHA256 of full key
  scopes JSONB DEFAULT '["scan:read", "scan:write"]',
  
  last_used_at TIMESTAMP,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  revoked_at TIMESTAMP,
  expires_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `usage_logs` — Billing & analytics

```sql
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  api_key_id UUID REFERENCES api_keys(id),
  scan_id UUID REFERENCES scans(id),
  
  action TEXT NOT NULL,                -- "scan", "fix_generation", "orion_completion"
  repo_url TEXT,
  tokens_used INTEGER DEFAULT 0,
  cost_cents INTEGER DEFAULT 0,
  ip_address TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Plan Limits Configuration

```typescript
export const PLAN_LIMITS = {
  free: {
    scansPerMonth: 5,
    privateRepos: false,
    aiFixGeneration: false,
    apiAccess: false,
    // ORION.AI LIMITS
    orionCompletions: 0,        // View only
    orionGenerations: 0,
  },
  pro: {
    scansPerMonth: 100,
    privateRepos: true,
    aiFixGeneration: true,
    apiAccess: true,
    // ORION.AI LIMITS
    orionCompletions: 10,       // Full completions/month
    orionGenerations: 50,       // Individual generations/month
  },
  team: {
    scansPerMonth: 500,
    privateRepos: true,
    aiFixGeneration: true,
    apiAccess: true,
    // ORION.AI LIMITS
    orionCompletions: 50,
    orionGenerations: 200,
  },
  enterprise: {
    scansPerMonth: -1,           // Unlimited
    privateRepos: true,
    aiFixGeneration: true,
    apiAccess: true,
    // ORION.AI LIMITS
    orionCompletions: -1,       // Unlimited
    orionGenerations: -1,       // Unlimited
  },
};
```

---

## 2. API Reference

### Base URLs

| Environment | URL |
|-------------|-----|
| Production | `https://www.slopometer.com/api` |
| Local | `http://localhost:3000/api` |

### Authentication

**Cookie-based (Web):**
```
Cookie: slopometer_session=<encrypted_session>
```

**API Key (CLI/API):**
```
Authorization: Bearer slop_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Endpoints

#### `GET /api/auth/me` — Get current user

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "githubId": 12345,
    "githubLogin": "username",
    "githubAvatarUrl": "https://...",
    "email": "user@example.com",
    "plan": "pro",
    "scansThisMonth": 5,
    "scansLimit": 100
  }
}
```

#### `GET /api/scan/[id]` — Get scan result

**Response:**
```json
{
  "id": "uuid",
  "repoUrl": "https://github.com/owner/repo",
  "repoOwner": "owner",
  "repoName": "repo",
  "isPrivate": false,
  "status": "completed",
  "techStack": {
    "type": "web",
    "languages": [
      { "name": "typescript", "percentage": 85 },
      { "name": "javascript", "percentage": 15 }
    ],
    "frameworks": ["next.js", "react", "tailwindcss"],
    "packageManager": "npm",
    "projectType": "app",
    "maturityLevel": "mvp"
  },
  "slopScore": 72,
  "decision": "ship_with_caution",
  "blockers": [
    {
      "id": "finding-uuid",
      "type": "security",
      "severity": "blocker",
      "title": "Hardcoded API Key",
      "description": "Found exposed API key in source code",
      "filePath": "src/lib/api.ts",
      "lineStart": 23,
      "codeSnippet": "const API_KEY = \"sk-...\";",
      "fix": {
        "type": "suggested",
        "originalCode": "const API_KEY = \"sk-...\";",
        "fixedCode": "const API_KEY = process.env.API_KEY;",
        "explanation": "Move secret to environment variable"
      }
    }
  ],
  "warnings": [...],
  "info": [...],
  "scanTimeSeconds": 8.2,
  "createdAt": "2026-01-02T12:00:00Z"
}
```

#### `POST /api/scan` — Start new scan

**Request:**
```json
{
  "repoUrl": "https://github.com/owner/repo"
}
```

**Response (SSE Stream):**
```
event: progress
data: {"type":"progress","stage":"cloning","message":"Cloning repository..."}

event: stack
data: {"type":"stack","data":{"type":"web","languages":["typescript"],...}}

event: finding
data: {"type":"finding","data":{"id":"uuid","severity":"blocker",...}}

event: complete
data: {"type":"complete","data":{"id":"scan-uuid","slopScore":72,...}}
```

#### `GET /api/scans` — List user's scans

**Query params:**
- `limit` (default: 20)
- `offset` (default: 0)

**Response:**
```json
{
  "scans": [
    {
      "id": "uuid",
      "repoOwner": "owner",
      "repoName": "repo",
      "slopScore": 72,
      "decision": "ship_with_caution",
      "blockerCount": 1,
      "warningCount": 5,
      "createdAt": "2026-01-02T12:00:00Z"
    }
  ],
  "total": 15
}
```

#### `GET /api/scan/[id]/sarif` — Download SARIF report

**Response:** SARIF 2.1.0 JSON file

---

## 3. Authentication & SSO

### Current Auth Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      SLOPOMETER AUTH FLOW                                 │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  1. User clicks "Sign in with GitHub"                                    │
│     └── GET /api/auth/login → Redirect to GitHub OAuth                   │
│                                                                           │
│  2. GitHub redirects back with code                                      │
│     └── GET /api/auth/callback?code=xxx&state=yyy                        │
│         ├── Verify state (CSRF protection)                               │
│         ├── Exchange code for access_token                               │
│         ├── Fetch GitHub user profile                                    │
│         ├── Upsert user in database                                      │
│         ├── Encrypt session (AES-256-GCM)                                │
│         └── Set slopometer_session cookie                                │
│                                                                           │
│  3. Subsequent requests                                                   │
│     └── getSession() decrypts cookie → returns { userId, accessToken }   │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### Session Cookie Format

```typescript
// Cookie name
const SESSION_COOKIE_NAME = "slopometer_session";

// Session data (before encryption)
interface SessionData {
  userId: string;      // Internal UUID
  accessToken: string; // GitHub access token
}

// After encryption: AES-256-GCM encrypted string
// Format: salt:iv:ciphertext:authTag (hex encoded)
```

### SSO for orion.ai

**Option 1: Shared Cookie (Same Domain)**
```
slopometer.com     → slopometer_session cookie
orion.slopometer.com → Same cookie (subdomain)
```

**Option 2: Cross-Domain SSO (Different Domain)**
```typescript
// orion.ai requests token exchange from Slopometer
// POST https://api.slopometer.com/v1/auth/exchange
{
  "slopometerSessionToken": "<from redirect>",
  "orionClientId": "orion-client-id"
}

// Returns
{
  "orionToken": "<signed JWT>",
  "user": { "id": "uuid", "plan": "pro", ... },
  "expiresAt": "2026-01-02T13:00:00Z"
}
```

**Option 3: OAuth Extension (Recommended)**
```typescript
// User on Slopometer clicks "Complete in orion.ai"
// Redirect to:
const url = `https://orion.ai/complete?` + new URLSearchParams({
  slopometer_session: await signedSessionToken(session),
  scan_id: scanId,
  return_url: window.location.href,
});

// orion.ai verifies token with Slopometer API
// GET https://api.slopometer.com/v1/auth/verify
// Authorization: Bearer <slopometer_session_token>
```

### Auth Helper Functions

```typescript
// src/lib/auth/github.ts

// Get current session
export async function getSession(): Promise<{
  userId: string;
  accessToken: string;
} | null>;

// Set session after OAuth
export async function setSession(
  userId: string,
  accessToken: string
): Promise<void>;

// Clear session (logout)
export async function clearSession(): Promise<void>;

// Get GitHub access token for API calls
export async function getAccessToken(): Promise<string | null>;
```

---

## 4. Tech Stack Detection

### Detection Logic

Slopometer detects tech stack from these sources:

| Source | What's Detected |
|--------|-----------------|
| `package.json` | Node.js frameworks, dependencies |
| `Cargo.toml` | Rust crates |
| `pyproject.toml` / `requirements.txt` | Python packages |
| `go.mod` | Go modules |
| `Package.swift` | Swift packages |
| `build.gradle` / `pom.xml` | Java/Kotlin |
| Directory structure | Framework patterns |
| Config files | `next.config.js`, `vite.config.ts`, etc. |

### TechStackAnalysis Type

```typescript
interface TechStackAnalysis {
  type: "web" | "ios" | "android" | "backend" | "cli" | "library" | "monorepo";
  
  languages: string[];
  // Examples: ["typescript", "javascript", "python", "rust", "swift"]
  
  frameworks: string[];
  // Examples: ["next.js", "react", "express", "fastapi", "django"]
  
  packageManager: "npm" | "yarn" | "pnpm" | "pip" | "poetry" | "cargo" | 
                  "maven" | "gradle" | "swift" | "cocoapods" | "bundler" | "go" | null;
  
  projectType: "app" | "library" | "monorepo" | "microservice";
  
  maturityLevel: "prototype" | "mvp" | "production";
  // Determined by:
  // - Has tests → production
  // - Has CI/CD → production
  // - Has documentation → mvp or production
  // - Has TODOs/FIXMEs → prototype or mvp
  
  detectedFiles: string[];
  // Key files that led to detection
  
  confidence: number; // 0-100
}
```

### Detection Code Location

```
src/lib/ai/stack-detector.ts     → AI-powered detection
src/lib/git/clone.ts             → File parsing & pattern matching
```

### Example Detection Result

```json
{
  "type": "web",
  "languages": [
    { "name": "typescript", "percentage": 78 },
    { "name": "css", "percentage": 12 },
    { "name": "javascript", "percentage": 10 }
  ],
  "frameworks": ["next.js", "react", "tailwindcss", "drizzle-orm"],
  "packageManagers": ["npm"],
  "database": "postgres",
  "cloudProvider": "vercel",
  "ciCd": "github-actions",
  "mobilePlatform": "none",
  "projectType": "app",
  "maturityLevel": "mvp"
}
```

---

## 5. Finding Types & Detectors

### Scanner Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      SLOPOMETER SCANNER PIPELINE                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  runAllScanners(files, techStack, standards)                            │
│           │                                                              │
│           ├─── scanSecrets()          → API keys, passwords, tokens     │
│           │                                                              │
│           ├─── scanPatterns()         → TODO, FIXME, console.log, etc.  │
│           │                                                              │
│           ├─── scanWithESLintRules()  → TypeScript/JS code quality      │
│           │                                                              │
│           ├─── scanPackages()         → NPM hallucinations, CVEs        │
│           │                                                              │
│           ├─── scanCVEs()             → OSV database vulnerabilities    │
│           │                                                              │
│           └─── scanProductionReadiness() → Timeouts, error handling     │
│                                                                          │
│           ▼                                                              │
│     All findings aggregated & deduplicated                              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Finding Type Definitions

```typescript
type FindingType = 
  | "secret"              // API keys, passwords, tokens
  | "hallucination"       // Non-existent packages
  | "slop"                // TODOs, FIXMEs, placeholder code
  | "security"            // XSS, SQL injection, SSRF
  | "pattern"             // Code anti-patterns
  | "platform"            // iOS/Android specific issues
  | "error-handling"      // Missing try/catch, unhandled promises
  | "production-readiness"; // Timeouts, health checks, rate limiting

type FindingSeverity = "blocker" | "warning" | "info";

interface Finding {
  id: string;
  type: FindingType;
  severity: FindingSeverity;
  title: string;
  description: string;
  filePath: string;
  lineStart?: number;
  lineEnd?: number;
  codeSnippet?: string;
  fix?: Fix;
  confidence: number; // 0-100
}
```

### Detector → Finding Type Mapping

| Detector | File | Finding Types | orion.ai Generation |
|----------|------|---------------|---------------------|
| `secrets.ts` | Regex patterns | `secret` | Env var extraction |
| `patterns.ts` | Code patterns | `slop`, `pattern` | Remove/replace |
| `eslint.ts` | AST analysis | `pattern`, `security` | Code fixes |
| `packages.ts` | Registry check | `hallucination` | Correct package |
| `cve.ts` | OSV API | `security` | Version update |
| `production.ts` | Code analysis | `production-readiness`, `error-handling` | Full implementation |

### Secrets Scanner Patterns

```typescript
// src/lib/scanners/secrets.ts

const SECRET_PATTERNS = [
  // API Keys
  { pattern: /sk[-_]live[-_][a-zA-Z0-9]{24,}/g, type: "stripe-live-key" },
  { pattern: /sk[-_]test[-_][a-zA-Z0-9]{24,}/g, type: "stripe-test-key" },
  { pattern: /ghp_[a-zA-Z0-9]{36}/g, type: "github-token" },
  { pattern: /gho_[a-zA-Z0-9]{36}/g, type: "github-oauth" },
  { pattern: /AIza[0-9A-Za-z_-]{35}/g, type: "google-api-key" },
  { pattern: /sk-[a-zA-Z0-9]{48}/g, type: "openai-api-key" },
  
  // Passwords
  { pattern: /password\s*[:=]\s*["'][^"']{8,}["']/gi, type: "hardcoded-password" },
  { pattern: /secret\s*[:=]\s*["'][^"']{8,}["']/gi, type: "hardcoded-secret" },
  
  // Connection strings
  { pattern: /postgres:\/\/[^:]+:[^@]+@/gi, type: "database-url" },
  { pattern: /mongodb(\+srv)?:\/\/[^:]+:[^@]+@/gi, type: "mongodb-url" },
];
```

### Production Readiness Checks

```typescript
// src/lib/scanners/production.ts

// What we check:
const PRODUCTION_CHECKS = [
  // Timeouts
  { pattern: /fetch\s*\(/, check: "has AbortController", severity: "warning" },
  { pattern: /axios\./, check: "has timeout config", severity: "warning" },
  
  // Error handling
  { pattern: /async function/, check: "has try/catch", severity: "warning" },
  { pattern: /export async function (GET|POST)/, check: "API route has try/catch", severity: "warning" },
  
  // Health checks (non-serverless only)
  { pattern: /express|koa|fastify/, check: "has /health endpoint", severity: "info" },
  
  // Rate limiting
  { pattern: /export async function POST/, check: "has rate limiting", severity: "info" },
  
  // Input validation
  { pattern: /req\.body|request\.json/, check: "validates input", severity: "warning" },
];
```

### Finding → orion.ai Generation Template Mapping

```typescript
const FINDING_TO_TEMPLATE: Record<string, string> = {
  // Secrets
  "hardcoded-secret": "extract-to-env",
  "exposed-api-key": "extract-to-env",
  "database-url-exposed": "extract-to-env",
  
  // Security
  "unencrypted-session": "add-encryption",
  "missing-csrf": "add-csrf-protection",
  "ssrf-vulnerability": "add-url-validation",
  "sql-injection": "add-parameterized-query",
  "xss-vulnerability": "add-sanitization",
  "missing-security-headers": "add-security-headers",
  
  // Error handling
  "unhandled-promise": "add-try-catch",
  "missing-error-boundary": "add-error-boundary",
  "silent-catch": "add-error-logging",
  
  // Production readiness
  "fetch-no-timeout": "add-fetch-timeout",
  "no-rate-limiting": "add-rate-limiter",
  "no-input-validation": "add-zod-validation",
  "no-health-check": "add-health-endpoint",
  
  // Testing
  "no-tests": "generate-unit-tests",
  "low-coverage": "generate-missing-tests",
  
  // CI/CD
  "no-ci-pipeline": "generate-github-actions",
  "no-linting-in-ci": "add-lint-to-ci",
};
```

---

## 6. Billing Integration

### Stripe Configuration

```typescript
// src/lib/stripe/client.ts

export const STRIPE_PRICES = {
  pro: {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
  },
  team: {
    monthly: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID,
    yearly: process.env.STRIPE_TEAM_YEARLY_PRICE_ID,
  },
};

export const PRICING = {
  free: { monthlyPrice: 0, yearlyPrice: 0 },
  pro: { monthlyPrice: 19, yearlyPrice: 190 },
  team: { monthlyPrice: 49, yearlyPrice: 490 },
  enterprise: { monthlyPrice: null, yearlyPrice: null }, // Contact sales
};
```

### Unified Billing for orion.ai

**Same Stripe Customer:**
```typescript
// When user subscribes on Slopometer
await stripe.customers.create({
  email: user.email,
  metadata: {
    slopometer_user_id: user.id,
    orion_user_id: user.id,  // Same ID!
  },
});

// Store in users table
await db.update(users)
  .set({ stripeCustomerId: customer.id })
  .where(eq(users.id, userId));
```

**orion.ai reads same customer:**
```typescript
// orion.ai checks subscription
const user = await db.select().from(users).where(eq(users.id, userId));
const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

// Unified limits
const limits = PLAN_LIMITS[user.plan];
const canGenerate = limits.orionGenerations === -1 || 
                    user.generationsThisMonth < limits.orionGenerations;
```

### Webhook Events (Shared)

```typescript
// Stripe webhooks handled at /api/stripe/webhook

// Events that affect both Slopometer and orion.ai:
switch (event.type) {
  case "checkout.session.completed":
    // User subscribed → update plan
    break;
  case "customer.subscription.updated":
    // Plan changed → update limits
    break;
  case "customer.subscription.deleted":
    // Cancelled → downgrade to free
    break;
  case "invoice.payment_failed":
    // Payment failed → grace period
    break;
}
```

---

## 7. Integration Protocol

### Handoff: Slopometer → orion.ai

#### Step 1: User clicks "Complete in orion.ai"

```typescript
// Slopometer: src/app/scan/[id]/page.tsx

const handleComplete = async () => {
  // Create signed handoff token
  const handoff = {
    scanId: scan.id,
    userId: session.userId,
    repoUrl: scan.repoUrl,
    techStack: scan.techStack,
    findingCount: scan.findings.length,
    timestamp: Date.now(),
  };
  
  const signature = await signHandoff(handoff, ORION_SHARED_SECRET);
  
  // Redirect to orion.ai
  window.location.href = `https://orion.ai/complete?` + new URLSearchParams({
    handoff: btoa(JSON.stringify(handoff)),
    sig: signature,
  });
};
```

#### Step 2: orion.ai receives handoff

```typescript
// orion.ai: src/app/complete/page.tsx

export default async function CompletePage({ searchParams }) {
  // Verify signature
  const handoff = JSON.parse(atob(searchParams.handoff));
  const isValid = await verifyHandoff(handoff, searchParams.sig, SLOPOMETER_SHARED_SECRET);
  
  if (!isValid) {
    return <ErrorPage message="Invalid handoff" />;
  }
  
  // Check timestamp (prevent replay)
  if (Date.now() - handoff.timestamp > 5 * 60 * 1000) {
    return <ErrorPage message="Handoff expired" />;
  }
  
  // Fetch full scan from Slopometer API
  const scan = await fetch(`https://api.slopometer.com/v1/scans/${handoff.scanId}`, {
    headers: { Authorization: `Bearer ${SLOPOMETER_API_KEY}` },
  }).then(r => r.json());
  
  // Continue with completion flow...
}
```

#### Step 3: orion.ai fetches scan data

```typescript
// orion.ai API client for Slopometer

class SlopometerClient {
  private apiKey: string;
  private baseUrl = "https://api.slopometer.com/v1";
  
  async getScan(scanId: string): Promise<ScanResult> {
    const res = await fetch(`${this.baseUrl}/scans/${scanId}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    return res.json();
  }
  
  async getFindings(scanId: string): Promise<Finding[]> {
    const res = await fetch(`${this.baseUrl}/scans/${scanId}/findings`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    return res.json();
  }
  
  async verifyUser(userId: string, sessionToken: string): Promise<User | null> {
    const res = await fetch(`${this.baseUrl}/auth/verify`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    if (!res.ok) return null;
    return res.json();
  }
}
```

### API for orion.ai

**New endpoints to add to Slopometer:**

```typescript
// GET /api/v1/scans/[id]
// Returns full scan with all findings and fixes
// Auth: API key or session token

// GET /api/v1/scans/[id]/findings
// Returns just findings array
// Auth: API key or session token

// POST /api/v1/auth/verify
// Verifies session token and returns user
// Auth: Session token in Authorization header

// POST /api/v1/auth/exchange
// Exchanges Slopometer session for orion.ai token
// Auth: Signed handoff token
```

---

## 8. Shared Libraries

### What Can Be Shared

| Library | Location | Can Share? | Notes |
|---------|----------|------------|-------|
| Crypto | `src/lib/crypto.ts` | ✅ Yes | AES-256-GCM encryption |
| Types | `src/lib/types.ts` | ✅ Yes | All TypeScript types |
| AI Client | `src/lib/ai/client.ts` | ✅ Yes | Claude, GPT, etc. |
| Cost Tracker | `src/lib/cost-tracker.ts` | ✅ Yes | AI cost tracking |
| Rate Limiter | `src/lib/rate-limit.ts` | ✅ Yes | IP-based limiting |
| DB Schema | `src/lib/db/schema.ts` | ✅ Yes | Add orion tables |
| DB Ops | `src/lib/db/operations.ts` | ⚠️ Partial | Extend for orion |
| Scanners | `src/lib/scanners/*` | ✅ Yes | Reuse for detection |
| Fix Generator | `src/lib/ai/fix-generator.ts` | ✅ Yes | Extend for full gen |

### Recommended Package Structure

```
// Option 1: Monorepo
packages/
├── shared/                    # Shared libraries
│   ├── types/                 # TypeScript types
│   ├── crypto/                # Encryption
│   ├── ai/                    # AI client
│   └── db/                    # Database schema
├── slopometer/                # Slopometer app
│   └── src/
└── orion/                    # orion.ai app
    └── src/

// Option 2: Separate repos with shared npm package
@slopometer/shared             # Published to npm (private)
├── types
├── crypto
├── ai
└── db
```

### Environment Variables (Shared)

```bash
# Database (SHARED)
DATABASE_URL=postgres://...

# Auth (SHARED)
ENCRYPTION_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# AI (SHARED)
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
GOOGLE_AI_API_KEY=...
XAI_API_KEY=...

# Stripe (SHARED)
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# Slopometer specific
NEXT_PUBLIC_APP_URL=https://slopometer.com

# orion.ai specific
NEXT_PUBLIC_ORION_URL=https://orion.ai
SLOPOMETER_API_KEY=...           # For API calls to Slopometer
ORION_SHARED_SECRET=...         # For handoff signing
```

---

## Quick Start: Building orion.ai Integration

### 1. Clone and extend Slopometer

```bash
# Create orion.ai project
npx create-next-app@latest orion --typescript --tailwind --app

# Copy shared libraries
cp -r slopometer/src/lib/types.ts orion/src/lib/
cp -r slopometer/src/lib/crypto.ts orion/src/lib/
cp -r slopometer/src/lib/ai orion/src/lib/
cp -r slopometer/src/lib/db/schema.ts orion/src/lib/db/
```

### 2. Add orion.ai tables to schema

```typescript
// Add to src/lib/db/schema.ts

export const completions = pgTable("completions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  scanId: uuid("scan_id").references(() => scans.id),
  
  repoUrl: text("repo_url").notNull(),
  completenessScore: integer("completeness_score"),
  categoryScores: jsonb("category_scores"),
  
  filesGenerated: integer("files_generated").default(0),
  status: text("status").default("pending"),
  
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const generatedFiles = pgTable("generated_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  completionId: uuid("completion_id").references(() => completions.id),
  
  filePath: text("file_path").notNull(),
  fileContent: text("file_content").notNull(),
  category: text("category").notNull(),
  confidence: integer("confidence"),
  
  createdAt: timestamp("created_at").defaultNow(),
});
```

### 3. Implement handoff receiver

```typescript
// orion.ai: src/app/complete/page.tsx

import { SlopometerClient } from "@/lib/slopometer-client";

export default async function CompletePage({ searchParams }) {
  const client = new SlopometerClient(process.env.SLOPOMETER_API_KEY!);
  
  // Verify and get scan
  const scan = await client.getScan(searchParams.scanId);
  
  // Analyze completeness
  const completeness = await analyzeCompleteness(scan);
  
  return (
    <CompletionDashboard 
      scan={scan}
      completeness={completeness}
    />
  );
}
```

### 4. Wire up the "Complete" button in Slopometer

```typescript
// Slopometer: Add to scan results page

<Button 
  onClick={() => {
    window.location.href = `https://orion.ai/complete?scanId=${scan.id}`;
  }}
  className="gap-2"
>
  <Zap className="w-4 h-4" />
  Complete in orion.ai
  <ExternalLink className="w-4 h-4" />
</Button>
```

---

**Document History:**

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 2026 | Initial integration guide |


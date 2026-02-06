# Proofs Not Scores: The Evolution of orion

**Status**: Strategic Direction  
**Last Updated**: February 2026  
**Summary**: Shift from pattern-based scoring to verification-based guarantees

---

## The Problem with Scores

Current orion (and all competitors) work like this:

```
Scan code → Match patterns → Assign score → Guess user capacity
```

This produces statements like:
- "Your testing score is 72/100"
- "You can handle ~10K users"
- "Security is at 85%"

**The problem**: These are **guesses based on patterns**, not verified facts.

A codebase with Vitest configured gets points for "has test framework" even if:
- The tests don't pass
- The tests are meaningless (100% coverage, 0% mutation score)
- The tests have never run in CI

---

## The Vision: Verification Levels

Instead of guessing, **prove it**.

| Level | What We Do | Confidence | Cost |
|-------|------------|------------|------|
| **Static** | Pattern matching | "Looks like X" | Free |
| **Compiled** | Actually compile | "Code compiles" | $0.01 |
| **Tested** | Run test suite | "Tests pass" | $0.03 |
| **Mutation** | Run Stryker | "Tests are effective" | $0.15 |
| **Load Tested** | Run k6/Artillery | "Handles N users" | $0.05 |
| **Production** | Sentry/OTel data | "Real bugs tracked" | API cost |
| **Proven** | Formal verification | "Mathematically correct" | High |

---

## Current vs Target Architecture

### Current Architecture

```
lib/orion/
├── analyzers/          # Pattern matching (12 categories)
│   ├── testing.ts      # Checks for test files, frameworks
│   ├── security.ts     # Checks for headers, validation
│   └── ...
├── altitude.ts         # Maps scores → user capacity (GUESS)
├── generators/         # Generate fix code
└── types.ts            # CategoryScore, Gap, etc.

lib/sandbox.ts          # E2B integration (EXISTS but underused)
```

### Target Architecture

```
lib/orion/
├── analyzers/          # Static analysis (unchanged)
├── verifiers/          # NEW: Execute and verify
│   ├── compile.ts      # Verify code compiles
│   ├── tests.ts        # Run tests, verify they pass
│   ├── mutation.ts     # Stryker integration
│   ├── load.ts         # k6/Artillery load testing
│   └── efficiency.ts   # Algorithmic efficiency analysis
├── observability/      # NEW: Production integration
│   ├── sentry.ts       # Fetch real errors
│   ├── opentelemetry.ts
│   └── correlate.ts    # Map errors → code
├── altitude.ts         # Uses VERIFIED data, not guesses
└── types.ts            # Extended with verification types
```

---

## Key Type Changes

### Current Types

```typescript
interface CategoryScore {
  category: Category
  score: number // 0-100 (guessed)
  detected: string[]
  gaps: Gap[]
}

interface AltitudeResult {
  maxUsers: number // GUESSED from patterns
  bottleneck: { category, reason }
}
```

### New Types

```typescript
interface VerifiedCategoryScore extends CategoryScore {
  verification: {
    level: 'unverified' | 'compiled' | 'tested' | 'mutation' | 'load_tested' | 'proven'
    timestamp: Date
    evidence: string
  }
  
  // For testing category
  testsExecuted?: {
    total: number
    passed: number
    failed: number
    duration: number
  }
  
  // Mutation testing
  mutationScore?: number
  weakTests?: string[]
  
  // Production correlation
  productionBugs?: {
    count: number
    usersAffected: number
  }
}

interface VerifiedAltitude extends AltitudeResult {
  verificationLevel: 'pattern' | 'load_tested'
  
  // If load tested, these are REAL numbers
  verified?: {
    maxUsers: number
    p99Latency: number
    errorRate: number
    bottleneck: string
    testTimestamp: Date
  }
}
```

---

## Implementation: Phase 1 (Compile Verification)

Extend existing sandbox.ts:

```typescript
// lib/orion/verifiers/compile.ts

export interface CompileResult {
  success: boolean
  errors: CompileError[]
  warnings: CompileWarning[]
  duration: number
  evidence: string // Build log
}

export async function verifyCompilation(
  files: Record<string, string>,
  stack: TechStack
): Promise<CompileResult> {
  const sandbox = await Sandbox.create(getTemplate(stack))
  
  try {
    // Write files
    for (const [path, content] of Object.entries(files)) {
      await sandbox.files.write(`/app/${path}`, content)
    }
    
    // Install deps
    await sandbox.commands.run(getInstallCommand(stack), { cwd: '/app' })
    
    // Build
    const build = await sandbox.commands.run(getBuildCommand(stack), { cwd: '/app' })
    
    return {
      success: build.exitCode === 0,
      errors: parseErrors(build.stderr),
      warnings: parseWarnings(build.stderr),
      duration: build.duration,
      evidence: build.stdout + build.stderr
    }
  } finally {
    await sandbox.kill()
  }
}
```

---

## Implementation: Phase 2 (Test Verification)

```typescript
// lib/orion/verifiers/tests.ts

export interface TestResult {
  success: boolean
  total: number
  passed: number
  failed: number
  skipped: number
  coverage?: {
    lines: number
    branches: number
    functions: number
  }
  failures: TestFailure[]
  duration: number
  evidence: string
}

export async function verifyTests(
  sandbox: Sandbox
): Promise<TestResult> {
  const result = await sandbox.commands.run('npm test -- --coverage --json', {
    cwd: '/app',
    timeoutMs: 180_000
  })
  
  return parseTestOutput(result.stdout, result.stderr)
}
```

---

## Implementation: Phase 3 (Mutation Testing)

```typescript
// lib/orion/verifiers/mutation.ts

export interface MutationResult {
  score: number // 0-100, % of mutants killed
  totalMutants: number
  killed: number
  survived: number
  timeout: number
  noCoverage: number
  
  // Weak tests that didn't catch mutations
  weakTests: {
    file: string
    test: string
    survivingMutants: number
  }[]
  
  duration: number
  evidence: string
}

export async function runMutationTesting(
  sandbox: Sandbox,
  targetFiles: string[]
): Promise<MutationResult> {
  // Install Stryker
  await sandbox.commands.run(
    'npm install --save-dev @stryker-mutator/core @stryker-mutator/vitest-runner',
    { cwd: '/app' }
  )
  
  // Configure
  await sandbox.files.write('/app/stryker.config.json', JSON.stringify({
    testRunner: 'vitest',
    mutate: targetFiles,
    reporters: ['json', 'clear-text'],
    concurrency: 4,
    timeoutMS: 10000
  }))
  
  // Run (slow - 5-15 minutes typical)
  const result = await sandbox.commands.run('npx stryker run', {
    cwd: '/app',
    timeoutMs: 900_000 // 15 minutes
  })
  
  return parseStrykerOutput(result.stdout)
}
```

---

## Implementation: Phase 4 (Load Testing)

```typescript
// lib/orion/verifiers/load.ts

export interface LoadTestResult {
  maxConcurrentUsers: number // VERIFIED number
  
  metrics: {
    requestsTotal: number
    requestsFailed: number
    latencyP50: number
    latencyP95: number
    latencyP99: number
    throughput: number // req/s
  }
  
  bottleneck: {
    component: string // 'database' | 'api' | 'memory' | 'cpu'
    saturatedAt: number // User count when it failed
    errorType: string
  }
  
  duration: number
  evidence: string
}

export async function runLoadTest(
  sandbox: Sandbox,
  endpoint: string,
  options: {
    maxUsers?: number
    duration?: number
    rampUp?: number
  } = {}
): Promise<LoadTestResult> {
  const { maxUsers = 1000, duration = 60, rampUp = 30 } = options
  
  // Install k6
  await sandbox.commands.run(
    'curl -L https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz | tar xz'
  )
  
  // Create load test script
  const script = `
    import http from 'k6/http';
    import { check, sleep } from 'k6';
    import { Rate, Trend } from 'k6/metrics';
    
    const errorRate = new Rate('errors');
    const latency = new Trend('latency');
    
    export const options = {
      stages: [
        { duration: '${rampUp}s', target: ${maxUsers / 2} },
        { duration: '${duration}s', target: ${maxUsers} },
        { duration: '30s', target: 0 },
      ],
    };
    
    export default function() {
      const start = Date.now();
      const res = http.get('${endpoint}');
      latency.add(Date.now() - start);
      errorRate.add(res.status !== 200);
      check(res, { 'status 200': (r) => r.status === 200 });
      sleep(0.1);
    }
  `
  
  await sandbox.files.write('/app/loadtest.js', script)
  
  const result = await sandbox.commands.run(
    './k6 run --out json=results.json loadtest.js',
    { cwd: '/app', timeoutMs: 300_000 }
  )
  
  return parseK6Output(result.stdout)
}
```

---

## Implementation: Phase 5 (Production Correlation)

```typescript
// lib/orion/observability/sentry.ts

export interface SentryIssue {
  id: string
  title: string
  culprit: string // file:line
  count: number
  userCount: number
  firstSeen: Date
  lastSeen: Date
  isRegression: boolean
  stackTrace: StackFrame[]
}

export async function fetchSentryIssues(
  dsn: string,
  since: Date = new Date(Date.now() - 24 * 60 * 60 * 1000)
): Promise<SentryIssue[]> {
  const [org, project] = parseSentryDsn(dsn)
  
  const response = await fetch(
    `https://sentry.io/api/0/projects/${org}/${project}/issues/?query=is:unresolved`,
    { headers: { Authorization: `Bearer ${SENTRY_API_KEY}` } }
  )
  
  return response.json()
}

// lib/orion/observability/correlate.ts

export function correlateToSource(
  issues: SentryIssue[],
  files: RepoFile[]
): CorrelatedIssue[] {
  return issues.map(issue => {
    const stackFrame = issue.stackTrace.find(frame =>
      files.some(f => f.path.endsWith(frame.filename))
    )
    
    return {
      ...issue,
      sourceFile: stackFrame?.filename,
      sourceLine: stackFrame?.lineno,
      codeSnippet: stackFrame ? getCodeSnippet(files, stackFrame) : undefined
    }
  })
}
```

---

## Updated Altitude Calculation

```typescript
// lib/orion/altitude.ts - V2

export function calculateVerifiedAltitude(
  categories: VerifiedCategoryScore[],
  loadTest?: LoadTestResult,
  productionData?: SentryIssue[]
): VerifiedAltitude {
  // If we have load test data, use REAL numbers
  if (loadTest) {
    return {
      maxUsers: loadTest.maxConcurrentUsers,
      verificationLevel: 'load_tested',
      zone: getAltitudeZone(loadTest.maxConcurrentUsers),
      bottleneck: {
        category: mapComponentToCategory(loadTest.bottleneck.component),
        score: 0, // Not applicable for verified
        maxUsers: loadTest.bottleneck.saturatedAt,
        reason: `VERIFIED: ${loadTest.bottleneck.errorType} at ${loadTest.bottleneck.saturatedAt} users`
      },
      verified: {
        maxUsers: loadTest.maxConcurrentUsers,
        p99Latency: loadTest.metrics.latencyP99,
        errorRate: loadTest.metrics.requestsFailed / loadTest.metrics.requestsTotal,
        bottleneck: loadTest.bottleneck.component,
        testTimestamp: new Date()
      },
      categoryLimits: [],
      potentialUsers: loadTest.maxConcurrentUsers * 2, // Estimate
      topUpgrades: []
    }
  }
  
  // Fall back to pattern-based estimation
  const baseResult = calculateAltitude(categories)
  return {
    ...baseResult,
    verificationLevel: 'pattern'
  }
}
```

---

## API Changes

```typescript
// POST /api/analyze

interface AnalyzeRequest {
  repoUrl: string
  verification?: 'static' | 'compile' | 'test' | 'mutation' | 'load' | 'full'
  // Optional: production integration
  sentryDsn?: string
}

interface AnalyzeResponse {
  // Existing
  categories: CategoryScore[]
  overallScore: number
  altitude: AltitudeResult
  
  // NEW: Verification data
  verification: {
    level: 'static' | 'compiled' | 'tested' | 'mutation' | 'load_tested'
    timestamp: Date
    
    compile?: CompileResult
    tests?: TestResult
    mutation?: MutationResult
    load?: LoadTestResult
    production?: CorrelatedIssue[]
  }
  
  // Verified altitude (if available)
  verifiedAltitude?: {
    maxUsers: number
    p99Latency: number
    proof: 'load_tested'
  }
}
```

---

## Cost Model

| Verification | Time | E2B Cost | When |
|--------------|------|----------|------|
| Static | 2-5s | $0 | Always |
| Compile | 30-60s | $0.01 | Free tier |
| Test | 1-3min | $0.03 | Pro |
| Mutation | 5-15min | $0.15 | Pro (optional) |
| Load | 3-5min | $0.05 | Pro |
| Full | 15-25min | $0.25 | Enterprise |

At 1000 full verifications/month: **$250 E2B cost**

---

## UI Changes

### Before (Pattern-Based)

```
┌─────────────────────────────────────────────┐
│  ALTITUDE: CRUISING                         │
│  Max Users: ~10K (estimated)                │
│                                              │
│  Testing: 72/100                            │
│  ├── ✓ Vitest configured                    │
│  ├── ✓ 15 test files found                  │
│  └── ⚠ No E2E tests                         │
└─────────────────────────────────────────────┘
```

### After (Verification-Based)

```
┌─────────────────────────────────────────────┐
│  ALTITUDE: CRUISING ✓ VERIFIED              │
│  Max Users: 12,847 (load tested)            │
│  p99 Latency: 247ms | Error rate: 0.3%      │
│                                              │
│  Testing: 72/100 → 89/100 (verified)        │
│  ├── ✓ VERIFIED: 147/152 tests pass         │
│  ├── ✓ VERIFIED: 78% mutation score         │
│  ├── ⚠ 5 tests failing (see details)        │
│  └── ⚠ 12 weak tests (didn't catch mutants) │
│                                              │
│  Production (Sentry):                        │
│  ├── 3 errors in last 24h (47 users)        │
│  └── TypeError at api/users.ts:45           │
└─────────────────────────────────────────────┘
```

---

## The Pitch

**Before**: "Your code looks like it could handle 10K users"

**After**: "We ran 1,000,000 requests against your code. It handles 12,847 concurrent users before the database connection pool saturates. Here's the evidence."

**One-liner**: "Not guesses — proofs."

---

## Competitive Position

| Competitor | What They Do | Limitation |
|------------|--------------|------------|
| SonarQube | Pattern matching | No execution |
| Snyk | Vulnerability scanning | No verification |
| Codacy | Code quality metrics | No runtime analysis |
| GitHub Copilot | Code generation | No verification |
| OpenAI Codex | Autonomous coding | No load testing |

**orion unique**: Execute code, run tests, mutation test, load test, correlate production — all in one flow.

---

## Risks

1. **E2B costs** — Load testing is expensive at scale. Need to tier carefully.

2. **Sandbox escape** — Security critical. E2B handles this, but we're trusting them.

3. **False confidence** — "Verified" doesn't mean "bug-free." Need clear messaging.

4. **Time** — Full verification takes 15-25 minutes. Not for every commit.

---

## Next Steps

1. [ ] Extend sandbox.ts with test execution
2. [ ] Add Stryker integration for mutation testing
3. [ ] Add k6 integration for load testing
4. [ ] Add Sentry API integration
5. [ ] Update altitude calculation to use verified data
6. [ ] Update UI to show verification status
7. [ ] Pricing tiers based on verification level

# inprod.ai PRD v2 — Verified Production Readiness

**Version**: 2.0  
**Status**: Strategic  
**Last Updated**: February 2026  
**Domain**: inprod.ai  
**Parent Product**: Slopometer

---

## Executive Summary

inprod.ai evolves from a pattern-matching analysis tool to a **verification-based production readiness platform**. The core insight: scores are guesses, proofs are facts.

**The shift**:
- v1: "Your code looks like it could handle 10K users" (pattern matching)
- v2: "We ran 1M requests against your code. It handles 12,847 users before database saturation." (verified)

**Two-track strategy**:
1. **Proofs Not Scores** (product) — verification-based analysis that proves code works, scales, and is tested
2. **Efficiency Auditor** (research) — measures how close code is to theoretical optimum

---

## Problem Statement

### The Pattern Matching Trap

All current production readiness tools (including inprod v1) work the same way:

```
Scan code → Match patterns → Assign score → Guess capacity
```

This produces statements that are **unverified guesses**:
- "Testing score: 72/100" — but do the tests pass?
- "Can handle ~10K users" — based on what evidence?
- "Security at 85%" — encrypted cookies detected, but is the encryption correct?

A codebase with Vitest configured gets points for "has test framework" even if:
- Tests don't pass
- Tests are meaningless (100% coverage, 0% mutation score)
- Tests have never run in CI

### The Market Gap

| Tool | What It Does | What It Doesn't Do |
|------|--------------|-------------------|
| SonarQube | Pattern matching | Execute code |
| Snyk | Find vulnerabilities | Verify fixes work |
| Codacy | Code quality metrics | Run tests |
| k6/Artillery | Load testing | Integrate with code analysis |
| Stryker | Mutation testing | Integrate with capacity planning |

No tool combines: code analysis + test execution + mutation testing + load testing + production correlation.

---

## Market Opportunity

### Total Addressable Market

| Segment | 2025 Size | Growth | Relevance |
|---------|-----------|--------|-----------|
| Software Testing/QA | $55B | 6.2% CAGR | Core market |
| Load Testing | $8.9B | 11% CAGR | Direct feature |
| Continuous Testing | $1.5-9.6B | 13-17% CAGR | DevOps integration |
| Performance Testing | $1.9B | 14% CAGR | Efficiency auditor |
| Formal Verification | $1.1B | 18.6% CAGR | Premium tier |

### Enterprise Adoption Signals

- 78% of enterprises have CI/CD automation
- 62% of Fortune 500 use continuous testing at scale
- 35% use AI-driven testing engines
- Cloud solutions dominate (59% market share)

### Buyer Profile

**Primary**: DevOps teams, Engineering leads, QA managers

**Budget owners**: Already paying for testing tools, load testing, observability

**Pain point**: Too many disconnected tools; no single source of truth for "is this production ready?"

---

## Product Vision

### Verification Levels

Instead of pattern-based scores, offer progressively rigorous verification:

| Level | What We Do | Evidence | Cost |
|-------|------------|----------|------|
| **Static** | Pattern matching | "Looks like X" | Free |
| **Compiled** | Actually compile | Build log | $0.01 |
| **Tested** | Run test suite | Test results | $0.03 |
| **Mutation** | Run Stryker | Mutation score | $0.15 |
| **Load Tested** | Run k6 | Verified user capacity | $0.05 |
| **Production** | Sentry/OTel data | Real error correlation | API cost |
| **Proven** | Formal verification | Mathematical guarantee | High |

### Core Value Propositions

**To DevOps teams**: "Stop guessing if your code works. Prove it."

**To Engineering leads**: "Know your actual capacity before you deploy."

**To QA managers**: "Verify test quality, not just coverage."

---

## Architecture

### Current State

```
lib/inprod/
├── analyzers/          # Pattern matching (12 categories)
├── generators/         # Generate fix code
├── altitude.ts         # Maps scores → user capacity (GUESS)
└── types.ts

lib/sandbox.ts          # E2B integration (exists, underused)
```

### Target State

```
lib/inprod/
├── analyzers/          # Static analysis (unchanged)
├── verifiers/          # NEW: Execute and verify
│   ├── compile.ts      # Verify code compiles
│   ├── tests.ts        # Run tests, capture results
│   ├── mutation.ts     # Stryker integration
│   ├── load.ts         # k6/Artillery load testing
│   └── efficiency.ts   # Algorithmic efficiency (research track)
├── observability/      # NEW: Production integration
│   ├── sentry.ts       # Fetch real errors
│   ├── opentelemetry.ts
│   └── correlate.ts    # Map errors → code location
├── generators/         # Generate fix code
├── altitude.ts         # Uses VERIFIED data, not guesses
└── types.ts            # Extended with verification types
```

### Data Flow

```
User submits repo
        ↓
┌───────────────────────────────────────────────────────────┐
│ PHASE 1: Static Analysis                                   │
│ ├── Pattern matching (existing 12 analyzers)              │
│ ├── Tech stack detection                                   │
│ └── Gap identification                                     │
└───────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│ PHASE 2: Sandbox Verification (E2B)                        │
│ ├── Clone repo into sandbox                                │
│ ├── Install dependencies                                   │
│ ├── Run build → capture compile errors                     │
│ ├── Run tests → capture pass/fail + coverage              │
│ └── (Optional) Mutation testing → capture mutation score   │
└───────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│ PHASE 3: Load Testing (Pro tier)                           │
│ ├── Start app in sandbox                                   │
│ ├── Run k6 load test (ramp 0 → N users)                   │
│ ├── Capture p50/p95/p99 latency                           │
│ ├── Identify bottleneck (where it breaks)                 │
│ └── Return VERIFIED max concurrent users                   │
└───────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│ PHASE 4: Production Correlation (optional)                 │
│ ├── Connect Sentry/OpenTelemetry                          │
│ ├── Fetch real errors from last 24h                       │
│ ├── Correlate stack traces → source files                 │
│ └── Prioritize fixes by production impact                  │
└───────────────────────────────────────────────────────────┘
        ↓
Output: Verified analysis with evidence
```

---

## Key Type Definitions

### Verified Category Score

```typescript
interface VerifiedCategoryScore extends CategoryScore {
  verification: {
    level: 'unverified' | 'compiled' | 'tested' | 'mutation' | 'load_tested'
    timestamp: Date
    evidence: string  // Build log, test output, etc.
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
```

### Verified Altitude

```typescript
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

## API Design

### Analyze Endpoint

```typescript
// POST /api/analyze

interface AnalyzeRequest {
  repoUrl: string
  verification?: 'static' | 'compile' | 'test' | 'mutation' | 'load' | 'full'
  sentryDsn?: string  // Optional production integration
}

interface AnalyzeResponse {
  // Existing fields
  categories: CategoryScore[]
  overallScore: number
  altitude: AltitudeResult

  // NEW: Verification data
  verification: {
    level: string
    timestamp: Date
    compile?: CompileResult
    tests?: TestResult
    mutation?: MutationResult
    load?: LoadTestResult
    production?: CorrelatedIssue[]
  }

  // Verified altitude (if load tested)
  verifiedAltitude?: {
    maxUsers: number
    p99Latency: number
    proof: 'load_tested'
  }
}
```

---

## Pricing Strategy

### Tiered by Verification Level

| Tier | Price | Verification | Use Case |
|------|-------|--------------|----------|
| **Free** | $0 | Static only | Try before buy |
| **Pro** | $29/mo | Static + Compile + Test | Individual devs |
| **Team** | $99/mo | Pro + Mutation + Load | Small teams |
| **Enterprise** | Custom | Full + Production + SLA | Large orgs |

### Cost Model

| Verification | E2B Time | E2B Cost | Margin at Pro |
|--------------|----------|----------|---------------|
| Compile | 30-60s | $0.01 | 99%+ |
| Test | 1-3min | $0.03 | 99%+ |
| Mutation | 5-15min | $0.15 | 97% |
| Load | 3-5min | $0.05 | 98% |
| Full | 15-25min | $0.25 | 95% |

At 1000 full verifications/month: $250 E2B cost vs $29,000 revenue (Pro) = 99%+ margin

---

## Competitive Positioning

### Unique Value

No competitor combines all of:
1. Static code analysis (like SonarQube)
2. Test execution with results (like CI)
3. Mutation testing (like Stryker)
4. Load testing (like k6)
5. Production correlation (like Sentry)
6. Capacity prediction (unique to inprod)

### Positioning Matrix

```
                    HIGH VERIFICATION
                          ↑
                          │
        Formal tools      │       inprod v2
        (Coq, TLA+)       │    (verified + accessible)
                          │
    ←─────────────────────┼─────────────────────────→
    ACADEMIC              │                  PRACTICAL
                          │
        Static analyzers  │       Cursor/Copilot
        (SonarQube, Snyk) │    (generation, no verification)
                          │
                          ↓
                    LOW VERIFICATION
```

---

## Research Track: Efficiency Auditor

### The Concept

No tool answers: "How close is my code to the theoretical optimum?"

Current tools tell you complexity class (O(n²)). None tell you the efficiency ratio — actual operations vs theoretical minimum.

### The Output

```
You want to sort 1M items. The theoretical minimum is 19.9M comparisons.
Your implementation does 47M comparisons.
You're at 42% theoretical efficiency.

Gap breakdown:
├── 30% — Suboptimal algorithm (bubble sort vs merge sort)
├── 12% — Cache misses from non-sequential access
└── 5% — Redundant comparisons

Recommendation: Replace with merge sort for 2.4x speedup.
```

### Market Position

| Audience | Pain | Willingness to Pay |
|----------|------|-------------------|
| HFT / Trading | Nanoseconds = money | Very high |
| Game developers | Frame time budgets | High |
| Database vendors | Query optimization | High |
| Embedded systems | Resource constraints | Medium |
| General SaaS | "Fast enough" mentality | Low |

### Research Value

This concept is **publishable** (novel academic contribution) and **defensible** (hard to replicate):
- Problem classification is AI-hard
- Bounds database requires deep CS knowledge
- Instrumentation is technically complex
- Gap explanation requires LLM + domain expertise

Target venues: PLDI, ICSE, FSE

---

## Slopometer Integration

### Relationship

- **Slopometer**: Detection ("Is my code ready to ship?")
- **inprod**: Completion + Verification ("Make my code ready to ship" + "Prove it's ready")

### Integration Flow

```
Slopometer scan
      ↓
"3 blockers, 12 warnings"
      ↓
[Complete in inprod.ai →] button
      ↓
inprod.ai receives scan context
      ↓
Generate fixes + Verify they work
      ↓
Create PR with verified fixes
```

### Shared Infrastructure

| Component | Shared? |
|-----------|---------|
| Auth (GitHub OAuth) | Yes, SSO |
| Database (Neon Postgres) | Yes, shared tables |
| AI Layer (Claude/GPT) | Yes |
| Billing (Stripe) | Yes, unified |
| Analytics (PostHog) | Yes |

---

## Distribution

### Multi-Platform Support

| Developer Type | Distribution | Status |
|----------------|--------------|--------|
| Web/React/Node | npm (`npx inprod`) | Planned |
| macOS / iOS | Homebrew (`brew install inprod`) | Planned |
| Universal | curl script | Planned |
| Web-only | inprod.ai dashboard | Current |

### CLI Flow

```bash
$ inprod

🔍 Analyzing my-startup...

📊 Production Readiness: 67% → 89% (verified)

┌──────────────────────────────────────────────────────────┐
│  Category       Pattern   Verified   Action              │
├──────────────────────────────────────────────────────────┤
│  Testing        ✓ 72%     ✓ 89%      147/152 tests pass │
│  Security       ⚠ 45%     ✓ 78%      Encryption verified │
│  Deployment     ✗ 0%      ✗ 0%       Will generate CI/CD │
└──────────────────────────────────────────────────────────┘

🚀 Max Concurrent Users: 12,847 (VERIFIED via load test)
   Bottleneck: Database connection pool at 13K users
   p99 Latency: 247ms

Generate fixes? [Y/n]
```

---

## Success Metrics

### Product Metrics

| Metric | Definition | Target (Month 3) |
|--------|------------|------------------|
| Verified scans | Scans with compile/test verification | 1,000/mo |
| Verification rate | % of scans that verify | 60% |
| Fix generation | Files generated | 5,000/mo |
| PR creation | PRs opened via inprod | 200/mo |

### Business Metrics

| Metric | Target (Month 3) |
|--------|------------------|
| Pro conversions | 200 |
| MRR | $6,000 |
| Churn rate | <5% |

### Research Metrics

| Metric | Target (Year 1) |
|--------|-----------------|
| Paper submission | 1 (ICSE/PLDI/FSE) |
| Efficiency auditor beta users | 50 |
| Problem classes classified | 20 |

---

## Risks and Mitigations

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| E2B sandbox escape | Critical | Trust E2B; add input sanitization |
| Mutation testing too slow | Medium | Incremental; target critical paths only |
| Load testing inaccurate | Medium | Calibrate against known benchmarks |
| LLM hallucination in analysis | Medium | Validate with static analysis |

### Business Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| E2B costs at scale | Medium | Aggressive caching; tier verification |
| Too complex for users | High | Progressive disclosure; start with static |
| Competition copies | Medium | Move fast on efficiency auditor (moat) |

---

## Open Questions

1. **Verification timing**: Run on every push? Scheduled? On-demand only?

2. **Private repo security**: How to handle secrets in sandboxed execution?

3. **Multi-language load testing**: How to start apps in different frameworks?

4. **Production integration auth**: OAuth flow for Sentry/Datadog access?

5. **Efficiency auditor scope**: Start with which problem classes?

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 2026 | Initial PRD |
| 1.1 | Jan 2026 | Added form factor, distribution, cost modeling |
| 2.0 | Feb 2026 | Major revision: Proofs Not Scores vision, Efficiency Auditor research track, market sizing, competitive positioning |

# inprod Gameplan

**Status**: Active  
**Last Updated**: February 2026  
**Objective**: Execute Proofs Not Scores strategy while building toward Efficiency Auditor moat

---

## Strategy Summary

**Build what sells first, research what differentiates in parallel.**

- **Track 1** (Product): Proofs Not Scores — verification-based analysis
- **Track 2** (Research): Efficiency Auditor — theoretical optimality measurement

Track 1 generates revenue and builds infrastructure. Track 2 uses that infrastructure to create defensible moat and academic credibility.

---

## Phase Overview

| Phase | Focus | Output | Dependencies |
|-------|-------|--------|--------------|
| **1** | Compile verification | "Your code builds" | Existing E2B sandbox |
| **2** | Test verification | "147/152 tests pass" | Phase 1 |
| **3** | Mutation testing | "78% mutation score" | Phase 2 |
| **4** | Load testing | "Handles 12,847 users" | Phase 2 |
| **5** | Production correlation | "3 errors in prod today" | Phases 2-4 |
| **6** | Efficiency auditor MVP | "42% theoretical efficiency" | Phases 1-4 |

---

## Phase 1: Compile Verification

**Goal**: Prove code compiles in sandbox

### Deliverables

1. **`lib/inprod/verifiers/compile.ts`**
   - Clone repo into E2B sandbox
   - Install dependencies based on detected stack
   - Run build command
   - Capture stdout/stderr as evidence
   - Return structured CompileResult

2. **API extension**
   - Add `verification: 'compile'` option to `/api/analyze`
   - Return compile status and errors in response

3. **UI update**
   - Show "COMPILED ✓" or "COMPILE FAILED ✗" badge
   - Display build errors if failed

### Technical Spec

```typescript
// lib/inprod/verifiers/compile.ts

export interface CompileResult {
  success: boolean
  errors: Array<{
    file: string
    line: number
    message: string
  }>
  warnings: Array<{
    file: string
    line: number
    message: string
  }>
  duration: number
  evidence: string  // Full build log
}

export async function verifyCompilation(
  repoUrl: string,
  stack: TechStack
): Promise<CompileResult> {
  const sandbox = await Sandbox.create(getTemplate(stack))

  try {
    // Clone repo
    await sandbox.commands.run(`git clone --depth 1 ${repoUrl} /app`)

    // Install deps
    const install = getInstallCommand(stack) // npm install, pip install, etc.
    await sandbox.commands.run(install, { cwd: '/app' })

    // Build
    const build = getBuildCommand(stack) // npm run build, go build, etc.
    const result = await sandbox.commands.run(build, { cwd: '/app' })

    return {
      success: result.exitCode === 0,
      errors: parseErrors(result.stderr, stack),
      warnings: parseWarnings(result.stderr, stack),
      duration: result.duration,
      evidence: result.stdout + '\n' + result.stderr
    }
  } finally {
    await sandbox.kill()
  }
}

function getInstallCommand(stack: TechStack): string {
  switch (stack.platform) {
    case 'node': return 'npm ci || npm install'
    case 'python': return 'pip install -r requirements.txt'
    case 'go': return 'go mod download'
    case 'rust': return 'cargo fetch'
    default: return 'echo "No install command"'
  }
}

function getBuildCommand(stack: TechStack): string {
  switch (stack.platform) {
    case 'node': return 'npm run build || npx tsc --noEmit'
    case 'python': return 'python -m py_compile *.py'
    case 'go': return 'go build ./...'
    case 'rust': return 'cargo build'
    default: return 'echo "No build command"'
  }
}
```

### Success Criteria

- [ ] Can compile Node.js/TypeScript repos
- [ ] Can compile Python repos
- [ ] Can compile Go repos
- [ ] Errors are correctly parsed and displayed
- [ ] Build log is captured as evidence
- [ ] E2B cost per compile < $0.02

### Risks

- **Large repos**: May exceed sandbox timeout
  - Mitigation: Shallow clone, timeout at 5 minutes

- **Private dependencies**: npm private packages, etc.
  - Mitigation: Defer to Phase 5 (production integration)

---

## Phase 2: Test Verification

**Goal**: Prove tests pass (or fail) with evidence

### Deliverables

1. **`lib/inprod/verifiers/tests.ts`**
   - Detect test framework
   - Run test command
   - Parse test output (pass/fail counts)
   - Capture coverage if available
   - Return structured TestResult

2. **API extension**
   - Add `verification: 'test'` option
   - Return test results in response

3. **UI update**
   - Show "147/152 TESTS PASS ✓" or "5 TESTS FAILING ✗"
   - Display failing test names and errors
   - Show coverage percentage if available

4. **Altitude update**
   - Weight verified test results higher than pattern-detected

### Technical Spec

```typescript
// lib/inprod/verifiers/tests.ts

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
  failures: Array<{
    name: string
    file: string
    error: string
  }>
  duration: number
  evidence: string
}

export async function verifyTests(
  sandbox: Sandbox,
  stack: TechStack
): Promise<TestResult> {
  const testCommand = getTestCommand(stack)

  const result = await sandbox.commands.run(testCommand, {
    cwd: '/app',
    timeoutMs: 180_000  // 3 minute timeout
  })

  return parseTestOutput(result.stdout, result.stderr, stack)
}

function getTestCommand(stack: TechStack): string {
  // Detect test framework from package.json, pyproject.toml, etc.
  switch (stack.testFramework) {
    case 'vitest': return 'npx vitest run --reporter=json'
    case 'jest': return 'npx jest --json'
    case 'pytest': return 'pytest --tb=short -q'
    case 'go': return 'go test -v ./...'
    default: return 'npm test'
  }
}
```

### Success Criteria

- [ ] Correctly detect test framework (vitest, jest, pytest, go test)
- [ ] Parse pass/fail counts accurately
- [ ] Capture coverage when available
- [ ] Display failing test details
- [ ] E2B cost per test run < $0.05

### Risks

- **Long test suites**: May timeout
  - Mitigation: 3-minute timeout, surface partial results

- **Flaky tests**: May pass/fail inconsistently
  - Mitigation: Run twice if first fails, note flakiness

---

## Phase 3: Mutation Testing

**Goal**: Verify test quality, not just coverage

### Deliverables

1. **`lib/inprod/verifiers/mutation.ts`**
   - Install Stryker in sandbox
   - Run mutation testing on target files
   - Parse mutation score
   - Identify weak tests (didn't catch mutants)

2. **API extension**
   - Add `verification: 'mutation'` option
   - Return mutation score and weak tests

3. **UI update**
   - Show "78% MUTATION SCORE"
   - List weak tests that should be strengthened
   - Highlight files with surviving mutants

4. **Generation extension**
   - Generate stronger tests for weak areas

### Technical Spec

```typescript
// lib/inprod/verifiers/mutation.ts

export interface MutationResult {
  score: number  // 0-100
  totalMutants: number
  killed: number
  survived: number
  timeout: number
  noCoverage: number
  weakTests: Array<{
    file: string
    test: string
    survivingMutants: number
  }>
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

  // Write config
  await sandbox.files.write('/app/stryker.config.json', JSON.stringify({
    testRunner: 'vitest',
    mutate: targetFiles.slice(0, 5),  // Limit to 5 files for speed
    reporters: ['json', 'clear-text'],
    concurrency: 2,
    timeoutMS: 10000
  }))

  // Run
  const result = await sandbox.commands.run('npx stryker run', {
    cwd: '/app',
    timeoutMs: 600_000  // 10 minute timeout
  })

  return parseStrykerOutput(result.stdout)
}
```

### Success Criteria

- [ ] Stryker runs successfully in sandbox
- [ ] Mutation score calculated correctly
- [ ] Weak tests identified
- [ ] Results parseable from JSON output
- [ ] E2B cost per mutation run < $0.20

### Risks

- **Very slow**: Mutation testing is inherently slow
  - Mitigation: Limit to 5 critical files, use sampling

- **Stryker setup complexity**: Different frameworks need different configs
  - Mitigation: Start with vitest only, expand later

---

## Phase 4: Load Testing

**Goal**: Verify actual user capacity with evidence

### Deliverables

1. **`lib/inprod/verifiers/load.ts`**
   - Start application in sandbox
   - Run k6 load test
   - Ramp users until failure
   - Capture metrics (latency, error rate, max users)
   - Identify bottleneck

2. **API extension**
   - Add `verification: 'load'` option
   - Return LoadTestResult with verified capacity

3. **Altitude v2**
   - Use verified capacity when available
   - Override pattern-based estimates

4. **UI update**
   - Show "VERIFIED: 12,847 concurrent users"
   - Display latency percentiles
   - Show bottleneck component

### Technical Spec

```typescript
// lib/inprod/verifiers/load.ts

export interface LoadTestResult {
  maxConcurrentUsers: number
  metrics: {
    requestsTotal: number
    requestsFailed: number
    latencyP50: number
    latencyP95: number
    latencyP99: number
    throughput: number
  }
  bottleneck: {
    component: string  // 'database' | 'api' | 'memory' | 'cpu'
    saturatedAt: number
    errorType: string
  }
  duration: number
  evidence: string
}

export async function runLoadTest(
  sandbox: Sandbox,
  endpoint: string,
  options: { maxUsers?: number; duration?: number } = {}
): Promise<LoadTestResult> {
  const { maxUsers = 500, duration = 60 } = options

  // Download k6
  await sandbox.commands.run(
    'curl -sL https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz | tar xz',
    { cwd: '/app' }
  )

  // Write test script
  const script = generateK6Script(endpoint, maxUsers, duration)
  await sandbox.files.write('/app/loadtest.js', script)

  // Start app in background
  await sandbox.commands.run('npm start &', { cwd: '/app' })
  await sleep(5000)  // Wait for app to start

  // Run load test
  const result = await sandbox.commands.run(
    './k6-v0.47.0-linux-amd64/k6 run --out json=results.json loadtest.js',
    { cwd: '/app', timeoutMs: 300_000 }
  )

  return parseK6Output(result.stdout)
}
```

### Success Criteria

- [ ] App starts in sandbox
- [ ] k6 runs successfully
- [ ] Max users determined by error rate threshold (< 1%)
- [ ] Bottleneck identified from error messages
- [ ] E2B cost per load test < $0.10

### Risks

- **App won't start**: Missing env vars, database, etc.
  - Mitigation: Mock external services, use SQLite for simple cases

- **Network isolation**: Sandbox can't reach external APIs
  - Mitigation: Test internal endpoints only, note limitations

---

## Phase 5: Production Correlation

**Goal**: Connect real production errors to code

### Deliverables

1. **`lib/inprod/observability/sentry.ts`**
   - OAuth flow for Sentry access
   - Fetch issues from Sentry API
   - Parse stack traces

2. **`lib/inprod/observability/correlate.ts`**
   - Map stack frames to repo files
   - Rank issues by user impact

3. **UI update**
   - Show "3 errors in last 24h (47 users affected)"
   - Link to specific code lines
   - Prioritize fixes by production impact

4. **Generation update**
   - Prioritize fixes for production errors

### Technical Spec

```typescript
// lib/inprod/observability/sentry.ts

export interface SentryIssue {
  id: string
  title: string
  culprit: string
  count: number
  userCount: number
  firstSeen: Date
  lastSeen: Date
  stackTrace: Array<{
    filename: string
    lineno: number
    function: string
    context: string[]
  }>
}

export async function fetchSentryIssues(
  accessToken: string,
  org: string,
  project: string,
  since: Date = new Date(Date.now() - 24 * 60 * 60 * 1000)
): Promise<SentryIssue[]> {
  const response = await fetch(
    `https://sentry.io/api/0/projects/${org}/${project}/issues/` +
    `?query=is:unresolved&statsPeriod=24h`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  return response.json()
}

// lib/inprod/observability/correlate.ts

export function correlateToSource(
  issues: SentryIssue[],
  files: RepoFile[]
): Array<SentryIssue & { sourceFile?: string; sourceLine?: number }> {
  return issues.map(issue => {
    const frame = issue.stackTrace.find(f =>
      files.some(file => file.path.endsWith(f.filename))
    )

    return {
      ...issue,
      sourceFile: frame?.filename,
      sourceLine: frame?.lineno
    }
  })
}
```

### Success Criteria

- [ ] Sentry OAuth flow works
- [ ] Issues fetched and parsed
- [ ] Stack traces mapped to repo files
- [ ] Top issues displayed by user impact
- [ ] Fixes prioritized by production data

### Risks

- **User doesn't use Sentry**: Optional integration
  - Mitigation: Also support OpenTelemetry, Datadog

- **Stack traces don't match**: Source maps, minification
  - Mitigation: Request source map upload, fuzzy matching

---

## Phase 6: Efficiency Auditor MVP

**Goal**: Measure theoretical efficiency for known problem classes

### Deliverables

1. **`lib/inprod/verifiers/efficiency.ts`**
   - LLM classifier for problem types
   - Instrumented execution
   - Efficiency ratio calculation

2. **Bounds database**
   - 20 common problem classes with known bounds
   - Reference implementations

3. **API extension**
   - Add `verification: 'efficiency'` option
   - Return efficiency ratio and gap analysis

4. **Research paper draft**
   - Problem statement
   - Methodology
   - Initial results

### Technical Spec

```typescript
// lib/inprod/verifiers/efficiency.ts

export interface EfficiencyResult {
  problemClass: string
  confidence: number
  theoreticalMinimum: number
  actualOperations: number
  efficiencyRatio: number  // 0-100%
  gaps: Array<{
    cause: string
    wastedOperations: number
    suggestion: string
  }>
  optimalImplementation?: string
}

const THEORETICAL_BOUNDS: Record<string, (n: number) => number> = {
  'comparison-sort': (n) => n * Math.log2(n),
  'binary-search': (n) => Math.log2(n),
  'linear-search': (n) => n,
  'graph-bfs': (n) => n,  // V + E simplified
  'matrix-multiply': (n) => n ** 2,  // Lower bound
}

export async function analyzeEfficiency(
  sandbox: Sandbox,
  functionCode: string,
  testInputs: unknown[]
): Promise<EfficiencyResult> {
  // Step 1: Classify problem
  const classification = await classifyProblem(functionCode)

  if (classification.class === 'unknown') {
    return { error: 'Could not classify problem type' }
  }

  // Step 2: Run instrumented execution
  const measurements = await measureOperations(sandbox, functionCode, testInputs)

  // Step 3: Calculate efficiency
  const n = testInputs[0].length
  const theoretical = THEORETICAL_BOUNDS[classification.class](n)
  const actual = measurements.comparisons + measurements.swaps
  const ratio = (theoretical / actual) * 100

  // Step 4: Explain gaps
  const gaps = await explainGaps(functionCode, classification.class, ratio)

  return {
    problemClass: classification.class,
    confidence: classification.confidence,
    theoreticalMinimum: theoretical,
    actualOperations: actual,
    efficiencyRatio: ratio,
    gaps
  }
}

async function classifyProblem(code: string): Promise<{ class: string; confidence: number }> {
  const prompt = `
    Classify what computational problem this function solves.
    Return JSON: { "class": "...", "confidence": 0.0-1.0 }

    Options:
    - comparison-sort
    - binary-search
    - linear-search
    - graph-bfs
    - graph-dfs
    - matrix-multiply
    - string-match
    - unknown

    Function:
    ${code}
  `

  const result = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }]
  })

  return JSON.parse(result.content[0].text)
}
```

### Success Criteria

- [ ] Classify 10+ problem types with >80% accuracy
- [ ] Instrumented execution captures operations
- [ ] Efficiency ratio calculated correctly
- [ ] Gap explanations are actionable
- [ ] Paper draft submitted

### Risks

- **Classification accuracy**: LLM may misclassify
  - Mitigation: Require high confidence, fallback to "unknown"

- **Instrumentation overhead**: May affect measurements
  - Mitigation: Measure overhead, subtract from results

---

## Timeline

### Phase Dependencies

```
Phase 1 (Compile)
    ↓
Phase 2 (Test) ─────→ Phase 3 (Mutation)
    ↓                      ↓
Phase 4 (Load) ←───────────┘
    ↓
Phase 5 (Production)
    ↓
Phase 6 (Efficiency)
```

### Suggested Order

| Week | Focus | Output |
|------|-------|--------|
| 1-2 | Phase 1 | Compile verification working |
| 3-4 | Phase 2 | Test execution working |
| 5-6 | Phase 4 | Load testing working (parallelize with Phase 3) |
| 5-7 | Phase 3 | Mutation testing working |
| 8-9 | Phase 5 | Sentry integration |
| 10-12 | Phase 6 | Efficiency auditor MVP |

---

## Success Metrics by Phase

### Phase 1

- Compile success rate: >90% for repos with CI
- E2B cost: <$0.02/compile
- Time: <60s average

### Phase 2

- Test parsing accuracy: >95%
- Coverage extraction: Works for vitest, jest
- Time: <180s average

### Phase 3

- Mutation score accuracy: Matches local Stryker run
- Weak test identification: >80% precision
- Time: <600s average

### Phase 4

- Max user detection: Within 20% of manual k6 run
- Bottleneck identification: Correct in >70% of cases
- Time: <300s average

### Phase 5

- Sentry issues fetched: 100% of open issues
- Stack trace mapping: >60% mapped to source
- User adoption: >20% of Pro users connect Sentry

### Phase 6

- Problem classification: >80% accuracy on known types
- Efficiency ratio: Within 10% of manual calculation
- Paper: Submitted to ICSE/PLDI/FSE

---

## Resource Requirements

### Infrastructure

- E2B account with elevated limits
- Sentry developer account (for OAuth app)
- k6 cloud account (optional, for hosted load testing)

### Dependencies

| Dependency | Purpose | Cost |
|------------|---------|------|
| E2B | Sandbox execution | ~$0.10/scan avg |
| Stryker | Mutation testing | Free (OSS) |
| k6 | Load testing | Free (OSS) |
| Sentry API | Production data | Free tier sufficient |
| Anthropic API | Classification | ~$0.01/scan |

### Cost Model at Scale

| Scans/month | E2B Cost | Anthropic | Total | Revenue (Pro) |
|-------------|----------|-----------|-------|---------------|
| 100 | $10 | $1 | $11 | $580 |
| 1,000 | $100 | $10 | $110 | $5,800 |
| 10,000 | $1,000 | $100 | $1,100 | $58,000 |

Margin remains >95% at all scales.

---

## Open Decisions

1. **Verification default**: What level should be default for Pro users?
   - Option A: Static only, verification opt-in
   - Option B: Compile + Test by default
   - Recommendation: B (users want proof, not guesses)

2. **Mutation testing scope**: Full repo or targeted files?
   - Option A: Full repo (slow, comprehensive)
   - Option B: Changed files only (fast, incremental)
   - Recommendation: B initially, A as premium

3. **Load testing target**: What endpoint to test?
   - Option A: Auto-detect main endpoint
   - Option B: User specifies
   - Recommendation: A with B as override

4. **Efficiency auditor visibility**: Public or gated?
   - Option A: Public beta (gather feedback)
   - Option B: Enterprise only (premium positioning)
   - Recommendation: A initially, B after paper published

---

## Next Actions

1. [ ] Set up E2B account with appropriate limits
2. [ ] Implement Phase 1 compile verification
3. [ ] Add verification option to analyze API
4. [ ] Update UI to show verification status
5. [ ] Write tests for compile verifier
6. [ ] Document verification levels in user docs

// =============================================================================
// VERIFIER TYPE DEFINITIONS
// =============================================================================
// Verification-based analysis: prove code works, don't just guess

export type VerificationLevel =
  | 'static'       // Pattern matching only
  | 'compiled'     // Code compiles successfully
  | 'tested'       // Tests pass
  | 'mutation'     // Mutation testing shows test quality
  | 'load_tested'  // Load testing shows capacity
  | 'production'   // Production data correlation

// =============================================================================
// COMPILE VERIFICATION
// =============================================================================

export interface CompileError {
  file: string
  line?: number
  column?: number
  message: string
  severity: 'error' | 'warning'
}

export interface CompileResult {
  success: boolean
  errors: CompileError[]
  warnings: CompileError[]
  duration: number
  evidence: string  // Full build log
}

// =============================================================================
// TEST VERIFICATION
// =============================================================================

export interface TestFailure {
  name: string
  file: string
  error: string
  stack?: string
}

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

// =============================================================================
// MUTATION TESTING
// =============================================================================

export interface WeakTest {
  file: string
  test: string
  survivingMutants: number
}

export interface MutationResult {
  success: boolean
  score: number  // 0-100, % of mutants killed
  totalMutants: number
  killed: number
  survived: number
  timeout: number
  noCoverage: number
  weakTests: WeakTest[]
  duration: number
  evidence: string
}

// =============================================================================
// LOAD TESTING
// =============================================================================

export interface LoadTestMetrics {
  requestsTotal: number
  requestsFailed: number
  latencyP50: number
  latencyP95: number
  latencyP99: number
  throughput: number  // req/s
}

export interface LoadTestBottleneck {
  component: 'database' | 'api' | 'memory' | 'cpu' | 'network' | 'unknown'
  saturatedAt: number  // User count when it failed
  errorType: string
}

export interface LoadTestResult {
  success: boolean
  maxConcurrentUsers: number
  metrics: LoadTestMetrics
  bottleneck: LoadTestBottleneck
  duration: number
  evidence: string
}

// =============================================================================
// COMBINED VERIFICATION RESULT
// =============================================================================

export interface VerificationResult {
  level: VerificationLevel
  timestamp: Date

  compile?: CompileResult
  tests?: TestResult
  mutation?: MutationResult
  load?: LoadTestResult

  // Total cost for this verification
  costUsd: number
}

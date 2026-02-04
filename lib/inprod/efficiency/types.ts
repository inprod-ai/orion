// =============================================================================
// EFFICIENCY AUDITOR TYPE DEFINITIONS
// =============================================================================
// Research Track: Measures algorithmic efficiency vs theoretical optimum

export type ProblemClass =
  | 'comparison-sort'
  | 'counting-sort'
  | 'binary-search'
  | 'linear-search'
  | 'graph-bfs'
  | 'graph-dfs'
  | 'shortest-path-dijkstra'
  | 'string-match-naive'
  | 'string-match-kmp'
  | 'matrix-multiply'
  | 'tree-traversal'
  | 'hash-lookup'
  | 'median-finding'
  | 'unknown'

export const PROBLEM_CLASSES: ProblemClass[] = [
  'comparison-sort',
  'counting-sort',
  'binary-search',
  'linear-search',
  'graph-bfs',
  'graph-dfs',
  'shortest-path-dijkstra',
  'string-match-naive',
  'string-match-kmp',
  'matrix-multiply',
  'tree-traversal',
  'hash-lookup',
  'median-finding',
  'unknown',
]

export const PROBLEM_CLASS_LABELS: Record<ProblemClass, string> = {
  'comparison-sort': 'Comparison-Based Sort',
  'counting-sort': 'Counting/Bucket Sort',
  'binary-search': 'Binary Search',
  'linear-search': 'Linear Search',
  'graph-bfs': 'Breadth-First Search',
  'graph-dfs': 'Depth-First Search',
  'shortest-path-dijkstra': 'Dijkstra Shortest Path',
  'string-match-naive': 'Naive String Matching',
  'string-match-kmp': 'KMP String Matching',
  'matrix-multiply': 'Matrix Multiplication',
  'tree-traversal': 'Tree Traversal',
  'hash-lookup': 'Hash Table Lookup',
  'median-finding': 'Median/Selection',
  'unknown': 'Unknown Problem Class',
}

// =============================================================================
// THEORETICAL BOUNDS
// =============================================================================

export type OperationType = 'comparisons' | 'operations' | 'accesses'

export interface Citation {
  authors: string[]
  title: string
  venue: string
  year: number
  theorem?: string
}

export interface BoundParams {
  n?: number      // Input size
  m?: number      // Secondary size (e.g., pattern length for string matching)
  v?: number      // Vertices (graphs)
  e?: number      // Edges (graphs)
  k?: number      // Range/buckets (counting sort)
}

export interface TheoreticalBound {
  class: ProblemClass
  notation: string
  formula: (params: BoundParams) => number
  operationType: OperationType
  source: Citation
  tight: boolean
  assumptions: string[]
}

// =============================================================================
// CLASSIFICATION
// =============================================================================

export interface ClassificationResult {
  class: ProblemClass
  confidence: number  // 0.0-1.0
  reasoning: string
  alternativeClasses: Array<{ class: ProblemClass; confidence: number }>
}

export interface CodePatterns {
  hasComparisons: boolean
  hasGraphStructure: boolean
  hasRecursion: boolean
  hasLoops: boolean
  hasHashAccess: boolean
  hasArraySwaps: boolean
  hasQueueOperations: boolean
  hasStackOperations: boolean
}

// =============================================================================
// INSTRUMENTATION & MEASUREMENT
// =============================================================================

export interface OperationCounts {
  comparisons: number
  swaps: number
  reads: number
  writes: number
  allocations: number
  functionCalls: number
}

export interface Measurement {
  inputSize: number
  counts: OperationCounts
  timeNs: number
}

// =============================================================================
// EFFICIENCY RESULT
// =============================================================================

export interface EfficiencyGap {
  cause: string
  wastedPercent: number
  explanation: string
  suggestion: string
}

export interface EfficiencyResult {
  // Classification
  problemClass: ProblemClass
  classificationConfidence: number

  // Measurements
  inputSize: number
  theoreticalMinimum: number
  actualOperations: number

  // Core metric: (theoretical / actual) * 100
  efficiencyRatio: number
  wastedOperations: number

  // Inferred complexity from measurements
  empiricalComplexity: string

  // Gap explanation
  gaps: EfficiencyGap[]

  // Optional optimal implementation
  optimalImplementation?: string
  optimalAlgorithm?: string

  // Metadata
  duration: number
  evidence: string
}

// =============================================================================
// BENCHMARK
// =============================================================================

export type BenchmarkDifficulty = 'easy' | 'medium' | 'hard'

export interface BenchmarkCase {
  id: string
  name: string
  code: string
  language: 'typescript' | 'javascript' | 'python'
  expectedClass: ProblemClass
  difficulty: BenchmarkDifficulty
  description: string
  expectedEfficiency?: number  // Expected efficiency ratio for known implementations
}

export interface BenchmarkResult {
  caseId: string
  predictedClass: ProblemClass
  expectedClass: ProblemClass
  correct: boolean
  confidence: number
  timeMs: number
}

export interface BenchmarkSummary {
  totalCases: number
  correctPredictions: number
  accuracy: number
  byClass: Record<ProblemClass, { total: number; correct: number; accuracy: number }>
  byDifficulty: Record<BenchmarkDifficulty, { total: number; correct: number; accuracy: number }>
  averageConfidence: number
  averageTimeMs: number
}

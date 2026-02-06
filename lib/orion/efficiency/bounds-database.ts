// =============================================================================
// THEORETICAL BOUNDS DATABASE
// =============================================================================
// Curated database of known algorithmic lower bounds with academic citations
// Used for efficiency ratio calculation: (theoretical_min / actual_ops) * 100

import type {
  ProblemClass,
  TheoreticalBound,
  BoundParams,
  Citation,
} from './types'

// =============================================================================
// CITATIONS
// =============================================================================

const CLRS: Citation = {
  authors: ['Cormen', 'Leiserson', 'Rivest', 'Stein'],
  title: 'Introduction to Algorithms',
  venue: 'MIT Press',
  year: 2009,
}

const KNUTH_VOL3: Citation = {
  authors: ['Knuth'],
  title: 'The Art of Computer Programming, Vol. 3: Sorting and Searching',
  venue: 'Addison-Wesley',
  year: 1998,
}

const KMP_PAPER: Citation = {
  authors: ['Knuth', 'Morris', 'Pratt'],
  title: 'Fast Pattern Matching in Strings',
  venue: 'SIAM Journal on Computing',
  year: 1977,
}

const DIJKSTRA_PAPER: Citation = {
  authors: ['Dijkstra'],
  title: 'A Note on Two Problems in Connexion with Graphs',
  venue: 'Numerische Mathematik',
  year: 1959,
}

const BLUM_MEDIAN: Citation = {
  authors: ['Blum', 'Floyd', 'Pratt', 'Rivest', 'Tarjan'],
  title: 'Time Bounds for Selection',
  venue: 'Journal of Computer and System Sciences',
  year: 1973,
}

const FOLKLORE: Citation = {
  authors: [],
  title: 'Information-theoretic lower bound',
  venue: 'Folklore',
  year: 0,
}

// =============================================================================
// BOUNDS DATABASE - 10 PROBLEM CLASSES
// =============================================================================

export const BOUNDS_DATABASE: TheoreticalBound[] = [
  // -------------------------------------------------------------------------
  // 1. COMPARISON-BASED SORTING
  // -------------------------------------------------------------------------
  // The decision tree model proves Omega(n log n) comparisons are necessary
  // to distinguish between n! permutations. This is a tight bound achieved
  // by merge sort and heap sort.
  {
    class: 'comparison-sort',
    notation: 'Ω(n log n)',
    formula: ({ n = 1 }: BoundParams) => {
      if (n <= 1) return 0
      // Stirling approximation: log(n!) ≈ n log n - n log e
      // For comparison counting, we use ceil(log2(n!)) ≈ n * log2(n) - 1.44n
      return n * Math.log2(n) - 1.44 * n
    },
    operationType: 'comparisons',
    source: { ...CLRS, theorem: 'Theorem 8.1' },
    tight: true,
    assumptions: [
      'Comparison-based sorting only',
      'All elements are distinct',
      'Random access memory model',
    ],
  },

  // -------------------------------------------------------------------------
  // 2. BINARY SEARCH
  // -------------------------------------------------------------------------
  // Information-theoretic: need log2(n) bits to specify one of n positions.
  // Each comparison yields at most 1 bit of information.
  {
    class: 'binary-search',
    notation: 'Ω(log n)',
    formula: ({ n = 1 }: BoundParams) => {
      if (n <= 1) return 1
      return Math.ceil(Math.log2(n))
    },
    operationType: 'comparisons',
    source: FOLKLORE,
    tight: true,
    assumptions: [
      'Sorted input array',
      'Random access memory',
      'Element may or may not exist',
    ],
  },

  // -------------------------------------------------------------------------
  // 3. LINEAR SEARCH
  // -------------------------------------------------------------------------
  // Adversarial argument: an adversary can always place the target in the
  // last position examined, forcing n comparisons in worst case.
  {
    class: 'linear-search',
    notation: 'Ω(n)',
    formula: ({ n = 1 }: BoundParams) => n,
    operationType: 'comparisons',
    source: FOLKLORE,
    tight: true,
    assumptions: [
      'Unsorted input',
      'No preprocessing allowed',
      'Element may not exist',
    ],
  },

  // -------------------------------------------------------------------------
  // 4. BREADTH-FIRST SEARCH
  // -------------------------------------------------------------------------
  // Must visit every vertex and examine every edge at least once.
  // Optimal BFS achieves exactly V + E operations with adjacency list.
  {
    class: 'graph-bfs',
    notation: 'Ω(V + E)',
    formula: ({ v = 0, e = 0 }: BoundParams) => v + e,
    operationType: 'operations',
    source: { ...CLRS, theorem: 'Theorem 22.2' },
    tight: true,
    assumptions: [
      'Adjacency list representation',
      'Must visit all reachable vertices',
      'Unweighted graph',
    ],
  },

  // -------------------------------------------------------------------------
  // 5. DEPTH-FIRST SEARCH
  // -------------------------------------------------------------------------
  // Same bound as BFS - must visit all vertices and edges.
  // DFS and BFS differ in traversal order, not asymptotic complexity.
  {
    class: 'graph-dfs',
    notation: 'Ω(V + E)',
    formula: ({ v = 0, e = 0 }: BoundParams) => v + e,
    operationType: 'operations',
    source: { ...CLRS, theorem: 'Theorem 22.3' },
    tight: true,
    assumptions: [
      'Adjacency list representation',
      'Must visit all reachable vertices',
    ],
  },

  // -------------------------------------------------------------------------
  // 6. DIJKSTRA SHORTEST PATH
  // -------------------------------------------------------------------------
  // With binary heap: O((V + E) log V)
  // With Fibonacci heap: O(V log V + E) - theoretically better for dense graphs
  // We use the binary heap bound as it's the common implementation.
  {
    class: 'shortest-path-dijkstra',
    notation: 'Ω((V + E) log V)',
    formula: ({ v = 1, e = 0 }: BoundParams) => {
      if (v <= 1) return 0
      return (v + e) * Math.log2(v)
    },
    operationType: 'operations',
    source: DIJKSTRA_PAPER,
    tight: true,
    assumptions: [
      'Binary heap priority queue',
      'Non-negative edge weights',
      'Single-source shortest paths',
    ],
  },

  // -------------------------------------------------------------------------
  // 7. NAIVE STRING MATCHING
  // -------------------------------------------------------------------------
  // Worst case: must compare at each of (n - m + 1) positions, up to m chars.
  // Example: searching "aaa...aab" in "aaa...aaa" triggers worst case.
  {
    class: 'string-match-naive',
    notation: 'Ω(nm)',
    formula: ({ n = 0, m = 0 }: BoundParams) => {
      if (n === 0 || m === 0 || m > n) return 0
      // Worst case: (n - m + 1) * m comparisons
      return (n - m + 1) * m
    },
    operationType: 'comparisons',
    source: KNUTH_VOL3,
    tight: false, // This is upper bound for naive, not optimal
    assumptions: [
      'Naive sliding window approach',
      'No preprocessing of pattern',
      'Worst case adversarial input',
    ],
  },

  // -------------------------------------------------------------------------
  // 8. KMP STRING MATCHING
  // -------------------------------------------------------------------------
  // KMP achieves O(n + m) by preprocessing pattern to avoid redundant comparisons.
  // The failure function ensures no character is compared more than twice.
  {
    class: 'string-match-kmp',
    notation: 'Ω(n + m)',
    formula: ({ n = 0, m = 0 }: BoundParams) => n + m,
    operationType: 'comparisons',
    source: KMP_PAPER,
    tight: true,
    assumptions: [
      'Pattern preprocessing allowed',
      'Single pattern matching',
      'Sequential text scanning',
    ],
  },

  // -------------------------------------------------------------------------
  // 9. MATRIX MULTIPLICATION
  // -------------------------------------------------------------------------
  // Lower bound: Ω(n²) because output has n² elements that must be written.
  // Best known upper bound: O(n^2.3728596) [Williams 2024]
  // Gap between lower and upper bound remains an open problem.
  {
    class: 'matrix-multiply',
    notation: 'Ω(n²)',
    formula: ({ n = 0 }: BoundParams) => n * n,
    operationType: 'operations',
    source: FOLKLORE,
    tight: false, // Gap between n² and n^2.37 is open
    assumptions: [
      'n × n square matrices',
      'Standard algebraic operations',
      'No sparsity exploitation',
    ],
  },

  // -------------------------------------------------------------------------
  // 10. MEDIAN FINDING / SELECTION
  // -------------------------------------------------------------------------
  // The median-of-medians algorithm proves O(n) is achievable.
  // Information-theoretic: must examine all n elements (element could be anywhere).
  // Quickselect achieves O(n) expected, O(n²) worst case.
  {
    class: 'median-finding',
    notation: 'Ω(n)',
    formula: ({ n = 0 }: BoundParams) => n,
    operationType: 'comparisons',
    source: BLUM_MEDIAN,
    tight: true,
    assumptions: [
      'Finding exact median or kth element',
      'No preprocessing/sorting allowed',
      'Comparison-based model',
    ],
  },
]

// =============================================================================
// LOOKUP FUNCTIONS
// =============================================================================

/**
 * Get the theoretical bound for a problem class
 */
export function getBound(problemClass: ProblemClass): TheoreticalBound | undefined {
  return BOUNDS_DATABASE.find((b) => b.class === problemClass)
}

/**
 * Calculate theoretical minimum operations for a problem class and input size
 */
export function calculateTheoreticalMinimum(
  problemClass: ProblemClass,
  params: BoundParams
): number {
  const bound = getBound(problemClass)
  if (!bound) return Infinity
  return Math.max(0, Math.ceil(bound.formula(params)))
}

/**
 * Get all bounds as a lookup map
 */
export function getBoundsMap(): Map<ProblemClass, TheoreticalBound> {
  return new Map(BOUNDS_DATABASE.map((b) => [b.class, b]))
}

/**
 * Get optimal algorithm description for a problem class
 */
export function getOptimalAlgorithm(problemClass: ProblemClass): string {
  const descriptions: Record<ProblemClass, string> = {
    'comparison-sort': 'Merge sort or heap sort: O(n log n) comparisons, stable',
    'counting-sort': 'Counting sort: O(n + k) where k is range, non-comparison',
    'binary-search': 'Iterative binary search: O(log n) comparisons, space O(1)',
    'linear-search': 'Sequential scan: O(n) comparisons worst case, O(1) space',
    'graph-bfs': 'Queue-based BFS: O(V + E) with adjacency list representation',
    'graph-dfs': 'Recursive or stack-based DFS: O(V + E) with adjacency list',
    'shortest-path-dijkstra': 'Dijkstra with binary heap: O((V + E) log V)',
    'string-match-naive': 'Sliding window: O(nm) worst case, O(1) space',
    'string-match-kmp': 'Knuth-Morris-Pratt: O(n + m) with O(m) preprocessing',
    'matrix-multiply': 'Strassen: O(n^2.807), practical for large matrices',
    'tree-traversal': 'Iterative with stack or Morris traversal: O(n)',
    'hash-lookup': 'Hash table with good hash function: O(1) amortized',
    'median-finding': 'Quickselect: O(n) expected, or median-of-medians: O(n) worst case',
    'unknown': 'Unable to determine optimal algorithm for unknown problem class',
  }

  return descriptions[problemClass]
}

/**
 * Check if a bound is tight (no gap between lower and upper bound)
 */
export function isTightBound(problemClass: ProblemClass): boolean {
  const bound = getBound(problemClass)
  return bound?.tight ?? false
}

/**
 * Format citation as a string for display
 */
export function formatCitation(citation: Citation): string {
  if (citation.authors.length === 0) {
    return citation.title
  }

  const authors =
    citation.authors.length > 2
      ? `${citation.authors[0]} et al.`
      : citation.authors.join(' and ')

  const theorem = citation.theorem ? `, ${citation.theorem}` : ''

  return `${authors}. "${citation.title}" ${citation.venue}, ${citation.year}${theorem}`
}

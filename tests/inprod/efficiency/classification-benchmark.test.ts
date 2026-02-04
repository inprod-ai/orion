// =============================================================================
// CLASSIFICATION BENCHMARK TESTS
// =============================================================================

import { describe, it, expect } from 'vitest'

import {
  CLASSIFICATION_BENCHMARK,
  getCasesByClass,
  getCasesByDifficulty,
  getBenchmarkStats,
} from '@/lib/inprod/efficiency/classification-benchmark'

import type { ProblemClass, BenchmarkCase } from '@/lib/inprod/efficiency/types'

describe('CLASSIFICATION_BENCHMARK', () => {
  it('should contain exactly 100 benchmark cases', () => {
    expect(CLASSIFICATION_BENCHMARK.length).toBe(100)
  })

  it('should have unique IDs for all cases', () => {
    const ids = CLASSIFICATION_BENCHMARK.map((c) => c.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(CLASSIFICATION_BENCHMARK.length)
  })

  it('should have valid problem classes for all cases', () => {
    const validClasses: ProblemClass[] = [
      'comparison-sort',
      'binary-search',
      'linear-search',
      'graph-bfs',
      'graph-dfs',
      'shortest-path-dijkstra',
      'string-match-naive',
      'string-match-kmp',
      'matrix-multiply',
      'median-finding',
    ]

    for (const c of CLASSIFICATION_BENCHMARK) {
      expect(validClasses).toContain(c.expectedClass)
    }
  })

  it('should have valid difficulty levels for all cases', () => {
    const validDifficulties = ['easy', 'medium', 'hard']

    for (const c of CLASSIFICATION_BENCHMARK) {
      expect(validDifficulties).toContain(c.difficulty)
    }
  })

  it('should have non-empty code for all cases', () => {
    for (const c of CLASSIFICATION_BENCHMARK) {
      expect(c.code.length).toBeGreaterThan(0)
      // All should be functions or classes
      expect(c.code).toMatch(/function\s+\w+|class\s+\w+/)
    }
  })

  it('should have descriptions for all cases', () => {
    for (const c of CLASSIFICATION_BENCHMARK) {
      expect(c.description.length).toBeGreaterThan(0)
    }
  })
})

describe('getBenchmarkStats', () => {
  const stats = getBenchmarkStats()

  it('should report correct total', () => {
    expect(stats.total).toBe(100)
  })

  it('should have 10 cases per problem class', () => {
    const expectedClasses = [
      'comparison-sort',
      'binary-search',
      'linear-search',
      'graph-bfs',
      'graph-dfs',
      'shortest-path-dijkstra',
      'string-match-naive',
      'string-match-kmp',
      'matrix-multiply',
      'median-finding',
    ]

    for (const cls of expectedClasses) {
      expect(stats.byClass[cls as ProblemClass]).toBe(10)
    }
  })

  it('should have reasonable difficulty distribution', () => {
    // Should have at least some of each difficulty
    expect(stats.byDifficulty.easy).toBeGreaterThan(20)
    expect(stats.byDifficulty.medium).toBeGreaterThan(20)
    expect(stats.byDifficulty.hard).toBeGreaterThan(10)

    // Should sum to total
    const sum =
      stats.byDifficulty.easy + stats.byDifficulty.medium + stats.byDifficulty.hard
    expect(sum).toBe(100)
  })
})

describe('getCasesByClass', () => {
  it('should return all cases for a given class', () => {
    const sortCases = getCasesByClass('comparison-sort')
    expect(sortCases.length).toBe(10)
    expect(sortCases.every((c) => c.expectedClass === 'comparison-sort')).toBe(true)
  })

  it('should return empty array for unknown class', () => {
    const cases = getCasesByClass('unknown')
    expect(cases.length).toBe(0)
  })
})

describe('getCasesByDifficulty', () => {
  it('should return all easy cases', () => {
    const easyCases = getCasesByDifficulty('easy')
    expect(easyCases.every((c) => c.difficulty === 'easy')).toBe(true)
  })

  it('should return all medium cases', () => {
    const mediumCases = getCasesByDifficulty('medium')
    expect(mediumCases.every((c) => c.difficulty === 'medium')).toBe(true)
  })

  it('should return all hard cases', () => {
    const hardCases = getCasesByDifficulty('hard')
    expect(hardCases.every((c) => c.difficulty === 'hard')).toBe(true)
  })
})

describe('benchmark case quality', () => {
  // Each problem class should have varying difficulty levels
  const problemClasses: ProblemClass[] = [
    'comparison-sort',
    'binary-search',
    'linear-search',
    'graph-bfs',
    'graph-dfs',
    'shortest-path-dijkstra',
    'string-match-naive',
    'string-match-kmp',
    'matrix-multiply',
    'median-finding',
  ]

  for (const cls of problemClasses) {
    describe(cls, () => {
      const cases = getCasesByClass(cls)

      it('should have at least one easy case', () => {
        const easyCases = cases.filter((c) => c.difficulty === 'easy')
        expect(easyCases.length).toBeGreaterThan(0)
      })

      it('should have descriptive function names', () => {
        for (const c of cases) {
          // Names should be descriptive, not just "test1", "test2"
          expect(c.name.length).toBeGreaterThan(5)
          expect(c.name).not.toMatch(/^test\d+$/)
        }
      })

      it('should have syntactically valid TypeScript', () => {
        for (const c of cases) {
          // Basic syntax checks - should have function/class keyword and braces
          expect(c.code).toMatch(/function\s+\w+|class\s+\w+/)
          expect(c.code).toContain('{')
          expect(c.code).toContain('}')
        }
      })
    })
  }
})

describe('sorting algorithm variety', () => {
  const sortCases = getCasesByClass('comparison-sort')

  it('should include bubble sort', () => {
    expect(sortCases.some((c) => c.name.includes('bubble'))).toBe(true)
  })

  it('should include merge sort', () => {
    expect(sortCases.some((c) => c.name.includes('merge'))).toBe(true)
  })

  it('should include quicksort', () => {
    expect(sortCases.some((c) => c.name.includes('quick'))).toBe(true)
  })

  it('should include heap sort', () => {
    expect(sortCases.some((c) => c.name.includes('heap'))).toBe(true)
  })
})

describe('search algorithm variety', () => {
  const binarySearchCases = getCasesByClass('binary-search')
  const linearSearchCases = getCasesByClass('linear-search')

  it('should have iterative and recursive binary search', () => {
    expect(binarySearchCases.some((c) => c.name.includes('iterative'))).toBe(true)
    expect(binarySearchCases.some((c) => c.name.includes('recursive'))).toBe(true)
  })

  it('should have various linear search patterns', () => {
    expect(linearSearchCases.some((c) => c.name.includes('find'))).toBe(true)
    expect(linearSearchCases.some((c) => c.name.includes('max') || c.name.includes('min'))).toBe(
      true
    )
  })
})

describe('graph algorithm variety', () => {
  const bfsCases = getCasesByClass('graph-bfs')
  const dfsCases = getCasesByClass('graph-dfs')

  it('should have tree and graph BFS variants', () => {
    expect(bfsCases.some((c) => c.code.includes('queue'))).toBe(true)
    expect(bfsCases.some((c) => c.name.includes('level'))).toBe(true)
  })

  it('should have tree traversal DFS variants', () => {
    expect(dfsCases.some((c) => c.name.includes('inorder') || c.name.includes('preorder'))).toBe(
      true
    )
  })

  it('should have graph-specific DFS variants', () => {
    expect(dfsCases.some((c) => c.name.includes('cycle') || c.name.includes('topological'))).toBe(
      true
    )
  })
})

describe('string matching variety', () => {
  const naiveCases = getCasesByClass('string-match-naive')
  const kmpCases = getCasesByClass('string-match-kmp')

  it('should have basic naive search', () => {
    expect(naiveCases.some((c) => c.name.includes('naive') || c.name.includes('strstr'))).toBe(true)
  })

  it('should have KMP implementation', () => {
    expect(kmpCases.some((c) => c.name.includes('kmp'))).toBe(true)
  })

  it('should have failure/LPS function variants', () => {
    expect(kmpCases.some((c) => c.code.includes('lps') || c.code.includes('failure'))).toBe(true)
  })
})

describe('code complexity validation', () => {
  it('easy cases should be shorter than hard cases on average', () => {
    const easyCases = getCasesByDifficulty('easy')
    const hardCases = getCasesByDifficulty('hard')

    const avgEasyLength = easyCases.reduce((sum, c) => sum + c.code.length, 0) / easyCases.length
    const avgHardLength = hardCases.reduce((sum, c) => sum + c.code.length, 0) / hardCases.length

    expect(avgEasyLength).toBeLessThan(avgHardLength)
  })

  it('hard cases should have more complex patterns', () => {
    const hardCases = getCasesByDifficulty('hard')

    // Hard cases are more likely to have recursion, multiple functions, or complex control flow
    const complexPatterns = hardCases.filter(
      (c) =>
        c.code.includes('function ') && // Has helper functions
        (c.code.match(/function /g) || []).length > 1
    )

    expect(complexPatterns.length).toBeGreaterThan(hardCases.length * 0.3)
  })
})

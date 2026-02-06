// =============================================================================
// BOUNDS DATABASE TESTS
// =============================================================================

import { describe, it, expect } from 'vitest'

import {
  BOUNDS_DATABASE,
  getBound,
  calculateTheoreticalMinimum,
  getOptimalAlgorithm,
  isTightBound,
  formatCitation,
} from '@/lib/orion/efficiency/bounds-database'

describe('BOUNDS_DATABASE', () => {
  it('should contain exactly 10 problem classes', () => {
    expect(BOUNDS_DATABASE.length).toBe(10)
  })

  it('should have unique problem classes', () => {
    const classes = BOUNDS_DATABASE.map((b) => b.class)
    const uniqueClasses = new Set(classes)
    expect(uniqueClasses.size).toBe(BOUNDS_DATABASE.length)
  })

  it('should have all required fields for each bound', () => {
    for (const bound of BOUNDS_DATABASE) {
      expect(bound.class).toBeDefined()
      expect(bound.notation).toBeDefined()
      expect(typeof bound.formula).toBe('function')
      expect(bound.operationType).toBeDefined()
      expect(bound.source).toBeDefined()
      expect(typeof bound.tight).toBe('boolean')
      expect(Array.isArray(bound.assumptions)).toBe(true)
    }
  })
})

describe('getBound', () => {
  it('should return bound for known problem class', () => {
    const bound = getBound('comparison-sort')
    expect(bound).toBeDefined()
    expect(bound?.notation).toBe('Ω(n log n)')
  })

  it('should return undefined for unknown problem class', () => {
    const bound = getBound('unknown')
    expect(bound).toBeUndefined()
  })
})

describe('calculateTheoreticalMinimum', () => {
  describe('comparison-sort', () => {
    it('should calculate n log n for sorting', () => {
      const min = calculateTheoreticalMinimum('comparison-sort', { n: 1000 })
      // n * log2(n) - 1.44n ≈ 1000 * 9.97 - 1440 ≈ 8530
      expect(min).toBeGreaterThan(8000)
      expect(min).toBeLessThan(10000)
    })

    it('should return 0 for n=1', () => {
      const min = calculateTheoreticalMinimum('comparison-sort', { n: 1 })
      expect(min).toBe(0)
    })
  })

  describe('binary-search', () => {
    it('should calculate log n for binary search', () => {
      const min = calculateTheoreticalMinimum('binary-search', { n: 1024 })
      expect(min).toBe(10) // log2(1024) = 10
    })

    it('should return 1 for n=1', () => {
      const min = calculateTheoreticalMinimum('binary-search', { n: 1 })
      expect(min).toBe(1)
    })
  })

  describe('linear-search', () => {
    it('should calculate n for linear search', () => {
      const min = calculateTheoreticalMinimum('linear-search', { n: 100 })
      expect(min).toBe(100)
    })
  })

  describe('graph-bfs', () => {
    it('should calculate V + E for BFS', () => {
      const min = calculateTheoreticalMinimum('graph-bfs', { v: 100, e: 500 })
      expect(min).toBe(600)
    })
  })

  describe('graph-dfs', () => {
    it('should calculate V + E for DFS', () => {
      const min = calculateTheoreticalMinimum('graph-dfs', { v: 50, e: 200 })
      expect(min).toBe(250)
    })
  })

  describe('shortest-path-dijkstra', () => {
    it('should calculate (V + E) log V for Dijkstra', () => {
      const min = calculateTheoreticalMinimum('shortest-path-dijkstra', { v: 100, e: 500 })
      // (100 + 500) * log2(100) ≈ 600 * 6.64 ≈ 3986
      expect(min).toBeGreaterThan(3900)
      expect(min).toBeLessThan(4100)
    })
  })

  describe('string-match-kmp', () => {
    it('should calculate n + m for KMP', () => {
      const min = calculateTheoreticalMinimum('string-match-kmp', { n: 1000, m: 50 })
      expect(min).toBe(1050)
    })
  })

  describe('matrix-multiply', () => {
    it('should calculate n² for matrix multiply lower bound', () => {
      const min = calculateTheoreticalMinimum('matrix-multiply', { n: 100 })
      expect(min).toBe(10000)
    })
  })

  describe('median-finding', () => {
    it('should calculate n for median finding', () => {
      const min = calculateTheoreticalMinimum('median-finding', { n: 1000 })
      expect(min).toBe(1000)
    })
  })

  it('should return Infinity for unknown class', () => {
    const min = calculateTheoreticalMinimum('unknown', { n: 100 })
    expect(min).toBe(Infinity)
  })
})

describe('getOptimalAlgorithm', () => {
  it('should return description for each known class', () => {
    expect(getOptimalAlgorithm('comparison-sort')).toContain('Merge sort')
    expect(getOptimalAlgorithm('binary-search')).toContain('O(log n)')
    expect(getOptimalAlgorithm('graph-bfs')).toContain('Queue-based')
    expect(getOptimalAlgorithm('string-match-kmp')).toContain('Knuth-Morris-Pratt')
  })

  it('should return message for unknown class', () => {
    expect(getOptimalAlgorithm('unknown')).toContain('Unable to determine')
  })
})

describe('isTightBound', () => {
  it('should return true for tight bounds', () => {
    expect(isTightBound('comparison-sort')).toBe(true)
    expect(isTightBound('binary-search')).toBe(true)
    expect(isTightBound('linear-search')).toBe(true)
  })

  it('should return false for non-tight bounds', () => {
    expect(isTightBound('matrix-multiply')).toBe(false)
    expect(isTightBound('string-match-naive')).toBe(false)
  })

  it('should return false for unknown class', () => {
    expect(isTightBound('unknown')).toBe(false)
  })
})

describe('formatCitation', () => {
  it('should format citation with multiple authors', () => {
    const citation = {
      authors: ['Cormen', 'Leiserson', 'Rivest', 'Stein'],
      title: 'Introduction to Algorithms',
      venue: 'MIT Press',
      year: 2009,
      theorem: 'Theorem 8.1',
    }
    const formatted = formatCitation(citation)
    expect(formatted).toContain('Cormen et al.')
    expect(formatted).toContain('Introduction to Algorithms')
    expect(formatted).toContain('MIT Press')
    expect(formatted).toContain('2009')
    expect(formatted).toContain('Theorem 8.1')
  })

  it('should format citation with two authors', () => {
    const citation = {
      authors: ['Knuth', 'Morris'],
      title: 'Fast Pattern Matching',
      venue: 'SIAM',
      year: 1977,
    }
    const formatted = formatCitation(citation)
    expect(formatted).toContain('Knuth and Morris')
  })

  it('should format folklore citation', () => {
    const citation = {
      authors: [],
      title: 'Information-theoretic lower bound',
      venue: 'Folklore',
      year: 0,
    }
    const formatted = formatCitation(citation)
    expect(formatted).toBe('Information-theoretic lower bound')
  })
})

describe('edge cases', () => {
  it('should handle zero input sizes', () => {
    expect(calculateTheoreticalMinimum('linear-search', { n: 0 })).toBe(0)
    expect(calculateTheoreticalMinimum('graph-bfs', { v: 0, e: 0 })).toBe(0)
  })

  it('should handle very large input sizes', () => {
    const largeN = 1_000_000
    const sortMin = calculateTheoreticalMinimum('comparison-sort', { n: largeN })
    // 1M * log2(1M) - 1.44 * 1M ≈ 1M * 20 - 1.44M ≈ 18.56M
    expect(sortMin).toBeGreaterThan(18_000_000)
    expect(sortMin).toBeLessThan(20_000_000)
  })

  it('should handle negative implicit values gracefully', () => {
    // The formula for comparison-sort can go negative for very small n
    // Our implementation should return 0 for n <= 1
    const min = calculateTheoreticalMinimum('comparison-sort', { n: 2 })
    expect(min).toBeGreaterThanOrEqual(0)
  })
})

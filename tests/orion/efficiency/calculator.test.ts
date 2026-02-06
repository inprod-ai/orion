// =============================================================================
// CALCULATOR TESTS
// =============================================================================
// Tests for efficiency calculation and complexity inference

import { describe, it, expect } from 'vitest'
import {
  calculateEfficiencyFromCounts,
  inferComplexity,
  formatEfficiency,
  formatOperations,
  generateEfficiencyBar,
} from '@/lib/orion/efficiency/calculator'
import type { OperationCounts } from '@/lib/orion/efficiency/types'

function createCounts(overrides: Partial<OperationCounts> = {}): OperationCounts {
  return {
    comparisons: 0,
    swaps: 0,
    reads: 0,
    writes: 0,
    allocations: 0,
    functionCalls: 0,
    ...overrides,
  }
}

describe('calculateEfficiencyFromCounts', () => {
  it('should calculate high efficiency for near-optimal sorting', () => {
    // Optimal merge sort: ~n log n comparisons
    // n=1000 -> ~8536 comparisons (formula: n * log2(n) - 1.44 * n)
    const counts = createCounts({ comparisons: 8600 })
    const result = calculateEfficiencyFromCounts('comparison-sort', counts, { n: 1000 })
    expect(result.efficiencyRatio).toBeGreaterThan(95)
    expect(result.efficiencyRatio).toBeLessThanOrEqual(100)
    expect(result.problemClass).toBe('comparison-sort')
  })

  it('should calculate low efficiency for bubble sort', () => {
    // Bubble sort: ~n^2 comparisons
    // n=1000 -> ~500,000 comparisons vs ~8,536 optimal
    const counts = createCounts({ comparisons: 500000 })
    const result = calculateEfficiencyFromCounts('comparison-sort', counts, { n: 1000 })
    expect(result.efficiencyRatio).toBeLessThan(5) // ~1.7% efficient
    expect(result.wastedOperations).toBeGreaterThan(400000)
    expect(result.overheadRatio).toBeGreaterThan(40)
  })

  it('should calculate efficiency for graph BFS', () => {
    // Optimal: O(V + E)
    // v=100, e=500 -> 600 operations
    const counts = createCounts({ reads: 300, writes: 300 })
    const result = calculateEfficiencyFromCounts('graph-bfs', counts, { v: 100, e: 500 })
    expect(result.efficiencyRatio).toBe(100)
    expect(result.wastedOperations).toBe(0)
  })

  it('should handle linear search correctly', () => {
    // Optimal: O(n) worst case
    const counts = createCounts({ comparisons: 1000 })
    const result = calculateEfficiencyFromCounts('linear-search', counts, { n: 1000 })
    expect(result.efficiencyRatio).toBe(100)
    expect(result.notation).toBe('Ω(n)')
  })

  it('should handle hash lookup', () => {
    // Optimal: O(1) - but our formula returns 1
    const counts = createCounts({ comparisons: 1 })
    const result = calculateEfficiencyFromCounts('hash-lookup', counts, { n: 1000 })
    // Hash lookup has no bound in our database, so it should return unknown
    expect(result.problemClass).toBe('unknown')
  })

  it('should return unknown for unknown problem class', () => {
    const counts = createCounts({ comparisons: 100 })
    const result = calculateEfficiencyFromCounts('unknown', counts, { n: 100 })
    expect(result.problemClass).toBe('unknown')
    expect(result.efficiencyRatio).toBe(0)
    expect(result.notation).toBe('unknown')
  })

  it('should cap efficiency at 100%', () => {
    // If somehow fewer operations than theoretical (measurement error)
    const counts = createCounts({ comparisons: 5000 }) // Less than n log n for n=1000
    const result = calculateEfficiencyFromCounts('comparison-sort', counts, { n: 1000 })
    expect(result.efficiencyRatio).toBe(100)
  })

  it('should handle zero operations', () => {
    const counts = createCounts({ comparisons: 0 })
    const result = calculateEfficiencyFromCounts('comparison-sort', counts, { n: 100 })
    expect(result.efficiencyRatio).toBe(0)
    expect(result.overheadRatio).toBe(Infinity)
  })

  it('should handle binary search', () => {
    // Optimal: O(log n), n=1000 -> ~10 comparisons
    const counts = createCounts({ comparisons: 10 })
    const result = calculateEfficiencyFromCounts('binary-search', counts, { n: 1000 })
    expect(result.efficiencyRatio).toBe(100)
    expect(result.notation).toBe('Ω(log n)')
  })

  it('should handle Dijkstra shortest path', () => {
    // Optimal: O((V + E) log V)
    // v=100, e=500 -> (100 + 500) * log2(100) ≈ 3986
    const counts = createCounts({ 
      comparisons: 2000, 
      reads: 1000, 
      writes: 1000 
    })
    const result = calculateEfficiencyFromCounts('shortest-path-dijkstra', counts, { v: 100, e: 500 })
    // Allow some floating point tolerance
    expect(result.efficiencyRatio).toBeGreaterThanOrEqual(99)
    expect(result.efficiencyRatio).toBeLessThanOrEqual(100)
  })
})

describe('inferComplexity', () => {
  it('should infer O(1) complexity', () => {
    const measurements = [
      { n: 100, ops: 5 },
      { n: 1000, ops: 5 },
      { n: 10000, ops: 5 },
    ]
    const result = inferComplexity(measurements)
    expect(result.complexity).toBe('O(1)')
  })

  it('should infer O(n) complexity', () => {
    const measurements = [
      { n: 100, ops: 100 },
      { n: 1000, ops: 1000 },
      { n: 10000, ops: 10000 },
    ]
    const result = inferComplexity(measurements)
    expect(result.complexity).toBe('O(n)')
  })

  it('should infer O(n log n) complexity', () => {
    // n * log2(n) values - use values that produce clear slope
    const measurements = [
      { n: 10, ops: 33 },       // 10 * log2(10) ≈ 33
      { n: 100, ops: 664 },     // 100 * log2(100) ≈ 664
      { n: 1000, ops: 9966 },   // 1000 * log2(1000) ≈ 9966
      { n: 10000, ops: 132877 },// 10000 * log2(10000) ≈ 132877
    ]
    const result = inferComplexity(measurements)
    expect(result.complexity).toBe('O(n log n)')
  })

  it('should infer O(n²) complexity', () => {
    const measurements = [
      { n: 100, ops: 10000 },    // 100^2
      { n: 200, ops: 40000 },    // 200^2
      { n: 400, ops: 160000 },   // 400^2
    ]
    const result = inferComplexity(measurements)
    expect(result.complexity).toBe('O(n²)')
  })

  it('should return unknown for insufficient data', () => {
    const measurements = [{ n: 100, ops: 100 }]
    const result = inferComplexity(measurements)
    expect(result.complexity).toBe('unknown')
    expect(result.confidence).toBe(0)
  })

  it('should handle noisy measurements', () => {
    const measurements = [
      { n: 100, ops: 105 },
      { n: 500, ops: 510 },
      { n: 1000, ops: 980 },
    ]
    const result = inferComplexity(measurements)
    expect(result.complexity).toBe('O(n)')
  })

  it('should detect O(n³) complexity', () => {
    const measurements = [
      { n: 10, ops: 1000 },    // 10^3
      { n: 20, ops: 8000 },    // 20^3
      { n: 40, ops: 64000 },   // 40^3
    ]
    const result = inferComplexity(measurements)
    expect(result.complexity).toBe('O(n³)')
  })

  it('should infer O(log n) complexity', () => {
    const measurements = [
      { n: 10, ops: 4 },       // log2(10) ≈ 3.3
      { n: 100, ops: 7 },      // log2(100) ≈ 6.6
      { n: 1000, ops: 10 },    // log2(1000) ≈ 10
    ]
    const result = inferComplexity(measurements)
    expect(result.complexity).toBe('O(log n)')
  })
})

describe('formatEfficiency', () => {
  it('should format high efficiency', () => {
    expect(formatEfficiency(100)).toBe('100%')
    expect(formatEfficiency(99.7)).toBe('100%')
    expect(formatEfficiency(95)).toBe('95%')
  })

  it('should format medium efficiency', () => {
    expect(formatEfficiency(50)).toBe('50%')
    expect(formatEfficiency(25.5)).toBe('26%')
    expect(formatEfficiency(10.1)).toBe('10%')
  })

  it('should format low efficiency with decimals', () => {
    expect(formatEfficiency(5.5)).toBe('5.5%')
    expect(formatEfficiency(1.23)).toBe('1.2%')
    expect(formatEfficiency(0.5)).toBe('0.50%')
    expect(formatEfficiency(0.01)).toBe('0.01%')
  })
})

describe('formatOperations', () => {
  it('should format small numbers', () => {
    expect(formatOperations(0)).toBe('0')
    expect(formatOperations(1)).toBe('1')
    expect(formatOperations(999)).toBe('999')
  })

  it('should format thousands', () => {
    expect(formatOperations(1000)).toBe('1.0K')
    expect(formatOperations(5500)).toBe('5.5K')
    expect(formatOperations(999999)).toBe('1000.0K')
  })

  it('should format millions', () => {
    expect(formatOperations(1000000)).toBe('1.0M')
    expect(formatOperations(2500000)).toBe('2.5M')
  })

  it('should format billions', () => {
    expect(formatOperations(1000000000)).toBe('1.0B')
    expect(formatOperations(7500000000)).toBe('7.5B')
  })
})

describe('generateEfficiencyBar', () => {
  it('should generate full bar for 100%', () => {
    const bar = generateEfficiencyBar(100, 10)
    expect(bar).toBe('██████████')
    expect(bar.length).toBe(10)
  })

  it('should generate empty bar for 0%', () => {
    const bar = generateEfficiencyBar(0, 10)
    expect(bar).toBe('░░░░░░░░░░')
    expect(bar.length).toBe(10)
  })

  it('should generate partial bar', () => {
    const bar = generateEfficiencyBar(50, 10)
    expect(bar).toBe('█████░░░░░')
    expect(bar.length).toBe(10)
  })

  it('should use default width of 50', () => {
    const bar = generateEfficiencyBar(50)
    expect(bar.length).toBe(50)
  })
})

describe('edge cases', () => {
  it('should handle very large input sizes', () => {
    const counts = createCounts({ comparisons: 1000000000 }) // 1 billion
    const result = calculateEfficiencyFromCounts('comparison-sort', counts, { n: 10000000 })
    expect(result.theoreticalMinimum).toBeLessThan(counts.comparisons * 2)
    expect(result.efficiencyRatio).toBeGreaterThan(0)
  })

  it('should handle negative efficiency gracefully', () => {
    // This shouldn't happen in practice, but let's be defensive
    const result = formatEfficiency(-5)
    expect(result).toContain('%')
  })

  it('should handle NaN inputs', () => {
    const bar = generateEfficiencyBar(NaN, 10)
    // NaN handling - should produce some output without crashing
    expect(typeof bar).toBe('string')
  })
})

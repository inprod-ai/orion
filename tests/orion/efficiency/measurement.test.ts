// =============================================================================
// MEASUREMENT TESTS
// =============================================================================
// Tests for operation counting and instrumentation

import { describe, it, expect } from 'vitest'
import {
  createInstrumentedArray,
  measureFunction,
  numericComparator,
  calculateStats,
} from '@/lib/orion/efficiency/measurement'
import type { OperationCounts, Measurement } from '@/lib/orion/efficiency/types'

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

function createMeasurement(
  inputSize: number,
  counts: Partial<OperationCounts>,
  timeNs: number = 0
): Measurement {
  return {
    inputSize,
    counts: createCounts(counts),
    timeNs,
  }
}

describe('createInstrumentedArray', () => {
  it('should track reads', () => {
    const arr = createInstrumentedArray([1, 2, 3, 4, 5])
    const _ = arr[0]
    const __ = arr[2]
    const ___ = arr[4]
    const counts = arr.getOperationCounts()
    expect(counts.reads).toBe(3)
  })

  it('should track writes', () => {
    const arr = createInstrumentedArray([1, 2, 3])
    arr[0] = 10
    arr[1] = 20
    const counts = arr.getOperationCounts()
    expect(counts.writes).toBe(2)
  })

  it('should track push operations', () => {
    const arr = createInstrumentedArray<number>([])
    arr.push(1)
    arr.push(2, 3, 4)
    const counts = arr.getOperationCounts()
    expect(counts.writes).toBe(4)
    expect(counts.allocations).toBe(4)
  })

  it('should track pop operations', () => {
    const arr = createInstrumentedArray([1, 2, 3])
    arr.pop()
    const counts = arr.getOperationCounts()
    expect(counts.reads).toBe(1)
    expect(counts.writes).toBe(1)
  })

  it('should track indexOf operations', () => {
    const arr = createInstrumentedArray([1, 2, 3, 4, 5])
    arr.indexOf(3)
    const counts = arr.getOperationCounts()
    expect(counts.functionCalls).toBe(5)
    expect(counts.comparisons).toBe(5)
  })

  it('should track forEach operations', () => {
    const arr = createInstrumentedArray([1, 2, 3, 4, 5])
    arr.forEach(() => {})
    const counts = arr.getOperationCounts()
    expect(counts.functionCalls).toBe(5)
  })

  it('should track sort comparisons', () => {
    const arr = createInstrumentedArray([5, 3, 1, 4, 2])
    arr.sort((a, b) => a - b)
    const counts = arr.getOperationCounts()
    expect(counts.comparisons).toBeGreaterThan(0)
  })

  it('should track reverse swaps', () => {
    const arr = createInstrumentedArray([1, 2, 3, 4, 5])
    arr.reverse()
    const counts = arr.getOperationCounts()
    expect(counts.swaps).toBe(2) // floor(5/2) = 2
  })

  it('should reset counts', () => {
    const arr = createInstrumentedArray([1, 2, 3])
    arr.push(4)
    arr[0] = 10
    arr.resetCounts()
    const counts = arr.getOperationCounts()
    expect(counts.reads).toBe(0)
    expect(counts.writes).toBe(0)
    expect(counts.allocations).toBe(0)
  })

  it('should still function as a normal array', () => {
    const arr = createInstrumentedArray([1, 2, 3])
    arr.push(4)
    expect(arr.length).toBe(4)
    expect(arr[3]).toBe(4)
    expect(arr.includes(2)).toBe(true)
    expect(arr.map((x) => x * 2)).toEqual([2, 4, 6, 8])
  })
})

describe('numericComparator', () => {
  it('should count comparisons', () => {
    const counts = createCounts()
    const compare = numericComparator(counts)
    
    expect(compare(1, 2)).toBeLessThan(0)
    expect(compare(3, 2)).toBeGreaterThan(0)
    expect(compare(2, 2)).toBe(0)
    
    expect(counts.comparisons).toBe(3)
  })

  it('should work correctly for sorting', () => {
    const counts = createCounts()
    const compare = numericComparator(counts)
    
    const arr = [5, 3, 1, 4, 2]
    arr.sort(compare)
    
    expect(arr).toEqual([1, 2, 3, 4, 5])
    expect(counts.comparisons).toBeGreaterThan(0)
  })
})

describe('measureFunction', () => {
  it('should measure a simple function', () => {
    const result = measureFunction(
      (arr, counts) => {
        let sum = 0
        for (let i = 0; i < arr.length; i++) {
          sum += arr[i]
          counts.functionCalls++
        }
        return sum
      },
      [1, 2, 3, 4, 5]
    )

    expect(result.returnValue).toBe(15)
    expect(result.counts.reads).toBe(5)
    expect(result.counts.functionCalls).toBe(5)
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0)
  })

  it('should measure sorting operations', () => {
    const result = measureFunction(
      (arr, counts) => {
        // Manual bubble sort with counted comparisons
        for (let i = 0; i < arr.length; i++) {
          for (let j = 0; j < arr.length - i - 1; j++) {
            counts.comparisons++
            if (arr[j] > arr[j + 1]) {
              const temp = arr[j]
              arr[j] = arr[j + 1]
              arr[j + 1] = temp
              counts.swaps++
            }
          }
        }
        return [...arr]
      },
      [5, 3, 1, 4, 2]
    )

    expect(result.returnValue).toEqual([1, 2, 3, 4, 5])
    expect(result.counts.comparisons).toBe(10) // 4+3+2+1
    expect(result.counts.swaps).toBeGreaterThan(0)
    // Reads from arr[j] and arr[j+1] comparisons + temp assignments
    expect(result.counts.reads).toBeGreaterThan(0)
  })

  it('should merge array and shared counts', () => {
    const result = measureFunction(
      (arr, counts) => {
        arr.push(6) // tracked by array
        counts.allocations++ // tracked by shared counts
        return arr.length
      },
      [1, 2, 3, 4, 5]
    )

    expect(result.returnValue).toBe(6)
    // Array tracks push as write+allocation
    expect(result.counts.writes).toBe(1)
    // Shared counts track our manual allocation
    expect(result.counts.allocations).toBe(2) // 1 from array + 1 manual
  })

  it('should handle empty input', () => {
    const result = measureFunction(
      (arr) => arr.length,
      []
    )
    expect(result.returnValue).toBe(0)
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0)
  })
})

describe('calculateStats', () => {
  it('should calculate average operations', () => {
    const measurements: Measurement[] = [
      createMeasurement(100, { comparisons: 100, swaps: 10, reads: 50, writes: 50 }),
      createMeasurement(100, { comparisons: 200, swaps: 20, reads: 100, writes: 100 }),
      createMeasurement(100, { comparisons: 300, swaps: 30, reads: 150, writes: 150 }),
    ]
    const stats = calculateStats(measurements)
    
    expect(stats.avgCounts.comparisons).toBe(200)
    expect(stats.avgCounts.swaps).toBe(20)
  })

  it('should calculate min and max', () => {
    const measurements: Measurement[] = [
      createMeasurement(100, { comparisons: 100, swaps: 5, reads: 50, writes: 50 }),
      createMeasurement(100, { comparisons: 500, swaps: 25, reads: 200, writes: 200 }),
      createMeasurement(100, { comparisons: 300, swaps: 15, reads: 100, writes: 100 }),
    ]
    const stats = calculateStats(measurements)
    
    expect(stats.minCounts.comparisons).toBe(100)
    expect(stats.maxCounts.comparisons).toBe(500)
  })

  it('should calculate variance', () => {
    const measurements: Measurement[] = [
      createMeasurement(100, { comparisons: 100 }),
      createMeasurement(100, { comparisons: 100 }),
      createMeasurement(100, { comparisons: 100 }),
    ]
    const stats = calculateStats(measurements)
    expect(stats.variance).toBe(0) // All same, no variance
  })

  it('should handle empty measurements', () => {
    const stats = calculateStats([])
    expect(stats.avgCounts.comparisons).toBe(0)
    expect(stats.variance).toBe(0)
  })

  it('should handle single measurement', () => {
    const measurements: Measurement[] = [
      createMeasurement(100, { comparisons: 100, swaps: 10, reads: 50, writes: 50 }),
    ]
    const stats = calculateStats(measurements)
    expect(stats.avgCounts.comparisons).toBe(100)
    expect(stats.variance).toBe(0)
  })
})

describe('edge cases and stress tests', () => {
  it('should handle large arrays', () => {
    const largeArray = Array.from({ length: 10000 }, (_, i) => i)
    const result = measureFunction(
      (arr) => {
        return arr.reduce((a, b) => a + b, 0)
      },
      largeArray
    )
    // Should complete without errors
    expect(result.returnValue).toBe(49995000)
  })

  it('should handle nested operations', () => {
    const result = measureFunction(
      (arr, counts) => {
        for (let i = 0; i < arr.length; i++) {
          counts.functionCalls++
          for (let j = 0; j < arr.length; j++) {
            counts.functionCalls++
            if (arr[i] > arr[j]) {
              counts.comparisons++
            }
          }
        }
        return null
      },
      [5, 3, 1, 4, 2]
    )
    
    // 5 outer + 25 inner iterations
    expect(result.counts.functionCalls).toBe(30)
  })

  it('should handle mixed operations', () => {
    const result = measureFunction(
      (arr) => {
        arr.push(6)
        arr[0] = 99
        const first = arr[0]
        arr.pop()
        arr.reverse()
        return first
      },
      [1, 2, 3, 4, 5]
    )
    
    expect(result.returnValue).toBe(99)
    expect(result.counts.writes).toBeGreaterThan(0)
    expect(result.counts.reads).toBeGreaterThan(0)
  })
})

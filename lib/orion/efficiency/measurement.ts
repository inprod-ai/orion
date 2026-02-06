// =============================================================================
// MEASUREMENT ENGINE
// =============================================================================
// Instruments code and counts operations for efficiency analysis
// Uses proxied data structures to intercept and count all operations

import type { OperationCounts, Measurement, ProblemClass, BoundParams } from './types'
import { calculateEfficiencyFromCounts } from './calculator'

// =============================================================================
// TYPES
// =============================================================================

export interface InstrumentedArray<T> extends Array<T> {
  getOperationCounts(): OperationCounts
  resetCounts(): void
}

export interface MeasurementResult {
  counts: OperationCounts
  returnValue: unknown
  executionTimeMs: number
}

function createEmptyCounts(): OperationCounts {
  return {
    comparisons: 0,
    swaps: 0,
    reads: 0,
    writes: 0,
    allocations: 0,
    functionCalls: 0,
  }
}

// =============================================================================
// INSTRUMENTED ARRAY
// =============================================================================

/**
 * Creates an instrumented array that tracks all operations
 */
export function createInstrumentedArray<T>(initial: T[] = []): InstrumentedArray<T> {
  const counts = createEmptyCounts()

  // Use a proxy to intercept all array operations
  const array = [...initial]

  const handler: ProxyHandler<T[]> = {
    get(target, prop) {
      // Handle our custom methods
      if (prop === 'getOperationCounts') {
        return () => ({ ...counts })
      }
      if (prop === 'resetCounts') {
        return () => {
          counts.comparisons = 0
          counts.swaps = 0
          counts.reads = 0
          counts.writes = 0
          counts.allocations = 0
          counts.functionCalls = 0
        }
      }

      // Handle numeric index reads
      if (typeof prop === 'string' && /^\d+$/.test(prop)) {
        counts.reads++
        return target[Number(prop)]
      }

      // Handle array methods
      const value = target[prop as keyof T[]]
      if (typeof value === 'function') {
        return (...args: unknown[]) => {
          const method = prop as string

          // Track specific method operations
          switch (method) {
            case 'push':
            case 'unshift':
              counts.writes += args.length
              counts.allocations += args.length
              break
            case 'pop':
            case 'shift':
              counts.reads++
              counts.writes++
              break
            case 'splice':
              counts.reads += Math.min(Number(args[1]) || 0, target.length)
              counts.writes += (args.length - 2) || 0
              break
            case 'indexOf':
            case 'includes':
            case 'find':
            case 'findIndex':
              // These iterate and compare
              counts.functionCalls += target.length
              counts.comparisons += target.length
              break
            case 'forEach':
            case 'map':
            case 'filter':
            case 'reduce':
            case 'some':
            case 'every':
              counts.functionCalls += target.length
              break
            case 'sort':
              // Estimate comparisons for built-in sort (n log n)
              counts.comparisons += Math.ceil(target.length * Math.log2(target.length + 1))
              break
            case 'reverse':
              counts.swaps += Math.floor(target.length / 2)
              break
          }

          return (value as Function).apply(target, args)
        }
      }

      return value
    },
    set(target, prop, value) {
      if (typeof prop === 'string' && /^\d+$/.test(prop)) {
        counts.writes++
        ;(target as unknown as Record<string, T>)[prop] = value
      } else if (typeof prop === 'string') {
        ;(target as unknown as Record<string, unknown>)[prop] = value
      }
      return true
    },
  }

  return new Proxy(array, handler) as InstrumentedArray<T>
}

// =============================================================================
// COMPARISON COUNTER
// =============================================================================

/**
 * Creates a comparison function that tracks comparisons
 */
export function createComparator<T>(
  compareFn: (a: T, b: T) => number,
  counts: OperationCounts
): (a: T, b: T) => number {
  return (a: T, b: T) => {
    counts.comparisons++
    return compareFn(a, b)
  }
}

/**
 * Standard numeric comparator with tracking
 */
export function numericComparator(counts: OperationCounts): (a: number, b: number) => number {
  return createComparator((a, b) => a - b, counts)
}

// =============================================================================
// MEASUREMENT EXECUTION
// =============================================================================

/**
 * Execute a function and measure its operations
 * The function should use the provided instrumented array
 */
export function measureFunction<T, R>(
  fn: (arr: InstrumentedArray<T>, counts: OperationCounts) => R,
  input: T[]
): MeasurementResult {
  const arr = createInstrumentedArray(input)
  const sharedCounts = createEmptyCounts()

  const start = performance.now()
  const returnValue = fn(arr, sharedCounts)
  const executionTimeMs = performance.now() - start

  // Merge array counts with shared counts
  const arrCounts = arr.getOperationCounts()
  const counts: OperationCounts = {
    comparisons: arrCounts.comparisons + sharedCounts.comparisons,
    swaps: arrCounts.swaps + sharedCounts.swaps,
    reads: arrCounts.reads + sharedCounts.reads,
    writes: arrCounts.writes + sharedCounts.writes,
    allocations: arrCounts.allocations + sharedCounts.allocations,
    functionCalls: arrCounts.functionCalls + sharedCounts.functionCalls,
  }

  return { counts, returnValue, executionTimeMs }
}

// =============================================================================
// MULTI-RUN MEASUREMENT
// =============================================================================

/**
 * Run measurements at multiple input sizes for complexity analysis
 */
export function measureAtSizes<T>(
  generateInput: (size: number) => T[],
  fn: (arr: InstrumentedArray<T>, counts: OperationCounts) => unknown,
  sizes: number[] = [100, 500, 1000, 5000, 10000]
): Measurement[] {
  return sizes.map((size) => {
    const input = generateInput(size)
    const { counts, executionTimeMs } = measureFunction(fn, input)

    return {
      inputSize: size,
      counts,
      timeNs: executionTimeMs * 1_000_000, // Convert ms to ns
    }
  })
}

/**
 * Generate efficiency results for multiple sizes
 */
export function analyzeAtSizes<T>(
  problemClass: ProblemClass,
  generateInput: (size: number) => T[],
  fn: (arr: InstrumentedArray<T>, counts: OperationCounts) => unknown,
  sizes: number[] = [100, 500, 1000, 5000, 10000],
  params?: Partial<BoundParams>
) {
  const measurements = measureAtSizes(generateInput, fn, sizes)

  return measurements.map((m) => ({
    measurement: m,
    efficiency: calculateEfficiencyFromCounts(
      problemClass,
      m.counts,
      { n: m.inputSize, ...params }
    ),
  }))
}

// =============================================================================
// STATISTICAL HELPERS
// =============================================================================

/**
 * Calculate statistics from multiple measurements
 */
export function calculateStats(measurements: Measurement[]): {
  avgCounts: OperationCounts
  minCounts: OperationCounts
  maxCounts: OperationCounts
  variance: number
} {
  if (measurements.length === 0) {
    const zero = createEmptyCounts()
    return {
      avgCounts: zero,
      minCounts: zero,
      maxCounts: zero,
      variance: 0,
    }
  }

  const keys: (keyof OperationCounts)[] = [
    'comparisons',
    'swaps',
    'reads',
    'writes',
    'allocations',
    'functionCalls',
  ]

  const avgCounts = createEmptyCounts()
  const minCounts = createEmptyCounts()
  const maxCounts = createEmptyCounts()

  for (const key of keys) {
    const values = measurements.map((m) => m.counts[key])
    avgCounts[key] = values.reduce((a, b) => a + b, 0) / values.length
    minCounts[key] = Math.min(...values)
    maxCounts[key] = Math.max(...values)
  }

  // Calculate variance based on total operations
  const totals = measurements.map(
    (m) => m.counts.comparisons + m.counts.swaps + m.counts.reads + m.counts.writes
  )
  const mean = totals.reduce((a, b) => a + b, 0) / totals.length
  const variance = totals.reduce((sum, val) => sum + (val - mean) ** 2, 0) / totals.length

  return { avgCounts, minCounts, maxCounts, variance }
}

// =============================================================================
// EFFICIENCY CALCULATOR
// =============================================================================
// Computes efficiency ratio: (theoretical_minimum / actual_operations) * 100
// Core metric of the Efficiency Auditor

import type {
  ProblemClass,
  BoundParams,
  OperationCounts,
  ClassificationResult,
  Measurement,
} from './types'
import { calculateTheoreticalMinimum, getBound, getOptimalAlgorithm } from './bounds-database'
import { classifyCode } from './classifier'

// =============================================================================
// TYPES
// =============================================================================

export interface EfficiencyInput {
  code: string
  inputSize: number
  actualOperations: number
  operationType?: 'comparisons' | 'operations' | 'accesses'
  
  // Optional: provide classification directly
  classification?: ClassificationResult
  
  // Optional: additional params for graph/string problems
  params?: BoundParams
}

export interface EfficiencyCalculation {
  problemClass: ProblemClass
  classificationConfidence: number
  
  inputSize: number
  theoreticalMinimum: number
  actualOperations: number
  
  efficiencyRatio: number  // 0-100%
  wastedOperations: number
  overheadRatio: number    // How many times worse than optimal
  
  notation: string         // e.g., "n log n"
  optimalAlgorithm: string
  isTightBound: boolean
}

// =============================================================================
// EFFICIENCY CALCULATION
// =============================================================================

/**
 * Calculate efficiency ratio for a piece of code
 */
export async function calculateEfficiency(
  input: EfficiencyInput
): Promise<EfficiencyCalculation> {
  const {
    code,
    inputSize,
    actualOperations,
    classification: providedClassification,
    params = { n: inputSize },
  } = input

  // Get or compute classification
  const classification = providedClassification || await classifyCode(code)

  // Get theoretical bound
  const bound = getBound(classification.class)
  
  if (!bound) {
    return {
      problemClass: 'unknown',
      classificationConfidence: 0,
      inputSize,
      theoreticalMinimum: 0,
      actualOperations,
      efficiencyRatio: 0,
      wastedOperations: actualOperations,
      overheadRatio: Infinity,
      notation: 'unknown',
      optimalAlgorithm: 'Unknown problem class',
      isTightBound: false,
    }
  }

  // Calculate theoretical minimum
  const theoreticalMinimum = calculateTheoreticalMinimum(classification.class, params)

  // Calculate efficiency ratio
  // Capped at 100% (can't be more efficient than optimal)
  const efficiencyRatio = Math.min(100, (theoreticalMinimum / actualOperations) * 100)
  
  // Calculate wasted operations
  const wastedOperations = Math.max(0, actualOperations - theoreticalMinimum)
  
  // Calculate overhead ratio (how many times worse than optimal)
  const overheadRatio = theoreticalMinimum > 0 
    ? actualOperations / theoreticalMinimum 
    : Infinity

  return {
    problemClass: classification.class,
    classificationConfidence: classification.confidence,
    inputSize,
    theoreticalMinimum: Math.ceil(theoreticalMinimum),
    actualOperations,
    efficiencyRatio,
    wastedOperations,
    overheadRatio,
    notation: bound.notation,
    optimalAlgorithm: getOptimalAlgorithm(classification.class),
    isTightBound: bound.tight,
  }
}

/**
 * Calculate efficiency from operation counts
 * Uses the primary operation type for the problem class
 */
export function calculateEfficiencyFromCounts(
  problemClass: ProblemClass,
  counts: OperationCounts,
  params: BoundParams
): EfficiencyCalculation {
  const bound = getBound(problemClass)
  
  if (!bound) {
    return {
      problemClass: 'unknown',
      classificationConfidence: 0,
      inputSize: params.n || 0,
      theoreticalMinimum: 0,
      actualOperations: counts.comparisons + counts.reads + counts.writes,
      efficiencyRatio: 0,
      wastedOperations: 0,
      overheadRatio: Infinity,
      notation: 'unknown',
      optimalAlgorithm: 'Unknown problem class',
      isTightBound: false,
    }
  }

  // Select the relevant operation count based on problem type
  let actualOperations: number
  switch (bound.operationType) {
    case 'comparisons':
      actualOperations = counts.comparisons
      break
    case 'accesses':
      actualOperations = counts.reads + counts.writes
      break
    case 'operations':
    default:
      actualOperations = counts.comparisons + counts.swaps + counts.reads + counts.writes
  }

  // Guard against division by zero
  if (actualOperations === 0) {
    return {
      problemClass,
      classificationConfidence: 1,
      inputSize: params.n || 0,
      theoreticalMinimum: calculateTheoreticalMinimum(problemClass, params),
      actualOperations: 0,
      efficiencyRatio: 0,
      wastedOperations: 0,
      overheadRatio: Infinity,
      notation: bound.notation,
      optimalAlgorithm: getOptimalAlgorithm(problemClass),
      isTightBound: bound.tight,
    }
  }

  const theoreticalMinimum = calculateTheoreticalMinimum(problemClass, params)
  const efficiencyRatio = Math.min(100, (theoreticalMinimum / actualOperations) * 100)
  const wastedOperations = Math.max(0, actualOperations - theoreticalMinimum)
  const overheadRatio = theoreticalMinimum > 0 
    ? actualOperations / theoreticalMinimum 
    : Infinity

  return {
    problemClass,
    classificationConfidence: 1, // Assumed since class was provided
    inputSize: params.n || 0,
    theoreticalMinimum: Math.ceil(theoreticalMinimum),
    actualOperations,
    efficiencyRatio,
    wastedOperations,
    overheadRatio,
    notation: bound.notation,
    optimalAlgorithm: getOptimalAlgorithm(problemClass),
    isTightBound: bound.tight,
  }
}

// =============================================================================
// COMPLEXITY INFERENCE
// =============================================================================

/**
 * Infer empirical complexity from multiple measurements
 * Fits operation counts to common complexity classes
 */
export function inferComplexity(
  measurements: Array<{ n: number; ops: number }>
): { complexity: string; confidence: number } {
  if (measurements.length < 3) {
    return { complexity: 'unknown', confidence: 0 }
  }

  // Sort by input size
  const sorted = [...measurements].sort((a, b) => a.n - b.n)

  // Use log-log regression to estimate complexity exponent
  // For O(n^k), log(ops) = k * log(n) + c
  const logData = sorted.map((m) => ({
    logN: Math.log(m.n),
    logOps: Math.log(m.ops),
  }))

  // Calculate slope using least squares
  const n = logData.length
  const sumX = logData.reduce((s, d) => s + d.logN, 0)
  const sumY = logData.reduce((s, d) => s + d.logOps, 0)
  const sumXY = logData.reduce((s, d) => s + d.logN * d.logOps, 0)
  const sumX2 = logData.reduce((s, d) => s + d.logN * d.logN, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)

  // Map slope to complexity class
  // Note: n log n has slope ~1.0-1.3 depending on the base
  if (slope < 0.15) {
    return { complexity: 'O(1)', confidence: 0.8 }
  } else if (slope < 0.5) {
    return { complexity: 'O(log n)', confidence: 0.7 }
  } else if (slope < 1.15) {
    return { complexity: 'O(n)', confidence: 0.8 }
  } else if (slope < 1.6) {
    return { complexity: 'O(n log n)', confidence: 0.7 }
  } else if (slope < 2.3) {
    return { complexity: 'O(n²)', confidence: 0.7 }
  } else if (slope < 3.3) {
    return { complexity: 'O(n³)', confidence: 0.6 }
  } else {
    return { complexity: 'O(2^n) or worse', confidence: 0.5 }
  }
}

// =============================================================================
// FORMATTING
// =============================================================================

/**
 * Format efficiency ratio as a percentage string
 */
export function formatEfficiency(ratio: number): string {
  if (ratio >= 99.5) return '100%'
  if (ratio >= 10) return `${Math.round(ratio)}%`
  if (ratio >= 1) return `${ratio.toFixed(1)}%`
  return `${ratio.toFixed(2)}%`
}

/**
 * Format operation count with appropriate suffix
 */
export function formatOperations(count: number): string {
  if (count >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(1)}B`
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`
  return count.toString()
}

/**
 * Generate efficiency bar visualization
 */
export function generateEfficiencyBar(ratio: number, width: number = 50): string {
  const filled = Math.round((ratio / 100) * width)
  const empty = width - filled
  return '█'.repeat(filled) + '░'.repeat(empty)
}

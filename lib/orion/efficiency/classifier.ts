// =============================================================================
// PROBLEM CLASSIFIER
// =============================================================================
// LLM-based classification of code into algorithmic problem classes
// Used to look up theoretical bounds for efficiency calculation

import Anthropic from '@anthropic-ai/sdk'
import type {
  ProblemClass,
  ClassificationResult,
  CodePatterns,
} from './types'
import { PROBLEM_CLASSES, PROBLEM_CLASS_LABELS } from './types'

// =============================================================================
// CONSTANTS
// =============================================================================

const CLASSIFICATION_PROMPT = `You are an expert algorithms researcher. Analyze this code and classify it into ONE of the following problem classes:

PROBLEM CLASSES:
- comparison-sort: Sorting algorithms using element comparisons (bubble, merge, quick, heap, insertion, selection sort)
- counting-sort: Non-comparison sorts using counting/bucketing (counting sort, radix sort, bucket sort)
- binary-search: Searching in sorted arrays by halving (binary search, lower/upper bound)
- linear-search: Sequential search through elements (find, indexOf, includes)
- graph-bfs: Breadth-first graph traversal (level-order, shortest path unweighted)
- graph-dfs: Depth-first graph traversal (preorder, postorder, topological sort, cycle detection)
- shortest-path-dijkstra: Weighted shortest path with priority queue
- string-match-naive: Pattern matching with sliding window
- string-match-kmp: Pattern matching with failure function preprocessing
- matrix-multiply: Matrix multiplication operations
- tree-traversal: Tree traversal (inorder, preorder, postorder)
- hash-lookup: Hash table operations (get, set, delete)
- median-finding: Selection/median finding (quickselect, nth_element)
- unknown: Does not match any known problem class

CODE TO ANALYZE:
\`\`\`
{CODE}
\`\`\`

Respond in JSON format:
{
  "class": "one of the problem classes above",
  "confidence": 0.0 to 1.0,
  "reasoning": "brief explanation of why this classification",
  "alternativeClasses": [{"class": "...", "confidence": 0.X}, ...]
}

Be precise. Only classify as a specific class if you are confident. Use "unknown" for ambiguous cases.`

// =============================================================================
// PATTERN DETECTION (fast pre-filter)
// =============================================================================

/**
 * Detect code patterns to help guide classification
 */
export function detectCodePatterns(code: string): CodePatterns {
  const normalized = code.toLowerCase()
  
  return {
    hasComparisons: /[<>]=?/.test(code) && !/=>/.test(code.replace(/[<>]=>/g, '')),
    hasGraphStructure: /\b(graph|vertex|vertices|edge|edges|node|nodes|neighbor|adjacent)\b/i.test(code),
    hasRecursion: /function\s+(\w+)[\s\S]*\1\s*\(/.test(code),
    hasLoops: /\b(for|while|do)\b/.test(code),
    hasHashAccess: /\[.+\]\s*=|\bMap\b|\bSet\b|\bObject\b/.test(code),
    hasArraySwaps: /\[.*\]\s*=\s*\[.*\]|\bswap\b/i.test(code),
    hasQueueOperations: /\b(push|shift|enqueue|dequeue|queue)\b/i.test(code),
    hasStackOperations: /\b(push|pop|stack)\b/i.test(code),
  }
}

/**
 * Quick heuristic classification based on patterns
 * Returns null if uncertain, otherwise a confident guess
 */
export function heuristicClassify(code: string, patterns: CodePatterns): ProblemClass | null {
  // Graph algorithms
  if (patterns.hasGraphStructure) {
    if (patterns.hasQueueOperations) return 'graph-bfs'
    if (patterns.hasStackOperations || patterns.hasRecursion) return 'graph-dfs'
    if (/dijkstra|priority|heap/i.test(code)) return 'shortest-path-dijkstra'
  }

  // String matching
  if (/\bpattern\b.*\btext\b|\btext\b.*\bpattern\b/i.test(code)) {
    if (/failure|prefix|lps/i.test(code)) return 'string-match-kmp'
    return 'string-match-naive'
  }

  // Matrix operations
  if (/matrix|\[\s*\[|\brows?\b.*\bcols?\b/i.test(code) && /\*|\bmultiply\b/i.test(code)) {
    return 'matrix-multiply'
  }

  // Tree traversal
  if (/\b(left|right|parent|child|tree|node)\b/i.test(code) && patterns.hasRecursion) {
    if (!/\bsort\b/i.test(code)) return 'tree-traversal'
  }

  // Sorting - check for swap patterns and comparisons
  if (patterns.hasArraySwaps && patterns.hasComparisons && patterns.hasLoops) {
    if (/\bsort\b/i.test(code)) return 'comparison-sort'
  }

  // Binary search
  if (/\b(mid|middle|low|high|left|right)\b/i.test(code) && 
      /Math\.floor|>>|\/\s*2/i.test(code) &&
      patterns.hasComparisons) {
    return 'binary-search'
  }

  // Linear search
  if (/\b(find|indexOf|includes|search)\b/i.test(code) &&
      patterns.hasLoops && !patterns.hasRecursion) {
    return 'linear-search'
  }

  // Hash lookup
  if (patterns.hasHashAccess && !patterns.hasLoops) {
    return 'hash-lookup'
  }

  // Median/selection
  if (/\b(median|select|kth|partition)\b/i.test(code)) {
    return 'median-finding'
  }

  return null
}

// =============================================================================
// LLM CLASSIFICATION
// =============================================================================

/**
 * Classify code into a problem class using LLM
 */
export async function classifyWithLLM(
  code: string,
  apiKey?: string
): Promise<ClassificationResult> {
  const key = apiKey || process.env.ANTHROPIC_API_KEY
  
  if (!key) {
    return {
      class: 'unknown',
      confidence: 0,
      reasoning: 'No API key available for LLM classification',
      alternativeClasses: [],
    }
  }

  const anthropic = new Anthropic({ apiKey: key })
  
  const prompt = CLASSIFICATION_PROMPT.replace('{CODE}', code)

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 500,
      temperature: 0.1,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    // Parse JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON in response')
    }

    const result = JSON.parse(jsonMatch[0])
    
    // Validate class
    const validClass = PROBLEM_CLASSES.includes(result.class) 
      ? result.class as ProblemClass 
      : 'unknown'

    return {
      class: validClass,
      confidence: Math.min(1, Math.max(0, result.confidence || 0)),
      reasoning: result.reasoning || '',
      alternativeClasses: (result.alternativeClasses || [])
        .filter((a: { class: string }) => PROBLEM_CLASSES.includes(a.class as ProblemClass))
        .slice(0, 3),
    }
  } catch (error) {
    console.error('Classification error:', error)
    return {
      class: 'unknown',
      confidence: 0,
      reasoning: error instanceof Error ? error.message : 'Classification failed',
      alternativeClasses: [],
    }
  }
}

// =============================================================================
// MAIN CLASSIFICATION FUNCTION
// =============================================================================

/**
 * Classify code into a problem class
 * Uses heuristics first, falls back to LLM for uncertain cases
 */
export async function classifyCode(
  code: string,
  options: { useLLM?: boolean; apiKey?: string } = {}
): Promise<ClassificationResult> {
  const { useLLM = true, apiKey } = options

  // Detect patterns
  const patterns = detectCodePatterns(code)

  // Try heuristic classification first
  const heuristicResult = heuristicClassify(code, patterns)
  
  if (heuristicResult && !useLLM) {
    return {
      class: heuristicResult,
      confidence: 0.7, // Heuristics are moderately confident
      reasoning: `Heuristic classification based on code patterns`,
      alternativeClasses: [],
    }
  }

  // Use LLM for more accurate classification
  if (useLLM) {
    const llmResult = await classifyWithLLM(code, apiKey)
    
    // If LLM is uncertain but heuristic has a guess, boost confidence
    if (llmResult.class === 'unknown' && heuristicResult) {
      return {
        class: heuristicResult,
        confidence: 0.5,
        reasoning: `Heuristic fallback: ${llmResult.reasoning}`,
        alternativeClasses: [],
      }
    }
    
    return llmResult
  }

  // No classification possible
  return {
    class: 'unknown',
    confidence: 0,
    reasoning: 'Unable to classify without LLM',
    alternativeClasses: [],
  }
}

/**
 * Get human-readable label for a problem class
 */
export function getClassLabel(problemClass: ProblemClass): string {
  return PROBLEM_CLASS_LABELS[problemClass]
}

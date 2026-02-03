# Efficiency Auditor Gameplan

**Status**: Research Initiative  
**Last Updated**: February 2026  
**Objective**: Build efficiency auditor as publishable research + premium product feature

---

## Strategy

The Efficiency Auditor is a **dual-track initiative**:

1. **Research track**: Novel academic contribution → paper at PLDI/ICSE/FSE
2. **Product track**: Premium tier feature for performance-critical users

Both tracks share infrastructure and validate each other. Research credibility drives enterprise sales. Product usage generates evaluation data for papers.

---

## Dependencies

The Efficiency Auditor builds on infrastructure from the main product:

| Dependency | Source | Status |
|------------|--------|--------|
| E2B sandbox | Proofs Not Scores Phase 1 | Required |
| LLM integration | Existing | Ready |
| API framework | Existing | Ready |
| Auth/billing | Existing | Ready |

**Critical path**: Cannot start instrumented execution until sandbox infrastructure is working.

---

## Phase Overview

| Phase | Focus | Output | Research Value | Product Value |
|-------|-------|--------|----------------|---------------|
| **1** | Problem classification | LLM classifier | High (novel) | Medium |
| **2** | Bounds database | 20 problem classes | Medium (curation) | High |
| **3** | Instrumentation | Operation counting | Medium | High |
| **4** | Efficiency calculation | Core metric | High (novel) | High |
| **5** | Gap explanation | LLM analysis | Medium | High |
| **6** | Optimal generation | Code fixes | Low | Very High |
| **7** | Evaluation | Benchmarks + user study | Required for paper | Required for launch |
| **8** | Paper | Submission | Goal | Marketing |

---

## Phase 1: Problem Classification

**Goal**: LLM that identifies computational problem class from code

### Deliverables

1. **`lib/inprod/efficiency/classifier.ts`**
   - Prompt engineering for problem classification
   - Confidence scoring
   - Fallback to "unknown"

2. **Classification benchmark**
   - 100+ labeled functions across problem classes
   - Accuracy measurement

3. **Static analysis augmentation**
   - Pattern matching to validate LLM classification
   - Loop structure analysis
   - Recursion detection

### Technical Spec

```typescript
// lib/inprod/efficiency/classifier.ts

import Anthropic from '@anthropic-ai/sdk'

export interface ClassificationResult {
  class: ProblemClass
  confidence: number
  reasoning: string
  alternativeClasses: Array<{ class: ProblemClass; confidence: number }>
}

const CLASSIFICATION_PROMPT = `
Analyze this function and classify what computational problem it solves.

Function:
\`\`\`
{{CODE}}
\`\`\`

Classify as ONE of:
- comparison-sort: Sorts elements using comparisons (bubble, merge, quick, heap)
- counting-sort: Sorts using counting/bucketing (radix, bucket, counting)
- binary-search: Searches sorted data by halving
- linear-search: Searches by examining each element
- graph-bfs: Breadth-first graph traversal
- graph-dfs: Depth-first graph traversal
- shortest-path-dijkstra: Single-source shortest paths (non-negative weights)
- shortest-path-bellman-ford: Single-source shortest paths (negative weights ok)
- string-match-naive: Substring search (naive approach)
- string-match-kmp: Substring search (KMP or similar)
- matrix-multiply: Matrix multiplication
- tree-traversal: Tree node visitation
- hash-lookup: Hash table operations
- median-finding: Finding median/kth element
- unknown: Does not match known problem classes

Consider:
- What is the input type? (array, graph, tree, string, matrix)
- What is the output? (sorted data, found element, path, etc.)
- What is the core operation? (compare, visit, multiply, hash)

Return JSON:
{
  "class": "...",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation",
  "alternativeClasses": [{"class": "...", "confidence": 0.0-1.0}]
}
`

export async function classifyProblem(
  code: string,
  language: string = 'typescript'
): Promise<ClassificationResult> {
  const anthropic = new Anthropic()

  const prompt = CLASSIFICATION_PROMPT.replace('{{CODE}}', code)

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }]
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  // Parse JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return {
      class: 'unknown',
      confidence: 0,
      reasoning: 'Failed to parse classification',
      alternativeClasses: []
    }
  }

  return JSON.parse(jsonMatch[0])
}

// Static analysis to validate LLM classification
export function validateClassification(
  code: string,
  llmResult: ClassificationResult
): ClassificationResult {
  const patterns = detectPatterns(code)

  // Check for contradictions
  if (llmResult.class === 'comparison-sort' && !patterns.hasComparisons) {
    return { ...llmResult, confidence: llmResult.confidence * 0.5 }
  }

  if (llmResult.class.includes('graph') && !patterns.hasGraphStructure) {
    return { ...llmResult, confidence: llmResult.confidence * 0.5 }
  }

  return llmResult
}

function detectPatterns(code: string): CodePatterns {
  return {
    hasComparisons: /[<>]=?|\.compare|localeCompare/.test(code),
    hasGraphStructure: /neighbors|edges|vertices|adjacency/.test(code),
    hasRecursion: /function\s+(\w+)[^{]*\{[^}]*\1\s*\(/.test(code),
    hasLoops: /for\s*\(|while\s*\(|\.forEach|\.map/.test(code),
    hasHashAccess: /\[\w+\]|\.get\(|\.set\(|Map|Object\./.test(code)
  }
}
```

### Benchmark Dataset

Create 100+ labeled examples:

```typescript
// tests/efficiency/classification-benchmark.ts

export const CLASSIFICATION_BENCHMARK = [
  {
    name: 'bubble-sort-basic',
    code: `function sort(arr) {
      for (let i = 0; i < arr.length; i++) {
        for (let j = 0; j < arr.length - i - 1; j++) {
          if (arr[j] > arr[j + 1]) {
            [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]]
          }
        }
      }
      return arr
    }`,
    expectedClass: 'comparison-sort',
    difficulty: 'easy'
  },
  {
    name: 'merge-sort-recursive',
    code: `function mergeSort(arr) {
      if (arr.length <= 1) return arr
      const mid = Math.floor(arr.length / 2)
      const left = mergeSort(arr.slice(0, mid))
      const right = mergeSort(arr.slice(mid))
      return merge(left, right)
    }`,
    expectedClass: 'comparison-sort',
    difficulty: 'easy'
  },
  {
    name: 'binary-search-iterative',
    code: `function binarySearch(arr, target) {
      let left = 0, right = arr.length - 1
      while (left <= right) {
        const mid = Math.floor((left + right) / 2)
        if (arr[mid] === target) return mid
        if (arr[mid] < target) left = mid + 1
        else right = mid - 1
      }
      return -1
    }`,
    expectedClass: 'binary-search',
    difficulty: 'easy'
  },
  // ... 97 more examples across all problem classes
]
```

### Success Criteria

- [ ] Classification accuracy >85% on benchmark
- [ ] Confidence calibration: high confidence = high accuracy
- [ ] Handles edge cases (empty functions, obfuscated code)
- [ ] Response time <2s per classification
- [ ] Cost <$0.02 per classification

### Risks

- **LLM misclassification**: Mitigate with static analysis validation
- **Ambiguous code**: Mitigate with confidence thresholds, fallback to "unknown"
- **Novel algorithms**: Accept "unknown" as valid output

---

## Phase 2: Bounds Database

**Goal**: Curated database of theoretical bounds with citations

### Deliverables

1. **`lib/inprod/efficiency/bounds-database.ts`**
   - 20 problem classes with bounds
   - Formulas for calculating minimum operations
   - Citations to authoritative sources

2. **Bounds documentation**
   - Markdown file explaining each bound
   - Proofs/references for each

### Technical Spec

```typescript
// lib/inprod/efficiency/bounds-database.ts

export interface TheoreticalBound {
  class: ProblemClass
  notation: string
  formula: BoundFormula
  operationType: 'comparisons' | 'operations' | 'accesses'
  source: Citation
  tight: boolean
  assumptions: string[]
}

export interface Citation {
  authors: string[]
  title: string
  venue: string
  year: number
  theorem?: string
}

export interface BoundFormula {
  // Calculate theoretical minimum for given parameters
  calculate: (params: BoundParams) => number

  // Parameter names for this bound
  params: string[]
}

export interface BoundParams {
  n?: number      // Input size
  m?: number      // Secondary size (e.g., pattern length)
  v?: number      // Vertices (graphs)
  e?: number      // Edges (graphs)
  k?: number      // Range/buckets (counting sort)
  d?: number      // Dimensions (matrix)
}

export const BOUNDS_DATABASE: TheoreticalBound[] = [
  {
    class: 'comparison-sort',
    notation: 'Ω(n log n)',
    formula: {
      calculate: ({ n = 0 }) => n * Math.log2(n),
      params: ['n']
    },
    operationType: 'comparisons',
    source: {
      authors: ['Cormen', 'Leiserson', 'Rivest', 'Stein'],
      title: 'Introduction to Algorithms',
      venue: 'MIT Press',
      year: 2009,
      theorem: 'Theorem 8.1'
    },
    tight: true,
    assumptions: ['Comparison-based sorting', 'All elements distinct']
  },
  {
    class: 'binary-search',
    notation: 'Ω(log n)',
    formula: {
      calculate: ({ n = 0 }) => Math.log2(n),
      params: ['n']
    },
    operationType: 'comparisons',
    source: {
      authors: [],
      title: 'Information-theoretic lower bound',
      venue: 'Folklore',
      year: 0
    },
    tight: true,
    assumptions: ['Sorted input', 'Random access']
  },
  {
    class: 'linear-search',
    notation: 'Ω(n)',
    formula: {
      calculate: ({ n = 0 }) => n,
      params: ['n']
    },
    operationType: 'comparisons',
    source: {
      authors: [],
      title: 'Adversarial argument',
      venue: 'Folklore',
      year: 0
    },
    tight: true,
    assumptions: ['Unsorted input', 'Element may not exist']
  },
  {
    class: 'graph-bfs',
    notation: 'Ω(V + E)',
    formula: {
      calculate: ({ v = 0, e = 0 }) => v + e,
      params: ['v', 'e']
    },
    operationType: 'operations',
    source: {
      authors: ['Cormen', 'Leiserson', 'Rivest', 'Stein'],
      title: 'Introduction to Algorithms',
      venue: 'MIT Press',
      year: 2009,
      theorem: 'Theorem 22.2'
    },
    tight: true,
    assumptions: ['Adjacency list representation']
  },
  {
    class: 'shortest-path-dijkstra',
    notation: 'Ω((V + E) log V)',
    formula: {
      calculate: ({ v = 0, e = 0 }) => (v + e) * Math.log2(v),
      params: ['v', 'e']
    },
    operationType: 'operations',
    source: {
      authors: ['Dijkstra'],
      title: 'A note on two problems in connexion with graphs',
      venue: 'Numerische Mathematik',
      year: 1959
    },
    tight: true,
    assumptions: ['Binary heap', 'Non-negative weights']
  },
  {
    class: 'string-match-kmp',
    notation: 'Ω(n + m)',
    formula: {
      calculate: ({ n = 0, m = 0 }) => n + m,
      params: ['n', 'm']
    },
    operationType: 'comparisons',
    source: {
      authors: ['Knuth', 'Morris', 'Pratt'],
      title: 'Fast pattern matching in strings',
      venue: 'SIAM Journal on Computing',
      year: 1977
    },
    tight: true,
    assumptions: ['Single pattern matching']
  },
  {
    class: 'matrix-multiply',
    notation: 'Ω(n²)',
    formula: {
      calculate: ({ n = 0 }) => n * n,
      params: ['n']
    },
    operationType: 'operations',
    source: {
      authors: [],
      title: 'Output size lower bound',
      venue: 'Folklore',
      year: 0
    },
    tight: false,  // Best known is O(n^2.37), gap exists
    assumptions: ['n × n matrices']
  },
  // ... more bounds
]

export function getBound(problemClass: ProblemClass): TheoreticalBound | undefined {
  return BOUNDS_DATABASE.find(b => b.class === problemClass)
}

export function calculateTheoreticalMinimum(
  problemClass: ProblemClass,
  params: BoundParams
): number {
  const bound = getBound(problemClass)
  if (!bound) return Infinity
  return bound.formula.calculate(params)
}
```

### Success Criteria

- [ ] 20 problem classes documented
- [ ] All bounds have citations
- [ ] Formulas verified against manual calculation
- [ ] Assumptions clearly stated

---

## Phase 3: Instrumentation

**Goal**: Count operations during function execution

### Deliverables

1. **`lib/inprod/efficiency/instrumentation.ts`**
   - Wrap arrays with Proxy to count accesses
   - Count comparisons via operator interception
   - Track function calls

2. **Sandbox integration**
   - Inject instrumentation code
   - Run function with instrumented inputs
   - Collect metrics

### Technical Spec

```typescript
// lib/inprod/efficiency/instrumentation.ts

export interface OperationCounts {
  comparisons: number
  swaps: number
  reads: number
  writes: number
  allocations: number
  functionCalls: number
}

export function createInstrumentedArray<T>(
  arr: T[],
  counts: OperationCounts
): T[] {
  return new Proxy(arr, {
    get(target, prop) {
      if (typeof prop === 'string' && !isNaN(Number(prop))) {
        counts.reads++
      }
      return Reflect.get(target, prop)
    },
    set(target, prop, value) {
      if (typeof prop === 'string' && !isNaN(Number(prop))) {
        counts.writes++
      }
      return Reflect.set(target, prop, value)
    }
  })
}

// For comparison counting, we need to wrap the comparison functions
export function instrumentComparisons(
  code: string,
  counts: OperationCounts
): string {
  // Replace comparison operators with tracking versions
  // This is simplified; real implementation needs AST transformation

  const instrumented = code
    .replace(/(\w+)\s*>\s*(\w+)/g, '(counts.comparisons++, $1 > $2)')
    .replace(/(\w+)\s*<\s*(\w+)/g, '(counts.comparisons++, $1 < $2)')
    .replace(/(\w+)\s*>=\s*(\w+)/g, '(counts.comparisons++, $1 >= $2)')
    .replace(/(\w+)\s*<=\s*(\w+)/g, '(counts.comparisons++, $1 <= $2)')
    .replace(/\.localeCompare\(/g, '(counts.comparisons++).localeCompare(')

  return instrumented
}

// Generate instrumentation wrapper for sandbox
export function generateInstrumentationWrapper(
  functionCode: string,
  functionName: string
): string {
  return `
    const counts = {
      comparisons: 0,
      swaps: 0,
      reads: 0,
      writes: 0,
      allocations: 0,
      functionCalls: 0
    };

    function createInstrumentedArray(arr) {
      return new Proxy(arr, {
        get(target, prop) {
          if (typeof prop === 'string' && !isNaN(Number(prop))) {
            counts.reads++;
          }
          return Reflect.get(target, prop);
        },
        set(target, prop, value) {
          if (typeof prop === 'string' && !isNaN(Number(prop))) {
            counts.writes++;
          }
          return Reflect.set(target, prop, value);
        }
      });
    }

    // Original function with instrumented comparisons
    ${instrumentComparisons(functionCode, { comparisons: 0, swaps: 0, reads: 0, writes: 0, allocations: 0, functionCalls: 0 })}

    // Run with instrumented input
    const input = createInstrumentedArray(JSON.parse(process.argv[2]));
    const start = process.hrtime.bigint();
    ${functionName}(input);
    const end = process.hrtime.bigint();

    console.log(JSON.stringify({
      counts,
      timeNs: Number(end - start)
    }));
  `
}
```

### Sandbox Execution

```typescript
// lib/inprod/efficiency/measurement.ts

import { Sandbox } from '@e2b/code-interpreter'

export interface Measurement {
  inputSize: number
  counts: OperationCounts
  timeNs: number
}

export async function measureFunction(
  sandbox: Sandbox,
  code: string,
  functionName: string,
  testInputs: unknown[][]
): Promise<Measurement[]> {
  const measurements: Measurement[] = []

  for (const input of testInputs) {
    const wrapper = generateInstrumentationWrapper(code, functionName)

    await sandbox.files.write('/app/measure.js', wrapper)

    const result = await sandbox.commands.run(
      `node measure.js '${JSON.stringify(input)}'`,
      { cwd: '/app', timeoutMs: 30_000 }
    )

    if (result.exitCode === 0) {
      const data = JSON.parse(result.stdout)
      measurements.push({
        inputSize: input.length,
        counts: data.counts,
        timeNs: data.timeNs
      })
    }
  }

  return measurements
}
```

### Success Criteria

- [ ] Accurate comparison counting for common patterns
- [ ] Array read/write tracking works
- [ ] Overhead <10% of execution time
- [ ] Works in E2B sandbox

### Risks

- **Proxy overhead**: Mitigate by running multiple times, averaging
- **Complex code structures**: Accept some undercounting

---

## Phase 4: Efficiency Calculation

**Goal**: Compute efficiency ratio from measurements and bounds

### Deliverables

1. **`lib/inprod/efficiency/calculator.ts`**
   - Core efficiency calculation
   - Multi-measurement analysis
   - Empirical complexity inference

### Technical Spec

```typescript
// lib/inprod/efficiency/calculator.ts

export interface EfficiencyCalculation {
  problemClass: ProblemClass
  inputSize: number
  theoreticalMinimum: number
  actualOperations: number
  efficiencyRatio: number
  wastedOperations: number
  empiricalComplexity: string
}

export function calculateEfficiency(
  classification: ClassificationResult,
  measurements: Measurement[]
): EfficiencyCalculation {
  const bound = getBound(classification.class)
  if (!bound) {
    throw new Error(`No bound for problem class: ${classification.class}`)
  }

  // Use largest input for most accurate measurement
  const measurement = measurements[measurements.length - 1]
  const n = measurement.inputSize

  // Calculate theoretical minimum
  const theoreticalMin = bound.formula.calculate({ n })

  // Get actual operations (use operation type from bound)
  const actual = getRelevantOperations(measurement.counts, bound.operationType)

  // Calculate ratio
  const ratio = Math.min(100, (theoreticalMin / actual) * 100)

  // Infer empirical complexity from measurements
  const empiricalComplexity = inferComplexity(measurements)

  return {
    problemClass: classification.class,
    inputSize: n,
    theoreticalMinimum: Math.round(theoreticalMin),
    actualOperations: actual,
    efficiencyRatio: Math.round(ratio * 10) / 10,
    wastedOperations: actual - Math.round(theoreticalMin),
    empiricalComplexity
  }
}

function getRelevantOperations(
  counts: OperationCounts,
  type: 'comparisons' | 'operations' | 'accesses'
): number {
  switch (type) {
    case 'comparisons':
      return counts.comparisons
    case 'operations':
      return counts.comparisons + counts.reads + counts.writes
    case 'accesses':
      return counts.reads + counts.writes
    default:
      return counts.comparisons + counts.swaps
  }
}

function inferComplexity(measurements: Measurement[]): string {
  if (measurements.length < 2) return 'unknown'

  // Fit to common complexity classes
  const ratios: number[] = []

  for (let i = 1; i < measurements.length; i++) {
    const prev = measurements[i - 1]
    const curr = measurements[i]

    const nRatio = curr.inputSize / prev.inputSize
    const opsRatio = getRelevantOperations(curr.counts, 'operations') /
                     getRelevantOperations(prev.counts, 'operations')

    ratios.push(opsRatio / nRatio)
  }

  const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length

  // Classify based on growth rate
  if (avgRatio < 1.2) return 'O(n)'
  if (avgRatio < 2.5) return 'O(n log n)'
  if (avgRatio < 5) return 'O(n²)'
  if (avgRatio < 10) return 'O(n³)'
  return 'O(2^n)'
}
```

### Success Criteria

- [ ] Efficiency ratio within 10% of manual calculation
- [ ] Empirical complexity matches actual complexity
- [ ] Handles edge cases (empty input, single element)

---

## Phase 5: Gap Explanation

**Goal**: LLM explains why efficiency is low

### Deliverables

1. **`lib/inprod/efficiency/explainer.ts`**
   - Prompt for gap explanation
   - Structured output parsing
   - Suggestion generation

### Technical Spec

```typescript
// lib/inprod/efficiency/explainer.ts

export interface EfficiencyGap {
  cause: string
  wastedPercent: number
  explanation: string
  suggestion: string
}

const EXPLANATION_PROMPT = `
You are analyzing code efficiency. The user's code is less efficient than the theoretical optimum.

Problem class: {{PROBLEM_CLASS}}
Theoretical minimum: {{THEORETICAL_MIN}} {{OPERATION_TYPE}}
Actual operations: {{ACTUAL_OPS}} {{OPERATION_TYPE}}
Efficiency: {{EFFICIENCY}}%

User's code:
\`\`\`
{{CODE}}
\`\`\`

Optimal algorithm for this problem: {{OPTIMAL_ALGORITHM}}

Analyze why the code is inefficient. Identify specific causes of wasted operations.

Return JSON array of gaps:
[
  {
    "cause": "Brief name of the issue",
    "wastedPercent": 0-100,
    "explanation": "Detailed explanation of why this wastes operations",
    "suggestion": "Specific fix recommendation"
  }
]

The wastedPercent values should sum to approximately (100 - efficiency).
`

export async function explainGaps(
  code: string,
  classification: ClassificationResult,
  calculation: EfficiencyCalculation
): Promise<EfficiencyGap[]> {
  const anthropic = new Anthropic()

  const optimalAlgorithm = getOptimalAlgorithmDescription(classification.class)

  const prompt = EXPLANATION_PROMPT
    .replace('{{PROBLEM_CLASS}}', classification.class)
    .replace('{{THEORETICAL_MIN}}', String(calculation.theoreticalMinimum))
    .replace(/{{OPERATION_TYPE}}/g, 'operations')
    .replace('{{ACTUAL_OPS}}', String(calculation.actualOperations))
    .replace('{{EFFICIENCY}}', String(calculation.efficiencyRatio))
    .replace('{{CODE}}', code)
    .replace('{{OPTIMAL_ALGORITHM}}', optimalAlgorithm)

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }]
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\[[\s\S]*\]/)

  if (!jsonMatch) {
    return [{
      cause: 'Analysis failed',
      wastedPercent: 100 - calculation.efficiencyRatio,
      explanation: 'Could not determine specific causes',
      suggestion: 'Consider using a more efficient algorithm'
    }]
  }

  return JSON.parse(jsonMatch[0])
}

function getOptimalAlgorithmDescription(problemClass: ProblemClass): string {
  const descriptions: Record<ProblemClass, string> = {
    'comparison-sort': 'Merge sort or heap sort: O(n log n) comparisons, stable',
    'binary-search': 'Iterative binary search: O(log n) comparisons',
    'linear-search': 'Simple iteration: O(n) comparisons worst case',
    'graph-bfs': 'Queue-based BFS: O(V + E) with adjacency list',
    'graph-dfs': 'Stack-based or recursive DFS: O(V + E)',
    'shortest-path-dijkstra': 'Dijkstra with binary heap: O((V + E) log V)',
    'shortest-path-bellman-ford': 'Bellman-Ford: O(VE)',
    'string-match-naive': 'Naive: O(nm)',
    'string-match-kmp': 'KMP: O(n + m) with preprocessing',
    'matrix-multiply': 'Strassen: O(n^2.807), naive: O(n³)',
    'tree-traversal': 'Iterative with stack or Morris traversal: O(n)',
    'hash-lookup': 'Hash table: O(1) amortized',
    'median-finding': 'Quickselect or median-of-medians: O(n)',
    'counting-sort': 'Counting sort: O(n + k)',
    'unknown': 'Unknown optimal algorithm'
  }

  return descriptions[problemClass] || 'Unknown'
}
```

### Success Criteria

- [ ] Gap explanations are accurate and actionable
- [ ] Suggestions are specific to the code
- [ ] Wasted percentages sum correctly

---

## Phase 6: Optimal Generation

**Goal**: Generate optimal implementation for the problem

### Deliverables

1. **`lib/inprod/efficiency/generator.ts`**
   - Generate optimal code for problem class
   - Match original function signature
   - Verify correctness with tests

### Technical Spec

```typescript
// lib/inprod/efficiency/generator.ts

export interface OptimalImplementation {
  code: string
  expectedEfficiency: number
  algorithm: string
  explanation: string
}

const GENERATION_PROMPT = `
Generate an optimal implementation for this problem.

Problem class: {{PROBLEM_CLASS}}
Optimal algorithm: {{OPTIMAL_ALGORITHM}}
Expected complexity: {{EXPECTED_COMPLEXITY}}

Original function signature:
\`\`\`
{{SIGNATURE}}
\`\`\`

Original function (for behavior reference):
\`\`\`
{{CODE}}
\`\`\`

Requirements:
1. Use the optimal algorithm for this problem class
2. Match the original function signature exactly
3. Produce the same output for the same input
4. Be readable and well-commented
5. Use {{LANGUAGE}}

Return JSON:
{
  "code": "The optimal implementation",
  "algorithm": "Name of algorithm used",
  "explanation": "Brief explanation of why this is optimal"
}
`

export async function generateOptimal(
  code: string,
  signature: string,
  classification: ClassificationResult,
  language: string = 'typescript'
): Promise<OptimalImplementation> {
  const anthropic = new Anthropic()

  const optimalAlgorithm = getOptimalAlgorithmDescription(classification.class)
  const bound = getBound(classification.class)

  const prompt = GENERATION_PROMPT
    .replace('{{PROBLEM_CLASS}}', classification.class)
    .replace('{{OPTIMAL_ALGORITHM}}', optimalAlgorithm)
    .replace('{{EXPECTED_COMPLEXITY}}', bound?.notation || 'unknown')
    .replace('{{SIGNATURE}}', signature)
    .replace('{{CODE}}', code)
    .replace('{{LANGUAGE}}', language)

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }]
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)

  if (!jsonMatch) {
    throw new Error('Failed to generate optimal implementation')
  }

  const result = JSON.parse(jsonMatch[0])

  return {
    code: result.code,
    expectedEfficiency: 90, // Estimate
    algorithm: result.algorithm,
    explanation: result.explanation
  }
}
```

### Success Criteria

- [ ] Generated code compiles
- [ ] Generated code passes original tests
- [ ] Generated code is more efficient than original
- [ ] Generated code is readable

---

## Phase 7: Evaluation

**Goal**: Rigorous evaluation for paper and product launch

### Deliverables

1. **Benchmark suite**
   - 200+ functions across problem classes
   - Ground truth efficiency ratios (manually calculated)

2. **User study**
   - 20+ developers
   - Task: Optimize code with/without efficiency auditor
   - Measure: Time to optimize, final efficiency

3. **Case studies**
   - HFT trading system
   - Game engine physics
   - Database query optimizer

### Evaluation Protocol

```markdown
## Classification Evaluation

Dataset: 200 labeled functions
Metric: Accuracy, precision, recall per class
Baseline: Random, naive pattern matching

## Efficiency Ratio Evaluation

Dataset: 50 functions with manual efficiency calculation
Metric: Correlation (Pearson r), mean absolute error
Baseline: None (novel metric)

## Gap Explanation Evaluation

Dataset: 30 inefficient functions
Metric: Expert rating (1-5) of explanation quality
Baseline: None

## User Study

Participants: 20 developers (mixed experience)
Task: Optimize 5 functions in 30 minutes
Conditions: With efficiency auditor, without
Metrics: Final efficiency, time spent, confidence
```

### Success Criteria

- [ ] Classification accuracy >85%
- [ ] Efficiency ratio r > 0.9 with ground truth
- [ ] User study shows significant improvement
- [ ] Case studies demonstrate real-world value

---

## Phase 8: Paper

**Goal**: Submit to top venue

### Paper Structure

1. **Abstract** (200 words)
2. **Introduction** (1.5 pages)
   - Motivation: gap between theory and practice
   - Contribution: efficiency ratio metric + tool
3. **Background** (1 page)
   - Algorithmic complexity
   - Existing tools
4. **Approach** (3 pages)
   - Problem classification
   - Instrumentation
   - Efficiency calculation
   - Gap explanation
5. **Implementation** (1 page)
   - Architecture
   - LLM integration
6. **Evaluation** (3 pages)
   - Classification accuracy
   - Efficiency ratio validation
   - User study
   - Case studies
7. **Related Work** (1 page)
8. **Discussion & Limitations** (0.5 pages)
9. **Conclusion** (0.5 pages)

### Submission Timeline

| Milestone | Date |
|-----------|------|
| Paper draft complete | Week 16 |
| Internal review | Week 17 |
| Revisions | Week 18-19 |
| Submission | Week 20 |

### Target Venues (with deadlines)

| Venue | Deadline | Notification |
|-------|----------|--------------|
| PLDI 2027 | November 2026 | February 2027 |
| ICSE 2027 | September 2026 | December 2026 |
| FSE 2026 | March 2026 | June 2026 |

---

## Success Metrics Summary

### Research Metrics

| Metric | Target |
|--------|--------|
| Classification accuracy | >85% |
| Efficiency ratio correlation | r > 0.9 |
| Paper acceptance | 1 top venue |
| Citations (year 1) | 10+ |

### Product Metrics

| Metric | Target (6 months) |
|--------|-------------------|
| Efficiency audits | 5,000 |
| Unique users | 500 |
| Paid conversions | 50 |
| Enterprise leads | 10 |

### Quality Metrics

| Metric | Target |
|--------|--------|
| False positive rate | <10% |
| User satisfaction | >4/5 |
| Optimal code correctness | >95% |

---

## Resource Requirements

### Infrastructure

| Resource | Purpose | Cost |
|----------|---------|------|
| E2B sandbox | Instrumented execution | ~$0.02/audit |
| Anthropic API | Classification, explanation | ~$0.05/audit |
| Benchmark hosting | Evaluation data | Minimal |

### Time Estimate

| Phase | Effort |
|-------|--------|
| Phase 1: Classification | 2 weeks |
| Phase 2: Bounds database | 1 week |
| Phase 3: Instrumentation | 2 weeks |
| Phase 4: Calculation | 1 week |
| Phase 5: Explanation | 1 week |
| Phase 6: Generation | 2 weeks |
| Phase 7: Evaluation | 3 weeks |
| Phase 8: Paper | 4 weeks |
| **Total** | **16 weeks** |

---

## Next Actions

1. [ ] Create classification benchmark dataset (20 functions per class)
2. [ ] Implement basic classifier with evaluation harness
3. [ ] Start bounds database with 10 well-known bounds
4. [ ] Design instrumentation approach for JavaScript/TypeScript
5. [ ] Identify target paper venue and deadline
6. [ ] Reach out to potential user study participants

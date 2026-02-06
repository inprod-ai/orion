// =============================================================================
// TEST VERIFIER - Run tests in E2B sandbox, parse results + coverage
// =============================================================================
// Wraps lib/sandbox.ts to produce a TestResult.
// Cost: ~$0.03-0.05 per scan (2-3 min sandbox)

import { runInSandbox } from '@/lib/sandbox'
import type { RepoFile } from '../types'
import type { TestResult, TestFailure } from './types'

/**
 * Run the project's test suite in a sandbox and return structured results.
 */
export async function verifyTests(
  files: RepoFile[],
  stack: 'node' | 'python' | 'go' | 'rust' = 'node'
): Promise<TestResult> {
  const startTime = Date.now()

  // Convert RepoFile[] to Record<string, string> for sandbox
  const fileMap: Record<string, string> = {}
  for (const file of files) {
    fileMap[file.path] = file.content
  }

  const sandboxResult = await runInSandbox(fileMap, stack, {
    runBuild: true,
    runTests: true,
    installDeps: true,
  })

  // Parse test output for pass/fail counts
  const testOutput = sandboxResult.testOutput || ''
  const { total, passed, failed, skipped, failures } = parseTestOutput(testOutput, stack)

  return {
    success: sandboxResult.testsSuccess || false,
    total,
    passed,
    failed,
    skipped,
    coverage: sandboxResult.coverage ? {
      lines: sandboxResult.coverage.lines,
      branches: sandboxResult.coverage.branches,
      functions: sandboxResult.coverage.functions,
    } : undefined,
    failures,
    duration: Date.now() - startTime,
    evidence: testOutput.slice(0, 5000), // Cap evidence size
  }
}

/**
 * Parse test runner output to extract pass/fail counts and failure details.
 */
function parseTestOutput(
  output: string,
  stack: string
): { total: number; passed: number; failed: number; skipped: number; failures: TestFailure[] } {
  const failures: TestFailure[] = []
  let total = 0, passed = 0, failed = 0, skipped = 0

  if (stack === 'node') {
    // Vitest: "Tests  42 passed | 3 failed (45)"
    const vitestMatch = output.match(/Tests\s+(\d+)\s+passed(?:\s*\|\s*(\d+)\s+failed)?(?:\s*\|\s*(\d+)\s+skipped)?\s*\((\d+)\)/)
    if (vitestMatch) {
      passed = parseInt(vitestMatch[1]) || 0
      failed = parseInt(vitestMatch[2]) || 0
      skipped = parseInt(vitestMatch[3]) || 0
      total = parseInt(vitestMatch[4]) || passed + failed + skipped
      parseVitestFailures(output, failures)
      return { total, passed, failed, skipped, failures }
    }

    // Jest: "Tests:  3 failed, 42 passed, 45 total"
    const jestMatch = output.match(/Tests:\s+(?:(\d+)\s+failed,\s+)?(\d+)\s+passed(?:,\s+(\d+)\s+skipped)?,\s+(\d+)\s+total/)
    if (jestMatch) {
      failed = parseInt(jestMatch[1]) || 0
      passed = parseInt(jestMatch[2]) || 0
      skipped = parseInt(jestMatch[3]) || 0
      total = parseInt(jestMatch[4]) || passed + failed + skipped
      parseJestFailures(output, failures)
      return { total, passed, failed, skipped, failures }
    }

    // Node test runner: "tests 10 | pass 8 | fail 2"
    const nodeMatch = output.match(/tests\s+(\d+)\s*\|\s*pass\s+(\d+)\s*\|\s*fail\s+(\d+)/)
    if (nodeMatch) {
      total = parseInt(nodeMatch[1]) || 0
      passed = parseInt(nodeMatch[2]) || 0
      failed = parseInt(nodeMatch[3]) || 0
      return { total, passed, failed, skipped, failures }
    }
  }

  if (stack === 'python') {
    // pytest: "5 passed, 2 failed, 1 skipped"
    const passedMatch = output.match(/(\d+)\s+passed/)
    const failedMatch = output.match(/(\d+)\s+failed/)
    const skippedMatch = output.match(/(\d+)\s+skipped/)
    passed = passedMatch ? parseInt(passedMatch[1]) : 0
    failed = failedMatch ? parseInt(failedMatch[1]) : 0
    skipped = skippedMatch ? parseInt(skippedMatch[1]) : 0
    total = passed + failed + skipped
    return { total, passed, failed, skipped, failures }
  }

  if (stack === 'go') {
    // Go: "ok", "FAIL", "--- FAIL:"
    const okCount = (output.match(/^ok\s/gm) || []).length
    const failCount = (output.match(/^FAIL\s/gm) || []).length
    passed = okCount
    failed = failCount
    total = passed + failed
    return { total, passed, failed, skipped, failures }
  }

  return { total, passed, failed, skipped, failures }
}

function parseVitestFailures(output: string, failures: TestFailure[]): void {
  // Match "FAIL  tests/foo.test.ts > Suite > test name"
  const failRegex = /FAIL\s+(\S+)\s+>\s+(.+)/g
  let match
  while ((match = failRegex.exec(output)) !== null) {
    failures.push({
      name: match[2].trim(),
      file: match[1],
      error: extractErrorAfter(output, match.index),
    })
    if (failures.length >= 20) break // Cap at 20 failures
  }
}

function parseJestFailures(output: string, failures: TestFailure[]): void {
  // Match "● Suite > test name" blocks
  const failRegex = /●\s+(.+)/g
  let match
  while ((match = failRegex.exec(output)) !== null) {
    failures.push({
      name: match[1].trim(),
      file: '',
      error: extractErrorAfter(output, match.index),
    })
    if (failures.length >= 20) break
  }
}

function extractErrorAfter(output: string, startIndex: number): string {
  // Grab up to 500 chars after the match for error context
  const chunk = output.slice(startIndex, startIndex + 500)
  const lines = chunk.split('\n').slice(1, 6) // Skip the match line, take 5 lines
  return lines.join('\n').trim()
}

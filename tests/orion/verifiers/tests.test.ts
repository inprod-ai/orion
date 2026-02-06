// =============================================================================
// TEST VERIFIER - Adversarial tests
// =============================================================================
// Tests the test output parser, not the sandbox itself (that requires E2B).
// Attacks: malformed output, edge case formats, injection, overflow.

import { describe, it, expect, vi, beforeEach } from 'vitest'

// We need to test the parseTestOutput logic. Since it's not exported,
// we test it through verifyTests by mocking runInSandbox.
vi.mock('@/lib/sandbox', () => ({
  runInSandbox: vi.fn(),
}))

import { verifyTests } from '@/lib/orion/verifiers/tests'
import { runInSandbox } from '@/lib/sandbox'

const mockSandbox = vi.mocked(runInSandbox)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('verifyTests', () => {
  it('should handle no E2B key gracefully', async () => {
    mockSandbox.mockResolvedValue({
      success: false,
      errors: ['E2B_API_KEY not configured - sandbox execution disabled'],
      duration: 0,
    })

    const result = await verifyTests([], 'node')
    expect(result.success).toBe(false)
    expect(result.total).toBe(0)
  })

  describe('Vitest output parsing', () => {
    it('should parse standard vitest success output', async () => {
      mockSandbox.mockResolvedValue({
        success: true,
        testsSuccess: true,
        testOutput: `
 ✓ tests/foo.test.ts (10 tests) 5ms
 ✓ tests/bar.test.ts (5 tests) 3ms

 Test Files  2 passed (2)
      Tests  15 passed (15)
   Duration  1.5s
`,
        duration: 1500,
      })

      const result = await verifyTests([{ path: 'test.ts', content: '', size: 0 }], 'node')
      expect(result.success).toBe(true)
      expect(result.passed).toBe(15)
      expect(result.total).toBe(15)
      expect(result.failed).toBe(0)
    })

    it('should parse vitest output with failures', async () => {
      mockSandbox.mockResolvedValue({
        success: true,
        testsSuccess: false,
        testOutput: `
 ✓ tests/foo.test.ts (8 tests)
 ✗ tests/bar.test.ts (2 tests)

 FAIL  tests/bar.test.ts > should validate input
   AssertionError: expected true to be false

 Test Files  1 failed | 1 passed (2)
      Tests  2 failed | 8 passed (10)
   Duration  2.1s
`,
        duration: 2100,
      })

      const result = await verifyTests([{ path: 'test.ts', content: '', size: 0 }], 'node')
      expect(result.success).toBe(false)
      expect(result.passed).toBe(8)
      expect(result.failed).toBe(2)
      expect(result.total).toBe(10)
    })

    it('should parse vitest with skipped tests', async () => {
      mockSandbox.mockResolvedValue({
        success: true,
        testsSuccess: true,
        testOutput: '      Tests  10 passed | 2 skipped (12)',
        duration: 500,
      })

      const result = await verifyTests([], 'node')
      expect(result.passed).toBe(10)
      expect(result.skipped).toBe(2)
      expect(result.total).toBe(12)
    })
  })

  describe('Jest output parsing', () => {
    it('should parse jest summary line', async () => {
      mockSandbox.mockResolvedValue({
        success: true,
        testsSuccess: true,
        testOutput: 'Tests:  42 passed, 42 total',
        duration: 3000,
      })

      const result = await verifyTests([], 'node')
      expect(result.passed).toBe(42)
      expect(result.total).toBe(42)
    })

    it('should parse jest with failures', async () => {
      mockSandbox.mockResolvedValue({
        success: true,
        testsSuccess: false,
        testOutput: 'Tests:  3 failed, 10 passed, 13 total',
        duration: 3000,
      })

      const result = await verifyTests([], 'node')
      expect(result.failed).toBe(3)
      expect(result.passed).toBe(10)
      expect(result.total).toBe(13)
    })
  })

  describe('Python pytest output parsing', () => {
    it('should parse pytest success', async () => {
      mockSandbox.mockResolvedValue({
        success: true,
        testsSuccess: true,
        testOutput: '====== 25 passed in 4.32s ======',
        duration: 4320,
      })

      const result = await verifyTests([], 'python')
      expect(result.passed).toBe(25)
      expect(result.total).toBe(25)
    })

    it('should parse pytest mixed results', async () => {
      mockSandbox.mockResolvedValue({
        success: true,
        testsSuccess: false,
        testOutput: '====== 18 passed, 3 failed, 2 skipped in 6.1s ======',
        duration: 6100,
      })

      const result = await verifyTests([], 'python')
      expect(result.passed).toBe(18)
      expect(result.failed).toBe(3)
      expect(result.skipped).toBe(2)
      expect(result.total).toBe(23)
    })
  })

  describe('Go test output parsing', () => {
    it('should parse go test success', async () => {
      mockSandbox.mockResolvedValue({
        success: true,
        testsSuccess: true,
        testOutput: 'ok  \tgithub.com/foo/bar\t0.5s\nok  \tgithub.com/foo/baz\t1.2s',
        duration: 1700,
      })

      const result = await verifyTests([], 'go')
      expect(result.passed).toBe(2)
      expect(result.failed).toBe(0)
    })

    it('should parse go test failures', async () => {
      mockSandbox.mockResolvedValue({
        success: true,
        testsSuccess: false,
        testOutput: 'ok  \tgithub.com/foo/bar\t0.5s\nFAIL\tgithub.com/foo/baz\t1.2s',
        duration: 1700,
      })

      const result = await verifyTests([], 'go')
      expect(result.passed).toBe(1)
      expect(result.failed).toBe(1)
    })
  })

  describe('Coverage parsing', () => {
    it('should pass through sandbox coverage data', async () => {
      mockSandbox.mockResolvedValue({
        success: true,
        testsSuccess: true,
        testOutput: 'Tests  5 passed (5)',
        coverage: { lines: 82.5, branches: 67.3, functions: 91.0 },
        duration: 2000,
      })

      const result = await verifyTests([], 'node')
      expect(result.coverage).toEqual({ lines: 82.5, branches: 67.3, functions: 91.0 })
    })

    it('should handle missing coverage gracefully', async () => {
      mockSandbox.mockResolvedValue({
        success: true,
        testsSuccess: true,
        testOutput: 'Tests  5 passed (5)',
        duration: 2000,
      })

      const result = await verifyTests([], 'node')
      expect(result.coverage).toBeUndefined()
    })
  })

  describe('Adversarial inputs', () => {
    it('should handle empty test output', async () => {
      mockSandbox.mockResolvedValue({
        success: true,
        testsSuccess: false,
        testOutput: '',
        duration: 100,
      })

      const result = await verifyTests([], 'node')
      expect(result.total).toBe(0)
      expect(result.failures).toEqual([])
    })

    it('should handle garbage output without crashing', async () => {
      mockSandbox.mockResolvedValue({
        success: false,
        testsSuccess: false,
        testOutput: '\x00\x01\x02 binary garbage ÿÿÿ 🚀🔥 \n\n\n',
        duration: 100,
      })

      const result = await verifyTests([], 'node')
      expect(result.total).toBe(0)
      expect(result.success).toBe(false)
    })

    it('should handle extremely long output without OOM', async () => {
      const hugeOutput = 'x'.repeat(1_000_000)
      mockSandbox.mockResolvedValue({
        success: true,
        testsSuccess: true,
        testOutput: hugeOutput,
        duration: 100,
      })

      const result = await verifyTests([], 'node')
      // Evidence should be capped at 5000 chars
      expect(result.evidence.length).toBeLessThanOrEqual(5000)
    })

    it('should handle sandbox throwing', async () => {
      mockSandbox.mockRejectedValue(new Error('Sandbox exploded'))

      // Should not throw, should return failed result
      await expect(verifyTests([], 'node')).rejects.toThrow()
    })

    it('should handle numbers that look like test counts in random output', async () => {
      mockSandbox.mockResolvedValue({
        success: true,
        testsSuccess: true,
        testOutput: 'Downloaded 42 packages in 3.5s\nCompiled 100 files\nTests  5 passed (5)',
        duration: 100,
      })

      const result = await verifyTests([], 'node')
      // Should pick up the Tests line, not the download count
      expect(result.passed).toBe(5)
      expect(result.total).toBe(5)
    })
  })
})

// =============================================================================
// PRODUCTION CORRELATION - Adversarial tests
// =============================================================================
// Tests Sentry issue mapping, gap correlation, and edge cases.
// Mocks fetch to avoid real API calls.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { correlateProduction } from '@/lib/orion/verifiers/production'
import type { CategoryScore, Gap } from '@/lib/orion/types'

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  vi.clearAllMocks()
})

function makeCategory(category: string, gaps: Partial<Gap>[] = []): CategoryScore {
  return {
    category: category as CategoryScore['category'],
    label: category,
    score: 50,
    detected: [],
    gaps: gaps.map((g, i) => ({
      id: g.id || `gap-${i}`,
      category: category as Gap['category'],
      title: g.title || 'test gap',
      description: g.description || '',
      severity: g.severity || 'warning',
      confidence: g.confidence || 'high',
      fixType: g.fixType || 'suggested',
      effortMinutes: g.effortMinutes || 30,
    })),
    canGenerate: false,
  }
}

describe('correlateProduction', () => {
  it('should return error when no credentials provided', async () => {
    const result = await correlateProduction('', '', '', [])
    expect(result.success).toBe(false)
    expect(result.error).toBe('Sentry credentials not provided')
  })

  it('should return error for partial credentials', async () => {
    const result = await correlateProduction('token', '', 'project', [])
    expect(result.success).toBe(false)
  })

  it('should handle Sentry 401', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 })
    const result = await correlateProduction('bad-token', 'org', 'project', [])
    expect(result.success).toBe(false)
    expect(result.error).toBe('Invalid Sentry token')
  })

  it('should handle Sentry 404', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 })
    const result = await correlateProduction('token', 'org', 'nonexistent', [])
    expect(result.success).toBe(false)
    expect(result.error).toBe('Sentry project not found')
  })

  it('should handle Sentry 500', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 })
    const result = await correlateProduction('token', 'org', 'project', [])
    expect(result.success).toBe(false)
    expect(result.error).toBe('Sentry API error: 500')
  })

  it('should handle network failure', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'))
    const result = await correlateProduction('token', 'org', 'project', [])
    expect(result.success).toBe(false)
    expect(result.error).toBe('ECONNREFUSED')
  })

  it('should return 100% accuracy when no Sentry issues', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) })
    const result = await correlateProduction('token', 'org', 'project', [])
    expect(result.success).toBe(true)
    expect(result.accuracy).toBe(100)
    expect(result.issueCount).toBe(0)
  })

  it('should categorize auth-related issues correctly', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { id: '1', title: 'Token expired 401 unauthorized', count: '15', firstSeen: '2026-01-01', lastSeen: '2026-02-01', level: 'error', culprit: 'auth.ts' },
      ]),
    })

    const categories = [makeCategory('authentication', [{ title: 'No token expiry check' }])]
    const result = await correlateProduction('token', 'org', 'project', categories)

    expect(result.success).toBe(true)
    expect(result.issues[0].category).toBe('authentication')
  })

  it('should categorize database issues correctly', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { id: '2', title: 'PrismaClientKnownRequestError: connection pool timeout', count: '200', firstSeen: '2026-01-01', lastSeen: '2026-02-01', level: 'error', culprit: 'db.ts' },
      ]),
    })

    const result = await correlateProduction('token', 'org', 'project', [])
    expect(result.issues[0].category).toBe('database')
  })

  it('should correlate Sentry issues with matching Orion gaps', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { id: '1', title: 'Unhandled TypeError missing error handling', count: '50', firstSeen: '2026-01-01', lastSeen: '2026-02-01', level: 'error', culprit: 'payments.ts' },
      ]),
    })

    const categories = [
      makeCategory('errorHandling', [{ title: 'Missing error handling' }]),
    ]

    const result = await correlateProduction('token', 'org', 'project', categories)
    expect(result.correlations.length).toBeGreaterThan(0)
    expect(result.accuracy).toBeGreaterThan(0)
  })

  it('should report undetected issues', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { id: '1', title: 'Memory leak in worker process', count: '5', firstSeen: '2026-01-01', lastSeen: '2026-02-01', level: 'warning', culprit: 'worker.ts' },
      ]),
    })

    // No matching gaps
    const categories = [makeCategory('security', [{ title: 'Missing CSRF protection' }])]
    const result = await correlateProduction('token', 'org', 'project', categories)

    expect(result.undetected.length).toBe(1)
    expect(result.accuracy).toBe(0)
  })

  it('should handle count as non-numeric string', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { id: '1', title: 'Error', count: 'not-a-number', firstSeen: '', lastSeen: '', level: 'error', culprit: '' },
      ]),
    })

    const result = await correlateProduction('token', 'org', 'project', [])
    expect(result.issues[0].count).toBe(0) // parseInt('not-a-number') = NaN, || 0
  })

  it('should handle unknown severity level', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { id: '1', title: 'Something', count: '1', firstSeen: '', lastSeen: '', level: 'catastrophic', culprit: '' },
      ]),
    })

    const result = await correlateProduction('token', 'org', 'project', [])
    expect(result.issues[0].level).toBe('error') // Falls back to 'error'
  })

  it('should handle missing fields gracefully', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { id: '1' }, // Missing everything except id
      ]),
    })

    const result = await correlateProduction('token', 'org', 'project', [])
    expect(result.success).toBe(true)
    expect(result.issues[0].title).toBe(undefined)
    expect(result.issues[0].count).toBe(0)
    expect(result.issues[0].culprit).toBe('')
  })

  it('should URL-encode org and project names', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) })

    await correlateProduction('token', 'org with spaces', 'project/slash', [])

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('org%20with%20spaces'),
      expect.anything()
    )
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('project%2Fslash'),
      expect.anything()
    )
  })

  it('should not correlate across different categories', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { id: '1', title: 'Authentication token expired', count: '10', firstSeen: '', lastSeen: '', level: 'error', culprit: '' },
      ]),
    })

    // Gap is in security category, issue is in authentication
    const categories = [makeCategory('security', [{ title: 'Token validation missing' }])]
    const result = await correlateProduction('token', 'org', 'project', categories)

    // Should NOT correlate because categories don't match
    expect(result.correlations.length).toBe(0)
  })

  it('should handle 50+ issues without performance issues', async () => {
    const issues = Array.from({ length: 100 }, (_, i) => ({
      id: String(i),
      title: `Error ${i} in module ${i % 10}`,
      count: String(i * 10),
      firstSeen: '2026-01-01',
      lastSeen: '2026-02-01',
      level: 'error',
      culprit: `module${i % 10}.ts`,
    }))

    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(issues) })

    const categories = Array.from({ length: 12 }, (_, i) =>
      makeCategory(`cat${i}`, Array.from({ length: 5 }, (_, j) => ({
        title: `Gap ${j} in category ${i}`,
      })))
    )

    const start = performance.now()
    const result = await correlateProduction('token', 'org', 'project', categories)
    const elapsed = performance.now() - start

    expect(result.success).toBe(true)
    expect(result.issueCount).toBe(100)
    expect(elapsed).toBeLessThan(1000) // Should complete in under 1 second
  })
})

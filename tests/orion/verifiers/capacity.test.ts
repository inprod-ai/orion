// =============================================================================
// CAPACITY INFERENCE - Adversarial tests
// =============================================================================
// Tests extractArchitectureFiles and the capacity estimation pipeline.
// We mock Anthropic to test parsing, not LLM output.

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Anthropic SDK with a proper class constructor
const mockCreate = vi.fn()

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = { create: mockCreate }
    },
  }
})

import { estimateCapacity } from '@/lib/orion/verifiers/capacity'
import type { RepoFile } from '@/lib/orion/types'

const makeFile = (path: string, content: string): RepoFile => ({
  path, content, size: content.length,
})

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ANTHROPIC_API_KEY = 'test-key'
})

describe('estimateCapacity', () => {
  it('should return default when no API key', async () => {
    delete process.env.ANTHROPIC_API_KEY
    const result = await estimateCapacity([])
    expect(result.maxConcurrentUsers).toBe(0)
    expect(result.confidence).toBe('low')
  })

  it('should return default when no architecture files found', async () => {
    const files = [
      makeFile('README.md', '# Hello'),
      makeFile('src/index.ts', 'console.log("hi")'),
    ]

    const result = await estimateCapacity(files)
    expect(result.maxConcurrentUsers).toBe(0)
    expect(result.bottleneck.reason).toBe('No architecture files found')
  })

  it('should find prisma schema as architecture file', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({
        maxConcurrentUsers: 5000,
        confidence: 'medium',
        bottleneck: { component: 'database', reason: 'Prisma default pool size', limit: 5000 },
        factors: [{ name: 'DB pool', value: '10', impact: 'negative', estimatedLimit: 5000, explanation: 'Default pool' }],
        methodology: 'Based on Prisma default pool size of 10',
      })}],
    })

    const files = [
      makeFile('prisma/schema.prisma', 'generator client { provider = "prisma-client-js" }'),
      makeFile('package.json', '{"dependencies": {"@prisma/client": "^5.0.0"}}'),
    ]

    const result = await estimateCapacity(files)
    expect(result.maxConcurrentUsers).toBe(5000)
    expect(result.confidence).toBe('medium')
    expect(result.bottleneck.component).toBe('database')
  })

  it('should handle Claude returning markdown-wrapped JSON', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '```json\n{"maxConcurrentUsers": 1000, "confidence": "low", "bottleneck": {"component": "api", "reason": "test", "limit": 1000}, "factors": [], "methodology": "test"}\n```' }],
    })

    const files = [makeFile('package.json', '{}')]
    const result = await estimateCapacity(files)
    expect(result.maxConcurrentUsers).toBe(1000)
  })

  it('should handle Claude returning garbage', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'I cannot parse this repository because...' }],
    })

    const files = [makeFile('package.json', '{}')]
    const result = await estimateCapacity(files)
    expect(result.maxConcurrentUsers).toBe(0)
    expect(result.confidence).toBe('low')
  })

  it('should handle Claude API throwing', async () => {
    mockCreate.mockRejectedValue(new Error('Rate limited'))

    const files = [makeFile('package.json', '{}')]
    const result = await estimateCapacity(files)
    expect(result.maxConcurrentUsers).toBe(0)
  })

  it('should handle negative maxConcurrentUsers from Claude', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({
        maxConcurrentUsers: -500,
        confidence: 'high',
        bottleneck: { component: 'api', reason: 'test', limit: -500 },
        factors: [],
        methodology: 'test',
      })}],
    })

    const files = [makeFile('package.json', '{}')]
    const result = await estimateCapacity(files)
    expect(result.maxConcurrentUsers).toBeGreaterThanOrEqual(1)
  })

  it('should handle Claude returning non-text content', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'tool_use', id: 'foo', name: 'bar', input: {} }],
    })

    const files = [makeFile('package.json', '{}')]
    const result = await estimateCapacity(files)
    expect(result.maxConcurrentUsers).toBe(0)
  })

  it('should cap architecture files at 20', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({
        maxConcurrentUsers: 100,
        confidence: 'low',
        bottleneck: { component: 'unknown', reason: 'test', limit: 100 },
        factors: [],
        methodology: 'test',
      })}],
    })

    // Generate 50 API route files
    const files = Array.from({ length: 50 }, (_, i) =>
      makeFile(`app/api/route${i}/route.ts`, `export async function GET() { return Response.json({}) }`)
    )
    files.push(makeFile('package.json', '{}'))

    const result = await estimateCapacity(files)
    expect(result).toBeDefined()
    expect(mockCreate).toHaveBeenCalledTimes(1)

    const prompt = mockCreate.mock.calls[0][0].messages[0].content
    const fileCount = (prompt.match(/---\s+\S+\s+---/g) || []).length
    expect(fileCount).toBeLessThanOrEqual(21)
  })

  it('should truncate large files to 3000 chars', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({
        maxConcurrentUsers: 100,
        confidence: 'low',
        bottleneck: { component: 'unknown', reason: 'test', limit: 100 },
        factors: [],
        methodology: 'test',
      })}],
    })

    const hugeContent = 'x'.repeat(100_000)
    const files = [makeFile('package.json', hugeContent)]
    await estimateCapacity(files)

    const prompt = mockCreate.mock.calls[0][0].messages[0].content
    expect(prompt.length).toBeLessThan(50_000)
  })
})

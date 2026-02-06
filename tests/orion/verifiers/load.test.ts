// =============================================================================
// LOAD TEST VERIFIER - Adversarial tests
// =============================================================================
// Tests k6 output parsing, bottleneck detection, and edge cases.
// Mocks E2B sandbox since we can't run k6 in tests.

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock E2B
vi.mock('e2b', () => ({
  Sandbox: {
    create: vi.fn(),
  },
}))

import { verifyLoad } from '@/lib/orion/verifiers/load'
import { Sandbox } from 'e2b'
import type { RepoFile } from '@/lib/orion/types'

const makeFile = (path: string, content: string): RepoFile => ({
  path, content, size: content.length,
})

beforeEach(() => {
  vi.clearAllMocks()
  process.env.E2B_API_KEY = 'test-key'
})

describe('verifyLoad', () => {
  it('should return error when no E2B key', async () => {
    delete process.env.E2B_API_KEY
    const result = await verifyLoad([], 'node')
    expect(result.success).toBe(false)
    expect(result.maxConcurrentUsers).toBe(0)
  })

  it('should return error when no start command detected', async () => {
    const mockSandbox = {
      files: { write: vi.fn() },
      commands: { run: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' }) },
      kill: vi.fn(),
    }
    ;(Sandbox.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockSandbox)

    // package.json with no start/dev script
    const files = [makeFile('package.json', '{"scripts": {"build": "tsc"}}')]
    const result = await verifyLoad(files, 'node')

    expect(result.success).toBe(false)
    expect(result.bottleneck.errorType).toContain('No start command')
  })

  it('should detect start command from package.json', async () => {
    const mockSandbox = {
      files: { write: vi.fn() },
      commands: {
        run: vi.fn()
          .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' }) // install
          .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' }) // k6 install
          .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' }) // build
          .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' }) // start
          .mockResolvedValueOnce({ exitCode: 0, stdout: 'waiting', stderr: '' }) // health check
          .mockResolvedValueOnce({ exitCode: 0, stdout: 'ready', stderr: '' }) // health check
          .mockResolvedValueOnce({ exitCode: 0, stdout: 'http_reqs...: 1000 50.0/s\nhttp_req_failed...: 2.00%\nmed=45.2\np(95)=120.5\np(99)=250.1', stderr: '' }), // k6 run
      },
      kill: vi.fn(),
    }
    ;(Sandbox.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockSandbox)

    const files = [makeFile('package.json', '{"scripts": {"start": "node server.js", "build": "tsc"}}')]
    const result = await verifyLoad(files, 'node')

    expect(result.success).toBe(true)
    expect(result.maxConcurrentUsers).toBeGreaterThan(0)
    expect(mockSandbox.kill).toHaveBeenCalled()
  })

  it('should handle sandbox crash gracefully', async () => {
    ;(Sandbox.create as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Sandbox quota exceeded'))

    const result = await verifyLoad([], 'node')
    expect(result.success).toBe(false)
    expect(result.evidence).toContain('Sandbox quota exceeded')
  })

  describe('k6 output parsing', () => {
    it('should detect connection refused as API bottleneck', async () => {
      const mockSandbox = {
        files: { write: vi.fn() },
        commands: {
          run: vi.fn()
            .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' })
            .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' })
            .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' })
            .mockResolvedValueOnce({ exitCode: 0, stdout: 'ready', stderr: '' })
            .mockResolvedValueOnce({ exitCode: 1, stdout: 'ECONNREFUSED connection refused to localhost:3000\nhttp_reqs...: 50\nhttp_req_failed...: 80.00%', stderr: '' }),
        },
        kill: vi.fn(),
      }
      ;(Sandbox.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockSandbox)

      const files = [makeFile('package.json', '{"scripts": {"start": "node index.js"}}')]
      const result = await verifyLoad(files, 'node', { startCommand: 'node index.js' })

      expect(result.bottleneck.component).toBe('api')
      expect(result.bottleneck.errorType).toContain('connection')
    })

    it('should detect database bottleneck from connection pool errors', async () => {
      const mockSandbox = {
        files: { write: vi.fn() },
        commands: {
          run: vi.fn()
            .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' })
            .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' })
            .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' })
            .mockResolvedValueOnce({ exitCode: 0, stdout: 'ready', stderr: '' })
            .mockResolvedValueOnce({ exitCode: 0, stdout: 'too many connections error\nconnection pool exhausted\nhttp_reqs...: 500\nhttp_req_failed...: 15.00%', stderr: '' }),
        },
        kill: vi.fn(),
      }
      ;(Sandbox.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockSandbox)

      const files = [makeFile('package.json', '{"scripts": {"start": "node index.js"}}')]
      const result = await verifyLoad(files, 'node', { startCommand: 'node index.js' })

      expect(result.bottleneck.component).toBe('database')
    })

    it('should detect high latency as CPU bottleneck', async () => {
      const mockSandbox = {
        files: { write: vi.fn() },
        commands: {
          run: vi.fn()
            .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' })
            .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' })
            .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' })
            .mockResolvedValueOnce({ exitCode: 0, stdout: 'ready', stderr: '' })
            .mockResolvedValueOnce({ exitCode: 0, stdout: 'http_reqs...: 200\nhttp_req_failed...: 1.00%\nmed=2500.0\np(95)=8000.0\np(99)=12000.0', stderr: '' }),
        },
        kill: vi.fn(),
      }
      ;(Sandbox.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockSandbox)

      const files = [makeFile('package.json', '{"scripts": {"start": "node index.js"}}')]
      const result = await verifyLoad(files, 'node', { startCommand: 'node index.js' })

      expect(result.bottleneck.component).toBe('cpu')
      expect(result.bottleneck.errorType).toContain('p95')
    })

    it('should handle zero requests as failed', async () => {
      const mockSandbox = {
        files: { write: vi.fn() },
        commands: {
          run: vi.fn()
            .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' })
            .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' })
            .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' })
            .mockResolvedValueOnce({ exitCode: 0, stdout: 'ready', stderr: '' })
            .mockResolvedValueOnce({ exitCode: 1, stdout: '', stderr: 'k6 crashed' }),
        },
        kill: vi.fn(),
      }
      ;(Sandbox.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockSandbox)

      const files = [makeFile('package.json', '{"scripts": {"start": "node index.js"}}')]
      const result = await verifyLoad(files, 'node', { startCommand: 'node index.js' })

      expect(result.success).toBe(false)
      expect(result.maxConcurrentUsers).toBe(0)
    })
  })

  it('should always cleanup sandbox even on error', async () => {
    const mockKill = vi.fn()
    const mockSandbox = {
      files: { write: vi.fn().mockRejectedValue(new Error('Write failed')) },
      commands: { run: vi.fn() },
      kill: mockKill,
    }
    ;(Sandbox.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockSandbox)

    await verifyLoad([makeFile('package.json', '{}')], 'node', { startCommand: 'node index.js' })
    expect(mockKill).toHaveBeenCalled()
  })
})

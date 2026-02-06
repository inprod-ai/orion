import { describe, it, expect, vi, beforeEach } from 'vitest'
import { verifyCompilation } from '@/lib/orion/verifiers/compile'
import type { RepoFile, TechStack } from '@/lib/orion/types'

// Mock E2B
vi.mock('e2b', () => ({
  Sandbox: {
    create: vi.fn()
  }
}))

import { Sandbox } from 'e2b'

describe('verifyCompilation', () => {
  const mockSandbox = {
    files: {
      write: vi.fn().mockResolvedValue(undefined)
    },
    commands: {
      run: vi.fn()
    },
    kill: vi.fn().mockResolvedValue(undefined)
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(Sandbox.create).mockResolvedValue(mockSandbox as unknown as Awaited<ReturnType<typeof Sandbox.create>>)
  })

  describe('when E2B is not configured', () => {
    it('returns error when E2B_API_KEY is not set', async () => {
      const originalEnv = process.env.E2B_API_KEY
      delete process.env.E2B_API_KEY

      const files: RepoFile[] = [
        { path: 'index.ts', content: 'console.log("hello")', size: 20 }
      ]
      const stack: TechStack = {
        platform: 'web',
        languages: ['typescript'],
        frameworks: [],
        packageManager: 'npm',
        database: null,
        testFramework: null,
        ciProvider: null,
        deploymentPlatform: null,
        maturityLevel: 'prototype'
      }

      const result = await verifyCompilation(files, stack)

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toContain('E2B_API_KEY not configured')

      process.env.E2B_API_KEY = originalEnv
    })
  })

  describe('when E2B is configured', () => {
    beforeEach(() => {
      process.env.E2B_API_KEY = 'test-key'
    })

    it('creates sandbox for Node.js projects', async () => {
      mockSandbox.commands.run.mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: ''
      })

      const files: RepoFile[] = [
        { path: 'package.json', content: '{"name":"test","scripts":{"build":"tsc"}}', size: 50 },
        { path: 'index.ts', content: 'console.log("hello")', size: 20 }
      ]
      const stack: TechStack = {
        platform: 'web',
        languages: ['typescript'],
        frameworks: [],
        packageManager: 'npm',
        database: null,
        testFramework: null,
        ciProvider: null,
        deploymentPlatform: null,
        maturityLevel: 'prototype'
      }

      await verifyCompilation(files, stack)

      // E2B base sandbox used (no template ID)
      expect(Sandbox.create).toHaveBeenCalledWith(expect.objectContaining({ timeoutMs: expect.any(Number) }))
    })

    it('creates sandbox for Python projects', async () => {
      mockSandbox.commands.run.mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: ''
      })

      const files: RepoFile[] = [
        { path: 'requirements.txt', content: 'flask==2.0.0', size: 20 },
        { path: 'app.py', content: 'print("hello")', size: 15 }
      ]
      const stack: TechStack = {
        platform: 'backend',
        languages: ['python'],
        frameworks: ['flask'],
        packageManager: 'pip',
        database: null,
        testFramework: null,
        ciProvider: null,
        deploymentPlatform: null,
        maturityLevel: 'prototype'
      }

      await verifyCompilation(files, stack)

      expect(Sandbox.create).toHaveBeenCalledWith(expect.objectContaining({ timeoutMs: expect.any(Number) }))
    })

    it('creates sandbox for Go projects', async () => {
      mockSandbox.commands.run.mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: ''
      })

      const files: RepoFile[] = [
        { path: 'go.mod', content: 'module test', size: 15 },
        { path: 'main.go', content: 'package main', size: 12 }
      ]
      const stack: TechStack = {
        platform: 'cli',
        languages: ['go'],
        frameworks: [],
        packageManager: 'go',
        database: null,
        testFramework: null,
        ciProvider: null,
        deploymentPlatform: null,
        maturityLevel: 'prototype'
      }

      await verifyCompilation(files, stack)

      expect(Sandbox.create).toHaveBeenCalledWith(expect.objectContaining({ timeoutMs: expect.any(Number) }))
    })

    it('writes all files to sandbox', async () => {
      mockSandbox.commands.run.mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: ''
      })

      const files: RepoFile[] = [
        { path: 'package.json', content: '{}', size: 2 },
        { path: 'src/index.ts', content: 'export {}', size: 10 },
        { path: 'src/utils.ts', content: 'export {}', size: 10 }
      ]
      const stack: TechStack = {
        platform: 'web',
        languages: ['typescript'],
        frameworks: [],
        packageManager: 'npm',
        database: null,
        testFramework: null,
        ciProvider: null,
        deploymentPlatform: null,
        maturityLevel: 'prototype'
      }

      await verifyCompilation(files, stack)

      expect(mockSandbox.files.write).toHaveBeenCalledTimes(3)
      expect(mockSandbox.files.write).toHaveBeenCalledWith('/app/package.json', '{}')
      expect(mockSandbox.files.write).toHaveBeenCalledWith('/app/src/index.ts', 'export {}')
    })

    it('runs npm install when package.json exists', async () => {
      mockSandbox.commands.run.mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: ''
      })

      const files: RepoFile[] = [
        { path: 'package.json', content: '{"name":"test"}', size: 20 }
      ]
      const stack: TechStack = {
        platform: 'web',
        languages: ['typescript'],
        frameworks: [],
        packageManager: 'npm',
        database: null,
        testFramework: null,
        ciProvider: null,
        deploymentPlatform: null,
        maturityLevel: 'prototype'
      }

      await verifyCompilation(files, stack)

      expect(mockSandbox.commands.run).toHaveBeenCalledWith(
        'npm install',
        expect.objectContaining({ cwd: '/app' })
      )
    })

    it('runs pnpm install when pnpm-lock.yaml exists', async () => {
      mockSandbox.commands.run.mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: ''
      })

      const files: RepoFile[] = [
        { path: 'package.json', content: '{"name":"test"}', size: 20 },
        { path: 'pnpm-lock.yaml', content: 'lockfileVersion: 5.4', size: 20 }
      ]
      const stack: TechStack = {
        platform: 'web',
        languages: ['typescript'],
        frameworks: [],
        packageManager: 'pnpm',
        database: null,
        testFramework: null,
        ciProvider: null,
        deploymentPlatform: null,
        maturityLevel: 'prototype'
      }

      await verifyCompilation(files, stack)

      expect(mockSandbox.commands.run).toHaveBeenCalledWith(
        'pnpm install --frozen-lockfile',
        expect.objectContaining({ cwd: '/app' })
      )
    })

    it('runs build script when present in package.json', async () => {
      mockSandbox.commands.run.mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: ''
      })

      const files: RepoFile[] = [
        { path: 'package.json', content: '{"name":"test","scripts":{"build":"tsc"}}', size: 50 }
      ]
      const stack: TechStack = {
        platform: 'web',
        languages: ['typescript'],
        frameworks: [],
        packageManager: 'npm',
        database: null,
        testFramework: null,
        ciProvider: null,
        deploymentPlatform: null,
        maturityLevel: 'prototype'
      }

      await verifyCompilation(files, stack)

      // Should run install then build
      expect(mockSandbox.commands.run).toHaveBeenCalledWith(
        'npm run build',
        expect.objectContaining({ cwd: '/app' })
      )
    })

    it('returns success when build succeeds', async () => {
      mockSandbox.commands.run.mockResolvedValue({
        exitCode: 0,
        stdout: 'Build successful',
        stderr: ''
      })

      const files: RepoFile[] = [
        { path: 'package.json', content: '{"name":"test","scripts":{"build":"tsc"}}', size: 50 }
      ]
      const stack: TechStack = {
        platform: 'web',
        languages: ['typescript'],
        frameworks: [],
        packageManager: 'npm',
        database: null,
        testFramework: null,
        ciProvider: null,
        deploymentPlatform: null,
        maturityLevel: 'prototype'
      }

      const result = await verifyCompilation(files, stack)

      expect(result.success).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.evidence).toContain('Build successful')
    })

    it('returns failure with parsed errors when build fails', async () => {
      mockSandbox.commands.run
        .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' }) // install
        .mockResolvedValueOnce({
          exitCode: 1,
          stdout: '',
          stderr: 'src/index.ts(10,5): error TS2304: Cannot find name \'foo\'.'
        }) // build

      const files: RepoFile[] = [
        { path: 'package.json', content: '{"name":"test","scripts":{"build":"tsc"}}', size: 50 },
        { path: 'src/index.ts', content: 'console.log(foo)', size: 20 }
      ]
      const stack: TechStack = {
        platform: 'web',
        languages: ['typescript'],
        frameworks: [],
        packageManager: 'npm',
        database: null,
        testFramework: null,
        ciProvider: null,
        deploymentPlatform: null,
        maturityLevel: 'prototype'
      }

      const result = await verifyCompilation(files, stack)

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0].file).toBe('src/index.ts')
      expect(result.errors[0].line).toBe(10)
      expect(result.errors[0].message).toContain('Cannot find name')
    })

    it('kills sandbox after completion', async () => {
      mockSandbox.commands.run.mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: ''
      })

      const files: RepoFile[] = [
        { path: 'package.json', content: '{}', size: 2 }
      ]
      const stack: TechStack = {
        platform: 'web',
        languages: ['typescript'],
        frameworks: [],
        packageManager: 'npm',
        database: null,
        testFramework: null,
        ciProvider: null,
        deploymentPlatform: null,
        maturityLevel: 'prototype'
      }

      await verifyCompilation(files, stack)

      expect(mockSandbox.kill).toHaveBeenCalled()
    })

    it('kills sandbox even on error', async () => {
      mockSandbox.commands.run.mockRejectedValue(new Error('Sandbox crashed'))

      const files: RepoFile[] = [
        { path: 'package.json', content: '{}', size: 2 }
      ]
      const stack: TechStack = {
        platform: 'web',
        languages: ['typescript'],
        frameworks: [],
        packageManager: 'npm',
        database: null,
        testFramework: null,
        ciProvider: null,
        deploymentPlatform: null,
        maturityLevel: 'prototype'
      }

      await verifyCompilation(files, stack)

      expect(mockSandbox.kill).toHaveBeenCalled()
    })
  })

  describe('error parsing', () => {
    beforeEach(() => {
      process.env.E2B_API_KEY = 'test-key'
    })

    it('parses TypeScript errors correctly', async () => {
      mockSandbox.commands.run
        .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' })
        .mockResolvedValueOnce({
          exitCode: 1,
          stdout: '',
          stderr: `src/utils.ts(25,10): error TS2339: Property 'foo' does not exist on type 'Bar'.
src/index.ts(5,1): warning TS6133: 'unused' is declared but never used.`
        })

      const files: RepoFile[] = [
        { path: 'package.json', content: '{"scripts":{"build":"tsc"}}', size: 30 }
      ]
      const stack: TechStack = {
        platform: 'web',
        languages: ['typescript'],
        frameworks: [],
        packageManager: 'npm',
        database: null,
        testFramework: null,
        ciProvider: null,
        deploymentPlatform: null,
        maturityLevel: 'prototype'
      }

      const result = await verifyCompilation(files, stack)

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toMatchObject({
        file: 'src/utils.ts',
        line: 25,
        column: 10,
        severity: 'error'
      })

      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0]).toMatchObject({
        file: 'src/index.ts',
        line: 5,
        column: 1,
        severity: 'warning'
      })
    })

    it('parses Go errors correctly', async () => {
      mockSandbox.commands.run
        .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' })
        .mockResolvedValueOnce({
          exitCode: 1,
          stdout: '',
          stderr: './main.go:15:8: undefined: foo'
        })

      const files: RepoFile[] = [
        { path: 'go.mod', content: 'module test', size: 12 },
        { path: 'main.go', content: 'package main', size: 12 }
      ]
      const stack: TechStack = {
        platform: 'cli',
        languages: ['go'],
        frameworks: [],
        packageManager: 'go',
        database: null,
        testFramework: null,
        ciProvider: null,
        deploymentPlatform: null,
        maturityLevel: 'prototype'
      }

      const result = await verifyCompilation(files, stack)

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toMatchObject({
        file: 'main.go',
        line: 15,
        column: 8,
        message: 'undefined: foo'
      })
    })
  })
})

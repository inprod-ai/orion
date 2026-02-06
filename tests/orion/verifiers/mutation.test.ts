// =============================================================================
// MUTATION VERIFIER - Adversarial tests
// =============================================================================
// Tests Stryker output parsing, config generation, edge cases.

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('e2b', () => ({
  Sandbox: { create: vi.fn() },
}))

import { verifyMutations } from '@/lib/orion/verifiers/mutation'
import { Sandbox } from 'e2b'
import type { RepoFile } from '@/lib/orion/types'

const makeFile = (path: string, content: string): RepoFile => ({
  path, content, size: content.length,
})

beforeEach(() => {
  vi.clearAllMocks()
  process.env.E2B_API_KEY = 'test-key'
})

describe('verifyMutations', () => {
  it('should return error when no E2B key', async () => {
    delete process.env.E2B_API_KEY
    const result = await verifyMutations([])
    expect(result.success).toBe(false)
    expect(result.score).toBe(0)
  })

  it('should return error when no source files to mutate', async () => {
    const mockSandbox = {
      files: { write: vi.fn(), read: vi.fn() },
      commands: {
        run: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' }),
      },
      kill: vi.fn(),
    }
    ;(Sandbox.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockSandbox)

    // Only test files, no source files
    const files = [
      makeFile('tests/foo.test.ts', 'test("foo", () => {})'),
      makeFile('package.json', '{"dependencies": {"vitest": "^1.0.0"}}'),
    ]

    const result = await verifyMutations(files)
    expect(result.success).toBe(false)
    expect(result.evidence).toContain('No source files')
  })

  it('should prioritize API routes over components', async () => {
    const mockSandbox = {
      files: { write: vi.fn(), read: vi.fn().mockRejectedValue(new Error('No report')) },
      commands: {
        run: vi.fn().mockResolvedValue({ exitCode: 0, stdout: 'Mutation score: 75.00%\nKilled: 30\nSurvived: 10', stderr: '' }),
      },
      kill: vi.fn(),
    }
    ;(Sandbox.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockSandbox)

    const files = [
      makeFile('package.json', '{"dependencies": {"vitest": "^1.0.0"}}'),
      makeFile('components/Button.tsx', 'export default function Button() {}'),
      makeFile('app/api/auth/route.ts', 'export async function POST() {}'),
      makeFile('lib/utils.ts', 'export function helper() {}'),
    ]

    const result = await verifyMutations(files)

    // Check the Stryker config written to sandbox
    const configCall = mockSandbox.files.write.mock.calls.find(
      (c: [string, string]) => c[0] === '/app/stryker.config.json'
    )
    expect(configCall).toBeDefined()
    const config = JSON.parse(configCall![1])

    // API route should come before component
    const apiIndex = config.mutate.indexOf('app/api/auth/route.ts')
    const componentIndex = config.mutate.indexOf('components/Button.tsx')
    expect(apiIndex).toBeLessThan(componentIndex)
  })

  it('should detect vitest vs jest from dependencies', async () => {
    const mockSandbox = {
      files: { write: vi.fn(), read: vi.fn().mockRejectedValue(new Error()) },
      commands: {
        run: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' }),
      },
      kill: vi.fn(),
    }
    ;(Sandbox.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockSandbox)

    // Jest project
    const files = [
      makeFile('package.json', '{"devDependencies": {"jest": "^29.0.0"}}'),
      makeFile('src/index.ts', 'export const x = 1'),
    ]

    await verifyMutations(files)

    const configCall = mockSandbox.files.write.mock.calls.find(
      (c: [string, string]) => c[0] === '/app/stryker.config.json'
    )
    const config = JSON.parse(configCall![1])
    expect(config.testRunner).toBe('jest')
  })

  it('should parse Stryker JSON report correctly', async () => {
    const strykerReport = JSON.stringify({
      files: {
        'src/auth.ts': {
          mutants: [
            { status: 'Killed', killedBy: ['test1'] },
            { status: 'Killed', killedBy: ['test2'] },
            { status: 'Survived' },
          ],
        },
        'src/db.ts': {
          mutants: [
            { status: 'Killed', killedBy: ['test3'] },
            { status: 'NoCoverage' },
            { status: 'Survived' },
            { status: 'Survived' },
            { status: 'Survived' },
          ],
        },
      },
    })

    const mockSandbox = {
      files: {
        write: vi.fn(),
        read: vi.fn().mockResolvedValue(strykerReport),
      },
      commands: {
        run: vi.fn().mockResolvedValue({ exitCode: 0, stdout: 'Mutation testing done', stderr: '' }),
      },
      kill: vi.fn(),
    }
    ;(Sandbox.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockSandbox)

    const files = [
      makeFile('package.json', '{"dependencies": {"vitest": "^1.0.0"}}'),
      makeFile('src/auth.ts', 'export function auth() {}'),
      makeFile('src/db.ts', 'export function db() {}'),
    ]

    const result = await verifyMutations(files)

    expect(result.success).toBe(true)
    expect(result.killed).toBe(3) // 2 from auth, 1 from db
    expect(result.survived).toBe(4) // 1 from auth, 3 from db
    expect(result.noCoverage).toBe(1)
    expect(result.totalMutants).toBe(8)
    expect(result.score).toBe(38) // 3/8 = 37.5 -> 38

    // db.ts should be flagged as weak (3 survived > threshold of 2)
    expect(result.weakTests.length).toBe(1)
    expect(result.weakTests[0].file).toBe('src/db.ts')
    expect(result.weakTests[0].survivingMutants).toBe(3)
  })

  it('should parse clear-text output when no JSON report', async () => {
    const mockSandbox = {
      files: {
        write: vi.fn(),
        read: vi.fn().mockRejectedValue(new Error('File not found')),
      },
      commands: {
        run: vi.fn().mockResolvedValue({
          exitCode: 0,
          stdout: `
All mutants have been tested.
Mutation score: 82.35%
Killed: 14
Survived: 3
Timeout: 0
NoCoverage: 0
`,
          stderr: '',
        }),
      },
      kill: vi.fn(),
    }
    ;(Sandbox.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockSandbox)

    const files = [
      makeFile('package.json', '{"dependencies": {"vitest": "^1.0.0"}}'),
      makeFile('src/index.ts', 'export const x = 1'),
    ]

    const result = await verifyMutations(files)
    expect(result.success).toBe(true)
    expect(result.score).toBe(82)
    expect(result.killed).toBe(14)
    expect(result.survived).toBe(3)
  })

  it('should handle malformed package.json', async () => {
    const mockSandbox = {
      files: { write: vi.fn(), read: vi.fn().mockRejectedValue(new Error()) },
      commands: {
        run: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' }),
      },
      kill: vi.fn(),
    }
    ;(Sandbox.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockSandbox)

    const files = [
      makeFile('package.json', '{{{invalid json'),
      makeFile('src/index.ts', 'export const x = 1'),
    ]

    // Should not crash -- JSON.parse throws but is inside try/catch
    const result = await verifyMutations(files)
    expect(result).toBeDefined()
  })

  it('should filter out config files and test files from mutation targets', async () => {
    const mockSandbox = {
      files: { write: vi.fn(), read: vi.fn().mockRejectedValue(new Error()) },
      commands: {
        run: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' }),
      },
      kill: vi.fn(),
    }
    ;(Sandbox.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockSandbox)

    const files = [
      makeFile('package.json', '{"dependencies": {"vitest": "^1.0.0"}}'),
      makeFile('vitest.config.ts', 'export default {}'),
      makeFile('next.config.js', 'module.exports = {}'),
      makeFile('src/index.test.ts', 'test("x", () => {})'),
      makeFile('src/index.spec.ts', 'describe("x", () => {})'),
      makeFile('src/real-code.ts', 'export function main() {}'),
    ]

    await verifyMutations(files)

    const configCall = mockSandbox.files.write.mock.calls.find(
      (c: [string, string]) => c[0] === '/app/stryker.config.json'
    )
    const config = JSON.parse(configCall![1])

    expect(config.mutate).toContain('src/real-code.ts')
    expect(config.mutate).not.toContain('vitest.config.ts')
    expect(config.mutate).not.toContain('next.config.js')
    expect(config.mutate).not.toContain('src/index.test.ts')
    expect(config.mutate).not.toContain('src/index.spec.ts')
  })

  it('should cap mutation targets at MAX_MUTATE_FILES', async () => {
    const mockSandbox = {
      files: { write: vi.fn(), read: vi.fn().mockRejectedValue(new Error()) },
      commands: {
        run: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' }),
      },
      kill: vi.fn(),
    }
    ;(Sandbox.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockSandbox)

    // 50 source files
    const files = [
      makeFile('package.json', '{"dependencies": {"vitest": "^1.0.0"}}'),
      ...Array.from({ length: 50 }, (_, i) =>
        makeFile(`src/module${i}.ts`, `export const m${i} = ${i}`)
      ),
    ]

    await verifyMutations(files)

    const configCall = mockSandbox.files.write.mock.calls.find(
      (c: [string, string]) => c[0] === '/app/stryker.config.json'
    )
    const config = JSON.parse(configCall![1])

    expect(config.mutate.length).toBeLessThanOrEqual(15) // MAX_MUTATE_FILES
  })

  it('should always cleanup sandbox', async () => {
    const mockKill = vi.fn()
    ;(Sandbox.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      files: { write: vi.fn().mockRejectedValue(new Error('disk full')), read: vi.fn() },
      commands: { run: vi.fn() },
      kill: mockKill,
    })

    await verifyMutations([makeFile('src/x.ts', ''), makeFile('package.json', '{}')])
    expect(mockKill).toHaveBeenCalled()
  })
})

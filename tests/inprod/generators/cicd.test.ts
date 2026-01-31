// =============================================================================
// CI/CD GENERATOR TESTS
// =============================================================================

import { describe, it, expect } from 'vitest'
import { generateCICD } from '@/lib/inprod/generators/cicd'
import type { RepoContext, Gap } from '@/lib/inprod/types'

function createMockContext(overrides: Partial<RepoContext> = {}): RepoContext {
  return {
    files: [],
    techStack: {
      platform: 'web',
      languages: ['typescript'],
      frameworks: ['next.js'],
      packageManager: 'npm',
      database: null,
      testFramework: null,
      ciProvider: null,
      deploymentPlatform: null,
      maturityLevel: 'mvp',
    },
    packageJson: {
      name: 'test-project',
      scripts: {},
    },
    ...overrides,
  }
}

const NO_CI_GAP: Gap = {
  id: 'deploy-no-ci',
  category: 'deployment',
  title: 'No CI/CD',
  description: 'No CI/CD pipeline detected',
  severity: 'critical',
  confidence: 'proven',
  fixType: 'instant',
}

describe('generateCICD', () => {
  describe('respects package.json scripts', () => {
    it('should not generate lint step when lint script does not exist', async () => {
      const ctx = createMockContext({
        packageJson: { name: 'test', scripts: { build: 'tsc', test: 'vitest' } },
      })
      
      const files = await generateCICD(ctx, [NO_CI_GAP])
      const ciFile = files.find(f => f.path === '.github/workflows/ci.yml')
      
      expect(ciFile).toBeDefined()
      expect(ciFile!.content).not.toContain('npm run lint')
      expect(ciFile!.content).not.toContain('Run ESLint')
    })

    it('should not generate typecheck step when typecheck script does not exist', async () => {
      const ctx = createMockContext({
        packageJson: { name: 'test', scripts: { build: 'tsc' } },
        techStack: {
          platform: 'cli',
          languages: ['javascript'], // Not TypeScript
          frameworks: [],
          packageManager: 'npm',
          database: null,
          testFramework: null,
          ciProvider: null,
          deploymentPlatform: null,
          maturityLevel: 'mvp',
        },
      })
      
      const files = await generateCICD(ctx, [NO_CI_GAP])
      const ciFile = files.find(f => f.path === '.github/workflows/ci.yml')
      
      expect(ciFile).toBeDefined()
      // Should not have typecheck since no script and not TypeScript
      expect(ciFile!.content).not.toContain('npm run typecheck')
    })

    it('should use npx tsc --noEmit for TypeScript repos without typecheck script', async () => {
      const ctx = createMockContext({
        packageJson: { name: 'test', scripts: { build: 'tsc' } },
        techStack: {
          platform: 'cli',
          languages: ['typescript'],
          frameworks: [],
          packageManager: 'npm',
          database: null,
          testFramework: null,
          ciProvider: null,
          deploymentPlatform: null,
          maturityLevel: 'mvp',
        },
      })
      
      const files = await generateCICD(ctx, [NO_CI_GAP])
      const ciFile = files.find(f => f.path === '.github/workflows/ci.yml')
      
      expect(ciFile).toBeDefined()
      expect(ciFile!.content).toContain('npx tsc --noEmit')
      expect(ciFile!.content).not.toContain('npm run typecheck')
    })

    it('should not generate test job when test script does not exist', async () => {
      const ctx = createMockContext({
        packageJson: { name: 'test', scripts: { build: 'tsc' } },
      })
      
      const files = await generateCICD(ctx, [NO_CI_GAP])
      const ciFile = files.find(f => f.path === '.github/workflows/ci.yml')
      
      expect(ciFile).toBeDefined()
      expect(ciFile!.content).not.toContain('npm run test')
      expect(ciFile!.content).not.toContain('Run Tests')
    })

    it('should not generate build job when build script does not exist', async () => {
      const ctx = createMockContext({
        packageJson: { name: 'test', scripts: { test: 'vitest' } },
      })
      
      const files = await generateCICD(ctx, [NO_CI_GAP])
      const ciFile = files.find(f => f.path === '.github/workflows/ci.yml')
      
      expect(ciFile).toBeDefined()
      expect(ciFile!.content).not.toContain('npm run build')
      expect(ciFile!.content).not.toContain('name: Build')
    })

    it('should generate all jobs when all scripts exist', async () => {
      const ctx = createMockContext({
        packageJson: {
          name: 'test',
          scripts: {
            lint: 'eslint .',
            typecheck: 'tsc --noEmit',
            test: 'vitest',
            build: 'next build',
          },
        },
      })
      
      const files = await generateCICD(ctx, [NO_CI_GAP])
      const ciFile = files.find(f => f.path === '.github/workflows/ci.yml')
      
      expect(ciFile).toBeDefined()
      expect(ciFile!.content).toContain('npm run lint')
      expect(ciFile!.content).toContain('npm run typecheck')
      expect(ciFile!.content).toContain('npm run test')
      expect(ciFile!.content).toContain('npm run build')
    })

    it('should generate minimal install job when no scripts exist', async () => {
      const ctx = createMockContext({
        packageJson: { name: 'test', scripts: {} },
        techStack: {
          platform: 'cli',
          languages: ['javascript'], // Not TypeScript
          frameworks: [],
          packageManager: 'npm',
          database: null,
          testFramework: null,
          ciProvider: null,
          deploymentPlatform: null,
          maturityLevel: 'mvp',
        },
      })
      
      const files = await generateCICD(ctx, [NO_CI_GAP])
      const ciFile = files.find(f => f.path === '.github/workflows/ci.yml')
      
      expect(ciFile).toBeDefined()
      expect(ciFile!.content).toContain('Install Dependencies')
      expect(ciFile!.content).toContain('npm ci')
    })

    it('should handle missing packageJson gracefully', async () => {
      const ctx = createMockContext({
        packageJson: undefined,
        techStack: {
          platform: 'cli',
          languages: ['javascript'],
          frameworks: [],
          packageManager: 'npm',
          database: null,
          testFramework: null,
          ciProvider: null,
          deploymentPlatform: null,
          maturityLevel: 'mvp',
        },
      })
      
      const files = await generateCICD(ctx, [NO_CI_GAP])
      const ciFile = files.find(f => f.path === '.github/workflows/ci.yml')
      
      expect(ciFile).toBeDefined()
      // Should not crash, should generate minimal install job
      expect(ciFile!.content).toContain('Install Dependencies')
    })

    it('should use correct commands for pnpm', async () => {
      const ctx = createMockContext({
        techStack: {
          platform: 'web',
          languages: ['typescript'],
          frameworks: ['next.js'],
          packageManager: 'pnpm',
          database: null,
          testFramework: null,
          ciProvider: null,
          deploymentPlatform: null,
          maturityLevel: 'mvp',
        },
        packageJson: {
          name: 'test',
          scripts: { lint: 'eslint .', build: 'next build' },
        },
      })
      
      const files = await generateCICD(ctx, [NO_CI_GAP])
      const ciFile = files.find(f => f.path === '.github/workflows/ci.yml')
      
      expect(ciFile).toBeDefined()
      expect(ciFile!.content).toContain('pnpm install')
      expect(ciFile!.content).toContain('pnpm lint')
      expect(ciFile!.content).toContain('pnpm build')
    })

    it('should use correct commands for yarn', async () => {
      const ctx = createMockContext({
        techStack: {
          platform: 'web',
          languages: ['typescript'],
          frameworks: ['next.js'],
          packageManager: 'yarn',
          database: null,
          testFramework: null,
          ciProvider: null,
          deploymentPlatform: null,
          maturityLevel: 'mvp',
        },
        packageJson: {
          name: 'test',
          scripts: { test: 'vitest', build: 'next build' },
        },
      })
      
      const files = await generateCICD(ctx, [NO_CI_GAP])
      const ciFile = files.find(f => f.path === '.github/workflows/ci.yml')
      
      expect(ciFile).toBeDefined()
      expect(ciFile!.content).toContain('yarn install --frozen-lockfile')
      expect(ciFile!.content).toContain('yarn test')
      expect(ciFile!.content).toContain('yarn build')
    })
  })

  describe('build job dependencies', () => {
    it('should depend on lint and test when both exist', async () => {
      const ctx = createMockContext({
        packageJson: {
          name: 'test',
          scripts: { lint: 'eslint .', test: 'vitest', build: 'tsc' },
        },
      })
      
      const files = await generateCICD(ctx, [NO_CI_GAP])
      const ciFile = files.find(f => f.path === '.github/workflows/ci.yml')
      
      expect(ciFile).toBeDefined()
      expect(ciFile!.content).toContain('needs: [lint, test]')
    })

    it('should depend only on lint when test does not exist', async () => {
      const ctx = createMockContext({
        packageJson: {
          name: 'test',
          scripts: { lint: 'eslint .', build: 'tsc' },
        },
      })
      
      const files = await generateCICD(ctx, [NO_CI_GAP])
      const ciFile = files.find(f => f.path === '.github/workflows/ci.yml')
      
      expect(ciFile).toBeDefined()
      expect(ciFile!.content).toContain('needs: [lint]')
      expect(ciFile!.content).not.toContain('needs: [lint, test]')
    })

    it('should depend only on test when lint does not exist', async () => {
      const ctx = createMockContext({
        packageJson: {
          name: 'test',
          scripts: { test: 'vitest', build: 'tsc' },
        },
        techStack: {
          platform: 'cli',
          languages: ['javascript'], // No TypeScript fallback
          frameworks: [],
          packageManager: 'npm',
          database: null,
          testFramework: null,
          ciProvider: null,
          deploymentPlatform: null,
          maturityLevel: 'mvp',
        },
      })
      
      const files = await generateCICD(ctx, [NO_CI_GAP])
      const ciFile = files.find(f => f.path === '.github/workflows/ci.yml')
      
      expect(ciFile).toBeDefined()
      expect(ciFile!.content).toContain('needs: [test]')
    })

    it('should have no dependencies when neither lint nor test exist', async () => {
      const ctx = createMockContext({
        packageJson: {
          name: 'test',
          scripts: { build: 'tsc' },
        },
        techStack: {
          platform: 'cli',
          languages: ['javascript'],
          frameworks: [],
          packageManager: 'npm',
          database: null,
          testFramework: null,
          ciProvider: null,
          deploymentPlatform: null,
          maturityLevel: 'mvp',
        },
      })
      
      const files = await generateCICD(ctx, [NO_CI_GAP])
      const ciFile = files.find(f => f.path === '.github/workflows/ci.yml')
      
      expect(ciFile).toBeDefined()
      expect(ciFile!.content).not.toContain('needs:')
    })
  })
})

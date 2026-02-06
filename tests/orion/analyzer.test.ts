import { describe, it, expect } from 'vitest'
import {
  analyzeCompleteness,
  analyzeRepository,
  formatAnalysisSummary,
  getInstantFixGaps,
  generateCompletionPlan,
  getAltitudeSummary,
} from '@/lib/orion/analyzer'
import { detectTechStack } from '@/lib/orion/stack-detector'
import type { RepoFile, RepoContext } from '@/lib/orion/types'

// Test fixtures
function createPackageJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    name: 'test-app',
    dependencies: { next: '^14.0.0', react: '^18.0.0' },
    devDependencies: {},
    ...overrides,
  })
}

const minimalNextJsFiles: RepoFile[] = [
  { path: 'package.json', content: createPackageJson(), size: 100 },
  { path: 'app/page.tsx', content: 'export default function Home() { return <div>Hello</div> }', size: 60 },
]

const productionReadyFiles: RepoFile[] = [
  {
    path: 'package.json',
    content: createPackageJson({
      dependencies: { next: '^14.0.0', react: '^18.0.0', '@prisma/client': '^5.0.0' },
      devDependencies: { vitest: '^1.0.0', typescript: '^5.0.0' },
    }),
    size: 300,
  },
  { path: 'app/page.tsx', content: 'export default function Home() {}', size: 60 },
  { path: 'prisma/schema.prisma', content: 'model User { id String @id }', size: 100 },
  { path: 'vitest.config.ts', content: 'export default {}', size: 20 },
  { path: 'tests/app.test.ts', content: 'test("works", () => expect(true).toBe(true))', size: 50 },
  { path: '.github/workflows/ci.yml', content: 'name: CI\non: push', size: 200 },
  { path: 'vercel.json', content: '{}', size: 10 },
  { path: '.env.example', content: 'DATABASE_URL=', size: 20 },
]

function createContext(files: RepoFile[]): RepoContext {
  const packageJsonFile = files.find(f => f.path === 'package.json')
  let packageJson: Record<string, unknown> | undefined
  try {
    packageJson = packageJsonFile ? JSON.parse(packageJsonFile.content) : undefined
  } catch {
    packageJson = undefined
  }
  const readmeFile = files.find(f => f.path.toLowerCase() === 'readme.md')
  const techStack = detectTechStack(files)
  return { files, techStack, packageJson, readme: readmeFile?.content }
}

describe('analyzeRepository', () => {
  it('should return 12 category scores', () => {
    const result = analyzeRepository(createContext(minimalNextJsFiles))
    expect(result.categories).toHaveLength(12)
  })

  it('should calculate overall score between 0 and 100', () => {
    const result = analyzeRepository(createContext(minimalNextJsFiles))
    expect(result.overallScore).toBeGreaterThanOrEqual(0)
    expect(result.overallScore).toBeLessThanOrEqual(100)
  })

  it('should count gaps by severity correctly', () => {
    const result = analyzeRepository(createContext(minimalNextJsFiles))
    const allGaps = result.categories.flatMap(c => c.gaps)
    expect(result.totalGaps).toBe(allGaps.length)
    expect(result.blockerCount).toBe(allGaps.filter(g => g.severity === 'blocker').length)
    expect(result.criticalCount).toBe(allGaps.filter(g => g.severity === 'critical').length)
  })

  it('should include altitude calculation', () => {
    const result = analyzeRepository(createContext(minimalNextJsFiles))
    expect(result.altitude).toBeDefined()
    expect(result.altitude.maxUsers).toBeGreaterThanOrEqual(0)
    expect(result.altitude.bottleneck).toBeDefined()
    expect(result.altitudeProgress).toBeGreaterThanOrEqual(0)
    expect(result.altitudeProgress).toBeLessThanOrEqual(100)
  })

  it('should give higher score for production-ready repos', () => {
    const minimal = analyzeRepository(createContext(minimalNextJsFiles))
    const production = analyzeRepository(createContext(productionReadyFiles))
    expect(production.overallScore).toBeGreaterThan(minimal.overallScore)
  })
})

describe('analyzeCompleteness', () => {
  it('should set repoUrl on result', async () => {
    const result = await analyzeCompleteness('https://github.com/test/repo', minimalNextJsFiles)
    expect(result.repoUrl).toBe('https://github.com/test/repo')
  })

  it('should detect Next.js tech stack', async () => {
    const result = await analyzeCompleteness('https://github.com/test/repo', minimalNextJsFiles)
    expect(result.techStack.frameworks).toContain('next.js')
    expect(result.techStack.frameworks).toContain('react')
  })

  it('should detect missing tests', async () => {
    const result = await analyzeCompleteness('https://github.com/test/repo', minimalNextJsFiles)
    const testing = result.categories.find(c => c.category === 'testing')
    expect(testing?.gaps.some(g => g.id === 'testing-no-framework')).toBe(true)
  })

  it('should detect missing CI/CD', async () => {
    const result = await analyzeCompleteness('https://github.com/test/repo', minimalNextJsFiles)
    const deploy = result.categories.find(c => c.category === 'deployment')
    expect(deploy?.gaps.some(g => g.id === 'deploy-no-ci')).toBe(true)
  })

  it('should give higher testing score when tests exist', async () => {
    const filesWithTests: RepoFile[] = [
      { path: 'package.json', content: createPackageJson({ devDependencies: { vitest: '^1.0.0' } }), size: 150 },
      { path: 'app/page.tsx', content: 'export default function Home() {}', size: 50 },
      { path: 'vitest.config.ts', content: 'export default {}', size: 20 },
      { path: 'tests/page.test.tsx', content: 'test("works", () => expect(true).toBe(true))', size: 50 },
    ]
    const withTests = await analyzeCompleteness('https://github.com/test/repo', filesWithTests)
    const withoutTests = await analyzeCompleteness('https://github.com/test/repo', minimalNextJsFiles)
    const scoreWith = withTests.categories.find(c => c.category === 'testing')?.score || 0
    const scoreWithout = withoutTests.categories.find(c => c.category === 'testing')?.score || 0
    expect(scoreWith).toBeGreaterThan(scoreWithout)
  })
})

describe('formatAnalysisSummary', () => {
  it('should include production readiness header', async () => {
    const result = await analyzeCompleteness('https://github.com/test/repo', minimalNextJsFiles)
    const summary = formatAnalysisSummary(result)
    expect(summary).toContain('Production Readiness')
  })

  it('should include overall score', async () => {
    const result = await analyzeCompleteness('https://github.com/test/repo', minimalNextJsFiles)
    const summary = formatAnalysisSummary(result)
    expect(summary).toMatch(/Overall Score.*\d+\/100/)
  })

  it('should include tech stack info', async () => {
    const result = await analyzeCompleteness('https://github.com/test/repo', minimalNextJsFiles)
    const summary = formatAnalysisSummary(result)
    expect(summary).toContain('next.js')
  })
})

describe('getInstantFixGaps', () => {
  it('should return only instant fix gaps', async () => {
    const result = await analyzeCompleteness('https://github.com/test/repo', minimalNextJsFiles)
    const instantGaps = getInstantFixGaps(result)
    instantGaps.forEach(gap => expect(gap.fixType).toBe('instant'))
  })
})

describe('generateCompletionPlan', () => {
  it('should prioritize security in top 5', async () => {
    const result = await analyzeCompleteness('https://github.com/test/repo', minimalNextJsFiles)
    const plan = generateCompletionPlan(result)
    const securityIndex = plan.priority.indexOf('security')
    expect(securityIndex).toBeLessThan(5)
  })

  it('should calculate total minutes', async () => {
    const result = await analyzeCompleteness('https://github.com/test/repo', minimalNextJsFiles)
    const plan = generateCompletionPlan(result)
    expect(plan.totalMinutes).toBeGreaterThanOrEqual(0)
  })
})

describe('getAltitudeSummary', () => {
  it('should return headline, subtext, and cta', async () => {
    const result = await analyzeCompleteness('https://github.com/test/repo', minimalNextJsFiles)
    const summary = getAltitudeSummary(result)
    expect(summary.headline).toBeDefined()
    expect(summary.subtext).toBeDefined()
    expect(summary.cta).toBeDefined()
  })
})

describe('Edge Cases', () => {
  it('should handle empty file list', async () => {
    const result = await analyzeCompleteness('https://github.com/test/empty', [])
    expect(result.categories).toHaveLength(12)
  })

  it('should handle malformed package.json', async () => {
    const files: RepoFile[] = [
      { path: 'package.json', content: 'not valid json', size: 20 },
      { path: 'index.ts', content: 'export {}', size: 10 },
    ]
    const result = await analyzeCompleteness('https://github.com/test/malformed', files)
    expect(result.categories).toHaveLength(12)
  })

  it('should handle monorepo structure', async () => {
    const files: RepoFile[] = [
      { path: 'package.json', content: JSON.stringify({ workspaces: ['packages/*'] }), size: 50 },
      { path: 'packages/web/package.json', content: createPackageJson(), size: 100 },
      { path: 'packages/web/app/page.tsx', content: 'export default function() {}', size: 30 },
    ]
    const result = await analyzeCompleteness('https://github.com/test/monorepo', files)
    expect(result.techStack.platform).toBe('monorepo')
  })
})

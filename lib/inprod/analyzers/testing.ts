// =============================================================================
// TESTING ANALYZER
// =============================================================================

import { CategoryScore, Gap, RepoContext } from '../types'

export function analyzeTesting(ctx: RepoContext): CategoryScore {
  const gaps: Gap[] = []
  const detected: string[] = []
  let score = 0
  
  const { files, techStack, packageJson } = ctx
  const deps = packageJson ? { 
    ...((packageJson.dependencies as Record<string, string>) || {}),
    ...((packageJson.devDependencies as Record<string, string>) || {})
  } : {}

  // 1. Check for test framework (20 points)
  const hasTestFramework = techStack.testFramework !== null
  
  if (hasTestFramework) {
    detected.push(`Test framework: ${techStack.testFramework}`)
    score += 20
  } else {
    gaps.push({
      id: 'testing-no-framework',
      category: 'testing',
      title: 'No test framework configured',
      description: 'Add Vitest or Jest for unit testing',
      severity: 'critical',
      confidence: 'proven',
      fixType: 'instant',
      fixTemplate: 'vitest-setup',
      effortMinutes: 15,
    })
  }

  // 2. Count test files (30 points)
  const testFiles = files.filter(f => 
    f.path.includes('.test.') || 
    f.path.includes('.spec.') ||
    f.path.includes('__tests__')
  )
  
  const sourceFiles = files.filter(f => 
    (f.path.endsWith('.ts') || f.path.endsWith('.tsx') || f.path.endsWith('.js') || f.path.endsWith('.jsx')) &&
    !f.path.includes('.test.') && 
    !f.path.includes('.spec.') &&
    !f.path.includes('node_modules')
  )
  
  const testCoverage = sourceFiles.length > 0 ? (testFiles.length / sourceFiles.length) * 100 : 0
  
  if (testFiles.length > 0) {
    detected.push(`${testFiles.length} test files`)
    if (testCoverage >= 50) {
      score += 30
    } else if (testCoverage >= 20) {
      score += 20
    } else {
      score += 10
    }
  } else {
    gaps.push({
      id: 'testing-no-tests',
      category: 'testing',
      title: 'No test files found',
      description: 'Add unit tests for critical functionality',
      severity: 'critical',
      confidence: 'proven',
      fixType: 'instant',
      fixTemplate: 'generate-tests',
      effortMinutes: 60,
    })
  }

  // 3. Check for E2E tests (20 points)
  const hasE2E = deps['@playwright/test'] || deps['cypress'] || deps['puppeteer'] ||
                 files.some(f => f.path.includes('e2e') || f.path.includes('playwright'))
  
  if (hasE2E) {
    detected.push('E2E testing configured')
    score += 20
  } else {
    gaps.push({
      id: 'testing-no-e2e',
      category: 'testing',
      title: 'No E2E tests detected',
      description: 'Add Playwright for end-to-end testing of critical user flows',
      severity: 'warning',
      confidence: 'high',
      fixType: 'instant',
      fixTemplate: 'playwright-setup',
      effortMinutes: 30,
    })
  }

  // 4. Check for test in CI (15 points)
  const hasTestInCI = files.some(f => 
    f.path.includes('.github/workflows') && 
    (f.content.includes('npm test') || f.content.includes('pnpm test') || f.content.includes('vitest'))
  )
  
  if (hasTestInCI) {
    detected.push('Tests run in CI')
    score += 15
  } else if (techStack.ciProvider) {
    gaps.push({
      id: 'testing-not-in-ci',
      category: 'testing',
      title: 'Tests not running in CI',
      description: 'Add test step to CI pipeline',
      severity: 'warning',
      confidence: 'likely',
      fixType: 'instant',
      fixTemplate: 'ci-tests',
      effortMinutes: 10,
    })
  }

  // 5. Check for coverage reporting (15 points)
  const hasCoverage = deps['@vitest/coverage-v8'] || deps['@vitest/coverage-istanbul'] ||
                      deps['nyc'] || deps['c8'] ||
                      files.some(f => f.content.includes('coverage'))
  
  if (hasCoverage) {
    detected.push('Coverage reporting configured')
    score += 15
  }

  return {
    category: 'testing',
    label: 'Testing',
    score: Math.min(100, score),
    detected,
    gaps,
    canGenerate: gaps.some(g => g.fixType === 'instant'),
  }
}


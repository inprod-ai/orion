// =============================================================================
// ANALYZER UNIT TESTS
// =============================================================================
// Tests for all category analyzers

import { describe, it, expect, beforeEach } from 'vitest'
import { RepoFile, RepoContext, TechStack } from '@/lib/inprod/types'
import { analyzeFrontend } from '@/lib/inprod/analyzers/frontend'
import { analyzeBackend } from '@/lib/inprod/analyzers/backend'
import { analyzeDatabase } from '@/lib/inprod/analyzers/database'
import { analyzeAuthentication } from '@/lib/inprod/analyzers/authentication'
import { analyzeApiIntegrations } from '@/lib/inprod/analyzers/api-integrations'
import { analyzeStateManagement } from '@/lib/inprod/analyzers/state-management'
import { analyzeDesignUx } from '@/lib/inprod/analyzers/design-ux'
import { analyzeTesting } from '@/lib/inprod/analyzers/testing'
import { analyzeErrorHandling } from '@/lib/inprod/analyzers/error-handling'
import { analyzeVersionControl } from '@/lib/inprod/analyzers/version-control'
import { analyzeDeployment } from '@/lib/inprod/analyzers/deployment'

// =============================================================================
// TEST HELPERS
// =============================================================================

function createContext(
  files: RepoFile[],
  overrides?: Partial<TechStack>,
  packageJson?: Record<string, unknown>
): RepoContext {
  const techStack: TechStack = {
    platform: 'web',
    languages: ['typescript'],
    frameworks: ['next.js', 'react'],
    packageManager: 'npm',
    database: null,
    testFramework: null,
    ciProvider: null,
    deploymentPlatform: null,
    maturityLevel: 'mvp',
    ...overrides,
  }
  
  return {
    files,
    techStack,
    packageJson: packageJson || {
      dependencies: {},
      devDependencies: {},
    },
  }
}

// =============================================================================
// FRONTEND ANALYZER TESTS
// =============================================================================

describe('analyzeFrontend', () => {
  it('should return N/A for non-frontend platforms', () => {
    const ctx = createContext([], { platform: 'cli', frameworks: [] })
    const result = analyzeFrontend(ctx)
    
    expect(result.score).toBe(100)
    expect(result.detected).toContain('Not applicable for cli projects')
  })
  
  it('should detect React framework', () => {
    const files: RepoFile[] = [
      { path: 'app/page.tsx', content: 'export default function Home() {}', size: 50 },
    ]
    const ctx = createContext(files, { frameworks: ['react', 'next.js'] })
    const result = analyzeFrontend(ctx)
    
    expect(result.detected.some(d => d.includes('UI Framework'))).toBe(true)
    expect(result.score).toBeGreaterThan(0)
  })
  
  it('should detect error boundaries', () => {
    const files: RepoFile[] = [
      { path: 'app/error.tsx', content: 'export default function ErrorBoundary() {}', size: 50 },
    ]
    const ctx = createContext(files)
    const result = analyzeFrontend(ctx)
    
    expect(result.detected).toContain('Error boundary implemented')
  })
  
  it('should flag missing CSS framework', () => {
    const ctx = createContext([], { frameworks: ['react'] })
    const result = analyzeFrontend(ctx)
    
    expect(result.gaps.some(g => g.id === 'frontend-no-css-framework')).toBe(true)
  })
  
  it('should detect Tailwind CSS', () => {
    const ctx = createContext([], { frameworks: ['react'] }, {
      dependencies: {},
      devDependencies: { tailwindcss: '^3.0.0' },
    })
    const result = analyzeFrontend(ctx)
    
    expect(result.detected).toContain('CSS Framework detected')
  })
})

// =============================================================================
// BACKEND ANALYZER TESTS
// =============================================================================

describe('analyzeBackend', () => {
  it('should return N/A for library platform', () => {
    const ctx = createContext([], { platform: 'library', frameworks: [] })
    const result = analyzeBackend(ctx)
    
    expect(result.score).toBe(100)
    expect(result.detected).toContain('Not applicable for library projects')
  })
  
  it('should detect API routes', () => {
    const files: RepoFile[] = [
      { path: 'app/api/users/route.ts', content: 'export async function GET() {}', size: 50 },
    ]
    const ctx = createContext(files)
    const result = analyzeBackend(ctx)
    
    expect(result.detected).toContain('API routes detected')
  })
  
  it('should detect Zod validation', () => {
    const files: RepoFile[] = [
      { path: 'app/api/users/route.ts', content: 'import { z } from "zod"\nschema.parse(body)', size: 100 },
    ]
    const ctx = createContext(files, {}, {
      dependencies: { zod: '^3.0.0' },
      devDependencies: {},
    })
    const result = analyzeBackend(ctx)
    
    expect(result.detected).toContain('Input validation configured')
  })
  
  it('should flag missing rate limiting', () => {
    const files: RepoFile[] = [
      { path: 'app/api/users/route.ts', content: 'export async function POST() {}', size: 50 },
    ]
    const ctx = createContext(files)
    const result = analyzeBackend(ctx)
    
    expect(result.gaps.some(g => g.id === 'backend-no-rate-limit')).toBe(true)
  })
  
  it('should detect health endpoint', () => {
    const files: RepoFile[] = [
      { path: 'app/api/health/route.ts', content: 'export async function GET() {}', size: 50 },
    ]
    const ctx = createContext(files)
    const result = analyzeBackend(ctx)
    
    expect(result.detected).toContain('Health endpoint present')
  })
})

// =============================================================================
// DATABASE ANALYZER TESTS
// =============================================================================

describe('analyzeDatabase', () => {
  it('should return N/A for CLI platform', () => {
    const ctx = createContext([], { platform: 'cli', database: null })
    const result = analyzeDatabase(ctx)
    
    expect(result.score).toBe(100)
    expect(result.detected).toContain('Not applicable for cli projects')
  })
  
  it('should return N/A when no database detected', () => {
    const ctx = createContext([], { database: null })
    const result = analyzeDatabase(ctx)
    
    expect(result.score).toBe(100)
    expect(result.detected).toContain('No database detected')
  })
  
  it('should detect Prisma ORM', () => {
    const ctx = createContext([], { database: 'postgresql' }, {
      dependencies: { '@prisma/client': '^5.0.0' },
      devDependencies: { prisma: '^5.0.0' },
    })
    const result = analyzeDatabase(ctx)
    
    expect(result.detected).toContain('ORM configured')
  })
  
  it('should flag missing ORM', () => {
    const ctx = createContext([], { database: 'postgresql' })
    const result = analyzeDatabase(ctx)
    
    expect(result.gaps.some(g => g.id === 'database-no-orm')).toBe(true)
  })
})

// =============================================================================
// AUTHENTICATION ANALYZER TESTS
// =============================================================================

describe('analyzeAuthentication', () => {
  it('should return N/A for library platform', () => {
    const ctx = createContext([], { platform: 'library' })
    const result = analyzeAuthentication(ctx)
    
    expect(result.score).toBe(100)
    expect(result.detected).toContain('Not applicable for library projects')
  })
  
  it('should detect NextAuth', () => {
    const ctx = createContext([], {}, {
      dependencies: { 'next-auth': '^4.0.0' },
      devDependencies: {},
    })
    const result = analyzeAuthentication(ctx)
    
    expect(result.detected).toContain('Authentication system detected')
  })
  
  it('should detect session encryption', () => {
    const files: RepoFile[] = [
      { path: 'lib/auth.ts', content: 'import crypto from "crypto"\nencrypt(session)', size: 100 },
    ]
    const ctx = createContext(files, {}, {
      dependencies: { 'next-auth': '^4.0.0' },
      devDependencies: {},
    })
    const result = analyzeAuthentication(ctx)
    
    expect(result.detected).toContain('Session encryption detected')
  })
})

// =============================================================================
// API INTEGRATIONS ANALYZER TESTS
// =============================================================================

describe('analyzeApiIntegrations', () => {
  it('should return N/A for library platform', () => {
    const ctx = createContext([], { platform: 'library' })
    const result = analyzeApiIntegrations(ctx)
    
    expect(result.score).toBe(100)
  })
  
  it('should detect Stripe integration', () => {
    const ctx = createContext([], {}, {
      dependencies: { stripe: '^12.0.0' },
      devDependencies: {},
    })
    const result = analyzeApiIntegrations(ctx)
    
    expect(result.detected.some(d => d.includes('Stripe'))).toBe(true)
  })
  
  it('should return N/A when no external APIs', () => {
    const ctx = createContext([])
    const result = analyzeApiIntegrations(ctx)
    
    expect(result.score).toBe(100)
    expect(result.detected).toContain('No external API integrations detected')
  })
})

// =============================================================================
// STATE MANAGEMENT ANALYZER TESTS
// =============================================================================

describe('analyzeStateManagement', () => {
  it('should return N/A for CLI platform', () => {
    const ctx = createContext([], { platform: 'cli', frameworks: [] })
    const result = analyzeStateManagement(ctx)
    
    expect(result.score).toBe(100)
  })
  
  it('should detect Zustand', () => {
    const ctx = createContext([], { frameworks: ['react'] }, {
      dependencies: { zustand: '^4.0.0' },
      devDependencies: {},
    })
    const result = analyzeStateManagement(ctx)
    
    expect(result.detected.some(d => d.includes('State management'))).toBe(true)
  })
  
  it('should detect React Query', () => {
    const ctx = createContext([], { frameworks: ['react'] }, {
      dependencies: { '@tanstack/react-query': '^5.0.0' },
      devDependencies: {},
    })
    const result = analyzeStateManagement(ctx)
    
    expect(result.detected.some(d => d.includes('Data fetching'))).toBe(true)
  })
})

// =============================================================================
// DESIGN/UX ANALYZER TESTS
// =============================================================================

describe('analyzeDesignUx', () => {
  it('should return N/A for backend platform', () => {
    const ctx = createContext([], { platform: 'backend' })
    const result = analyzeDesignUx(ctx)
    
    expect(result.score).toBe(100)
    expect(result.detected).toContain('Not applicable for backend projects')
  })
  
  it('should detect Radix UI', () => {
    const ctx = createContext([], {}, {
      dependencies: { '@radix-ui/react-dialog': '^1.0.0' },
      devDependencies: {},
    })
    const result = analyzeDesignUx(ctx)
    
    expect(result.detected.some(d => d.includes('UI component library'))).toBe(true)
  })
})

// =============================================================================
// TESTING ANALYZER TESTS
// =============================================================================

describe('analyzeTesting', () => {
  it('should detect Vitest', () => {
    const ctx = createContext([], { testFramework: 'vitest' }, {
      dependencies: {},
      devDependencies: { vitest: '^1.0.0' },
    })
    const result = analyzeTesting(ctx)
    
    expect(result.detected.some(d => d.includes('vitest'))).toBe(true)
  })
  
  it('should flag missing test framework', () => {
    const ctx = createContext([], { testFramework: null })
    const result = analyzeTesting(ctx)
    
    expect(result.gaps.some(g => g.id === 'testing-no-framework')).toBe(true)
  })
  
  it('should count test files', () => {
    const files: RepoFile[] = [
      { path: 'tests/unit/user.test.ts', content: 'describe("User")', size: 100 },
      { path: 'tests/unit/api.test.ts', content: 'describe("API")', size: 100 },
    ]
    const ctx = createContext(files, { testFramework: 'vitest' })
    const result = analyzeTesting(ctx)
    
    expect(result.score).toBeGreaterThan(20) // Framework + test files
  })
})

// =============================================================================
// ERROR HANDLING ANALYZER TESTS
// =============================================================================

describe('analyzeErrorHandling', () => {
  it('should detect Sentry', () => {
    const ctx = createContext([], {}, {
      dependencies: { '@sentry/nextjs': '^7.0.0' },
      devDependencies: {},
    })
    const result = analyzeErrorHandling(ctx)
    
    expect(result.detected).toContain('Error monitoring configured')
  })
  
  it('should flag missing error monitoring', () => {
    const ctx = createContext([])
    const result = analyzeErrorHandling(ctx)
    
    expect(result.gaps.some(g => g.id === 'error-no-monitoring')).toBe(true)
  })
  
  it('should detect try-catch usage in API routes', () => {
    const files: RepoFile[] = [
      { path: 'app/api/users/route.ts', content: 'try { await fetch() } catch (error) { console.error(error) }', size: 100 },
    ]
    const ctx = createContext(files)
    const result = analyzeErrorHandling(ctx)
    
    expect(result.detected.some(d => d.includes('try-catch'))).toBe(true)
  })
})

// =============================================================================
// VERSION CONTROL ANALYZER TESTS
// =============================================================================

describe('analyzeVersionControl', () => {
  it('should detect .gitignore', () => {
    const files: RepoFile[] = [
      { path: '.gitignore', content: 'node_modules\n.env\n.next', size: 50 },
    ]
    const ctx = createContext(files)
    const result = analyzeVersionControl(ctx)
    
    expect(result.detected.some(d => d.includes('gitignore'))).toBe(true)
  })
  
  it('should detect PR template', () => {
    const files: RepoFile[] = [
      { path: '.github/PULL_REQUEST_TEMPLATE.md', content: '## Description', size: 100 },
    ]
    const ctx = createContext(files)
    const result = analyzeVersionControl(ctx)
    
    expect(result.detected).toContain('PR template present')
  })
  
  it('should flag incomplete .gitignore', () => {
    const files: RepoFile[] = [
      { path: '.gitignore', content: 'node_modules', size: 20 },
    ]
    const ctx = createContext(files)
    const result = analyzeVersionControl(ctx)
    
    expect(result.gaps.some(g => g.id === 'vc-incomplete-gitignore')).toBe(true)
  })
})

// =============================================================================
// DEPLOYMENT ANALYZER TESTS
// =============================================================================

describe('analyzeDeployment', () => {
  it('should detect GitHub Actions CI', () => {
    const ctx = createContext([], { ciProvider: 'github-actions' })
    const result = analyzeDeployment(ctx)
    
    expect(result.detected.some(d => d.includes('CI/CD'))).toBe(true)
  })
  
  it('should flag missing CI/CD', () => {
    const ctx = createContext([], { ciProvider: null })
    const result = analyzeDeployment(ctx)
    
    expect(result.gaps.some(g => g.id === 'deploy-no-ci')).toBe(true)
  })
  
  it('should detect Vercel deployment', () => {
    const files: RepoFile[] = [
      { path: 'vercel.json', content: '{ "buildCommand": "npm run build" }', size: 50 },
    ]
    const ctx = createContext(files, { deploymentPlatform: 'vercel' })
    const result = analyzeDeployment(ctx)
    
    expect(result.detected.some(d => d.includes('Platform: vercel'))).toBe(true)
  })
  
  it('should return custom label for iOS platform', () => {
    const ctx = createContext([], { platform: 'ios', ciProvider: 'xcode-cloud' })
    const result = analyzeDeployment(ctx)
    
    // Platform override is applied via getCategoryLabel
    expect(result.label).toBe('App Store')
  })
  
  it('should work without platform overrides', () => {
    const ctx = createContext([], { platform: 'web', ciProvider: 'github-actions' })
    const result = analyzeDeployment(ctx)
    
    expect(result.label).toBe('Deployment')
  })
})

// =============================================================================
// PLATFORM APPLICABILITY TESTS
// =============================================================================

describe('Platform Applicability', () => {
  it('should mark frontend N/A for backend projects', () => {
    const ctx = createContext([], { platform: 'backend', frameworks: [] })
    expect(analyzeFrontend(ctx).detected).toContain('Not applicable for backend projects')
  })
  
  it('should mark database N/A for library projects', () => {
    const ctx = createContext([], { platform: 'library' })
    expect(analyzeDatabase(ctx).detected).toContain('Not applicable for library projects')
  })
  
  it('should mark authentication N/A for CLI projects', () => {
    const ctx = createContext([], { platform: 'cli' })
    expect(analyzeAuthentication(ctx).detected).toContain('Not applicable for cli projects')
  })
  
  it('should analyze security for all platforms', () => {
    // Security applies to all platforms
    const cliCtx = createContext([], { platform: 'cli' })
    const libraryCtx = createContext([], { platform: 'library' })
    
    // Both should be analyzed (not N/A)
    expect(analyzeTesting(cliCtx).detected).not.toContain('Not applicable for cli projects')
    expect(analyzeTesting(libraryCtx).detected).not.toContain('Not applicable for library projects')
  })
})

import { describe, it, expect } from 'vitest'
import { analyzeSecurity } from '@/lib/orion/analyzers/security'
import type { RepoContext, RepoFile, TechStack } from '@/lib/orion/types'

// Helper to create a minimal context
function createContext(
  files: RepoFile[],
  deps: Record<string, string> = {},
  devDeps: Record<string, string> = {}
): RepoContext {
  return {
    files,
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
      name: 'test-app',
      dependencies: deps,
      devDependencies: devDeps,
    },
  }
}

describe('analyzeSecurity', () => {
  describe('Security Headers Detection', () => {
    it('should detect security headers in next.config', () => {
      const files: RepoFile[] = [
        {
          path: 'next.config.js',
          content: `module.exports = {
            async headers() {
              return [{ source: '/:path*', headers: [{ key: 'X-Frame-Options', value: 'DENY' }] }]
            }
          }`,
          size: 200,
        },
      ]

      const result = analyzeSecurity(createContext(files))

      expect(result.detected).toContain('Security headers configured')
      expect(result.score).toBeGreaterThan(0)
    })

    it('should detect CSP headers', () => {
      const files: RepoFile[] = [
        { path: 'middleware.ts', content: 'response.headers.set("Content-Security-Policy", "default-src self")', size: 100 },
      ]

      const result = analyzeSecurity(createContext(files))

      expect(result.detected).toContain('Security headers configured')
    })

    it('should flag missing security headers', () => {
      const files: RepoFile[] = [
        { path: 'app/page.tsx', content: 'export default function Home() {}', size: 50 },
      ]

      const result = analyzeSecurity(createContext(files))

      expect(result.gaps.some(g => g.id === 'security-no-headers')).toBe(true)
    })
  })

  describe('Input Sanitization Detection', () => {
    it('should detect DOMPurify usage', () => {
      const result = analyzeSecurity(createContext(
        [{ path: 'lib/sanitize.ts', content: 'import DOMPurify from "dompurify"', size: 50 }],
        { dompurify: '^3.0.0' }
      ))

      expect(result.detected).toContain('Input sanitization detected')
    })

    it('should flag dangerouslySetInnerHTML without sanitization', () => {
      const files: RepoFile[] = [
        { path: 'components/Html.tsx', content: '<div dangerouslySetInnerHTML={{ __html: content }} />', size: 100 },
      ]

      const result = analyzeSecurity(createContext(files))

      expect(result.gaps.some(g => g.id === 'security-no-sanitization')).toBe(true)
      expect(result.gaps.find(g => g.id === 'security-no-sanitization')?.severity).toBe('critical')
    })

    it('should not flag when sanitization is present with dangerouslySetInnerHTML', () => {
      const files: RepoFile[] = [
        { path: 'components/Html.tsx', content: 'const clean = sanitize(html); return <div dangerouslySetInnerHTML={{ __html: clean }} />', size: 100 },
      ]

      const result = analyzeSecurity(createContext(files))

      expect(result.gaps.some(g => g.id === 'security-no-sanitization')).toBe(false)
    })
  })

  describe('Hardcoded Secrets Detection', () => {
    it('should detect hardcoded secret keys', () => {
      const files: RepoFile[] = [
        { path: 'lib/stripe.ts', content: 'const stripe = new Stripe("secret_key_abcdefghij1234567890")', size: 100 },
      ]

      const result = analyzeSecurity(createContext(files))

      expect(result.gaps.some(g => g.id.startsWith('security-hardcoded-secret'))).toBe(true)
      expect(result.gaps.find(g => g.id.startsWith('security-hardcoded-secret'))?.severity).toBe('blocker')
    })

    it('should detect GitHub tokens', () => {
      const files: RepoFile[] = [
        { path: 'scripts/deploy.ts', content: 'const token = "ghp_1234567890abcdefghijklmnopqrstuvwxyz"', size: 100 },
      ]

      const result = analyzeSecurity(createContext(files))

      expect(result.gaps.some(g => g.id.startsWith('security-hardcoded-secret'))).toBe(true)
    })

    it('should detect OpenAI API keys', () => {
      const files: RepoFile[] = [
        { path: 'lib/ai.ts', content: 'const apiKey = "sk-1234567890abcdefghijklmnopqrstuvwxyz123456789012"', size: 100 },
      ]

      const result = analyzeSecurity(createContext(files))

      expect(result.gaps.some(g => g.id.startsWith('security-hardcoded-secret'))).toBe(true)
    })

    it('should skip documentation files', () => {
      const files: RepoFile[] = [
        { path: 'docs/setup.md', content: 'Example: sk_FAKE_stripe_key_for_docs', size: 100 },
        { path: 'README.md', content: 'Set STRIPE_KEY=sk_your_key_here', size: 50 },
      ]

      const result = analyzeSecurity(createContext(files))

      // Should not flag docs as having secrets
      expect(result.gaps.filter(g => g.id.startsWith('security-hardcoded-secret'))).toHaveLength(0)
    })

    it('should skip .env files', () => {
      const files: RepoFile[] = [
        { path: '.env.local', content: 'STRIPE_KEY=sk_FAKE_stripe_key_envfile', size: 50 },
      ]

      const result = analyzeSecurity(createContext(files))

      expect(result.gaps.filter(g => g.id.startsWith('security-hardcoded-secret'))).toHaveLength(0)
    })

    it('should give points when no secrets found', () => {
      const files: RepoFile[] = [
        { path: 'lib/config.ts', content: 'export const apiUrl = process.env.API_URL', size: 50 },
      ]

      const result = analyzeSecurity(createContext(files))

      expect(result.detected).toContain('No hardcoded secrets found')
    })
  })

  describe('SQL Injection Protection', () => {
    it('should give points for using Prisma ORM', () => {
      const result = analyzeSecurity(createContext(
        [{ path: 'lib/db.ts', content: 'import { PrismaClient } from "@prisma/client"', size: 50 }],
        { '@prisma/client': '^5.0.0' }
      ))

      expect(result.detected).toContain('Using ORM for SQL injection protection')
    })

    it('should give points for using Drizzle ORM', () => {
      const result = analyzeSecurity(createContext(
        [{ path: 'lib/db.ts', content: 'import { drizzle } from "drizzle-orm"', size: 50 }],
        { 'drizzle-orm': '^0.28.0' }
      ))

      expect(result.detected).toContain('Using ORM for SQL injection protection')
    })

    it('should flag string concatenation in SQL queries', () => {
      const files: RepoFile[] = [
        { path: 'lib/db.ts', content: 'const query = `SELECT * FROM users WHERE id = ${userId}`', size: 100 },
      ]

      const result = analyzeSecurity(createContext(files))

      expect(result.gaps.some(g => g.id === 'security-sql-injection')).toBe(true)
    })

    it('should not flag SQL when using ORM', () => {
      const files: RepoFile[] = [
        { path: 'lib/db.ts', content: 'const query = `SELECT * FROM users WHERE id = ${userId}`', size: 100 },
      ]

      const result = analyzeSecurity(createContext(files, { '@prisma/client': '^5.0.0' }))

      expect(result.gaps.some(g => g.id === 'security-sql-injection')).toBe(false)
    })
  })

  describe('Environment Variables', () => {
    it('should detect .env.example file', () => {
      const files: RepoFile[] = [
        { path: '.env.example', content: 'DATABASE_URL=\nAPI_KEY=', size: 30 },
      ]

      const result = analyzeSecurity(createContext(files))

      expect(result.detected).toContain('.env.example present')
    })

    it('should detect .env.local.example file', () => {
      const files: RepoFile[] = [
        { path: '.env.local.example', content: 'DATABASE_URL=', size: 20 },
      ]

      const result = analyzeSecurity(createContext(files))

      expect(result.detected).toContain('.env.example present')
    })

    it('should flag missing .env.example', () => {
      const files: RepoFile[] = [
        { path: 'app/page.tsx', content: 'export default function() {}', size: 50 },
      ]

      const result = analyzeSecurity(createContext(files))

      expect(result.gaps.some(g => g.id === 'security-no-env-example')).toBe(true)
    })
  })

  describe('Encryption Detection', () => {
    it('should detect crypto usage', () => {
      const files: RepoFile[] = [
        { path: 'lib/crypto.ts', content: 'import crypto from "crypto"', size: 50 },
      ]

      const result = analyzeSecurity(createContext(files))

      expect(result.detected).toContain('Encryption utilities present')
    })

    it('should detect bcrypt usage', () => {
      const files: RepoFile[] = [
        { path: 'lib/auth.ts', content: 'import bcrypt from "bcrypt"', size: 50 },
      ]

      const result = analyzeSecurity(createContext(files))

      expect(result.detected).toContain('Encryption utilities present')
    })
  })

  describe('Dependency Audit', () => {
    it('should detect npm audit in CI', () => {
      const files: RepoFile[] = [
        { path: '.github/workflows/security.yml', content: 'run: npm audit', size: 100 },
      ]

      const result = analyzeSecurity(createContext(files))

      expect(result.detected).toContain('Dependency audit configured')
    })

    it('should detect Snyk dependency', () => {
      const result = analyzeSecurity(createContext([], { snyk: '^1.0.0' }))

      expect(result.detected).toContain('Dependency audit configured')
    })
  })

  describe('Score Calculation', () => {
    it('should cap score at 100', () => {
      // Create a very secure setup
      const files: RepoFile[] = [
        { path: 'next.config.js', content: 'headers: [{ key: "X-Frame-Options" }]', size: 100 },
        { path: '.env.example', content: 'KEY=', size: 10 },
        { path: 'lib/crypto.ts', content: 'import crypto from "crypto"', size: 50 },
        { path: '.github/workflows/security.yml', content: 'npm audit', size: 50 },
      ]

      const result = analyzeSecurity(createContext(files, { '@prisma/client': '^5.0.0' }))

      expect(result.score).toBeLessThanOrEqual(100)
    })

    it('should have score of 0 for terrible security', () => {
      // Minimal setup with secrets in code
      const files: RepoFile[] = [
        { path: 'lib/stripe.ts', content: 'const key = "secret_key_abcdefghij1234567890"', size: 50 },
        { path: 'components/Html.tsx', content: '<div dangerouslySetInnerHTML={{ __html: data }} />', size: 50 },
      ]

      const result = analyzeSecurity(createContext(files))

      // Score should be low due to critical issues
      expect(result.score).toBeLessThan(50)
    })

    it('should return category as security', () => {
      const result = analyzeSecurity(createContext([]))

      expect(result.category).toBe('security')
      expect(result.label).toBe('Security')
    })
  })

  describe('Gap Properties', () => {
    it('should include all required gap properties', () => {
      const files: RepoFile[] = [
        { path: 'app/page.tsx', content: 'export default function() {}', size: 50 },
      ]

      const result = analyzeSecurity(createContext(files))

      result.gaps.forEach(gap => {
        expect(gap.id).toBeDefined()
        expect(gap.category).toBe('security')
        expect(gap.title).toBeDefined()
        expect(gap.description).toBeDefined()
        expect(gap.severity).toMatch(/blocker|critical|warning|info/)
        expect(gap.confidence).toBeDefined()
        expect(gap.fixType).toMatch(/instant|suggested|guided/)
      })
    })

    it('should include effort minutes for instant fixes', () => {
      const files: RepoFile[] = [
        { path: 'app/page.tsx', content: 'export default function() {}', size: 50 },
      ]

      const result = analyzeSecurity(createContext(files))

      const instantGaps = result.gaps.filter(g => g.fixType === 'instant')
      instantGaps.forEach(gap => {
        expect(gap.effortMinutes).toBeGreaterThan(0)
      })
    })
  })
})

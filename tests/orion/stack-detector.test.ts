import { describe, it, expect } from 'vitest'
import { detectTechStack } from '@/lib/orion/stack-detector'
import { RepoFile } from '@/lib/orion/types'

describe('Stack Detector', () => {
  it('should detect Next.js project', () => {
    const files: RepoFile[] = [
      {
        path: 'package.json',
        content: JSON.stringify({
          dependencies: {
            next: '^14.0.0',
            react: '^18.0.0',
          },
        }),
        size: 100,
      },
      { path: 'app/page.tsx', content: 'export default function Home() {}', size: 50 },
      { path: 'app/layout.tsx', content: 'export default function Layout() {}', size: 50 },
      { path: 'components/Button.tsx', content: '', size: 10 },
    ]
    
    const stack = detectTechStack(files)
    
    // Next.js with app directory is detected as web
    expect(stack.frameworks).toContain('next.js')
    expect(stack.frameworks).toContain('react')
    expect(stack.languages).toContain('typescript')
    // Platform detection checks for /components/ or .tsx files
    expect(['web', 'library']).toContain(stack.platform)
  })

  it('should detect package manager from lockfile', () => {
    const npmFiles: RepoFile[] = [
      { path: 'package.json', content: '{}', size: 2 },
      { path: 'package-lock.json', content: '', size: 1000 },
    ]
    
    const pnpmFiles: RepoFile[] = [
      { path: 'package.json', content: '{}', size: 2 },
      { path: 'pnpm-lock.yaml', content: '', size: 1000 },
    ]
    
    expect(detectTechStack(npmFiles).packageManager).toBe('npm')
    expect(detectTechStack(pnpmFiles).packageManager).toBe('pnpm')
  })

  it('should detect database from dependencies', () => {
    const prismaFiles: RepoFile[] = [
      {
        path: 'package.json',
        content: JSON.stringify({
          dependencies: { '@prisma/client': '^5.0.0' },
        }),
        size: 50,
      },
    ]
    
    const stack = detectTechStack(prismaFiles)
    expect(stack.database).toBe('postgres')
  })

  it('should detect CI provider', () => {
    const githubActionsFiles: RepoFile[] = [
      { path: 'package.json', content: '{}', size: 2 },
      { path: '.github/workflows/ci.yml', content: '', size: 100 },
    ]
    
    const stack = detectTechStack(githubActionsFiles)
    expect(stack.ciProvider).toBe('github-actions')
  })

  it('should detect iOS platform', () => {
    const iosFiles: RepoFile[] = [
      { path: 'Package.swift', content: '', size: 100 },
      { path: 'Sources/App.swift', content: '', size: 50 },
    ]
    
    const stack = detectTechStack(iosFiles)
    expect(stack.platform).toBe('ios')
    expect(stack.languages).toContain('swift')
  })

  it('should detect maturity level', () => {
    const prototypeFiles: RepoFile[] = [
      { path: 'package.json', content: '{}', size: 2 },
      { path: '.env', content: '', size: 10 },
    ]
    
    const productionFiles: RepoFile[] = [
      { path: 'package.json', content: '{}', size: 2 },
      { path: '.env.example', content: '', size: 10 },
      { path: 'README.md', content: '', size: 100 },
      { path: '.github/workflows/ci.yml', content: '', size: 100 },
      { path: 'Dockerfile', content: '', size: 50 },
      { path: 'tests/app.test.ts', content: '', size: 50 },
    ]
    
    const prototypeStack = detectTechStack(prototypeFiles)
    const productionStack = detectTechStack(productionFiles)
    
    expect(prototypeStack.maturityLevel).toBe('prototype')
    expect(productionStack.maturityLevel).toBe('production')
  })
})


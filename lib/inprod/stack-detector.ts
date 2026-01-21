// =============================================================================
// TECH STACK DETECTION
// =============================================================================

import { TechStack, RepoFile } from './types'

export function detectTechStack(files: RepoFile[]): TechStack {
  const filePaths = files.map(f => f.path)
  const fileSet = new Set(filePaths)
  
  // Find package.json content
  const packageJsonFile = files.find(f => f.path === 'package.json')
  let packageJson: Record<string, unknown> | null = null
  if (packageJsonFile) {
    try {
      packageJson = JSON.parse(packageJsonFile.content)
    } catch {
      packageJson = null
    }
  }
  
  const deps = packageJson 
    ? { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) } 
    : {}

  // Detect platform
  const platform = detectPlatform(filePaths, fileSet, packageJson)
  
  // Detect languages
  const languages = detectLanguages(filePaths)
  
  // Detect frameworks
  const frameworks = detectFrameworks(deps, filePaths, fileSet)
  
  // Detect package manager
  const packageManager = detectPackageManager(fileSet)
  
  // Detect database
  const database = detectDatabase(deps, files)
  
  // Detect test framework
  const testFramework = detectTestFramework(deps, fileSet)
  
  // Detect CI provider
  const ciProvider = detectCIProvider(fileSet)
  
  // Detect deployment platform
  const deploymentPlatform = detectDeploymentPlatform(fileSet, deps)
  
  // Determine maturity level
  const maturityLevel = detectMaturityLevel(fileSet, deps)

  return {
    platform,
    languages,
    frameworks,
    packageManager,
    database,
    testFramework,
    ciProvider,
    deploymentPlatform,
    maturityLevel,
  }
}

function detectPlatform(
  paths: string[], 
  fileSet: Set<string>,
  packageJson: Record<string, any> | null
): TechStack['platform'] {
  // iOS
  if (paths.some(p => p.endsWith('.xcodeproj') || p.endsWith('.xcworkspace') || p === 'Package.swift')) {
    return 'ios'
  }
  
  // Android
  if (paths.some(p => p.includes('build.gradle') || p === 'settings.gradle')) {
    return 'android'
  }
  
  // Monorepo - check for workspace configs or packages/ directory
  if (fileSet.has('pnpm-workspace.yaml') || fileSet.has('lerna.json') || fileSet.has('turbo.json')) {
    return 'monorepo'
  }
  if (packageJson?.workspaces || paths.some(p => p.startsWith('packages/'))) {
    return 'monorepo'
  }
  
  // CLI - Go or Node.js CLI tools
  if (fileSet.has('go.mod') && !paths.some(p => p.includes('/api/') || p.includes('/server/'))) {
    return 'cli'
  }
  if (packageJson?.bin) {
    return 'cli'
  }
  
  // Library detection - much smarter now
  if (packageJson) {
    // Strong library signals: has exports, main, module, or types but no app structure
    const hasExports = packageJson.exports || packageJson.main || packageJson.module
    const hasTypes = packageJson.types || packageJson.typings
    const hasAppDir = paths.some(p => p.startsWith('app/') || p.includes('/app/'))
    const hasPagesDir = paths.some(p => p.startsWith('pages/') || p.includes('/pages/'))
    const hasSrcIndex = paths.some(p => p === 'src/index.ts' || p === 'src/index.js' || p === 'index.ts' || p === 'index.js')
    
    // If it has exports/main/module AND no app/pages structure AND no server = library
    if (hasExports && !hasAppDir && !hasPagesDir) {
      // Double-check it's not a server with just an index.js
      const hasServerCode = paths.some(p => p.includes('server.') || p.includes('/routes/'))
      if (!hasServerCode) {
        return 'library'
      }
    }
    
    // If it exports types AND has tests = definitely a library
    if (hasTypes && hasSrcIndex && paths.some(p => p.includes('test') || p.includes('spec'))) {
      return 'library'
    }
  }
  
  // Backend
  if (paths.some(p => p.includes('/api/') || p.includes('/routes/') || p.includes('server.'))) {
    if (!paths.some(p => p.includes('/components/') || p.includes('.tsx'))) {
      return 'backend'
    }
  }
  
  return 'web'
}

function detectLanguages(paths: string[]): string[] {
  const languages: Set<string> = new Set()
  
  const extMap: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.py': 'python',
    '.go': 'go',
    '.rs': 'rust',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.java': 'java',
    '.rb': 'ruby',
    '.php': 'php',
  }
  
  for (const path of paths) {
    for (const [ext, lang] of Object.entries(extMap)) {
      if (path.endsWith(ext)) {
        languages.add(lang)
      }
    }
  }
  
  return Array.from(languages)
}

function detectFrameworks(
  deps: Record<string, string>, 
  paths: string[],
  fileSet: Set<string>
): string[] {
  const frameworks: string[] = []
  
  // Web frameworks
  if (deps['next']) frameworks.push('next.js')
  if (deps['react']) frameworks.push('react')
  if (deps['vue']) frameworks.push('vue')
  if (deps['nuxt']) frameworks.push('nuxt')
  if (deps['svelte']) frameworks.push('svelte')
  if (deps['@sveltejs/kit']) frameworks.push('sveltekit')
  if (deps['angular']) frameworks.push('angular')
  if (deps['express']) frameworks.push('express')
  if (deps['fastify']) frameworks.push('fastify')
  if (deps['hono']) frameworks.push('hono')
  if (deps['@nestjs/core']) frameworks.push('nestjs')
  
  // UI libraries
  if (deps['tailwindcss']) frameworks.push('tailwindcss')
  if (deps['@chakra-ui/react']) frameworks.push('chakra-ui')
  if (deps['@mui/material']) frameworks.push('material-ui')
  if (deps['@radix-ui/react-dialog'] || deps['@shadcn/ui']) frameworks.push('shadcn')
  
  // Python frameworks (check files)
  if (paths.some(p => p.includes('fastapi') || p.endsWith('main.py'))) {
    const content = paths.find(p => p.endsWith('requirements.txt'))
    if (content) {
      if (content.includes('fastapi')) frameworks.push('fastapi')
      if (content.includes('django')) frameworks.push('django')
      if (content.includes('flask')) frameworks.push('flask')
    }
  }
  
  // Go frameworks
  if (fileSet.has('go.mod')) {
    const goMod = paths.find(p => p === 'go.mod')
    if (goMod) {
      // Would check content for gin, echo, fiber
      frameworks.push('go')
    }
  }
  
  // iOS frameworks
  if (paths.some(p => p.endsWith('.swift'))) {
    if (paths.some(p => p.includes('SwiftUI'))) frameworks.push('swiftui')
    else frameworks.push('uikit')
  }
  
  return frameworks
}

function detectPackageManager(fileSet: Set<string>): string | null {
  if (fileSet.has('pnpm-lock.yaml')) return 'pnpm'
  if (fileSet.has('yarn.lock')) return 'yarn'
  if (fileSet.has('bun.lockb')) return 'bun'
  if (fileSet.has('package-lock.json')) return 'npm'
  if (fileSet.has('Pipfile.lock')) return 'pipenv'
  if (fileSet.has('poetry.lock')) return 'poetry'
  if (fileSet.has('requirements.txt')) return 'pip'
  if (fileSet.has('go.sum')) return 'go'
  if (fileSet.has('Cargo.lock')) return 'cargo'
  if (fileSet.has('Gemfile.lock')) return 'bundler'
  if (fileSet.has('Podfile.lock')) return 'cocoapods'
  return null
}

function detectDatabase(deps: Record<string, string>, files: RepoFile[]): string | null {
  // Check deps
  if (deps['@prisma/client'] || deps['prisma']) return 'postgres'
  if (deps['drizzle-orm']) return 'postgres'
  if (deps['mongoose'] || deps['mongodb']) return 'mongodb'
  if (deps['mysql2']) return 'mysql'
  if (deps['better-sqlite3'] || deps['sqlite3']) return 'sqlite'
  if (deps['@supabase/supabase-js']) return 'supabase'
  if (deps['firebase'] || deps['firebase-admin']) return 'firebase'
  if (deps['@planetscale/database']) return 'planetscale'
  if (deps['@neondatabase/serverless']) return 'neon'
  
  // Check for schema files
  if (files.some(f => f.path.includes('prisma/schema.prisma'))) return 'postgres'
  if (files.some(f => f.path.includes('drizzle/'))) return 'postgres'
  
  return null
}

function detectTestFramework(deps: Record<string, string>, fileSet: Set<string>): string | null {
  if (deps['vitest']) return 'vitest'
  if (deps['jest']) return 'jest'
  if (deps['mocha']) return 'mocha'
  if (deps['@playwright/test']) return 'playwright'
  if (deps['cypress']) return 'cypress'
  if (deps['pytest'] || fileSet.has('pytest.ini') || fileSet.has('conftest.py')) return 'pytest'
  
  // XCTest for iOS
  if (fileSet.has('Tests') || Array.from(fileSet).some(f => f.includes('Tests.swift'))) {
    return 'xctest'
  }
  
  return null
}

function detectCIProvider(fileSet: Set<string>): string | null {
  if (Array.from(fileSet).some(f => f.startsWith('.github/workflows/'))) return 'github-actions'
  if (fileSet.has('.gitlab-ci.yml')) return 'gitlab-ci'
  if (fileSet.has('.circleci/config.yml')) return 'circleci'
  if (fileSet.has('Jenkinsfile')) return 'jenkins'
  if (fileSet.has('bitbucket-pipelines.yml')) return 'bitbucket'
  if (fileSet.has('.travis.yml')) return 'travis'
  return null
}

function detectDeploymentPlatform(fileSet: Set<string>, deps: Record<string, string>): string | null {
  if (fileSet.has('vercel.json') || deps['next']) return 'vercel'
  if (fileSet.has('netlify.toml')) return 'netlify'
  if (fileSet.has('fly.toml')) return 'fly'
  if (fileSet.has('railway.json') || fileSet.has('railway.toml')) return 'railway'
  if (fileSet.has('render.yaml')) return 'render'
  if (fileSet.has('Dockerfile')) return 'docker'
  if (fileSet.has('app.yaml')) return 'gcp'
  if (fileSet.has('serverless.yml') || fileSet.has('serverless.yaml')) return 'serverless'
  if (fileSet.has('amplify.yml')) return 'amplify'
  return null
}

function detectMaturityLevel(
  fileSet: Set<string>, 
  deps: Record<string, string>
): TechStack['maturityLevel'] {
  let productionSignals = 0
  let prototypeSignals = 0
  
  // Production signals
  if (Array.from(fileSet).some(f => f.includes('.test.') || f.includes('.spec.'))) productionSignals += 2
  if (Array.from(fileSet).some(f => f.startsWith('.github/workflows/'))) productionSignals += 2
  if (fileSet.has('Dockerfile')) productionSignals += 1
  if (fileSet.has('.env.example')) productionSignals += 1
  if (fileSet.has('README.md')) productionSignals += 1
  if (deps['sentry'] || deps['@sentry/nextjs']) productionSignals += 1
  if (deps['winston'] || deps['pino']) productionSignals += 1
  
  // Prototype signals
  if (Array.from(fileSet).some(f => f.includes('TODO') || f.includes('FIXME'))) prototypeSignals += 1
  if (!fileSet.has('.env.example') && fileSet.has('.env')) prototypeSignals += 2
  if (!Array.from(fileSet).some(f => f.includes('.test.') || f.includes('.spec.'))) prototypeSignals += 2
  
  if (productionSignals >= 5) return 'production'
  if (prototypeSignals > productionSignals) return 'prototype'
  return 'mvp'
}


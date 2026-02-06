// =============================================================================
// ORION CLI - Production Readiness Analysis
// =============================================================================
// Usage: npx orion-archi [path] [options]
//        npx orion-archi .
//        npx orion-archi /path/to/project

import * as fs from 'fs'
import * as path from 'path'

// Inline the core analysis to avoid module resolution issues when running globally
// This makes the CLI self-contained

interface RepoFile {
  path: string
  content: string
  size: number
}

interface TechStack {
  languages: string[]
  frameworks: string[]
  databases: string[]
  hasTests: boolean
  hasCI: boolean
  hasDocker: boolean
  hasPrisma: boolean
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun' | null
}

interface Gap {
  id: string
  title: string
  description: string
  severity: 'blocker' | 'critical' | 'warning' | 'info'
  category: string
  file?: string
  fix?: string
}

interface CategoryResult {
  id: string
  label: string
  score: number
  maxScore: number
  gaps: Gap[]
}

const IGNORE_DIRS = [
  'node_modules', '.git', '.next', 'dist', 'build', 'out',
  '.midas', 'coverage', '.husky', '.vercel', '.turbo',
  '__pycache__', '.pytest_cache', 'venv', '.venv',
  'target', 'vendor', 'Pods'
]

const ANALYZABLE_EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|cjs|json|prisma|yml|yaml|md|sql|py|go|rs|java|kt|swift|rb|php|vue|svelte)$/
const DOTFILES = ['.gitignore', '.env.example', '.eslintrc', '.prettierrc', 'Dockerfile', 'docker-compose.yml']

function getRepoFiles(dir: string, prefix = ''): RepoFile[] {
  const files: RepoFile[] = []
  
  let entries: string[]
  try {
    entries = fs.readdirSync(dir)
  } catch {
    return files
  }
  
  for (const entry of entries) {
    if (IGNORE_DIRS.includes(entry)) continue
    
    const fullPath = path.join(dir, entry)
    const relPath = prefix ? `${prefix}/${entry}` : entry
    
    try {
      const stat = fs.statSync(fullPath)
      if (stat.isDirectory()) {
        files.push(...getRepoFiles(fullPath, relPath))
      } else if (ANALYZABLE_EXTENSIONS.test(entry) || DOTFILES.includes(entry)) {
        const content = fs.readFileSync(fullPath, 'utf-8')
        if (content.length < 100000) {
          files.push({ path: relPath, content, size: content.length })
        }
      }
    } catch {
      // Skip unreadable files
    }
  }
  return files
}

function detectTechStack(files: RepoFile[]): TechStack {
  const stack: TechStack = {
    languages: [],
    frameworks: [],
    databases: [],
    hasTests: false,
    hasCI: false,
    hasDocker: false,
    hasPrisma: false,
    packageManager: null
  }
  
  const extensions = new Set<string>()
  for (const f of files) {
    const ext = path.extname(f.path)
    if (ext) extensions.add(ext)
  }
  
  // Languages
  if (extensions.has('.ts') || extensions.has('.tsx')) stack.languages.push('TypeScript')
  if (extensions.has('.js') || extensions.has('.jsx')) stack.languages.push('JavaScript')
  if (extensions.has('.py')) stack.languages.push('Python')
  if (extensions.has('.go')) stack.languages.push('Go')
  if (extensions.has('.rs')) stack.languages.push('Rust')
  if (extensions.has('.java') || extensions.has('.kt')) stack.languages.push('Java/Kotlin')
  if (extensions.has('.swift')) stack.languages.push('Swift')
  if (extensions.has('.rb')) stack.languages.push('Ruby')
  if (extensions.has('.php')) stack.languages.push('PHP')
  
  // Package manager
  if (files.some(f => f.path === 'package-lock.json')) stack.packageManager = 'npm'
  else if (files.some(f => f.path === 'yarn.lock')) stack.packageManager = 'yarn'
  else if (files.some(f => f.path === 'pnpm-lock.yaml')) stack.packageManager = 'pnpm'
  else if (files.some(f => f.path === 'bun.lockb')) stack.packageManager = 'bun'
  
  // Frameworks
  const pkgJson = files.find(f => f.path === 'package.json')
  if (pkgJson) {
    try {
      const pkg = JSON.parse(pkgJson.content)
      const deps = { ...pkg.dependencies, ...pkg.devDependencies }
      if (deps['next']) stack.frameworks.push('Next.js')
      if (deps['react']) stack.frameworks.push('React')
      if (deps['vue']) stack.frameworks.push('Vue')
      if (deps['svelte']) stack.frameworks.push('Svelte')
      if (deps['express']) stack.frameworks.push('Express')
      if (deps['fastify']) stack.frameworks.push('Fastify')
      if (deps['@nestjs/core']) stack.frameworks.push('NestJS')
      if (deps['prisma'] || deps['@prisma/client']) stack.hasPrisma = true
    } catch {}
  }
  
  // Features
  stack.hasTests = files.some(f => /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(f.path) || f.path.includes('__tests__'))
  stack.hasCI = files.some(f => f.path.includes('.github/workflows') || f.path === '.gitlab-ci.yml')
  stack.hasDocker = files.some(f => f.path === 'Dockerfile' || f.path === 'docker-compose.yml')
  
  // Databases
  if (stack.hasPrisma) stack.databases.push('Prisma')
  if (files.some(f => f.content.includes('mongoose') || f.content.includes('mongodb'))) stack.databases.push('MongoDB')
  if (files.some(f => f.content.includes('pg') || f.content.includes('postgres'))) stack.databases.push('PostgreSQL')
  if (files.some(f => f.content.includes('mysql'))) stack.databases.push('MySQL')
  if (files.some(f => f.content.includes('redis'))) stack.databases.push('Redis')
  
  return stack
}

function analyzeCategory(id: string, label: string, files: RepoFile[], stack: TechStack): CategoryResult {
  const gaps: Gap[] = []
  let score = 100
  
  const hasFile = (pattern: RegExp | string) => 
    typeof pattern === 'string' 
      ? files.some(f => f.path === pattern)
      : files.some(f => pattern.test(f.path))
  
  const hasContent = (pattern: RegExp) => files.some(f => pattern.test(f.content))
  
  switch (id) {
    case 'testing':
      if (!stack.hasTests) {
        gaps.push({ id: 'no-tests', title: 'No tests found', description: 'Add unit tests to improve reliability', severity: 'critical', category: id })
        score -= 40
      }
      if (!hasFile(/vitest\.config|jest\.config|\.mocharc/)) {
        gaps.push({ id: 'no-test-config', title: 'No test configuration', description: 'Configure a test runner', severity: 'warning', category: id })
        score -= 15
      }
      break
      
    case 'security':
      if (hasContent(/['"]sk[-_]live|api[-_]?key\s*[:=]\s*['"][a-zA-Z0-9]{20,}/i)) {
        gaps.push({ id: 'hardcoded-secret', title: 'Potential hardcoded secret', description: 'Move secrets to environment variables', severity: 'blocker', category: id })
        score -= 50
      }
      if (!hasFile('.env.example')) {
        gaps.push({ id: 'no-env-example', title: 'No .env.example', description: 'Document required environment variables', severity: 'warning', category: id })
        score -= 10
      }
      if (!hasFile('.gitignore') || !files.find(f => f.path === '.gitignore')?.content.includes('.env')) {
        gaps.push({ id: 'env-not-ignored', title: '.env may not be gitignored', description: 'Ensure .env is in .gitignore', severity: 'critical', category: id })
        score -= 20
      }
      break
      
    case 'cicd':
      if (!stack.hasCI) {
        gaps.push({ id: 'no-ci', title: 'No CI/CD pipeline', description: 'Add GitHub Actions or similar', severity: 'critical', category: id })
        score -= 40
      }
      break
      
    case 'docker':
      if (!stack.hasDocker) {
        gaps.push({ id: 'no-docker', title: 'No Docker configuration', description: 'Add Dockerfile for consistent deployments', severity: 'warning', category: id })
        score -= 20
      }
      break
      
    case 'errorHandling':
      if (!hasContent(/try\s*\{|\.catch\(|catch\s*\(/)) {
        gaps.push({ id: 'no-error-handling', title: 'Limited error handling', description: 'Add try/catch blocks', severity: 'warning', category: id })
        score -= 20
      }
      if (!hasContent(/sentry|bugsnag|datadog|logrocket/i)) {
        gaps.push({ id: 'no-error-monitoring', title: 'No error monitoring', description: 'Add error tracking service', severity: 'info', category: id })
        score -= 10
      }
      break
      
    case 'documentation':
      if (!hasFile(/readme\.md/i)) {
        gaps.push({ id: 'no-readme', title: 'No README', description: 'Add a README.md', severity: 'critical', category: id })
        score -= 30
      }
      break
      
    case 'typescript':
      if (stack.languages.includes('TypeScript')) {
        if (!hasFile('tsconfig.json')) {
          gaps.push({ id: 'no-tsconfig', title: 'No tsconfig.json', description: 'Add TypeScript configuration', severity: 'warning', category: id })
          score -= 20
        }
        const tsconfig = files.find(f => f.path === 'tsconfig.json')
        if (tsconfig && !tsconfig.content.includes('"strict"')) {
          gaps.push({ id: 'no-strict', title: 'TypeScript strict mode disabled', description: 'Enable strict mode', severity: 'warning', category: id })
          score -= 15
        }
      }
      break
      
    case 'dependencies':
      const pkg = files.find(f => f.path === 'package.json')
      if (pkg) {
        try {
          const parsed = JSON.parse(pkg.content)
          const deps = Object.keys(parsed.dependencies || {})
          if (deps.length > 50) {
            gaps.push({ id: 'too-many-deps', title: 'High dependency count', description: `${deps.length} dependencies - consider auditing`, severity: 'info', category: id })
            score -= 10
          }
        } catch {}
      }
      break
  }
  
  return { id, label, score: Math.max(0, score), maxScore: 100, gaps }
}

function analyze(targetPath: string) {
  const resolvedPath = path.resolve(targetPath)
  
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: Path does not exist: ${resolvedPath}`)
    process.exit(1)
  }
  
  console.log()
  console.log('  ✦ ✦ ✦  ORION  ✦ ✦ ✦')
  console.log('  Production Readiness Analysis')
  console.log()
  console.log(`  Target: ${resolvedPath}`)
  console.log()
  
  const files = getRepoFiles(resolvedPath)
  console.log(`  Scanned ${files.length} files`)
  
  const stack = detectTechStack(files)
  console.log(`  Stack: ${[...stack.languages, ...stack.frameworks].join(', ') || 'Unknown'}`)
  console.log()
  
  const categories = [
    analyzeCategory('security', 'Security', files, stack),
    analyzeCategory('testing', 'Testing', files, stack),
    analyzeCategory('cicd', 'CI/CD', files, stack),
    analyzeCategory('errorHandling', 'Error Handling', files, stack),
    analyzeCategory('documentation', 'Documentation', files, stack),
    analyzeCategory('typescript', 'TypeScript', files, stack),
    analyzeCategory('dependencies', 'Dependencies', files, stack),
    analyzeCategory('docker', 'Docker', files, stack),
  ]
  
  const avgScore = Math.round(categories.reduce((a, c) => a + c.score, 0) / categories.length)
  const allGaps = categories.flatMap(c => c.gaps)
  const blockers = allGaps.filter(g => g.severity === 'blocker')
  const critical = allGaps.filter(g => g.severity === 'critical')
  
  // Ship decision
  let decision = '✅ SHIP'
  let decisionColor = '\x1b[32m'
  if (blockers.length > 0) {
    decision = '❌ DO NOT SHIP'
    decisionColor = '\x1b[31m'
  } else if (critical.length > 2 || avgScore < 60) {
    decision = '⚠️  SHIP WITH CAUTION'
    decisionColor = '\x1b[33m'
  }
  
  console.log('─'.repeat(50))
  console.log()
  console.log(`  ${decisionColor}${decision}\x1b[0m`)
  console.log(`  Overall Score: ${avgScore}/100`)
  console.log()
  console.log('─'.repeat(50))
  console.log()
  
  // Category scores
  console.log('  CATEGORY SCORES')
  console.log()
  for (const cat of categories) {
    const bar = '█'.repeat(Math.floor(cat.score / 10)) + '░'.repeat(10 - Math.floor(cat.score / 10))
    const color = cat.score >= 80 ? '\x1b[32m' : cat.score >= 60 ? '\x1b[33m' : '\x1b[31m'
    console.log(`  ${cat.label.padEnd(16)} ${color}${bar}\x1b[0m ${cat.score}%`)
  }
  console.log()
  
  // Issues
  if (blockers.length > 0) {
    console.log('  🚫 BLOCKERS')
    for (const g of blockers) {
      console.log(`     ${g.title}`)
      console.log(`     \x1b[90m${g.description}\x1b[0m`)
    }
    console.log()
  }
  
  if (critical.length > 0) {
    console.log('  ⚠️  CRITICAL')
    for (const g of critical.slice(0, 5)) {
      console.log(`     ${g.title}`)
    }
    if (critical.length > 5) console.log(`     ... and ${critical.length - 5} more`)
    console.log()
  }
  
  const warnings = allGaps.filter(g => g.severity === 'warning')
  if (warnings.length > 0) {
    console.log('  💡 WARNINGS')
    for (const g of warnings.slice(0, 3)) {
      console.log(`     ${g.title}`)
    }
    if (warnings.length > 3) console.log(`     ... and ${warnings.length - 3} more`)
    console.log()
  }
  
  console.log('─'.repeat(50))
  console.log()
  console.log('  The stars are the limit ✦')
  console.log()
}

// Main
const args = process.argv.slice(2)
const targetPath = args[0] || '.'

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
  ORION - Production Readiness Analysis
  
  Usage:
    npx orion-archi [path]     Analyze a project
    npx orion-archi .          Analyze current directory
    npx orion-archi /path/to   Analyze specific path
  
  Options:
    --help, -h           Show this help
    --version, -v        Show version
`)
  process.exit(0)
}

if (args.includes('--version') || args.includes('-v')) {
  console.log('orion 0.1.0')
  process.exit(0)
}

analyze(targetPath)

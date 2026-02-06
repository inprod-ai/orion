#!/usr/bin/env npx tsx
// =============================================================================
// ANALYZE LOCAL REPOSITORY
// =============================================================================
// Runs Orion analysis on the local codebase

import * as fs from 'fs'
import * as path from 'path'
import { analyzeRepository } from '../lib/orion/analyzer'
import { detectTechStack } from '../lib/orion/stack-detector'
import type { RepoContext } from '../lib/orion/types'

const REPO_PATH = process.cwd()

interface RepoFile {
  path: string
  content: string
  size: number
}

// Read all relevant files from the local repo
function getRepoFiles(dir: string, prefix = ''): RepoFile[] {
  const files: RepoFile[] = []
  const ignoreDirs = ['node_modules', '.git', '.next', 'dist', '.midas', 'coverage', '.husky']
  
  for (const entry of fs.readdirSync(dir)) {
    if (ignoreDirs.includes(entry)) continue
    const fullPath = path.join(dir, entry)
    const relPath = prefix ? `${prefix}/${entry}` : entry
    
    try {
      const stat = fs.statSync(fullPath)
      if (stat.isDirectory()) {
        files.push(...getRepoFiles(fullPath, relPath))
      } else if (/\.(ts|tsx|js|jsx|json|prisma|yml|yaml|md|sql)$/.test(entry) || entry === '.gitignore' || entry === '.env.example') {
        const content = fs.readFileSync(fullPath, 'utf-8')
        // Skip very large files
        if (content.length < 100000) {
          files.push({ path: relPath, content, size: content.length })
        }
      }
    } catch {
      // Skip files we can't read
    }
  }
  return files
}

async function main() {
  console.log('='.repeat(60))
  console.log('ORION SELF-ANALYSIS')
  console.log('='.repeat(60))
  console.log()
  
  console.log('Reading local repository...')
  const files = getRepoFiles(REPO_PATH)
  console.log(`Found ${files.length} analyzable files`)
  console.log()
  
  console.log('Detecting tech stack...')
  const techStack = detectTechStack(files)
  console.log('Stack:', JSON.stringify(techStack, null, 2))
  console.log()
  
  // Find package.json
  const packageJsonFile = files.find(f => f.path === 'package.json')
  const packageJson = packageJsonFile ? JSON.parse(packageJsonFile.content) : undefined
  
  // Find README
  const readmeFile = files.find(f => /readme\.md/i.test(f.path))
  const readme = readmeFile?.content
  
  // Create repo context
  const ctx: RepoContext = {
    files,
    techStack,
    packageJson,
    readme,
  }
  
  console.log('Running production readiness analysis...')
  console.log()
  
  const startTime = Date.now()
  const result = analyzeRepository(ctx)
  const duration = ((Date.now() - startTime) / 1000).toFixed(1)
  
  console.log('='.repeat(60))
  console.log('RESULTS')
  console.log('='.repeat(60))
  console.log()
  
  console.log(`Max Concurrent Users: ${result.formattedMaxUsers}`)
  console.log(`Altitude Zone: ${result.altitude.zone?.displayName || 'Unknown'} (${result.altitude.zone?.altitude?.toLocaleString() || 0} ft)`)
  console.log(`Bottleneck: ${result.altitude.bottleneck.category} (${result.altitude.bottleneck.score}%)`)
  console.log(`Message: ${result.altitudeMessage}`)
  console.log(`Analysis Duration: ${duration}s`)
  console.log()
  
  console.log('Category Scores:')
  for (const cat of result.categories) {
    const bar = '█'.repeat(Math.floor(cat.score / 10)) + '░'.repeat(10 - Math.floor(cat.score / 10))
    console.log(`  ${cat.label.padEnd(20)} ${bar} ${cat.score}%`)
  }
  console.log()
  
  // Collect all gaps from categories
  const allGaps = result.categories.flatMap(c => c.gaps)
  console.log(`Total Gaps Found: ${allGaps.length}`)
  
  // Group gaps by severity
  const bySeverity = {
    blocker: allGaps.filter(g => g.severity === 'blocker'),
    critical: allGaps.filter(g => g.severity === 'critical'),
    warning: allGaps.filter(g => g.severity === 'warning'),
    info: allGaps.filter(g => g.severity === 'info'),
  }
  
  console.log(`  Blockers: ${bySeverity.blocker.length}`)
  console.log(`  Critical: ${bySeverity.critical.length}`)
  console.log(`  Warnings: ${bySeverity.warning.length}`)
  console.log(`  Info: ${bySeverity.info.length}`)
  console.log()
  
  if (bySeverity.blocker.length > 0) {
    console.log('BLOCKERS:')
    for (const gap of bySeverity.blocker) {
      console.log(`  ❌ ${gap.title}`)
      console.log(`     ${gap.description}`)
    }
    console.log()
  }
  
  if (bySeverity.critical.length > 0) {
    console.log('CRITICAL ISSUES:')
    for (const gap of bySeverity.critical.slice(0, 5)) {
      console.log(`  ⚠️  ${gap.title}`)
    }
    if (bySeverity.critical.length > 5) {
      console.log(`  ... and ${bySeverity.critical.length - 5} more`)
    }
    console.log()
  }
  
  if (bySeverity.warning.length > 0) {
    console.log('WARNINGS (top 5):')
    for (const gap of bySeverity.warning.slice(0, 5)) {
      console.log(`  ⚡ ${gap.title}`)
    }
    if (bySeverity.warning.length > 5) {
      console.log(`  ... and ${bySeverity.warning.length - 5} more`)
    }
    console.log()
  }
  
  console.log('='.repeat(60))
}

main().catch(err => {
  console.error('Analysis failed:', err)
  process.exit(1)
})

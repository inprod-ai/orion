// =============================================================================
// MUTATION VERIFIER - Stryker-JS in E2B sandbox
// =============================================================================
// Proves test quality by introducing bugs and checking if tests catch them.
// Only runs on Node/TypeScript projects with passing tests.
// Cost: ~$0.10-0.20 per scan (5-10 min sandbox)

import { Sandbox } from 'e2b'
import type { RepoFile } from '../types'
import type { MutationResult, WeakTest } from './types'

// Max files to mutate (keeps sandbox time under 10 minutes)
const MAX_MUTATE_FILES = 15

/**
 * Run Stryker mutation testing in an E2B sandbox.
 * Only for Node/TypeScript projects.
 */
export async function verifyMutations(
  files: RepoFile[],
  packageManager: 'npm' | 'pnpm' | 'yarn' = 'npm'
): Promise<MutationResult> {
  const startTime = Date.now()

  if (!process.env.E2B_API_KEY) {
    return emptyResult('E2B_API_KEY not configured', startTime)
  }

  let sandbox: Sandbox | null = null

  try {
    sandbox = await Sandbox.create({ timeoutMs: 600_000 }) // 10 min max

    // Write files to sandbox
    for (const file of files) {
      try {
        await sandbox.files.write(`/app/${file.path}`, file.content)
      } catch {
        // Skip files that can't be written
      }
    }

    // Install deps
    const installCmd = packageManager === 'pnpm'
      ? 'pnpm install --frozen-lockfile 2>/dev/null || pnpm install'
      : packageManager === 'yarn'
        ? 'yarn install --frozen-lockfile 2>/dev/null || yarn install'
        : 'npm ci 2>/dev/null || npm install'

    const install = await sandbox.commands.run(installCmd, {
      cwd: '/app',
      timeoutMs: 120_000,
    })

    if (install.exitCode !== 0) {
      return emptyResult('Failed to install dependencies', startTime)
    }

    // Install Stryker
    const strykerInstall = await sandbox.commands.run(
      'npm install --save-dev @stryker-mutator/core @stryker-mutator/typescript-checker @stryker-mutator/vitest-runner @stryker-mutator/jest-runner 2>/dev/null',
      { cwd: '/app', timeoutMs: 60_000 }
    )

    if (strykerInstall.exitCode !== 0) {
      return emptyResult('Failed to install Stryker', startTime)
    }

    // Detect test runner and source files to mutate
    const pkgFile = files.find(f => f.path === 'package.json')
    const pkg = pkgFile ? JSON.parse(pkgFile.content) : {}
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }

    const testRunner = deps['vitest'] ? 'vitest' : 'jest'

    // Find source files to mutate (prioritize API routes, lib code)
    const sourceFiles = files
      .filter(f => (f.path.endsWith('.ts') || f.path.endsWith('.tsx') || f.path.endsWith('.js') || f.path.endsWith('.jsx')))
      .filter(f => !f.path.includes('.test.') && !f.path.includes('.spec.'))
      .filter(f => !f.path.includes('node_modules'))
      .filter(f => !f.path.includes('.config.'))
      .sort((a, b) => {
        // Prioritize: api routes > lib code > components
        const priority = (p: string) => {
          if (p.includes('/api/')) return 0
          if (p.includes('/lib/') || p.includes('/utils/')) return 1
          if (p.includes('/services/')) return 2
          return 3
        }
        return priority(a.path) - priority(b.path)
      })
      .slice(0, MAX_MUTATE_FILES)
      .map(f => f.path)

    if (sourceFiles.length === 0) {
      return emptyResult('No source files found to mutate', startTime)
    }

    // Generate Stryker config
    const strykerConfig = {
      mutate: sourceFiles,
      testRunner,
      reporters: ['json', 'clear-text'],
      coverageAnalysis: 'perTest',
      timeoutMS: 30000,
      thresholds: { high: 80, low: 60, break: null },
      concurrency: 2,
      ...(testRunner === 'vitest' ? {
        vitest: { configFile: 'vitest.config.ts' }
      } : {}),
    }

    await sandbox.files.write('/app/stryker.config.json', JSON.stringify(strykerConfig, null, 2))

    // Run Stryker
    const strykerRun = await sandbox.commands.run(
      'npx stryker run --reporters json,clear-text 2>&1',
      { cwd: '/app', timeoutMs: 540_000 } // 9 min max
    )

    // Parse JSON report
    let jsonReport: string | null = null
    try {
      const reportContent = await sandbox.files.read('/app/reports/mutation/mutation.json')
      jsonReport = reportContent
    } catch {
      // JSON report file may not exist if Stryker failed
    }

    if (jsonReport) {
      return parseStrykerReport(jsonReport, strykerRun.stdout + strykerRun.stderr, startTime)
    }

    // Fall back to parsing clear-text output
    return parseClearTextOutput(strykerRun.stdout + strykerRun.stderr, startTime)

  } catch (error) {
    return emptyResult(
      error instanceof Error ? error.message : 'Mutation testing failed',
      startTime
    )
  } finally {
    if (sandbox) {
      await sandbox.kill()
    }
  }
}

function parseStrykerReport(jsonStr: string, textOutput: string, startTime: number): MutationResult {
  try {
    const report = JSON.parse(jsonStr)
    const files = report.files || {}

    let killed = 0, survived = 0, timeout = 0, noCoverage = 0
    const weakTests: WeakTest[] = []

    for (const [filePath, fileData] of Object.entries(files) as [string, { mutants: Array<{ status: string; killedBy?: string[] }> }][]) {
      for (const mutant of fileData.mutants || []) {
        switch (mutant.status) {
          case 'Killed': killed++; break
          case 'Survived':
            survived++
            break
          case 'Timeout': timeout++; break
          case 'NoCoverage': noCoverage++; break
        }
      }

      // Find files with high survival rates
      const fileMutants = fileData.mutants || []
      const fileSurvived = fileMutants.filter(m => m.status === 'Survived').length
      if (fileSurvived > 2) {
        weakTests.push({
          file: filePath,
          test: `${fileSurvived} mutants survived`,
          survivingMutants: fileSurvived,
        })
      }
    }

    const totalMutants = killed + survived + timeout + noCoverage
    const score = totalMutants > 0 ? Math.round((killed / totalMutants) * 100) : 0

    return {
      success: true,
      score,
      totalMutants,
      killed,
      survived,
      timeout,
      noCoverage,
      weakTests: weakTests.sort((a, b) => b.survivingMutants - a.survivingMutants).slice(0, 10),
      duration: Date.now() - startTime,
      evidence: textOutput.slice(0, 5000),
    }
  } catch {
    return parseClearTextOutput('', startTime)
  }
}

function parseClearTextOutput(output: string, startTime: number): MutationResult {
  // Parse "Mutation score: 72.50%"
  const scoreMatch = output.match(/Mutation score[:\s]+([\d.]+)%/)
  const score = scoreMatch ? parseFloat(scoreMatch[1]) : 0

  // Parse "Killed: 45, Survived: 12, Timeout: 3, NoCoverage: 5"
  const killedMatch = output.match(/Killed[:\s]+(\d+)/)
  const survivedMatch = output.match(/Survived[:\s]+(\d+)/)
  const timeoutMatch = output.match(/Timeout[:\s]+(\d+)/)
  const noCoverageMatch = output.match(/NoCoverage[:\s]+(\d+)/)

  const killed = killedMatch ? parseInt(killedMatch[1]) : 0
  const survived = survivedMatch ? parseInt(survivedMatch[1]) : 0
  const timeout = timeoutMatch ? parseInt(timeoutMatch[1]) : 0
  const noCoverage = noCoverageMatch ? parseInt(noCoverageMatch[1]) : 0

  return {
    success: killed > 0 || survived > 0,
    score: Math.round(score),
    totalMutants: killed + survived + timeout + noCoverage,
    killed,
    survived,
    timeout,
    noCoverage,
    weakTests: [],
    duration: Date.now() - startTime,
    evidence: output.slice(0, 5000),
  }
}

function emptyResult(error: string, startTime: number): MutationResult {
  return {
    success: false,
    score: 0,
    totalMutants: 0,
    killed: 0,
    survived: 0,
    timeout: 0,
    noCoverage: 0,
    weakTests: [],
    duration: Date.now() - startTime,
    evidence: error,
  }
}

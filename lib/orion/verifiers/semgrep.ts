// =============================================================================
// SEMGREP VERIFIER - AST-level security analysis in E2B sandbox
// =============================================================================
// Runs Semgrep CE (free, open source) against the repo to find real
// vulnerabilities via AST pattern matching, not string grep.
// Cost: ~$0.01-0.02 per scan (30-60s sandbox)

import { Sandbox } from 'e2b'
import type { RepoFile } from '../types'

export interface SemgrepFinding {
  ruleId: string
  path: string
  line: number
  column: number
  message: string
  severity: 'ERROR' | 'WARNING' | 'INFO'
  category: string
  metadata?: {
    cwe?: string[]
    owasp?: string[]
    confidence?: string
  }
}

export interface SemgrepResult {
  success: boolean
  findings: SemgrepFinding[]
  errors: string[]
  duration: number
  rulesRun: number
}

/**
 * Run Semgrep in an E2B sandbox against repo files.
 * Uses OWASP and default security rulesets.
 */
export async function runSemgrep(files: RepoFile[]): Promise<SemgrepResult> {
  const startTime = Date.now()

  if (!process.env.E2B_API_KEY) {
    return {
      success: false,
      findings: [],
      errors: ['E2B_API_KEY not configured'],
      duration: 0,
      rulesRun: 0,
    }
  }

  let sandbox: Sandbox | null = null

  try {
    sandbox = await Sandbox.create({ timeoutMs: 120_000 })

    // Write files to sandbox
    for (const file of files) {
      if (file.size > 50_000) continue // Skip large files
      try {
        await sandbox.files.write(`/app/${file.path}`, file.content)
      } catch {
        // Skip files that can't be written (binary, etc.)
      }
    }

    // Install Semgrep
    const install = await sandbox.commands.run(
      'pip install semgrep 2>/dev/null',
      { cwd: '/app', timeoutMs: 60_000 }
    )

    if (install.exitCode !== 0) {
      return {
        success: false,
        findings: [],
        errors: ['Failed to install Semgrep'],
        duration: Date.now() - startTime,
        rulesRun: 0,
      }
    }

    // Run Semgrep with default security rules + OWASP
    const scan = await sandbox.commands.run(
      'semgrep scan --config auto --json --quiet /app 2>/dev/null || true',
      { cwd: '/app', timeoutMs: 90_000 }
    )

    // Parse JSON output
    const findings: SemgrepFinding[] = []
    let rulesRun = 0

    try {
      const output = JSON.parse(scan.stdout)
      rulesRun = output.stats?.total_rules || 0

      for (const result of output.results || []) {
        findings.push({
          ruleId: result.check_id || 'unknown',
          path: (result.path || '').replace('/app/', ''),
          line: result.start?.line || 0,
          column: result.start?.col || 0,
          message: result.extra?.message || result.check_id || 'Security issue',
          severity: mapSeverity(result.extra?.severity || 'WARNING'),
          category: extractCategory(result.check_id || ''),
          metadata: {
            cwe: result.extra?.metadata?.cwe || [],
            owasp: result.extra?.metadata?.owasp || [],
            confidence: result.extra?.metadata?.confidence || 'medium',
          },
        })
      }
    } catch {
      // JSON parse failed, but scan may have still run
      return {
        success: true,
        findings: [],
        errors: ['Failed to parse Semgrep output'],
        duration: Date.now() - startTime,
        rulesRun: 0,
      }
    }

    return {
      success: true,
      findings,
      errors: [],
      duration: Date.now() - startTime,
      rulesRun,
    }
  } catch (error) {
    return {
      success: false,
      findings: [],
      errors: [error instanceof Error ? error.message : 'Semgrep scan failed'],
      duration: Date.now() - startTime,
      rulesRun: 0,
    }
  } finally {
    if (sandbox) {
      await sandbox.kill()
    }
  }
}

function mapSeverity(s: string): 'ERROR' | 'WARNING' | 'INFO' {
  switch (s.toUpperCase()) {
    case 'ERROR': return 'ERROR'
    case 'WARNING': return 'WARNING'
    default: return 'INFO'
  }
}

function extractCategory(ruleId: string): string {
  if (ruleId.includes('injection') || ruleId.includes('sqli')) return 'injection'
  if (ruleId.includes('xss') || ruleId.includes('html')) return 'xss'
  if (ruleId.includes('auth') || ruleId.includes('session')) return 'authentication'
  if (ruleId.includes('crypto') || ruleId.includes('hash')) return 'cryptography'
  if (ruleId.includes('path') || ruleId.includes('traversal')) return 'path-traversal'
  if (ruleId.includes('exec') || ruleId.includes('command')) return 'command-injection'
  if (ruleId.includes('ssrf') || ruleId.includes('redirect')) return 'ssrf'
  return 'security'
}

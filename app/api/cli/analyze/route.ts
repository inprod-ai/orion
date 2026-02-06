// =============================================================================
// API: /api/cli/analyze - CLI analysis with verification pipeline
// =============================================================================
// CLI sends local files. We run the same pipeline as the web API:
// local analyzers + Claude deep analysis + capacity estimation.
// Sandbox verification (compile, semgrep) if E2B is configured.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { analyzeCompleteness } from '@/lib/orion/analyzer'
import { detectTechStack } from '@/lib/orion/stack-detector'
import { estimateCapacity } from '@/lib/orion/verifiers/capacity'
import { verifyCompilation } from '@/lib/orion/verifiers/compile'
import { runSemgrep } from '@/lib/orion/verifiers/semgrep'
import { verifyTests } from '@/lib/orion/verifiers/tests'
import type { RepoFile } from '@/lib/orion/types'

export async function POST(request: NextRequest) {
  try {
    // Validate auth token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const session = await prisma.session.findFirst({
      where: { sessionToken: token },
      include: { User: true },
    })

    if (!session || session.expires < new Date()) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const user = session.User

    // Check usage limits (FREE: 3/month)
    if (user.tier === 'FREE') {
      const thisMonth = new Date()
      thisMonth.setDate(1)
      thisMonth.setHours(0, 0, 0, 0)

      const scansThisMonth = await prisma.scan.count({
        where: { userId: user.id, createdAt: { gte: thisMonth } },
      })

      if (scansThisMonth >= 3) {
        return NextResponse.json({
          error: 'Monthly CLI limit reached (3/month). Upgrade to Pro for unlimited.',
          upgradeUrl: 'https://orion.archi/upgrade',
        }, { status: 403 })
      }
    }

    const body = await request.json()
    const { path: repoPath, files, verification } = body

    if (!files || !Array.isArray(files)) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    // Convert to RepoFile format
    const repoFiles: RepoFile[] = files.slice(0, 200).map((f: { path: string; content: string; size?: number }) => ({
      path: f.path,
      content: (f.content || '').slice(0, 100_000),
      size: f.size || (f.content || '').length,
    }))

    // Phase 1: Run local analyzers on actual file contents
    const localAnalysis = await analyzeCompleteness(repoPath || 'local', repoFiles)
    const techStack = detectTechStack(repoFiles)

    // Phase 2: Capacity estimation
    let capacityEstimate = null
    try {
      capacityEstimate = await estimateCapacity(repoFiles)
    } catch {
      // Non-critical, continue
    }

    // Phase 3: Sandbox verification (if requested and E2B configured)
    let compileResult = null
    let semgrepResult = null
    let testResult = null

    const runSandbox = verification && verification !== 'static' && process.env.E2B_API_KEY

    if (runSandbox) {
      try {
        compileResult = await verifyCompilation(repoFiles, techStack)
      } catch {
        // Non-critical
      }

      try {
        semgrepResult = await runSemgrep(repoFiles)
      } catch {
        // Non-critical
      }

      if (verification === 'test' || verification === 'full') {
        try {
          const stack = techStack.languages.includes('python') ? 'python'
            : techStack.languages.includes('go') ? 'go'
            : 'node' as const
          testResult = await verifyTests(repoFiles, stack)
        } catch {
          // Non-critical
        }
      }
    }

    // Save scan
    const scan = await prisma.scan.create({
      data: {
        userId: user.id,
        repoUrl: repoPath || 'local',
        owner: 'local',
        repo: (repoPath || '').split('/').pop() || 'unknown',
        overallScore: localAnalysis.overallScore,
        categories: localAnalysis.categories as any, // eslint-disable-line @typescript-eslint/no-explicit-any -- Prisma JSON
        findings: localAnalysis.categories.flatMap(c => c.gaps) as any, // eslint-disable-line @typescript-eslint/no-explicit-any -- Prisma JSON
        summary: {
          altitude: localAnalysis.altitude,
          capacity: capacityEstimate,
        } as any, // eslint-disable-line @typescript-eslint/no-explicit-any -- Prisma JSON
      },
    })

    // Build response matching CLI expectations
    const allGaps = localAnalysis.categories.flatMap(c => c.gaps)

    return NextResponse.json({
      scanId: scan.id,
      decision: allGaps.some(g => g.severity === 'blocker') ? 'do_not_ship'
        : allGaps.filter(g => g.severity === 'critical').length > 2 ? 'ship_with_waiver'
        : 'ship',
      overallScore: localAnalysis.overallScore,
      categoryScores: Object.fromEntries(localAnalysis.categories.map(c => [c.category, c.score])),
      blockers: allGaps.filter(g => g.severity === 'blocker'),
      warnings: allGaps.filter(g => g.severity === 'critical' || g.severity === 'warning'),
      info: allGaps.filter(g => g.severity === 'info'),
      altitude: {
        maxUsers: localAnalysis.altitude.maxUsers,
        zone: localAnalysis.altitude.zone.displayName,
        bottleneck: localAnalysis.altitude.bottleneck,
        formatted: localAnalysis.formattedMaxUsers,
      },
      capacity: capacityEstimate ? {
        maxConcurrentUsers: capacityEstimate.maxConcurrentUsers,
        confidence: capacityEstimate.confidence,
        bottleneck: capacityEstimate.bottleneck,
        factors: capacityEstimate.factors,
      } : null,
      verification: (compileResult || semgrepResult || testResult) ? {
        compile: compileResult ? {
          success: compileResult.success,
          errorCount: compileResult.errors.length,
          duration: compileResult.duration,
        } : undefined,
        semgrep: semgrepResult?.success ? {
          findingCount: semgrepResult.findings.length,
          findings: semgrepResult.findings.slice(0, 20),
        } : undefined,
        tests: testResult ? {
          success: testResult.success,
          total: testResult.total,
          passed: testResult.passed,
          failed: testResult.failed,
          coverage: testResult.coverage,
        } : undefined,
      } : null,
      techStack: {
        languages: techStack.languages,
        frameworks: techStack.frameworks,
        platform: techStack.platform,
      },
    })
  } catch (error) {
    console.error('CLI analyze error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Analysis failed',
    }, { status: 500 })
  }
}

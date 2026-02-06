// =============================================================================
// API: /api/analyze - Production readiness analysis with verification levels
// =============================================================================
// Levels:
//   static   - Pattern matching + Claude analysis on actual code (default)
//   compile  - + compile verification in sandbox
//   test     - + run test suite, parse coverage
//   mutation - + Stryker mutation testing
//   load     - + k6 load testing (requires running app)
//   full     - all of the above

import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { ANALYSIS_CATEGORIES } from '@/types/analysis'
import type { AnalysisResult } from '@/types/analysis'
import { getSession } from '@/lib/github-auth'
import { prisma } from '@/lib/prisma'
import { parseGitHubUrl, fetchRepoFiles } from '@/lib/github'
import { analyzeCompleteness } from '@/lib/orion/analyzer'
import { verifyCompilation } from '@/lib/orion/verifiers/compile'
import { verifyTests } from '@/lib/orion/verifiers/tests'
import { runSemgrep } from '@/lib/orion/verifiers/semgrep'
import { verifyMutations } from '@/lib/orion/verifiers/mutation'
import { verifyLoad } from '@/lib/orion/verifiers/load'
import { estimateCapacity } from '@/lib/orion/verifiers/capacity'
import { detectTechStack } from '@/lib/orion/stack-detector'
import type { CompileResult, TestResult, MutationResult, LoadTestResult } from '@/lib/orion/verifiers/types'
import type { SemgrepResult } from '@/lib/orion/verifiers/semgrep'
import type { CapacityEstimate } from '@/lib/orion/verifiers/capacity'

type VerificationLevel = 'static' | 'compile' | 'test' | 'mutation' | 'load' | 'full'

export const maxDuration = 120 // Allow up to 2 minutes for deep verification

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is required')
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// In-memory rate limiting for anonymous users
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>()

export async function POST(request: NextRequest) {
  try {
    // Validate request size
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > 1024) {
      return new Response(JSON.stringify({ error: 'Request too large' }), {
        status: 413, headers: { 'Content-Type': 'application/json' },
      })
    }

    const body = await request.json()

    if (!body.repoUrl) {
      return new Response(JSON.stringify({ error: 'repoUrl is required' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      })
    }

    // SSRF-protected URL parsing
    const parsedRepo = parseGitHubUrl(body.repoUrl)
    if (!parsedRepo) {
      return new Response(JSON.stringify({ error: 'Invalid GitHub URL format' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      })
    }

    const repoUrl = parsedRepo.url
    const owner = body.owner || parsedRepo.owner
    const repo = body.repo || parsedRepo.name

    const verificationLevel: VerificationLevel =
      ['static', 'compile', 'test', 'mutation', 'load', 'full'].includes(body.verification)
        ? body.verification
        : 'static'

    // Auth + rate limiting
    const session = await getSession()

    if (session?.userId) {
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { tier: true, monthlyScans: true, lastResetAt: true },
      })

      if (user) {
        const now = new Date()
        const lastReset = new Date(user.lastResetAt)
        if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
          await prisma.user.update({
            where: { id: session.userId },
            data: { monthlyScans: 0, lastResetAt: now },
          })
          user.monthlyScans = 0
        }

        if (user.tier === 'FREE' && user.monthlyScans >= 3) {
          return new Response(JSON.stringify({ error: 'Monthly scan limit reached. Upgrade to Pro for unlimited scans.' }), {
            status: 403, headers: { 'Content-Type': 'application/json' },
          })
        }
      }
    }

    // IP rate limiting for anonymous users
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const remoteAddr = request.headers.get('remote-addr')
    const ip = (forwarded?.split(',')[0].trim()) || realIp || remoteAddr || 'unknown'

    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^::1$|^[0-9a-fA-F:]+$/
    if (ip !== 'unknown' && !ipRegex.test(ip)) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!session) {
      const now = Date.now()
      const resetTime = now + 24 * 60 * 60 * 1000
      const ipData = ipRequestCounts.get(ip) || { count: 0, resetTime }
      if (now > ipData.resetTime) { ipData.count = 0; ipData.resetTime = resetTime }
      if (ipData.count >= 3) {
        return new Response(JSON.stringify({
          error: 'Rate limit exceeded. Sign in for more requests or try again tomorrow.',
          reset: ipData.resetTime,
        }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': '3',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': ipData.resetTime.toString(),
          },
        })
      }
      ipData.count++
      ipRequestCounts.set(ip, ipData)
    }

    // =========================================================================
    // STREAMING RESPONSE
    // =========================================================================

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'))
        }

        try {
          // ===================================================================
          // PHASE 1: Fetch actual repo files
          // ===================================================================
          send({ progress: { stage: 'fetching', message: 'Fetching repository files...', percentage: 5 } })

          const accessToken = session?.accessToken || process.env.GITHUB_TOKEN
          const repoData = await fetchRepoFiles(repoUrl, accessToken, (event) => {
            send({ progress: {
              stage: 'fetching',
              message: `Fetched ${event.fetched}/${event.total} files...`,
              percentage: 5 + Math.floor((event.fetched / event.total) * 15),
            }})
          })

          send({ progress: { stage: 'analyzing', message: 'Running pattern analysis...', percentage: 22 } })

          // ===================================================================
          // PHASE 2: Run local analyzers on actual file contents
          // ===================================================================
          const localAnalysis = await analyzeCompleteness(repoUrl, repoData.files)
          const techStack = detectTechStack(repoData.files)

          send({ progress: { stage: 'analyzing', message: 'Analyzing code with AI...', percentage: 30 } })

          // ===================================================================
          // PHASE 3: Deep AI analysis -- send actual code to Claude
          // ===================================================================
          // Extract key files for per-route / per-file analysis
          const keyFileContents = extractKeyFileContents(repoData.files)

          const prompt = buildDeepAnalysisPrompt(
            owner, repo, repoData, localAnalysis, keyFileContents
          )

          const aiResponse = await anthropic.messages.create({
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 3000,
            temperature: 0.2,
            messages: [{ role: 'user', content: prompt }],
          })

          // Simulate per-category progress
          let pct = 35
          for (const cat of ANALYSIS_CATEGORIES) {
            send({ progress: { stage: 'scoring', message: `Evaluating ${cat.name}...`, percentage: pct, currentCategory: cat.name } })
            pct += Math.floor(30 / ANALYSIS_CATEGORIES.length)
            await new Promise(r => setTimeout(r, 50))
          }

          // Parse AI response
          const content = aiResponse.content[0]
          if (content.type !== 'text') throw new Error('Unexpected response format')

          let analysisData: Record<string, unknown>
          try {
            // Handle potential markdown code fences
            let jsonStr = content.text.trim()
            const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
            if (jsonMatch) jsonStr = jsonMatch[1].trim()
            analysisData = JSON.parse(jsonStr)
          } catch {
            // Fall back to local analysis if AI parse fails
            analysisData = {
              overallScore: localAnalysis.overallScore,
              categories: localAnalysis.categories.map(c => ({
                name: c.category,
                displayName: c.label,
                score: c.score,
                maxScore: 100,
                applicable: true,
                description: '',
                recommendations: [],
                subcategories: [],
              })),
              findings: localAnalysis.categories.flatMap(c => c.gaps.map(g => ({
                id: g.id,
                title: g.title,
                description: g.description,
                category: g.category,
                severity: g.severity === 'blocker' ? 'critical' : g.severity,
                points: g.severity === 'blocker' ? 10 : g.severity === 'critical' ? 7 : 3,
                effort: g.effortMinutes && g.effortMinutes <= 15 ? 'easy' : 'medium',
                estimatedTime: g.effortMinutes ? `${g.effortMinutes} min` : '30 min',
                fix: g.fixTemplate || '',
              }))),
              summary: {
                strengths: localAnalysis.categories.filter(c => c.score >= 80).map(c => c.label),
                weaknesses: localAnalysis.categories.filter(c => c.score < 50).map(c => c.label),
                topPriorities: localAnalysis.categories
                  .filter(c => c.gaps.some(g => g.severity === 'blocker' || g.severity === 'critical'))
                  .map(c => c.label),
              },
            }
          }

          // Build result with both local analysis + AI deep analysis
          const result: AnalysisResult = {
            repoUrl,
            owner,
            repo,
            overallScore: (analysisData as { overallScore?: number }).overallScore || localAnalysis.overallScore,
            timestamp: new Date(),
            categories: (analysisData as { categories?: AnalysisResult['categories'] }).categories || [],
            findings: (analysisData as { findings?: AnalysisResult['findings'] }).findings || [],
            confidence: {
              level: 'high', // We now read actual code
              score: 80,
              factors: [],
            },
            summary: (analysisData as { summary?: AnalysisResult['summary'] }).summary || { strengths: [], weaknesses: [], topPriorities: [] },
          }

          // ===================================================================
          // PHASE 4: Capacity estimation (always runs, Level 3)
          // ===================================================================
          send({ progress: { stage: 'analyzing', message: 'Estimating capacity from architecture...', percentage: 68 } })

          let capacityEstimate: CapacityEstimate | undefined
          try {
            capacityEstimate = await estimateCapacity(repoData.files)
          } catch (err) {
            console.error('Capacity estimation failed:', err)
          }

          // ===================================================================
          // PHASE 5: Verification levels (conditional)
          // ===================================================================
          let compileResult: CompileResult | undefined
          let testResult: TestResult | undefined
          let semgrepResult: SemgrepResult | undefined
          let mutationResult: MutationResult | undefined
          let loadResult: LoadTestResult | undefined

          const shouldRun = (level: VerificationLevel) => {
            const order: VerificationLevel[] = ['static', 'compile', 'test', 'mutation', 'load', 'full']
            return verificationLevel === 'full' || order.indexOf(verificationLevel) >= order.indexOf(level)
          }

          // Semgrep (runs with compile+ for AST-level security analysis)
          if (shouldRun('compile') && process.env.E2B_API_KEY) {
            send({ progress: { stage: 'verifying', message: 'Running Semgrep security scan...', percentage: 72 } })
            try {
              semgrepResult = await runSemgrep(repoData.files)
            } catch (err) {
              console.error('Semgrep failed:', err)
            }
          }

          // Compile verification
          if (shouldRun('compile') && process.env.E2B_API_KEY) {
            send({ progress: { stage: 'verifying', message: 'Verifying compilation in sandbox...', percentage: 78 } })
            try {
              compileResult = await verifyCompilation(repoData.files, techStack)
            } catch (err) {
              console.error('Compile verification failed:', err)
            }
          }

          // Test verification
          if (shouldRun('test') && process.env.E2B_API_KEY) {
            send({ progress: { stage: 'verifying', message: 'Running test suite in sandbox...', percentage: 84 } })
            try {
              const stack = techStack.languages.includes('python') ? 'python'
                : techStack.languages.includes('go') ? 'go'
                : 'node'
              testResult = await verifyTests(repoData.files, stack)
            } catch (err) {
              console.error('Test verification failed:', err)
            }
          }

          // Mutation testing (Pro only, compute-intensive)
          if (shouldRun('mutation') && process.env.E2B_API_KEY) {
            send({ progress: { stage: 'verifying', message: 'Running mutation testing...', percentage: 88 } })
            try {
              const pm = techStack.packageManager === 'pnpm' ? 'pnpm'
                : techStack.packageManager === 'yarn' ? 'yarn'
                : 'npm'
              mutationResult = await verifyMutations(repoData.files, pm)
            } catch (err) {
              console.error('Mutation testing failed:', err)
            }
          }

          // Load testing (requires running app)
          if (shouldRun('load') && process.env.E2B_API_KEY) {
            send({ progress: { stage: 'verifying', message: 'Running load tests...', percentage: 93 } })
            try {
              const stack = techStack.languages.includes('python') ? 'python'
                : techStack.languages.includes('go') ? 'go'
                : 'node'
              loadResult = await verifyLoad(repoData.files, stack)
            } catch (err) {
              console.error('Load testing failed:', err)
            }
          }

          // ===================================================================
          // PHASE 6: Save scan + build response
          // ===================================================================
          send({ progress: { stage: 'complete', message: 'Analysis complete!', percentage: 100 } })

          // Save to database
          let savedScan
          // Prisma JSON fields require `any` cast for compatibility
          const scanData = {
            repoUrl,
            owner,
            repo,
            overallScore: result.overallScore,
            confidence: result.confidence as any, // eslint-disable-line @typescript-eslint/no-explicit-any -- Prisma JSON field
            categories: result.categories as any, // eslint-disable-line @typescript-eslint/no-explicit-any -- Prisma JSON field
            findings: result.findings as any, // eslint-disable-line @typescript-eslint/no-explicit-any -- Prisma JSON field
            summary: result.summary as any, // eslint-disable-line @typescript-eslint/no-explicit-any -- Prisma JSON field
          }

          if (session?.userId) {
            savedScan = await prisma.scan.create({
              data: { ...scanData, userId: session.userId },
            })
            await prisma.user.update({
              where: { id: session.userId },
              data: { monthlyScans: { increment: 1 } },
            })
          } else {
            savedScan = await prisma.scan.create({ data: scanData })
          }

          // Free tier restrictions
          let finalResult = result
          const currentUser = session?.userId
            ? await prisma.user.findUnique({ where: { id: session.userId }, select: { tier: true } })
            : null

          if (!session?.userId || currentUser?.tier === 'FREE') {
            finalResult = {
              ...result,
              findings: result.findings.slice(0, 2),
              isFreeTier: true,
              totalFindings: result.findings.length,
            } as AnalysisResult & { isFreeTier: boolean; totalFindings: number }
          }

          // Build response with all verification data
          const responseData: Record<string, unknown> = {
            result: finalResult,
            scanId: savedScan.id,
            // Local analysis data (altitude, bottleneck)
            altitude: {
              maxUsers: localAnalysis.altitude.maxUsers,
              zone: localAnalysis.altitude.zone,
              bottleneck: localAnalysis.altitude.bottleneck,
              formattedMaxUsers: localAnalysis.formattedMaxUsers,
            },
          }

          // Capacity estimate (Level 3)
          if (capacityEstimate && capacityEstimate.maxConcurrentUsers > 0) {
            responseData.capacity = capacityEstimate
          }

          // Verification results
          if (compileResult || testResult || semgrepResult || mutationResult || loadResult) {
            responseData.verification = {
              level: verificationLevel,
              ...(compileResult && {
                compile: {
                  success: compileResult.success,
                  errorCount: compileResult.errors.length,
                  warningCount: compileResult.warnings.length,
                  errors: compileResult.errors.slice(0, 10),
                  duration: compileResult.duration,
                },
              }),
              ...(testResult && {
                tests: {
                  success: testResult.success,
                  total: testResult.total,
                  passed: testResult.passed,
                  failed: testResult.failed,
                  skipped: testResult.skipped,
                  coverage: testResult.coverage,
                  failures: testResult.failures.slice(0, 10),
                  duration: testResult.duration,
                },
              }),
              ...(semgrepResult && semgrepResult.success && {
                semgrep: {
                  findingCount: semgrepResult.findings.length,
                  findings: semgrepResult.findings.slice(0, 20),
                  rulesRun: semgrepResult.rulesRun,
                  duration: semgrepResult.duration,
                },
              }),
              ...(mutationResult && mutationResult.success && {
                mutation: {
                  score: mutationResult.score,
                  totalMutants: mutationResult.totalMutants,
                  killed: mutationResult.killed,
                  survived: mutationResult.survived,
                  weakTests: mutationResult.weakTests.slice(0, 5),
                  duration: mutationResult.duration,
                },
              }),
              ...(loadResult && loadResult.success && {
                load: {
                  maxConcurrentUsers: loadResult.maxConcurrentUsers,
                  metrics: loadResult.metrics,
                  bottleneck: loadResult.bottleneck,
                  duration: loadResult.duration,
                },
              }),
            }
          }

          send(responseData)
          controller.close()

        } catch (error) {
          const sanitizedMessage = process.env.NODE_ENV === 'production'
            ? 'Analysis failed'
            : error instanceof Error ? error.message : 'Analysis failed'

          console.error('Analysis error:', {
            message: sanitizedMessage,
            timestamp: new Date().toISOString(),
            ip: ip.substring(0, 10) + '***',
          })

          send({ error: sanitizedMessage })
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    const sanitizedMessage = process.env.NODE_ENV === 'production'
      ? 'Invalid request'
      : error instanceof Error ? error.message : 'Invalid request'

    console.error('Request error:', { message: sanitizedMessage, timestamp: new Date().toISOString() })

    return new Response(JSON.stringify({ error: sanitizedMessage }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }
}

// =============================================================================
// HELPER: Extract key file contents for deep AI analysis
// =============================================================================

function extractKeyFileContents(files: { path: string; content: string; size: number }[]): string {
  const keyPatterns = [
    // API routes (highest value for per-route analysis)
    (f: { path: string }) => f.path.includes('/api/') && f.path.endsWith('route.ts'),
    (f: { path: string }) => f.path.includes('/api/') && f.path.endsWith('route.js'),
    // Middleware
    (f: { path: string }) => f.path.includes('middleware') && !f.path.includes('.test.'),
    // Auth files
    (f: { path: string }) => f.path.includes('auth') && !f.path.includes('.test.') && !f.path.includes('node_modules'),
    // Database/ORM config
    (f: { path: string }) => f.path.endsWith('.prisma') || f.path.includes('drizzle'),
    // Config files
    (f: { path: string }) => f.path.includes('next.config') || f.path === 'vercel.json',
    // Package.json
    (f: { path: string }) => f.path === 'package.json',
    // Key lib files
    (f: { path: string }) => f.path.includes('/lib/') && !f.path.includes('.test.'),
  ]

  let result = ''
  let totalChars = 0
  const MAX_CHARS = 25_000 // ~6K tokens
  const seen = new Set<string>()

  for (const pattern of keyPatterns) {
    for (const file of files) {
      if (seen.has(file.path) || !pattern(file)) continue
      // Truncate large files
      const content = file.content.slice(0, 2000)
      const addition = `\n--- ${file.path} ---\n${content}\n`
      if (totalChars + addition.length > MAX_CHARS) continue
      result += addition
      totalChars += addition.length
      seen.add(file.path)
    }
  }

  return result
}

// =============================================================================
// HELPER: Build deep analysis prompt with actual code
// =============================================================================

function buildDeepAnalysisPrompt(
  owner: string,
  repo: string,
  repoData: { files: { path: string }[]; fileCount: number },
  localAnalysis: { overallScore: number; categories: { category: string; label: string; score: number; gaps: { title: string; severity: string }[] }[] },
  keyFileContents: string
): string {
  // Summary of local analysis results
  const localSummary = localAnalysis.categories
    .map(c => `${c.label}: ${c.score}/100 (${c.gaps.length} gaps${c.gaps.filter(g => g.severity === 'blocker' || g.severity === 'critical').length > 0 ? ', has critical issues' : ''})`)
    .join('\n')

  return `You are a senior security and infrastructure engineer. Analyze this repository's ACTUAL CODE for production readiness.

REPO: ${owner}/${repo} (${repoData.fileCount} files)

LOCAL PATTERN ANALYSIS (already completed):
${localSummary}
Overall: ${localAnalysis.overallScore}/100

ACTUAL CODE FROM KEY FILES:
${keyFileContents}

INSTRUCTIONS:
1. Read the actual code above. Don't guess from file names -- analyze the implementations.
2. For each API route, check: Does it validate input? Handle errors? Check auth? Have rate limiting?
3. For database access, check: Are queries parameterized? Is there connection pooling? Timeouts?
4. For auth, check: Are sessions encrypted? Tokens expiring? CSRF protection applied?
5. Cross-reference: Does the .env.example document all secrets used in code?
6. Each finding must cite a SPECIFIC file and what's wrong in it.

Score categories 0-100. Findings must be from the actual code, not generic advice.

${ANALYSIS_CATEGORIES.map(cat => `- ${cat.name} (weight: ${cat.weight}%)`).join('\n')}

Respond in JSON:
{
  "overallScore": number,
  "categories": [
    { "name": string, "displayName": string, "score": number, "maxScore": number, "applicable": boolean, "description": string, "recommendations": string[], "subcategories": [] }
  ],
  "findings": [
    { "id": string, "title": string, "description": string, "category": "security"|"performance"|"best-practices", "severity": "critical"|"high"|"medium"|"low", "points": number, "effort": "easy"|"medium"|"hard", "estimatedTime": string, "fix": string }
  ],
  "summary": { "strengths": string[], "weaknesses": string[], "topPriorities": string[] }
}`
}

import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { ANALYSIS_CATEGORIES } from '@/types/analysis'
import type { AnalysisResult } from '@/types/analysis'
import { getSession } from '@/lib/github-auth'
import { prisma } from '@/lib/prisma'
import { parseGitHubUrl, fetchRepoFiles } from '@/lib/github'
import { verifyCompilation } from '@/lib/inprod/verifiers/compile'
import { detectTechStack } from '@/lib/inprod/stack-detector'
import type { CompileResult } from '@/lib/inprod/verifiers/types'

// Verification levels: static (default), compile, test, mutation, load, full
type VerificationLevel = 'static' | 'compile' | 'test' | 'mutation' | 'load' | 'full'

// Increase timeout for AI analysis (Vercel Pro: up to 300s)
export const maxDuration = 60

// Validate required environment variables
if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is required')
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// In-memory rate limiting for anonymous users
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>()

export async function POST(request: NextRequest) {
  try {
    // Validate request size
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > 1024) { // 1KB limit
      return new Response(JSON.stringify({ error: 'Request too large' }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const body = await request.json()
    
    // Basic input validation
    if (!body.repoUrl) {
      return new Response(JSON.stringify({ error: 'repoUrl is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // SSRF-protected URL parsing
    const parsedRepo = parseGitHubUrl(body.repoUrl)
    if (!parsedRepo) {
      return new Response(JSON.stringify({ error: 'Invalid GitHub URL format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    
    const repoUrl = parsedRepo.url
    const owner = body.owner || parsedRepo.owner
    const repo = body.repo || parsedRepo.name
    
    // Parse verification level (default: static)
    const verificationLevel: VerificationLevel = 
      ['static', 'compile', 'test', 'mutation', 'load', 'full'].includes(body.verification)
        ? body.verification
        : 'static'
    
    // Get authenticated session
    const session = await getSession()
    
    
    // Check if user has exceeded free tier limits
    if (session?.userId) {
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { tier: true, monthlyScans: true, lastResetAt: true }
      })
      
      if (user) {
        // Reset monthly scans if it's a new month
        const now = new Date()
        const lastReset = new Date(user.lastResetAt)
        if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
          await prisma.user.update({
            where: { id: session.userId },
            data: { monthlyScans: 0, lastResetAt: now }
          })
          user.monthlyScans = 0
        }
        
        // Check scan limits for free tier
        if (user.tier === 'FREE' && user.monthlyScans >= 3) {
          return new Response(JSON.stringify({ error: 'Monthly scan limit reached. Upgrade to Pro for unlimited scans.' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      }
    }
    
    // Persistent rate limiting with better IP detection
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const remoteAddr = request.headers.get('remote-addr')
    const ip = (forwarded?.split(',')[0].trim()) || realIp || remoteAddr || 'unknown'
    
    // Validate IP format
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^::1$|^[0-9a-fA-F:]+$/
    if (ip !== 'unknown' && !ipRegex.test(ip)) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    
    // Rate limiting for anonymous users
    if (!session) {
      const now = Date.now()
      const resetTime = now + (24 * 60 * 60 * 1000) // 24 hours
      const ipData = ipRequestCounts.get(ip) || { count: 0, resetTime }
      
      // Reset if past reset time
      if (now > ipData.resetTime) {
        ipData.count = 0
        ipData.resetTime = resetTime
      }
      
      // Check rate limit (3 requests per day for anonymous)
      if (ipData.count >= 3) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded. Sign in for more requests or try again tomorrow.',
          reset: ipData.resetTime
        }), {
          status: 429,
          headers: { 
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': '3',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': ipData.resetTime.toString()
          },
        })
      }
      
      // Increment count
      ipData.count++
      ipRequestCounts.set(ip, ipData)
    }

    // Create a streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial progress
          controller.enqueue(encoder.encode(JSON.stringify({ 
            progress: { 
              stage: 'fetching', 
              message: 'Fetching repository data...', 
              percentage: 5 
            } 
          }) + '\n'))

          // Fetch GitHub data with timeout and validation
          // Use access token for private repos when user is authenticated
          const accessToken = session?.accessToken
          const fetchWithTimeout = (url: string, timeout = 15000) => {
            const headers: Record<string, string> = {
              'User-Agent': 'InProd-AI-Security-Scanner',
              'Accept': 'application/vnd.github.v3+json'
            }
            // Add auth header for private repo access
            if (accessToken) {
              headers['Authorization'] = `Bearer ${accessToken}`
            }
            return Promise.race([
              fetch(url, { headers }),
              new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('Request timeout')), timeout)
              )
            ])
          }

          const [repoResponse, readmeResponse, languagesResponse, commitsResponse, contentsResponse] = await Promise.all([
            fetchWithTimeout(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`),
            fetchWithTimeout(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`),
            fetchWithTimeout(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/languages`),
            fetchWithTimeout(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?per_page=5`),
            fetchWithTimeout(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents`)
          ])

          if (!repoResponse.ok) {
            if (repoResponse.status === 404) {
              // Could be private repo without access or doesn't exist
              if (!accessToken) {
                throw new Error('Repository not found. If this is a private repo, please sign in first.')
              } else {
                throw new Error('Repository not found or you don\'t have access to this private repo.')
              }
            }
            throw new Error(`GitHub API error: ${repoResponse.status}`)
          }

          controller.enqueue(encoder.encode(JSON.stringify({ 
            progress: { 
              stage: 'fetching', 
              message: 'Analyzing repository structure...', 
              percentage: 15 
            } 
          }) + '\n'))

          // Parse responses in parallel
          const [repoData, languages, recentCommits, contents] = await Promise.all([
            repoResponse.json(),
            languagesResponse.ok ? languagesResponse.json() : {},
            commitsResponse.ok ? commitsResponse.json() : [],
            contentsResponse.ok ? contentsResponse.json() : []
          ])

          const hasReadme = readmeResponse.ok

          // Check for important files (optimized)
          const fileNames = new Set(contents.map((item: any) => item.name.toLowerCase()))
          const hasTests = contents.some((item: any) => {
            const name = item.name.toLowerCase()
            return name.includes('test') || name.includes('spec') || name === '__tests__' || name === 'tests'
          })
          const hasCI = fileNames.has('.github') || fileNames.has('.circleci') || fileNames.has('.gitlab-ci.yml')
          const hasDocker = fileNames.has('dockerfile') || fileNames.has('docker-compose.yml') || fileNames.has('docker-compose.yaml')
          const hasPackageJson = fileNames.has('package.json')
          const hasRequirements = fileNames.has('requirements.txt') || fileNames.has('pyproject.toml') || fileNames.has('pipfile')
          const hasEnvExample = fileNames.has('.env.example') || fileNames.has('.env.sample')
          
          // Detect project type more intelligently
          const hasPackagesDir = contents.some((item: any) => item.name === 'packages' && item.type === 'dir')
          const hasSrcDir = contents.some((item: any) => item.name === 'src' && item.type === 'dir')
          const hasAppDir = contents.some((item: any) => item.name === 'app' && item.type === 'dir')
          const hasPagesDir = contents.some((item: any) => item.name === 'pages' && item.type === 'dir')
          
          // Fetch package.json if exists to understand project type
          let packageJsonData: any = null
          if (hasPackageJson) {
            try {
              const pkgResponse = await fetchWithTimeout(
                `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/package.json`
              )
              if (pkgResponse.ok) {
                const pkgContent = await pkgResponse.json()
                packageJsonData = JSON.parse(Buffer.from(pkgContent.content, 'base64').toString())
              }
            } catch { /* ignore */ }
          }
          
          // Determine project type
          let projectType: 'app' | 'library' | 'framework' | 'monorepo' | 'cli' | 'unknown' = 'unknown'
          let projectTypeReason = ''
          
          if (hasPackagesDir || packageJsonData?.workspaces) {
            projectType = 'monorepo'
            projectTypeReason = 'Has packages/ directory or workspaces config'
          } else if (packageJsonData?.bin) {
            projectType = 'cli'
            projectTypeReason = 'Has bin field in package.json'
          } else if (packageJsonData?.main || packageJsonData?.module || packageJsonData?.exports) {
            if (!hasAppDir && !hasPagesDir) {
              // Check if it's a framework (used by many, foundational)
              if (repoData.stargazers_count > 10000 && repoData.forks_count > 1000) {
                projectType = 'framework'
                projectTypeReason = 'Exports code, high stars/forks, no app structure = framework/library'
              } else {
                projectType = 'library'
                projectTypeReason = 'Has main/module/exports but no app/ or pages/'
              }
            } else {
              projectType = 'app'
              projectTypeReason = 'Has app/ or pages/ directory'
            }
          } else if (hasAppDir || hasPagesDir) {
            projectType = 'app'
            projectTypeReason = 'Has app/ or pages/ directory'
          }

          // Calculate confidence score
          const confidenceFactors = []
          let confidenceScore = 50 // Base confidence
          
          if (hasTests) {
            confidenceScore += 25
          } else {
            confidenceFactors.push('No test files detected')
          }
          
          if (hasCI) {
            confidenceScore += 25
          } else {
            confidenceFactors.push('No CI/CD configuration found')
          }
          
          if (!hasReadme) {
            confidenceFactors.push('No README file')
          }
          
          const confidenceLevel = confidenceScore >= 75 ? 'high' : confidenceScore >= 50 ? 'medium' : 'low'

          // Prepare context for Claude
          const context = {
            repoName: repo,
            description: repoData.description,
            languages: Object.keys(languages),
            primaryLanguage: repoData.language,
            // Project type detection (CRITICAL for accurate analysis)
            projectType,
            projectTypeReason,
            hasReadme,
            hasTests,
            hasCI,
            hasDocker,
            hasPackageJson,
            hasRequirements,
            hasEnvExample,
            // Structure info
            hasPackagesDir,
            hasSrcDir,
            hasAppDir,
            hasPagesDir,
            // package.json fields if available
            hasExports: !!packageJsonData?.exports,
            hasMainModule: !!packageJsonData?.main || !!packageJsonData?.module,
            hasBin: !!packageJsonData?.bin,
            hasWorkspaces: !!packageJsonData?.workspaces,
            peerDependencies: packageJsonData?.peerDependencies ? Object.keys(packageJsonData.peerDependencies) : [],
            // Repo metrics
            stars: repoData.stargazers_count,
            forks: repoData.forks_count,
            openIssues: repoData.open_issues_count,
            lastUpdated: repoData.updated_at,
            recentCommitCount: recentCommits.length,
            fileStructure: Array.from(fileNames).slice(0, 15), // First 15 files/folders
          }

          // Analyze with Claude
          controller.enqueue(encoder.encode(JSON.stringify({ 
            progress: { 
              stage: 'analyzing', 
              message: 'Performing comprehensive analysis...', 
              percentage: 30 
            } 
          }) + '\n'))

          // Build project-type-aware prompt
          const projectTypeGuidance = {
            framework: `This is a FRAMEWORK/LIBRARY (like React, Vue, lodash).
CRITICAL SCORING RULES FOR FRAMEWORKS:
- Testing: Score based on test coverage RATIO, not just "tests exist". Frameworks typically have extensive tests.
- Security: Focus on library-specific concerns (prototype pollution, XSS vectors in rendering, etc.)
- Performance: Bundle size, tree-shaking, build optimization
- NOT APPLICABLE: Authentication, Database, Frontend (it IS the frontend tool), Deployment (users deploy, not the lib)
- Best Practices: TypeScript types, API stability, changelog, semantic versioning, docs quality`,
            
            library: `This is a LIBRARY (reusable code published to npm/PyPI/etc).
SCORING RULES FOR LIBRARIES:
- Testing: Critical - libraries need thorough unit tests
- Security: Dependency audit, no vulnerable patterns
- NOT APPLICABLE: Authentication, Database, Deployment (unless it's a deployment tool)
- Best Practices: Types, exports, documentation, examples`,
            
            monorepo: `This is a MONOREPO with multiple packages.
SCORING RULES FOR MONOREPOS:
- Evaluate the overall architecture and shared tooling
- Testing: Look for test infrastructure across packages
- CI/CD: Critical - needs build/test orchestration`,
            
            cli: `This is a CLI TOOL.
SCORING RULES FOR CLI TOOLS:
- Testing: Command tests, argument parsing tests
- NOT APPLICABLE: Frontend, Design/UX (unless it's a TUI), Database (unless it uses one)
- Best Practices: Error messages, help text, exit codes`,
            
            app: `This is a WEB APPLICATION.
Apply standard web app scoring across all categories.`,
            
            unknown: `Could not determine project type. Apply general best practices.`
          }
          
          const prompt = `Analyze this GitHub repository for production readiness.

PROJECT TYPE: ${projectType.toUpperCase()}
${projectTypeGuidance[projectType]}

Repository Context:
${JSON.stringify(context, null, 2)}

CRITICAL INSTRUCTIONS:
1. Score ONLY categories that apply to this project type. Mark others as "applicable": false.
2. For libraries/frameworks with hasTests=true, assume good test coverage unless proven otherwise.
3. High stars+forks suggests mature, battle-tested code - don't give low scores without evidence.
4. Be specific to this project type - don't suggest "add authentication" to a utility library.
5. Each finding must be actionable and RELEVANT to what this project actually is.

Provide analysis with:

1. Category Scores for applicable categories only:
${ANALYSIS_CATEGORIES.map(cat => `- ${cat.name} (weight: ${cat.weight}%)`).join('\n')}

2. Top 3-5 actionable findings SPECIFIC to this project type:
   - Clear title and description (1-2 sentences)
   - Category (security/performance/best-practices)
   - Severity (critical/high/medium/low)
   - Points (critical: 8-10, high: 5-7, medium: 2-4, low: 1)
   - Effort level and time estimate
   - Specific fix (relevant to project type)

3. Summary acknowledging what the project IS

Respond in JSON:
{
  "overallScore": number,
  "categories": [
    {
      "name": string,
      "displayName": string,
      "score": number,
      "maxScore": number,
      "applicable": boolean,
      "description": string,
      "recommendations": string[],
      "subcategories": []
    }
  ],
  "findings": [
    {
      "id": string,
      "title": string,
      "description": string,
      "category": "security" | "performance" | "best-practices",
      "severity": "critical" | "high" | "medium" | "low",
      "points": number,
      "effort": "easy" | "medium" | "hard",
      "estimatedTime": string,
      "fix": string
    }
  ],
  "summary": {
    "strengths": string[],
    "weaknesses": string[],
    "topPriorities": string[]
  }
}`

          // Use Haiku for speed (3-5s vs 30-60s with Sonnet)
          const response = await anthropic.messages.create({
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 2500,
            temperature: 0.3,
            messages: [{
              role: 'user',
              content: prompt
            }]
          })

          // Send progress updates for each category
          let progressPercentage = 40
          for (const category of ANALYSIS_CATEGORIES) {
            controller.enqueue(encoder.encode(JSON.stringify({ 
              progress: { 
                stage: 'scoring', 
                message: `Evaluating ${category.name}...`, 
                percentage: progressPercentage,
                currentCategory: category.name
              } 
            }) + '\n'))
            progressPercentage += Math.floor(50 / ANALYSIS_CATEGORIES.length)
            await new Promise(resolve => setTimeout(resolve, 100)) // Reduced delay
          }

          // Parse Claude's response
          const content = response.content[0]
          if (content.type !== 'text') {
            throw new Error('Unexpected response format')
          }

          const analysisData = JSON.parse(content.text)
          
          const result: AnalysisResult = {
            repoUrl,
            owner,
            repo,
            overallScore: analysisData.overallScore,
            timestamp: new Date(),
            categories: analysisData.categories,
            findings: analysisData.findings || [],
            confidence: {
              level: confidenceLevel,
              score: confidenceScore,
              factors: confidenceFactors
            },
            summary: analysisData.summary
          }

          // Save scan to database
          let savedScan
          if (session?.userId) {
            savedScan = await prisma.scan.create({
              data: {
                userId: session.userId,
                repoUrl,
                owner,
                repo,
                overallScore: result.overallScore,
                confidence: result.confidence as any,
                categories: result.categories as any,
                findings: result.findings as any,
                summary: result.summary as any,
              }
            })
            
            // Increment user's monthly scan count
            await prisma.user.update({
              where: { id: session.userId },
              data: { monthlyScans: { increment: 1 } }
            })
          } else {
            // Save anonymous scan
            savedScan = await prisma.scan.create({
              data: {
                repoUrl,
                owner,
                repo,
                overallScore: result.overallScore,
                confidence: result.confidence as any,
                categories: result.categories as any,
                findings: result.findings as any,
                summary: result.summary as any,
              }
            })
          }
          
          // Run compile verification if requested
          let compileResult: CompileResult | undefined
          
          if (verificationLevel !== 'static') {
            controller.enqueue(encoder.encode(JSON.stringify({ 
              progress: { 
                stage: 'verifying', 
                message: 'Running compile verification in sandbox...', 
                percentage: 92 
              } 
            }) + '\n'))
            
            try {
              // Fetch full repo files for verification
              const repoFiles = await fetchRepoFiles(repoUrl, session?.accessToken)
              const techStack = detectTechStack(repoFiles.files)
              
              // Run compile verification
              compileResult = await verifyCompilation(repoFiles.files, techStack)
              
              controller.enqueue(encoder.encode(JSON.stringify({ 
                progress: { 
                  stage: 'verifying', 
                  message: compileResult.success 
                    ? 'Compile verification passed!' 
                    : `Compile verification failed: ${compileResult.errors.length} errors`,
                  percentage: 98 
                } 
              }) + '\n'))
            } catch (verifyError) {
              console.error('Verification error:', verifyError)
              compileResult = {
                success: false,
                errors: [{
                  file: '',
                  message: verifyError instanceof Error ? verifyError.message : 'Verification failed',
                  severity: 'error'
                }],
                warnings: [],
                duration: 0,
                evidence: ''
              }
            }
          }
          
          // Apply free tier restrictions if not authenticated or free user
          let finalResult = result
          const currentUser = session?.userId 
            ? await prisma.user.findUnique({ where: { id: session.userId }, select: { tier: true } })
            : null
          
          if (!session?.userId || currentUser?.tier === 'FREE') {
            // Only show top 2 findings for free tier
            finalResult = {
              ...result,
              findings: result.findings.slice(0, 2),
              isFreeTier: true,
              totalFindings: result.findings.length
            } as any
          }

          // Send final result
          controller.enqueue(encoder.encode(JSON.stringify({ 
            progress: { 
              stage: 'complete', 
              message: 'Analysis complete!', 
              percentage: 100 
            } 
          }) + '\n'))

          // Build response with verification data if available
          const responseData: Record<string, unknown> = { 
            result: finalResult, 
            scanId: savedScan.id 
          }
          
          if (compileResult) {
            responseData.verification = {
              level: verificationLevel,
              compile: {
                success: compileResult.success,
                errorCount: compileResult.errors.length,
                warningCount: compileResult.warnings.length,
                errors: compileResult.errors.slice(0, 10), // Limit to 10 errors
                duration: compileResult.duration
              }
            }
          }
          
          controller.enqueue(encoder.encode(JSON.stringify(responseData) + '\n'))
          controller.close()

        } catch (error) {
          // Sanitize error messages for production
          const sanitizedMessage = process.env.NODE_ENV === 'production' 
            ? 'Analysis failed' 
            : error instanceof Error ? error.message : 'Analysis failed'
          
          console.error('Analysis error:', {
            message: sanitizedMessage,
            timestamp: new Date().toISOString(),
            ip: ip.substring(0, 10) + '***' // Partially mask IP in logs
          })
          
          controller.enqueue(encoder.encode(JSON.stringify({ 
            error: sanitizedMessage
          }) + '\n'))
          controller.close()
        }
      }
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
      
    console.error('Request error:', {
      message: sanitizedMessage,
      timestamp: new Date().toISOString()
    })
    
    return new Response(JSON.stringify({ 
      error: sanitizedMessage
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

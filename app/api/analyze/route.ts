import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { ANALYSIS_CATEGORIES } from '@/types/analysis'
import type { AnalysisResult, CategoryScore, Finding } from '@/types/analysis'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// Rate limiting cache
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const limit = 5 // 5 requests per day
  const windowMs = 24 * 60 * 60 * 1000 // 24 hours

  const record = ipRequestCounts.get(ip)
  
  if (!record || now > record.resetTime) {
    ipRequestCounts.set(ip, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count >= limit) {
    return false
  }

  record.count++
  return true
}

export async function POST(request: NextRequest) {
  try {
    const { repoUrl, owner, repo } = await request.json()
    
    // Get authenticated session
    const session = await auth()
    
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(ip)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again tomorrow.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    
    // Check if user has exceeded free tier limits
    if (session?.user) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { tier: true, monthlyScans: true, lastResetAt: true }
      })
      
      if (user) {
        // Reset monthly scans if it's a new month
        const now = new Date()
        const lastReset = new Date(user.lastResetAt)
        if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
          await prisma.user.update({
            where: { id: session.user.id },
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
    
    // Use identifier based on session or IP
    const rateLimitId = session?.user?.id || `ip:${ip}`
    const rateLimitResult = await rateLimit(rateLimitId, 5) // 5 requests per day
    
    if (!rateLimitResult.success) {
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded. Try again tomorrow.',
        reset: rateLimitResult.reset
      }), {
        status: 429,
        headers: { 
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString()
        },
      })
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
          const fetchWithTimeout = (url: string, timeout = 10000) => {
            return Promise.race([
              fetch(url, {
                headers: {
                  'User-Agent': 'InProd-AI-Security-Scanner',
                  'Accept': 'application/vnd.github.v3+json'
                }
              }),
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
            throw new Error('Repository not found')
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
            hasReadme,
            hasTests,
            hasCI,
            hasDocker,
            hasPackageJson,
            hasRequirements,
            hasEnvExample,
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

          const prompt = `Analyze this GitHub repository for production readiness focusing on Security (40%), Performance (30%), and Best Practices (30%).

Repository Context:
${JSON.stringify(context, null, 2)}

IMPORTANT: Be concise in your responses. Focus on the most critical issues. Each finding description should be 1-2 sentences max.

Provide a comprehensive analysis with:

1. Category Scores for:
${ANALYSIS_CATEGORIES.map(cat => `- ${cat.name} (weight: ${cat.weight}%)`).join('\n')}

2. Top 5-7 actionable findings that would improve the score, each with:
   - Clear title and description
   - Category (security/performance/best-practices)
   - Severity (critical/high/medium/low)
   - Points that would be added if fixed (critical: 8-10, high: 5-7, medium: 2-4, low: 1)
   - Effort level (easy/medium/hard) and time estimate
   - Specific fix instructions

3. Summary with strengths, weaknesses, and priorities

Respond in JSON format:
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

          const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 2500, // Reduced for faster response
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
          if (session?.user) {
            savedScan = await prisma.scan.create({
              data: {
                userId: session.user.id,
                repoUrl,
                owner,
                repo,
                overallScore: result.overallScore,
                confidence: result.confidence,
                categories: result.categories,
                findings: result.findings,
                summary: result.summary,
              }
            })
            
            // Increment user's monthly scan count
            await prisma.user.update({
              where: { id: session.user.id },
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
                confidence: result.confidence,
                categories: result.categories,
                findings: result.findings,
                summary: result.summary,
              }
            })
          }
          
          // Apply free tier restrictions if not authenticated or free user
          let finalResult = result
          if (!session?.user || (session.user as any).tier === 'FREE') {
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

          controller.enqueue(encoder.encode(JSON.stringify({ result: finalResult, scanId: savedScan.id }) + '\n'))
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

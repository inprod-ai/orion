import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// CLI sends files + metadata, we analyze and return findings
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
      include: { User: true }
    })

    if (!session || session.expires < new Date()) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const user = session.User

    // Check usage limits
    // FREE: 3 completions/month, PRO: unlimited
    if (user.tier === 'FREE') {
      const thisMonth = new Date()
      thisMonth.setDate(1)
      thisMonth.setHours(0, 0, 0, 0)
      
      const completionsThisMonth = await prisma.scan.count({
        where: {
          userId: user.id,
          createdAt: { gte: thisMonth }
        }
      })
      
      if (completionsThisMonth >= 3) {
        return NextResponse.json({ 
          error: 'Monthly CLI limit reached (3/month). Upgrade to Pro for unlimited.',
          upgradeUrl: 'https://inprod.ai/upgrade'
        }, { status: 403 })
      }
    }

    const body = await request.json()
    const { path, techStack, categories, files } = body

    if (!files || !Array.isArray(files)) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    // Build analysis prompt with file contents
    const fileContext = files.slice(0, 50).map((f: any) => 
      `--- ${f.path} ---\n${f.content?.slice(0, 5000) || '[binary or too large]'}`
    ).join('\n\n')

    const prompt = `Analyze this codebase for production readiness across 12 categories.

Tech Stack: ${JSON.stringify(techStack)}
Categories to focus on: ${categories?.join(', ') || 'all'}

Files:
${fileContext}

Analyze and return findings in this JSON format:
{
  "decision": "ship" | "ship_with_waiver" | "do_not_ship",
  "blockers": [
    {
      "id": "unique-id",
      "category": "security|testing|error_handling|...",
      "severity": "blocker",
      "title": "Issue title",
      "description": "What's wrong",
      "filePath": "path/to/file.ts",
      "lineStart": 42,
      "confidence": 95,
      "detectionMethod": "static_analysis|pattern_matching|semantic",
      "effortMinutes": [15, 30],
      "fix": {
        "type": "instant|suggested|guided",
        "description": "How to fix",
        "codeBefore": "original code",
        "codeAfter": "fixed code"
      }
    }
  ],
  "warnings": [...],
  "info": [...],
  "categoryScores": {
    "frontend": 85,
    "backend": 70,
    ...
  },
  "overallScore": 72,
  "effortRange": [2, 4],
  "instantFixes": 5
}

Focus on:
1. Security issues (hardcoded secrets, SQL injection, XSS)
2. Missing error handling
3. Missing tests
4. Missing input validation
5. Production readiness (timeouts, rate limiting, health checks)

Be specific with file paths and line numbers. Confidence should reflect certainty.`

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }]
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response format')
    }

    // Parse and validate response
    let analysisData
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found')
      analysisData = JSON.parse(jsonMatch[0])
    } catch {
      throw new Error('Failed to parse analysis response')
    }

    // Save scan to database
    const scan = await prisma.scan.create({
      data: {
        userId: user.id,
        repoUrl: path,
        owner: 'local',
        repo: path.split('/').pop() || 'unknown',
        overallScore: analysisData.overallScore,
        categories: analysisData.categoryScores,
        findings: [...analysisData.blockers, ...analysisData.warnings, ...analysisData.info],
        summary: { decision: analysisData.decision }
      }
    })

    return NextResponse.json({
      ...analysisData,
      scanId: scan.id,
      repoPath: path,
      techStack,
      scanTime: Date.now()
    })

  } catch (error) {
    console.error('CLI analyze error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Analysis failed' 
    }, { status: 500 })
  }
}


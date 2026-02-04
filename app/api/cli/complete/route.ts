import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// Generate missing code, tests, and configs
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
          error: 'Monthly CLI limit reached. Upgrade to Pro for unlimited.',
          upgradeUrl: 'https://inprod.ai/upgrade'
        }, { status: 403 })
      }
    }

    const body = await request.json()
    const { path, categories, files } = body

    if (!files || !Array.isArray(files)) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    // Detect what's missing
    const fileNames = files.map((f: any) => f.path.toLowerCase())
    const hasTests = fileNames.some((f: string) => f.includes('test') || f.includes('spec'))
    const hasCI = fileNames.some((f: string) => f.includes('.github/workflows') || f.includes('ci'))
    const hasReadme = fileNames.includes('readme.md')
    const hasEnvExample = fileNames.includes('.env.example')

    // Build file context for generation
    const fileContext = files.slice(0, 30).map((f: any) => 
      `--- ${f.path} ---\n${f.content?.slice(0, 3000) || '[binary]'}`
    ).join('\n\n')

    // Detect stack from files
    const hasPackageJson = fileNames.includes('package.json')
    const hasSwiftPackage = fileNames.some((f: string) => f.includes('package.swift'))
    const hasPyproject = fileNames.includes('pyproject.toml') || fileNames.includes('requirements.txt')
    const hasGoMod = fileNames.includes('go.mod')

    let stack = 'typescript'
    if (hasSwiftPackage) stack = 'swift'
    else if (hasPyproject) stack = 'python'
    else if (hasGoMod) stack = 'go'

    const prompt = `You are a code completion engine. Analyze this ${stack} codebase and generate ALL missing production-ready code.

Current state:
- Has tests: ${hasTests}
- Has CI/CD: ${hasCI}
- Has README: ${hasReadme}
- Has .env.example: ${hasEnvExample}
- Categories requested: ${categories?.join(', ') || 'all'}

Files:
${fileContext}

Generate the following in JSON format:
{
  "filesGenerated": [
    {
      "path": "relative/path/to/new/file.ts",
      "category": "testing|security|error_handling|deployment|documentation",
      "content": "full file contents",
      "confidence": 85
    }
  ],
  "filesModified": [
    {
      "path": "existing/file.ts",
      "changeType": "modified",
      "diff": "unified diff format"
    }
  ]
}

GENERATE THESE IF MISSING:
1. Unit tests for main functions (Jest/XCTest/pytest based on stack)
2. .env.example with all required environment variables
3. Error handling wrappers for API calls
4. Input validation (Zod schemas or equivalent)
5. GitHub Actions CI workflow
6. README.md with setup instructions

For ${stack} projects, use appropriate conventions:
- TypeScript: Jest, Zod, ESLint
- Swift: XCTest, structured concurrency
- Python: pytest, pydantic
- Go: go test, standard library

IMPORTANT:
- Generate COMPLETE, RUNNABLE files
- Include all imports
- Follow the existing code style
- Each file should be production-ready`

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 8000,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }]
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response format')
    }

    // Parse response
    let generationData
    try {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found')
      generationData = JSON.parse(jsonMatch[0])
    } catch {
      throw new Error('Failed to parse generation response')
    }

    // Track in database
    await prisma.scan.create({
      data: {
        userId: user.id,
        repoUrl: path,
        owner: 'local',
        repo: path.split('/').pop() || 'unknown',
        overallScore: 0,
        categories: {},
        findings: [],
        summary: { 
          type: 'completion',
          filesGenerated: generationData.filesGenerated?.length || 0,
          filesModified: generationData.filesModified?.length || 0
        }
      }
    })

    return NextResponse.json({
      ...generationData,
      testsCreated: generationData.filesGenerated?.filter((f: any) => 
        f.category === 'testing'
      ).length || 0
    })

  } catch (error) {
    console.error('CLI complete error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Completion failed' 
    }, { status: 500 })
  }
}


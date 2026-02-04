import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// Generate fixes for specific findings
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

    const body = await request.json()
    const { path, category, instantOnly, findingId, files } = body

    if (!files || !Array.isArray(files)) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    // Build context from files
    const fileContext = files.slice(0, 20).map((f: any) => 
      `--- ${f.path} ---\n${f.content?.slice(0, 3000) || '[binary]'}`
    ).join('\n\n')

    // Build fix-specific prompt
    let focusInstruction = ''
    if (findingId) {
      focusInstruction = `Focus ONLY on fixing the issue with ID: ${findingId}`
    } else if (category) {
      focusInstruction = `Focus ONLY on ${category} issues`
    } else if (instantOnly) {
      focusInstruction = `Generate ONLY instant/safe fixes that can be auto-applied:
- Adding missing null checks
- Adding timeouts to fetch calls
- Fixing import paths
- Adding missing type annotations
- Removing console.log statements
DO NOT generate fixes that change behavior.`
    } else {
      focusInstruction = 'Generate fixes for all detected issues'
    }

    const prompt = `You are a code fix generator. Analyze this codebase and generate specific fixes.

${focusInstruction}

Files:
${fileContext}

Return fixes in this JSON format:
{
  "filesModified": [
    {
      "path": "path/to/file.ts",
      "changeType": "modified",
      "diff": "@@ -42,3 +42,5 @@\\n original code\\n-removed line\\n+added line"
    }
  ],
  "fixesSummary": [
    {
      "findingId": "id",
      "title": "What was fixed",
      "type": "instant|suggested|guided",
      "filePath": "path/to/file.ts",
      "description": "Description of fix"
    }
  ]
}

FIX TYPES:
- instant: Safe to auto-apply (null checks, timeouts, imports)
- suggested: Review recommended (error handling, validation)
- guided: Needs manual review (refactoring, architecture)

For each fix:
1. Show exact file path
2. Provide unified diff format
3. Explain what changed and why
4. Mark the fix type appropriately`

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

    // Parse response
    let fixData
    try {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found')
      fixData = JSON.parse(jsonMatch[0])
    } catch {
      throw new Error('Failed to parse fix response')
    }

    // Count fix types
    const instantCount = fixData.fixesSummary?.filter((f: any) => f.type === 'instant').length || 0
    const suggestedCount = fixData.fixesSummary?.filter((f: any) => f.type === 'suggested').length || 0
    const guidedCount = fixData.fixesSummary?.filter((f: any) => f.type === 'guided').length || 0

    return NextResponse.json({
      ...fixData,
      summary: {
        instant: instantCount,
        suggested: suggestedCount,
        guided: guidedCount,
        total: fixData.fixesSummary?.length || 0
      }
    })

  } catch (error) {
    console.error('CLI fix error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Fix generation failed' 
    }, { status: 500 })
  }
}


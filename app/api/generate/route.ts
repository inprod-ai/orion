// =============================================================================
// API: /api/generate - Generate fixes for identified gaps
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { analyzeCompleteness, getInstantFixGaps } from '@/lib/orion/analyzer'
import { fetchRepoFiles } from '@/lib/github'
import { RepoFile, Gap, Category, GeneratedFile } from '@/lib/orion/types'
import { generateSecurityFixes } from '@/lib/orion/generators/security'
import { generateTests } from '@/lib/orion/generators/testing'
import { generateCICD } from '@/lib/orion/generators/cicd'
import { generateReadme } from '@/lib/orion/generators/readme'

interface GenerateRequest {
  repoUrl: string
  files?: RepoFile[]
  categories?: Category[]
  gapsToFix?: string[] // Gap IDs to fix
  instantOnly?: boolean // Only auto-fixable gaps
  accessToken?: string // For private repos
}

export async function POST(req: NextRequest) {
  try {
    const body: GenerateRequest = await req.json()
    const { repoUrl, files, categories, gapsToFix, instantOnly, accessToken } = body
    
    if (!repoUrl) {
      return NextResponse.json({ error: 'repoUrl is required' }, { status: 400 })
    }
    
    // Get files if not provided
    let repoFiles: RepoFile[] = files || []
    if (repoFiles.length === 0) {
      const result = await fetchRepoFiles(repoUrl, accessToken)
      repoFiles = result.files
    }
    
    // Analyze the repo
    const analysis = await analyzeCompleteness(repoUrl, repoFiles)
    
    // Determine which gaps to fix
    let targetGaps: Gap[]
    
    if (gapsToFix && gapsToFix.length > 0) {
      // Fix specific gaps
      targetGaps = analysis.categories
        .flatMap(c => c.gaps)
        .filter(g => gapsToFix.includes(g.id))
    } else if (instantOnly) {
      // Only instant-fix gaps
      targetGaps = getInstantFixGaps(analysis)
    } else if (categories && categories.length > 0) {
      // All gaps in specified categories
      targetGaps = analysis.categories
        .filter(c => categories.includes(c.category))
        .flatMap(c => c.gaps)
    } else {
      // All instant-fix gaps
      targetGaps = getInstantFixGaps(analysis)
    }
    
    // Build context for generators
    const packageJsonFile = repoFiles.find(f => f.path === 'package.json')
    const packageJson = packageJsonFile 
      ? JSON.parse(packageJsonFile.content) 
      : undefined
    
    const readmeFile = repoFiles.find(f => f.path.toLowerCase() === 'readme.md')
    
    const ctx = {
      files: repoFiles,
      techStack: analysis.techStack,
      packageJson,
      readme: readmeFile?.content,
    }
    
    // Generate fixes by category
    const generatedFiles: GeneratedFile[] = []
    
    // Group gaps by category
    const gapsByCategory = new Map<Category, Gap[]>()
    for (const gap of targetGaps) {
      const existing = gapsByCategory.get(gap.category) || []
      existing.push(gap)
      gapsByCategory.set(gap.category, existing)
    }
    
    // Security fixes
    const securityGaps = gapsByCategory.get('security') || []
    if (securityGaps.length > 0) {
      const securityFiles = await generateSecurityFixes(ctx, securityGaps)
      generatedFiles.push(...securityFiles)
    }
    
    // Testing fixes
    const testingGaps = gapsByCategory.get('testing') || []
    if (testingGaps.length > 0) {
      const testFiles = await generateTests(ctx, testingGaps)
      generatedFiles.push(...testFiles)
    }
    
    // Deployment/CI fixes
    const deployGaps = gapsByCategory.get('deployment') || []
    if (deployGaps.length > 0) {
      const cicdFiles = await generateCICD(ctx, deployGaps)
      generatedFiles.push(...cicdFiles)
    }
    
    // Version control (README)
    const vcGaps = gapsByCategory.get('versionControl') || []
    const needsReadme = vcGaps.some(g => g.id === 'vc-no-readme')
    if (needsReadme) {
      const readmeFiles = await generateReadme(ctx)
      generatedFiles.push(...readmeFiles)
    }
    
    return NextResponse.json({
      success: true,
      generatedFiles,
      summary: {
        totalGaps: targetGaps.length,
        filesGenerated: generatedFiles.length,
        categories: Array.from(gapsByCategory.keys()),
      },
    })
  } catch (error) {
    console.error('Generate API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    )
  }
}



// =============================================================================
// API: /api/complete - Analyze repo for completeness
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { analyzeCompleteness, generateCompletionPlan, formatAnalysisSummary } from '@/lib/orion/analyzer'
import { fetchRepoFiles } from '@/lib/github'
import { RepoFile } from '@/lib/orion/types'

export async function POST(req: NextRequest) {
  try {
    const { repoUrl, files, accessToken } = await req.json()
    
    if (!repoUrl) {
      return NextResponse.json({ error: 'repoUrl is required' }, { status: 400 })
    }
    
    // If files not provided, fetch from GitHub
    let repoFiles: RepoFile[] = files
    if (!repoFiles || repoFiles.length === 0) {
      const result = await fetchRepoFiles(repoUrl, accessToken)
      repoFiles = result.files
    }
    
    // Analyze completeness
    const analysis = await analyzeCompleteness(repoUrl, repoFiles)
    
    // Generate completion plan
    const plan = generateCompletionPlan(analysis)
    
    // Format summary
    const summary = formatAnalysisSummary(analysis)
    
    return NextResponse.json({
      analysis,
      plan,
      summary,
    })
  } catch (error) {
    console.error('Complete API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    )
  }
}


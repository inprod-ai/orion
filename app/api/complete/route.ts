// =============================================================================
// API: /api/complete - Analyze repo for completeness
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { analyzeCompleteness, generateCompletionPlan, formatAnalysisSummary } from '@/lib/inprod/analyzer'
import { RepoFile } from '@/lib/inprod/types'

export async function POST(req: NextRequest) {
  try {
    const { repoUrl, files, scanId } = await req.json()
    
    if (!repoUrl) {
      return NextResponse.json({ error: 'repoUrl is required' }, { status: 400 })
    }
    
    // If files not provided, fetch from GitHub
    let repoFiles: RepoFile[] = files
    if (!repoFiles || repoFiles.length === 0) {
      repoFiles = await fetchRepoFiles(repoUrl)
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

async function fetchRepoFiles(repoUrl: string): Promise<RepoFile[]> {
  // Extract owner/repo from URL
  const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\s#?]+)/)
  if (!match) {
    throw new Error('Invalid GitHub URL')
  }
  
  const [, owner, repo] = match
  const cleanRepo = repo.replace(/\.git$/, '')
  
  // Fetch repo tree
  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${cleanRepo}/git/trees/HEAD?recursive=1`,
    {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        ...(process.env.GITHUB_TOKEN && {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
        }),
      },
    }
  )
  
  if (!treeRes.ok) {
    throw new Error(`Failed to fetch repo: ${treeRes.status}`)
  }
  
  const tree = await treeRes.json()
  
  // Filter relevant files
  const relevantFiles = tree.tree
    .filter((item: { type: string; path: string; size?: number }) => 
      item.type === 'blob' &&
      !item.path.includes('node_modules') &&
      !item.path.includes('.git/') &&
      !item.path.includes('dist/') &&
      !item.path.includes('build/') &&
      !item.path.includes('.next/') &&
      isRelevantFile(item.path) &&
      (item.size || 0) < 100000 // Skip files > 100KB
    )
    .slice(0, 200) // Limit to 200 files
  
  // Fetch file contents
  const files: RepoFile[] = []
  
  // Batch fetch in parallel (max 10 at a time)
  for (let i = 0; i < relevantFiles.length; i += 10) {
    const batch = relevantFiles.slice(i, i + 10)
    const contents = await Promise.all(
      batch.map(async (item: { path: string; size?: number }) => {
        try {
          const contentRes = await fetch(
            `https://api.github.com/repos/${owner}/${cleanRepo}/contents/${item.path}`,
            {
              headers: {
                Accept: 'application/vnd.github.v3.raw',
                ...(process.env.GITHUB_TOKEN && {
                  Authorization: `token ${process.env.GITHUB_TOKEN}`,
                }),
              },
            }
          )
          
          if (!contentRes.ok) return null
          
          const content = await contentRes.text()
          return {
            path: item.path,
            content,
            size: item.size || content.length,
          }
        } catch {
          return null
        }
      })
    )
    
    files.push(...contents.filter(Boolean) as RepoFile[])
  }
  
  return files
}

function isRelevantFile(path: string): boolean {
  const relevantExtensions = [
    '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
    '.py', '.go', '.rs', '.swift', '.kt', '.java',
    '.json', '.yaml', '.yml', '.toml',
    '.md', '.mdx',
    '.css', '.scss', '.sass',
    '.html',
    '.prisma',
    '.sql',
    '.sh',
    '.rb',
    '.env.example',
  ]
  
  const relevantFilenames = [
    'Dockerfile',
    'docker-compose.yml',
    '.gitignore',
    '.eslintrc',
    '.prettierrc',
    'Makefile',
    'Cargo.toml',
    'go.mod',
    'Package.swift',
    'Podfile',
    'Gemfile',
    'requirements.txt',
    'pyproject.toml',
  ]
  
  const filename = path.split('/').pop() || ''
  
  return (
    relevantExtensions.some(ext => path.endsWith(ext)) ||
    relevantFilenames.includes(filename)
  )
}


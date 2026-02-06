/**
 * Compare Rules-based vs AI-based analysis
 */

import Anthropic from '@anthropic-ai/sdk'
import { analyzeCompleteness } from '../lib/orion/analyzer'
import { RepoFile } from '../lib/orion/types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

async function fetchRepoFiles(owner: string, repo: string): Promise<RepoFile[]> {
  const token = process.env.GITHUB_TOKEN
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
    ...(token && { 'Authorization': `token ${token}` })
  }

  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
    { headers }
  )
  
  if (!treeRes.ok) throw new Error(`Failed to fetch repo: ${treeRes.status}`)
  
  const tree = await treeRes.json()
  
  const relevantFiles = tree.tree
    .filter((item: any) => 
      item.type === 'blob' &&
      !item.path.includes('node_modules') &&
      !item.path.includes('.git/') &&
      /\.(ts|tsx|js|jsx|json|yml|yaml|md|prisma)$/.test(item.path) &&
      (item.size || 0) < 50000
    )
    .slice(0, 100)

  const files: RepoFile[] = []
  
  for (let i = 0; i < relevantFiles.length; i += 10) {
    const batch = relevantFiles.slice(i, i + 10)
    const contents = await Promise.all(
      batch.map(async (item: any) => {
        try {
          const res = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${item.path}`,
            { headers: { ...headers, 'Accept': 'application/vnd.github.v3.raw' } }
          )
          if (!res.ok) return null
          return { path: item.path, content: await res.text(), size: item.size }
        } catch { return null }
      })
    )
    files.push(...contents.filter(Boolean) as RepoFile[])
  }
  
  return files
}

async function analyzeWithClaude(files: RepoFile[], repoUrl: string): Promise<any> {
  const packageJson = files.find(f => f.path === 'package.json')
  const pkg = packageJson ? JSON.parse(packageJson.content) : {}
  
  const fileList = files.map(f => f.path).join('\n')
  const sampleFiles = files.slice(0, 20).map(f => 
    `--- ${f.path} ---\n${f.content.slice(0, 2000)}`
  ).join('\n\n')

  const prompt = `You are a senior software architect reviewing a codebase for production readiness.

Repository: ${repoUrl}

## File List:
${fileList}

## Sample File Contents:
${sampleFiles}

## package.json:
${JSON.stringify(pkg, null, 2)}

Analyze this repository across these 12 categories:
1. Frontend - UI framework, components, styling
2. Backend - API design, routing, middleware
3. Database - Schema, migrations, queries
4. Authentication - Auth system, sessions, security
5. API Integrations - External APIs, error handling
6. State Management - Data flow, caching
7. Design/UX - Accessibility, responsiveness
8. Testing - Unit, integration, E2E tests
9. Security - Secrets, vulnerabilities, headers
10. Error Handling - Logging, monitoring, recovery
11. Version Control - Git practices, CI/CD
12. Deployment - Containerization, hosting, env vars

For each category, provide:
- Score (0-100)
- What's present (detected features)
- What's missing (gaps)
- Severity of gaps (blocker/critical/warning/info)

Return JSON:
{
  "overallScore": number,
  "categories": [
    {
      "category": string,
      "score": number,
      "detected": string[],
      "gaps": [
        {
          "title": string,
          "severity": "blocker" | "critical" | "warning" | "info",
          "description": string,
          "fix": string
        }
      ]
    }
  ],
  "summary": {
    "strengths": string[],
    "weaknesses": string[],
    "recommendation": string
  }
}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    temperature: 0.2,
    messages: [{ role: 'user', content: prompt }]
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response')
  
  // Extract JSON from response
  const jsonMatch = content.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON found in response')
  
  return JSON.parse(jsonMatch[0])
}

async function main() {
  const repoUrl = 'https://github.com/inprod-ai/orion'
  const owner = 'inprod-ai'
  const repo = 'orion'

  console.log('📥 Fetching repository files...')
  const files = await fetchRepoFiles(owner, repo)
  console.log(`   Found ${files.length} files\n`)

  console.log('═'.repeat(60))
  console.log('RULES-BASED ANALYZER')
  console.log('═'.repeat(60))
  
  const rulesStart = Date.now()
  const rulesResult = await analyzeCompleteness(repoUrl, files)
  const rulesTime = Date.now() - rulesStart

  console.log(`⏱️  Time: ${rulesTime}ms`)
  console.log(`📊 Score: ${rulesResult.overallScore}%`)
  console.log(`🚨 Blockers: ${rulesResult.blockerCount}`)
  console.log(`⚠️  Critical: ${rulesResult.criticalCount}`)
  console.log(`📝 Gaps: ${rulesResult.totalGaps}`)
  console.log('\nCategories:')
  rulesResult.categories.forEach(cat => {
    console.log(`   ${cat.label.padEnd(20)} ${cat.score}% ${cat.gaps.length > 0 ? `(${cat.gaps.length} gaps)` : '✓'}`)
  })
  
  console.log('\n' + '═'.repeat(60))
  console.log('AI-BASED ANALYZER (Claude Sonnet 4)')
  console.log('═'.repeat(60))
  
  const aiStart = Date.now()
  const aiResult = await analyzeWithClaude(files, repoUrl)
  const aiTime = Date.now() - aiStart

  console.log(`⏱️  Time: ${aiTime}ms`)
  console.log(`📊 Score: ${aiResult.overallScore}%`)
  
  const aiBlockers = aiResult.categories.flatMap((c: any) => c.gaps || []).filter((g: any) => g.severity === 'blocker').length
  const aiCritical = aiResult.categories.flatMap((c: any) => c.gaps || []).filter((g: any) => g.severity === 'critical').length
  const aiTotalGaps = aiResult.categories.flatMap((c: any) => c.gaps || []).length
  
  console.log(`🚨 Blockers: ${aiBlockers}`)
  console.log(`⚠️  Critical: ${aiCritical}`)
  console.log(`📝 Gaps: ${aiTotalGaps}`)
  console.log('\nCategories:')
  aiResult.categories.forEach((cat: any) => {
    const gapCount = (cat.gaps || []).length
    console.log(`   ${cat.category.padEnd(20)} ${cat.score}% ${gapCount > 0 ? `(${gapCount} gaps)` : '✓'}`)
  })

  console.log('\n' + '═'.repeat(60))
  console.log('COMPARISON')
  console.log('═'.repeat(60))
  
  console.log(`
| Metric          | Rules-Based | AI-Based   | Winner |
|-----------------|-------------|------------|--------|
| Time            | ${rulesTime.toString().padEnd(8)}ms  | ${aiTime.toString().padEnd(8)}ms  | ${rulesTime < aiTime ? 'Rules ⚡' : 'AI'} |
| Score           | ${rulesResult.overallScore.toString().padEnd(8)}%   | ${aiResult.overallScore.toString().padEnd(8)}%   | - |
| Blockers        | ${rulesResult.blockerCount.toString().padEnd(11)} | ${aiBlockers.toString().padEnd(10)} | - |
| Critical        | ${rulesResult.criticalCount.toString().padEnd(11)} | ${aiCritical.toString().padEnd(10)} | - |
| Total Gaps      | ${rulesResult.totalGaps.toString().padEnd(11)} | ${aiTotalGaps.toString().padEnd(10)} | - |
`)

  // AI Strengths/Weaknesses
  if (aiResult.summary) {
    console.log('\n📋 AI Analysis Summary:')
    console.log('Strengths:', aiResult.summary.strengths?.join(', '))
    console.log('Weaknesses:', aiResult.summary.weaknesses?.join(', '))
    console.log('Recommendation:', aiResult.summary.recommendation)
  }
}

main().catch(console.error)


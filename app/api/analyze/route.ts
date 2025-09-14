import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { ANALYSIS_CATEGORIES } from '@/types/analysis'
import type { AnalysisResult, CategoryScore } from '@/types/analysis'

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
    
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(ip)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again tomorrow.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
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

          // Fetch repository data from GitHub
          const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`)
          if (!repoResponse.ok) {
            throw new Error('Repository not found')
          }
          const repoData = await repoResponse.json()

          // Fetch README
          controller.enqueue(encoder.encode(JSON.stringify({ 
            progress: { 
              stage: 'fetching', 
              message: 'Analyzing repository structure...', 
              percentage: 15 
            } 
          }) + '\n'))

          const readmeResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`)
          const hasReadme = readmeResponse.ok

          // Fetch languages
          const languagesResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/languages`)
          const languages = languagesResponse.ok ? await languagesResponse.json() : {}

          // Fetch recent commits
          const commitsResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=10`)
          const recentCommits = commitsResponse.ok ? await commitsResponse.json() : []

          // Fetch directory structure (root level)
          const contentsResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents`)
          const contents = contentsResponse.ok ? await contentsResponse.json() : []

          // Check for important files
          const fileNames = contents.map((item: any) => item.name.toLowerCase())
          const hasTests = fileNames.some((name: string) => name.includes('test') || name.includes('spec'))
          const hasCI = fileNames.includes('.github') || fileNames.includes('.circleci') || fileNames.includes('.gitlab-ci.yml')
          const hasDocker = fileNames.includes('dockerfile') || fileNames.includes('docker-compose.yml')
          const hasPackageJson = fileNames.includes('package.json')
          const hasRequirements = fileNames.includes('requirements.txt') || fileNames.includes('pyproject.toml')
          const hasEnvExample = fileNames.includes('.env.example') || fileNames.includes('.env.sample')

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
            fileStructure: fileNames.slice(0, 20), // First 20 files/folders
          }

          // Analyze with Claude
          controller.enqueue(encoder.encode(JSON.stringify({ 
            progress: { 
              stage: 'analyzing', 
              message: 'Performing comprehensive analysis...', 
              percentage: 30 
            } 
          }) + '\n'))

          const prompt = `Analyze this GitHub repository for production readiness and provide scores for each category.

Repository Context:
${JSON.stringify(context, null, 2)}

For each of these categories, provide:
1. A score out of the max score
2. Whether it's applicable (true/false) - e.g., Financial/Billing might not apply to all projects
3. A brief description of findings
4. 2-3 specific recommendations
5. Subcategories with individual scores if applicable

Categories:
${ANALYSIS_CATEGORIES.map(cat => `- ${cat.name} (weight: ${cat.weight})`).join('\n')}

Also provide:
- Overall score (0-100)
- 3 main strengths
- 3 main weaknesses  
- 3 top priorities to address

Respond in JSON format matching this structure:
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
      "subcategories": [
        {
          "name": string,
          "score": number,
          "maxScore": number
        }
      ]
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
            max_tokens: 4000,
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
            await new Promise(resolve => setTimeout(resolve, 300)) // Simulate processing time
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
            summary: analysisData.summary
          }

          // Send final result
          controller.enqueue(encoder.encode(JSON.stringify({ 
            progress: { 
              stage: 'complete', 
              message: 'Analysis complete!', 
              percentage: 100 
            } 
          }) + '\n'))

          controller.enqueue(encoder.encode(JSON.stringify({ result }) + '\n'))
          controller.close()

        } catch (error) {
          console.error('Analysis error:', error)
          controller.enqueue(encoder.encode(JSON.stringify({ 
            error: error instanceof Error ? error.message : 'Analysis failed' 
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
    console.error('Request error:', error)
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Invalid request' 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

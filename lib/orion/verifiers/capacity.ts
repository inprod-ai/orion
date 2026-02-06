// =============================================================================
// CAPACITY INFERENCE - Claude-based estimation from architecture patterns
// =============================================================================
// Analyzes actual code for architecture signals (connection pooling, caching,
// worker config, etc.) and estimates max concurrent users based on known
// benchmarks. Not a guess from presence checks -- an informed estimate
// from reading the actual configuration.
// Cost: ~$0.02 per scan (Claude Haiku)

import Anthropic from '@anthropic-ai/sdk'
import type { RepoFile } from '../types'

export interface CapacityEstimate {
  maxConcurrentUsers: number
  confidence: 'measured' | 'high' | 'medium' | 'low'
  bottleneck: {
    component: string
    reason: string
    limit: number
  }
  factors: CapacityFactor[]
  methodology: string
}

export interface CapacityFactor {
  name: string
  value: string
  impact: 'positive' | 'negative' | 'neutral'
  estimatedLimit: number
  explanation: string
}

/**
 * Use Claude to estimate max concurrent users from architecture patterns
 * in the actual code. Reads config files, middleware, database setup, etc.
 */
export async function estimateCapacity(files: RepoFile[]): Promise<CapacityEstimate> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return defaultEstimate('ANTHROPIC_API_KEY not configured')
  }

  // Extract architecture-relevant files
  const archFiles = extractArchitectureFiles(files)

  if (archFiles.length === 0) {
    return defaultEstimate('No architecture files found')
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // Build file contents for Claude (cap at 20K tokens)
  let fileContext = ''
  let tokenEstimate = 0
  for (const file of archFiles) {
    const addition = `\n--- ${file.path} ---\n${file.content}\n`
    const addTokens = Math.ceil(addition.length / 4) // rough token estimate
    if (tokenEstimate + addTokens > 20000) break
    fileContext += addition
    tokenEstimate += addTokens
  }

  const prompt = `You are a senior infrastructure engineer. Analyze these actual code files and estimate the maximum concurrent users this application can handle.

ARCHITECTURE FILES:
${fileContext}

Based on the ACTUAL configuration you see (not guesses), identify:

1. Database connection limits (pool size, max connections)
2. Server worker/thread configuration
3. Caching layer (Redis, in-memory, CDN)
4. Rate limiting configuration
5. Horizontal scaling capability (container config, load balancer)
6. Memory-intensive operations
7. External API dependencies and their rate limits
8. WebSocket/long-polling connections

For each factor, cite the SPECIFIC file and line/setting you found.

Use these KNOWN BENCHMARKS:
- Express/Koa single process, no caching: ~200-500 concurrent
- Express with Redis caching: ~2,000-5,000 concurrent
- Next.js on Vercel serverless: ~1,000-10,000 concurrent (auto-scales)
- Single PostgreSQL connection: ~100 concurrent queries
- PostgreSQL with pool size 20: ~2,000 concurrent users
- PostgreSQL with pool size 100 + PgBouncer: ~20,000 concurrent
- Redis: ~50,000 concurrent reads
- In-memory state (no Redis): ~single-instance only, ~500 concurrent

The bottleneck is the LOWEST limit across all factors.

Respond in JSON:
{
  "maxConcurrentUsers": number,
  "confidence": "high" | "medium" | "low",
  "bottleneck": {
    "component": string,
    "reason": string,
    "limit": number
  },
  "factors": [
    {
      "name": string,
      "value": string,
      "impact": "positive" | "negative" | "neutral",
      "estimatedLimit": number,
      "explanation": string
    }
  ],
  "methodology": "one sentence explaining how you arrived at the number"
}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1500,
      temperature: 0.1,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      return defaultEstimate('Unexpected response format')
    }

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content.text.trim()
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) jsonStr = jsonMatch[1].trim()

    const result = JSON.parse(jsonStr)

    return {
      maxConcurrentUsers: Math.max(1, Math.round(result.maxConcurrentUsers || 0)),
      confidence: result.confidence || 'low',
      bottleneck: result.bottleneck || { component: 'unknown', reason: 'Unable to determine', limit: 0 },
      factors: (result.factors || []).map((f: CapacityFactor) => ({
        name: f.name,
        value: f.value,
        impact: f.impact || 'neutral',
        estimatedLimit: f.estimatedLimit || 0,
        explanation: f.explanation || '',
      })),
      methodology: result.methodology || '',
    }
  } catch (error) {
    console.error('Capacity estimation error:', error)
    return defaultEstimate('Analysis failed')
  }
}

/**
 * Extract files that reveal architecture patterns.
 * Prioritized by information density for capacity estimation.
 */
function extractArchitectureFiles(files: RepoFile[]): RepoFile[] {
  const patterns = [
    // Database config
    (f: RepoFile) => f.path.includes('prisma/schema') || f.path.endsWith('.prisma'),
    (f: RepoFile) => f.path.includes('drizzle') && f.path.endsWith('.ts'),
    (f: RepoFile) => f.path.includes('database') || f.path.includes('db.') || f.path.includes('db/'),
    // Server config
    (f: RepoFile) => f.path.includes('next.config'),
    (f: RepoFile) => f.path.includes('server.') && !f.path.includes('.test.'),
    (f: RepoFile) => f.path === 'vercel.json' || f.path === 'fly.toml' || f.path === 'railway.json',
    // Docker/infra
    (f: RepoFile) => f.path === 'Dockerfile' || f.path.includes('docker-compose'),
    (f: RepoFile) => f.path.includes('.github/workflows'),
    // Middleware / rate limiting
    (f: RepoFile) => f.path.includes('middleware') && !f.path.includes('.test.'),
    (f: RepoFile) => f.content.includes('rateLimit') || f.content.includes('rate-limit'),
    // Cache config
    (f: RepoFile) => f.content.includes('redis') || f.content.includes('Redis'),
    (f: RepoFile) => f.content.includes('cache') && (f.path.includes('config') || f.path.includes('lib/')),
    // Package.json for deps
    (f: RepoFile) => f.path === 'package.json',
    // Env example for connection strings
    (f: RepoFile) => f.path === '.env.example' || f.path === '.env.local.example',
    // API route files (to check patterns)
    (f: RepoFile) => f.path.includes('/api/') && f.path.endsWith('route.ts'),
  ]

  const found: RepoFile[] = []
  const seen = new Set<string>()

  for (const pattern of patterns) {
    for (const file of files) {
      if (!seen.has(file.path) && pattern(file)) {
        // Truncate large files to 3000 chars
        found.push({
          ...file,
          content: file.content.slice(0, 3000),
        })
        seen.add(file.path)
      }
    }
    if (found.length >= 20) break // Cap at 20 files
  }

  return found
}

function defaultEstimate(reason: string): CapacityEstimate {
  return {
    maxConcurrentUsers: 0,
    confidence: 'low',
    bottleneck: { component: 'unknown', reason, limit: 0 },
    factors: [],
    methodology: reason,
  }
}

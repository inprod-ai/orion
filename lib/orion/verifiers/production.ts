// =============================================================================
// PRODUCTION CORRELATION - Sentry API integration
// =============================================================================
// Connects Orion's predictions to actual production error data.
// User provides a Sentry auth token; we pull recent issues and correlate
// them with our gap predictions.
// Cost: API calls only, no sandbox (~$0)

import type { CategoryScore } from '../types'

export interface ProductionIssue {
  id: string
  title: string
  count: number
  firstSeen: string
  lastSeen: string
  level: 'fatal' | 'error' | 'warning' | 'info'
  culprit: string
  category: string // Mapped to Orion category
}

export interface ProductionCorrelation {
  issue: ProductionIssue
  predictedBy: string // Gap ID that predicted this
  gapCategory: string
  gapTitle: string
}

export interface ProductionResult {
  success: boolean
  issueCount: number
  issues: ProductionIssue[]
  correlations: ProductionCorrelation[]
  undetected: ProductionIssue[] // Issues Orion didn't predict
  accuracy: number // % of production issues that Orion predicted
  error?: string
}

/**
 * Fetch recent Sentry issues and correlate with Orion's gap predictions.
 */
export async function correlateProduction(
  sentryToken: string,
  sentryOrg: string,
  sentryProject: string,
  categories: CategoryScore[]
): Promise<ProductionResult> {
  if (!sentryToken || !sentryOrg || !sentryProject) {
    return emptyResult('Sentry credentials not provided')
  }

  try {
    // Fetch recent issues from Sentry
    const issues = await fetchSentryIssues(sentryToken, sentryOrg, sentryProject)

    if (issues.length === 0) {
      return {
        success: true,
        issueCount: 0,
        issues: [],
        correlations: [],
        undetected: [],
        accuracy: 100, // No issues means our predictions are vacuously correct
      }
    }

    // Map Sentry issues to Orion categories
    const mappedIssues = issues.map(mapSentryIssue)

    // Correlate with Orion's gap predictions
    const allGaps = categories.flatMap(c => c.gaps.map(g => ({ ...g, categoryLabel: c.label })))
    const correlations: ProductionCorrelation[] = []
    const correlated = new Set<string>()

    for (const issue of mappedIssues) {
      for (const gap of allGaps) {
        if (issueMatchesGap(issue, gap)) {
          correlations.push({
            issue,
            predictedBy: gap.id,
            gapCategory: gap.category,
            gapTitle: gap.title,
          })
          correlated.add(issue.id)
          break // One correlation per issue
        }
      }
    }

    const undetected = mappedIssues.filter(i => !correlated.has(i.id))
    const accuracy = mappedIssues.length > 0
      ? Math.round((correlated.size / mappedIssues.length) * 100)
      : 100

    return {
      success: true,
      issueCount: mappedIssues.length,
      issues: mappedIssues,
      correlations,
      undetected,
      accuracy,
    }
  } catch (error) {
    return emptyResult(error instanceof Error ? error.message : 'Sentry API error')
  }
}

async function fetchSentryIssues(
  token: string,
  org: string,
  project: string
): Promise<SentryIssue[]> {
  const response = await fetch(
    `https://sentry.io/api/0/projects/${encodeURIComponent(org)}/${encodeURIComponent(project)}/issues/?query=is:unresolved&sort=freq&limit=50`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  )

  if (!response.ok) {
    if (response.status === 401) throw new Error('Invalid Sentry token')
    if (response.status === 404) throw new Error('Sentry project not found')
    throw new Error(`Sentry API error: ${response.status}`)
  }

  return response.json()
}

interface SentryIssue {
  id: string
  title: string
  count: string
  firstSeen: string
  lastSeen: string
  level: string
  culprit: string
  metadata?: {
    type?: string
    value?: string
    filename?: string
  }
}

function mapSentryIssue(issue: SentryIssue): ProductionIssue {
  return {
    id: issue.id,
    title: issue.title,
    count: parseInt(issue.count) || 0,
    firstSeen: issue.firstSeen,
    lastSeen: issue.lastSeen,
    level: (['fatal', 'error', 'warning', 'info'].includes(issue.level)
      ? issue.level
      : 'error') as ProductionIssue['level'],
    culprit: issue.culprit || '',
    category: categorizeIssue(issue),
  }
}

function categorizeIssue(issue: SentryIssue): string {
  const title = (issue.title || '').toLowerCase()
  const culprit = (issue.culprit || '').toLowerCase()
  const type = (issue.metadata?.type || '').toLowerCase()

  if (title.includes('auth') || title.includes('401') || title.includes('403') ||
      title.includes('token') || title.includes('session')) return 'authentication'
  if (title.includes('database') || title.includes('sql') || title.includes('prisma') ||
      title.includes('connection pool') || type.includes('database')) return 'database'
  if (title.includes('timeout') || title.includes('rate limit') ||
      title.includes('429') || title.includes('too many requests')) return 'backend'
  if (title.includes('xss') || title.includes('csrf') || title.includes('injection') ||
      title.includes('security')) return 'security'
  if (title.includes('typeerror') || title.includes('referenceerror') ||
      title.includes('unhandled')) return 'errorHandling'
  if (culprit.includes('/api/')) return 'apiIntegrations'
  if (culprit.includes('component') || title.includes('render')) return 'frontend'

  return 'errorHandling'
}

function issueMatchesGap(
  issue: ProductionIssue,
  gap: { id: string; category: string; title: string }
): boolean {
  // Match by category first
  if (issue.category !== gap.category) return false

  // Fuzzy match on keywords
  const issueWords = new Set(issue.title.toLowerCase().split(/\W+/))
  const gapWords = gap.title.toLowerCase().split(/\W+/)

  const matchCount = gapWords.filter(w => w.length > 3 && issueWords.has(w)).length
  return matchCount >= 2 || (matchCount >= 1 && gapWords.length <= 3)
}

function emptyResult(error: string): ProductionResult {
  return {
    success: false,
    issueCount: 0,
    issues: [],
    correlations: [],
    undetected: [],
    accuracy: 0,
    error,
  }
}

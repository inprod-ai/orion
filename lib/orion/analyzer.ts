// =============================================================================
// MAIN ANALYZER - Combines all category analyzers + altitude calculation
// =============================================================================

import {
  CategoryScore,
  CompletenessAnalysis,
  RepoContext,
  RepoFile,
  AltitudeResult,
} from './types'
import { detectTechStack } from './stack-detector'
import { calculateAltitude, formatUserCount, getAltitudeMessage, getAltitudeProgress } from './altitude'
import {
  analyzeFrontend,
  analyzeBackend,
  analyzeDatabase,
  analyzeAuthentication,
  analyzeApiIntegrations,
  analyzeStateManagement,
  analyzeDesignUx,
  analyzeTesting,
  analyzeSecurity,
  analyzeErrorHandling,
  analyzeVersionControl,
  analyzeDeployment,
} from './analyzers'

export interface FullAnalysisResult extends CompletenessAnalysis {
  altitude: AltitudeResult
  altitudeProgress: number // 0-100 for visual
  altitudeMessage: string
  formattedMaxUsers: string
}

/**
 * Run all category analyzers and calculate altitude
 */
export function analyzeRepository(ctx: RepoContext): FullAnalysisResult {
  // Run all category analyzers
  const categories: CategoryScore[] = [
    analyzeFrontend(ctx),
    analyzeBackend(ctx),
    analyzeDatabase(ctx),
    analyzeAuthentication(ctx),
    analyzeApiIntegrations(ctx),
    analyzeStateManagement(ctx),
    analyzeDesignUx(ctx),
    analyzeTesting(ctx),
    analyzeSecurity(ctx),
    analyzeErrorHandling(ctx),
    analyzeVersionControl(ctx),
    analyzeDeployment(ctx),
  ]

  // Calculate overall score (weighted average of applicable categories)
  const applicableCategories = categories.filter(c => c.score < 100 || c.gaps.length > 0)
  const overallScore = applicableCategories.length > 0
    ? Math.round(applicableCategories.reduce((sum, c) => sum + c.score, 0) / applicableCategories.length)
    : 100

  // Calculate altitude
  const altitude = calculateAltitude(categories)
  const altitudeProgress = getAltitudeProgress(altitude.maxUsers)
  const altitudeMessage = getAltitudeMessage(altitude.zone)
  const formattedMaxUsers = formatUserCount(altitude.maxUsers)

  // Collect all gaps
  const allGaps = categories.flatMap(c => c.gaps)
  const blockerCount = allGaps.filter(g => g.severity === 'blocker').length
  const criticalCount = allGaps.filter(g => g.severity === 'critical').length
  const warningCount = allGaps.filter(g => g.severity === 'warning').length
  const estimatedFixMinutes = allGaps.reduce((sum, g) => sum + (g.effortMinutes || 0), 0)
  const canAutoFix = allGaps.filter(g => g.fixType === 'instant').length

  return {
    repoUrl: '', // Set by caller
    techStack: ctx.techStack,
    overallScore,
    categories,
    totalGaps: allGaps.length,
    blockerCount,
    criticalCount,
    warningCount,
    estimatedFixMinutes,
    canAutoFix,
    altitude,
    altitudeProgress,
    altitudeMessage,
    formattedMaxUsers,
  }
}

/**
 * Get a summary of altitude status for display
 */
export function getAltitudeSummary(result: FullAnalysisResult): {
  headline: string
  subtext: string
  cta: string
} {
  const { altitude, formattedMaxUsers } = result

  if (altitude.maxUsers < 100) {
    return {
      headline: `🛬 Grounded at ${formattedMaxUsers} users`,
      subtext: `${altitude.bottleneck.category} is blocking takeoff: ${altitude.bottleneck.reason}`,
      cta: `Fix ${altitude.bottleneck.category} to clear for takeoff`,
    }
  }

  if (altitude.maxUsers < 10000) {
    return {
      headline: `✈️ Flying at ${formattedMaxUsers} user altitude`,
      subtext: `${altitude.bottleneck.category} limits scale: ${altitude.bottleneck.reason}`,
      cta: `Upgrade ${altitude.bottleneck.category} to reach ${formatUserCount(altitude.potentialUsers)} users`,
    }
  }

  if (altitude.maxUsers < 100000) {
    return {
      headline: `🚀 Cruising at ${formattedMaxUsers} user altitude`,
      subtext: `Bottleneck: ${altitude.bottleneck.category} - ${altitude.bottleneck.reason}`,
      cta: altitude.topUpgrades.length > 0
        ? `Quick win: ${altitude.topUpgrades[0].category} → ${formatUserCount(altitude.topUpgrades[0].potentialUsers)} users`
        : 'Looking good! Minor optimizations available.',
    }
  }

  if (altitude.maxUsers < 1000000) {
    return {
      headline: `🛰️ Near space: ${formattedMaxUsers} user capacity`,
      subtext: `Enterprise-ready. ${altitude.bottleneck.category} is the limiting factor.`,
      cta: `Scale to ${formatUserCount(altitude.potentialUsers)} with targeted improvements`,
    }
  }

  return {
    headline: `🌌 Orbit achieved: ${formattedMaxUsers}+ users`,
    subtext: 'Your codebase can handle serious scale.',
    cta: altitude.topUpgrades.length > 0
      ? `Push further: ${altitude.topUpgrades[0].category} upgrade available`
      : 'Maintaining peak altitude. 🎉',
  }
}

/**
 * Analyze a repo from URL and files (test-friendly interface)
 */
export async function analyzeCompleteness(repoUrl: string, files: RepoFile[]): Promise<FullAnalysisResult> {
  // Build context from files
  const packageJsonFile = files.find(f => f.path === 'package.json')
  let packageJson: Record<string, unknown> | undefined
  try {
    packageJson = packageJsonFile ? JSON.parse(packageJsonFile.content) : undefined
  } catch {
    packageJson = undefined
  }
  const readmeFile = files.find(f => f.path.toLowerCase() === 'readme.md')
  
  const techStack = detectTechStack(files)
  
  const ctx: RepoContext = {
    files,
    techStack,
    packageJson,
    readme: readmeFile?.content,
  }
  
  const result = analyzeRepository(ctx)
  return {
    ...result,
    repoUrl,
  }
}

/**
 * Format analysis result as a text summary
 */
export function formatAnalysisSummary(result: FullAnalysisResult): string {
  const lines: string[] = []
  
  lines.push(`# Production Readiness Report`)
  lines.push(``)
  lines.push(`**Overall Score:** ${result.overallScore}/100`)
  lines.push(`**Max Users:** ${result.formattedMaxUsers}`)
  lines.push(`**Altitude:** ${result.altitude.zone.displayName}`)
  lines.push(``)
  lines.push(`## Tech Stack`)
  lines.push(`- Platform: ${result.techStack.platform}`)
  lines.push(`- Frameworks: ${result.techStack.frameworks.join(', ') || 'None detected'}`)
  lines.push(`- Languages: ${result.techStack.languages.join(', ') || 'None detected'}`)
  lines.push(``)
  lines.push(`## Category Scores`)
  result.categories.forEach(cat => {
    lines.push(`- **${cat.label}:** ${cat.score}/100 (${cat.gaps.length} gaps)`)
  })
  lines.push(``)
  lines.push(`## Bottleneck`)
  lines.push(`${result.altitude.bottleneck.category}: ${result.altitude.bottleneck.reason}`)
  
  return lines.join('\n')
}

/**
 * Get all gaps that can be fixed instantly (auto-fix)
 */
export function getInstantFixGaps(result: FullAnalysisResult): import('./types').Gap[] {
  return result.categories.flatMap(c => c.gaps.filter(g => g.fixType === 'instant'))
}

/**
 * Generate a completion plan prioritizing critical gaps
 */
export function generateCompletionPlan(result: FullAnalysisResult): import('./types').CompletionPlan {
  const priorityOrder: import('./types').Category[] = [
    'security',
    'testing',
    'errorHandling',
    'authentication',
    'database',
    'backend',
    'deployment',
    'apiIntegrations',
    'versionControl',
    'frontend',
    'stateManagement',
    'designUx',
  ]
  
  const categoryPlans = result.categories
    .filter(c => c.gaps.length > 0)
    .map(c => ({
      category: c.category,
      gaps: c.gaps,
      estimatedFiles: c.gaps.filter(g => g.fixType === 'instant').length,
      estimatedMinutes: c.gaps.reduce((sum, g) => sum + (g.effortMinutes || 0), 0),
    }))
    .sort((a, b) => {
      const aIndex = priorityOrder.indexOf(a.category)
      const bIndex = priorityOrder.indexOf(b.category)
      return aIndex - bIndex
    })
  
  return {
    categories: categoryPlans,
    totalFiles: categoryPlans.reduce((sum, c) => sum + c.estimatedFiles, 0),
    totalMinutes: categoryPlans.reduce((sum, c) => sum + c.estimatedMinutes, 0),
    priority: categoryPlans.map(c => c.category),
  }
}

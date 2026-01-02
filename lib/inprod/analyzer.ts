// =============================================================================
// COMPLETENESS ANALYZER - Main Orchestrator
// =============================================================================

import { 
  CompletenessAnalysis, 
  CategoryScore, 
  RepoContext, 
  RepoFile,
  CompletionPlan,
  CATEGORIES,
  Gap,
} from './types'
import { detectTechStack } from './stack-detector'
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

const CATEGORY_ANALYZERS = {
  frontend: analyzeFrontend,
  backend: analyzeBackend,
  database: analyzeDatabase,
  authentication: analyzeAuthentication,
  apiIntegrations: analyzeApiIntegrations,
  stateManagement: analyzeStateManagement,
  designUx: analyzeDesignUx,
  testing: analyzeTesting,
  security: analyzeSecurity,
  errorHandling: analyzeErrorHandling,
  versionControl: analyzeVersionControl,
  deployment: analyzeDeployment,
}

/**
 * Analyze a repository for production readiness across 12 categories
 */
export async function analyzeCompleteness(
  repoUrl: string,
  files: RepoFile[]
): Promise<CompletenessAnalysis> {
  // Detect tech stack
  const techStack = detectTechStack(files)
  
  // Find package.json
  const packageJsonFile = files.find(f => f.path === 'package.json')
  const packageJson = packageJsonFile 
    ? JSON.parse(packageJsonFile.content) 
    : undefined
  
  // Find README
  const readmeFile = files.find(f => f.path.toLowerCase() === 'readme.md')
  const readme = readmeFile?.content
  
  // Build context
  const ctx: RepoContext = {
    files,
    techStack,
    packageJson,
    readme,
  }
  
  // Run all analyzers
  const categories: CategoryScore[] = []
  for (const category of CATEGORIES) {
    const analyzer = CATEGORY_ANALYZERS[category]
    const result = analyzer(ctx)
    categories.push(result)
  }
  
  // Calculate overall score (weighted average)
  const weights = getWeights(techStack)
  let totalWeight = 0
  let weightedScore = 0
  
  for (const cat of categories) {
    const weight = weights[cat.category] || 1
    weightedScore += cat.score * weight
    totalWeight += weight
  }
  
  const overallScore = Math.round(weightedScore / totalWeight)
  
  // Aggregate gaps
  const allGaps = categories.flatMap(c => c.gaps)
  const blockerCount = allGaps.filter(g => g.severity === 'blocker').length
  const criticalCount = allGaps.filter(g => g.severity === 'critical').length
  const warningCount = allGaps.filter(g => g.severity === 'warning').length
  const estimatedFixMinutes = allGaps.reduce((sum, g) => sum + (g.effortMinutes || 0), 0)
  const canAutoFix = allGaps.filter(g => g.fixType === 'instant').length
  
  return {
    repoUrl,
    techStack,
    overallScore,
    categories,
    totalGaps: allGaps.length,
    blockerCount,
    criticalCount,
    warningCount,
    estimatedFixMinutes,
    canAutoFix,
  }
}

/**
 * Generate a completion plan from the analysis
 */
export function generateCompletionPlan(analysis: CompletenessAnalysis): CompletionPlan {
  const categoriesWithGaps = analysis.categories
    .filter(c => c.gaps.length > 0)
    .map(c => ({
      category: c.category,
      gaps: c.gaps,
      estimatedFiles: c.gaps.length * 2, // Rough estimate
      estimatedMinutes: c.gaps.reduce((sum, g) => sum + (g.effortMinutes || 15), 0),
    }))
  
  // Sort by priority (blockers first, then by score)
  const priority = prioritizeCategories(analysis.categories)
  
  return {
    categories: categoriesWithGaps,
    totalFiles: categoriesWithGaps.reduce((sum, c) => sum + c.estimatedFiles, 0),
    totalMinutes: categoriesWithGaps.reduce((sum, c) => sum + c.estimatedMinutes, 0),
    priority,
  }
}

/**
 * Prioritize categories for fixing
 */
function prioritizeCategories(categories: CategoryScore[]): CategoryScore['category'][] {
  const sorted = [...categories].sort((a, b) => {
    // First: categories with blockers
    const aBlockers = a.gaps.filter(g => g.severity === 'blocker').length
    const bBlockers = b.gaps.filter(g => g.severity === 'blocker').length
    if (aBlockers !== bBlockers) return bBlockers - aBlockers
    
    // Second: categories with critical issues
    const aCritical = a.gaps.filter(g => g.severity === 'critical').length
    const bCritical = b.gaps.filter(g => g.severity === 'critical').length
    if (aCritical !== bCritical) return bCritical - aCritical
    
    // Third: lowest score first
    return a.score - b.score
  })
  
  return sorted
    .filter(c => c.gaps.length > 0)
    .map(c => c.category)
}

/**
 * Get category weights based on tech stack
 */
function getWeights(techStack: RepoContext['techStack']): Record<string, number> {
  const base = {
    frontend: 1,
    backend: 1,
    database: 1,
    authentication: 1,
    apiIntegrations: 1,
    stateManagement: 0.8,
    designUx: 0.8,
    testing: 1.2,
    security: 1.5, // Security is always important
    errorHandling: 1,
    versionControl: 0.8,
    deployment: 1.2,
  }
  
  // Adjust weights based on platform
  if (techStack.platform === 'web') {
    base.frontend = 1.2
    base.designUx = 1
  } else if (techStack.platform === 'backend') {
    base.frontend = 0.5
    base.designUx = 0.3
    base.stateManagement = 0.3
  } else if (techStack.platform === 'ios' || techStack.platform === 'android') {
    base.designUx = 1.2
    base.deployment = 0.8
  }
  
  return base
}

/**
 * Get instant-fix gaps from analysis
 */
export function getInstantFixGaps(analysis: CompletenessAnalysis): Gap[] {
  return analysis.categories
    .flatMap(c => c.gaps)
    .filter(g => g.fixType === 'instant')
    .sort((a, b) => {
      // Sort by severity
      const severityOrder = { blocker: 0, critical: 1, warning: 2, info: 3 }
      return severityOrder[a.severity] - severityOrder[b.severity]
    })
}

/**
 * Format analysis as summary text
 */
export function formatAnalysisSummary(analysis: CompletenessAnalysis): string {
  const lines: string[] = []
  
  lines.push(`# Production Readiness: ${analysis.overallScore}%`)
  lines.push('')
  lines.push(`Tech Stack: ${analysis.techStack.frameworks.join(', ')} (${analysis.techStack.platform})`)
  lines.push(`Maturity: ${analysis.techStack.maturityLevel}`)
  lines.push('')
  lines.push('## Category Scores')
  lines.push('')
  
  for (const cat of analysis.categories) {
    const bar = '█'.repeat(Math.floor(cat.score / 10)) + '░'.repeat(10 - Math.floor(cat.score / 10))
    lines.push(`${cat.label.padEnd(18)} ${bar} ${cat.score}%`)
  }
  
  lines.push('')
  lines.push('## Issues')
  lines.push('')
  lines.push(`- Blockers: ${analysis.blockerCount}`)
  lines.push(`- Critical: ${analysis.criticalCount}`)
  lines.push(`- Warnings: ${analysis.warningCount}`)
  lines.push(`- Auto-fixable: ${analysis.canAutoFix}`)
  lines.push(`- Est. fix time: ${Math.round(analysis.estimatedFixMinutes / 60)}h ${analysis.estimatedFixMinutes % 60}m`)
  
  return lines.join('\n')
}


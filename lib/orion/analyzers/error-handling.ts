// =============================================================================
// ERROR HANDLING ANALYZER
// =============================================================================

import { CategoryScore, Gap, RepoContext } from '../types'
import { checkPlatformApplicability, getCategoryLabel } from '../platform'

export function analyzeErrorHandling(ctx: RepoContext): CategoryScore {
  const { files, techStack, packageJson } = ctx
  const label = getCategoryLabel('errorHandling', techStack.platform, 'Error Handling')
  
  // Check platform applicability
  const platformCheck = checkPlatformApplicability('errorHandling', label, techStack.platform)
  if (platformCheck) return platformCheck
  
  const gaps: Gap[] = []
  const detected: string[] = []
  let score = 0
  
  const deps = packageJson ? { 
    ...((packageJson.dependencies as Record<string, string>) || {}),
    ...((packageJson.devDependencies as Record<string, string>) || {})
  } : {}

  // 1. Check for error monitoring service (20 points)
  const hasErrorMonitoring = deps['@sentry/nextjs'] || deps['@sentry/node'] || 
                             deps['sentry'] || deps['bugsnag'] || deps['rollbar'] ||
                             files.some(f => f.content.includes('Sentry.'))
  
  if (hasErrorMonitoring) {
    detected.push('Error monitoring configured')
    score += 20
  } else {
    gaps.push({
      id: 'error-no-monitoring',
      category: 'errorHandling',
      title: 'No error monitoring service',
      description: 'Add Sentry or similar for production error tracking',
      severity: 'warning',
      confidence: 'high',
      fixType: 'instant',
      fixTemplate: 'sentry-setup',
      effortMinutes: 20,
    })
  }

  // 2. Check for global error handler (20 points)
  const hasGlobalHandler = files.some(f => 
    f.path.includes('error.tsx') || 
    f.path.includes('_error.tsx') ||
    f.content.includes('ErrorBoundary') ||
    f.content.includes('window.onerror') ||
    f.content.includes('process.on(\'uncaughtException')
  )
  
  if (hasGlobalHandler) {
    detected.push('Global error handler present')
    score += 20
  } else {
    gaps.push({
      id: 'error-no-global-handler',
      category: 'errorHandling',
      title: 'No global error handler',
      description: 'Add error boundary for React or global error handler',
      severity: 'warning',
      confidence: 'high',
      fixType: 'instant',
      fixTemplate: 'error-boundary',
      effortMinutes: 15,
    })
  }

  // 3. Check for try-catch in API routes (20 points)
  const apiRoutes = files.filter(f => f.path.includes('/api/') || f.path.includes('/routes/'))
  let routesWithTryCatch = 0
  
  for (const route of apiRoutes) {
    if (route.content.includes('try {') || route.content.includes('try{')) {
      routesWithTryCatch++
    }
  }
  
  if (apiRoutes.length > 0) {
    const tryCatchRatio = routesWithTryCatch / apiRoutes.length
    if (tryCatchRatio >= 0.8) {
      detected.push('API routes have try-catch blocks')
      score += 20
    } else if (tryCatchRatio >= 0.5) {
      score += 10
      gaps.push({
        id: 'error-some-routes-unprotected',
        category: 'errorHandling',
        title: 'Some API routes lack error handling',
        description: `${apiRoutes.length - routesWithTryCatch} routes missing try-catch`,
        severity: 'warning',
        confidence: 'verified',
        fixType: 'suggested',
        effortMinutes: 20,
      })
    } else {
      gaps.push({
        id: 'error-routes-unprotected',
        category: 'errorHandling',
        title: 'API routes lack error handling',
        description: 'Add try-catch to API routes to prevent unhandled exceptions',
        severity: 'critical',
        confidence: 'verified',
        fixType: 'instant',
        fixTemplate: 'api-error-wrapper',
        effortMinutes: 30,
      })
    }
  } else {
    score += 20 // N/A
  }

  // 4. Check for user-friendly error messages (15 points)
  const hasErrorMessages = files.some(f => 
    f.content.includes('error.message') || 
    f.content.includes('Something went wrong') ||
    f.content.includes('Please try again')
  )
  
  if (hasErrorMessages) {
    detected.push('User-friendly error messages')
    score += 15
  }

  // 5. Check for async error handling (15 points)
  const hasUnhandledRejection = files.some(f => 
    f.content.includes('unhandledRejection') || 
    f.content.includes('.catch(') ||
    f.content.includes('try {') // Already counting await in try
  )
  
  if (hasUnhandledRejection) {
    detected.push('Async error handling present')
    score += 15
  }

  // 6. Check for structured logging (10 points)
  const hasStructuredLogging = deps['pino'] || deps['winston'] || deps['bunyan'] ||
                               files.some(f => f.content.includes('logger.error'))
  
  if (hasStructuredLogging) {
    detected.push('Structured error logging')
    score += 10
  }

  return {
    category: 'errorHandling',
    label,
    score: Math.min(100, score),
    detected,
    gaps,
    canGenerate: gaps.some(g => g.fixType === 'instant'),
  }
}


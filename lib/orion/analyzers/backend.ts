// =============================================================================
// BACKEND ANALYZER
// =============================================================================

import { CategoryScore, Gap, RepoContext } from '../types'
import { checkPlatformApplicability, getCategoryLabel } from '../platform'

export function analyzeBackend(ctx: RepoContext): CategoryScore {
  const { files, techStack, packageJson } = ctx
  const label = getCategoryLabel('backend', techStack.platform, 'Backend')
  
  // Check platform applicability
  const platformCheck = checkPlatformApplicability('backend', label, techStack.platform)
  if (platformCheck) return platformCheck
  
  const gaps: Gap[] = []
  const detected: string[] = []
  let score = 0
  
  const deps = packageJson ? { 
    ...((packageJson.dependencies as Record<string, string>) || {}),
    ...((packageJson.devDependencies as Record<string, string>) || {})
  } : {}
  
  // Check if this has backend
  const hasBackend = files.some(f => 
    f.path.includes('/api/') || 
    f.path.includes('/routes/') ||
    f.path.includes('server.') ||
    techStack.frameworks.some(fw => ['express', 'fastify', 'nestjs', 'hono', 'fastapi', 'django', 'flask'].includes(fw))
  )
  
  if (!hasBackend) {
    return {
      category: 'backend',
      label,
      score: 100, // N/A
      detected: ['No backend detected'],
      gaps: [],
      canGenerate: false,
    }
  }

  detected.push('API routes detected')
  score += 20

  // 1. Check for input validation (20 points)
  const hasValidation = files.some(f => 
    f.content.includes('zod') || 
    f.content.includes('yup') ||
    f.content.includes('joi') ||
    f.content.includes('.parse(') ||
    f.content.includes('validate')
  ) || deps['zod'] || deps['yup'] || deps['joi']
  
  if (hasValidation) {
    detected.push('Input validation configured')
    score += 20
  } else {
    gaps.push({
      id: 'backend-no-validation',
      category: 'backend',
      title: 'No input validation detected',
      description: 'Add Zod or similar for request validation to prevent invalid data',
      severity: 'critical',
      confidence: 'high',
      fixType: 'instant',
      fixTemplate: 'zod-validation',
      effortMinutes: 30,
    })
  }

  // 2. Check for rate limiting (15 points)
  const hasRateLimit = files.some(f => 
    f.content.includes('rateLimit') || 
    f.content.includes('rate-limit') ||
    f.content.includes('throttle')
  ) || deps['express-rate-limit'] || deps['@upstash/ratelimit']
  
  if (hasRateLimit) {
    detected.push('Rate limiting configured')
    score += 15
  } else {
    gaps.push({
      id: 'backend-no-rate-limit',
      category: 'backend',
      title: 'No rate limiting detected',
      description: 'Add rate limiting to prevent abuse and DoS attacks',
      severity: 'warning',
      confidence: 'high',
      fixType: 'instant',
      fixTemplate: 'rate-limiter',
      effortMinutes: 20,
    })
  }

  // 3. Check for request timeouts (15 points)
  const hasTimeouts = files.some(f => 
    f.content.includes('timeout') || 
    f.content.includes('AbortController') ||
    f.content.includes('signal')
  )
  
  if (hasTimeouts) {
    detected.push('Request timeouts configured')
    score += 15
  } else {
    gaps.push({
      id: 'backend-no-timeouts',
      category: 'backend',
      title: 'No request timeouts detected',
      description: 'Add timeouts to external API calls to prevent hanging requests',
      severity: 'warning',
      confidence: 'likely',
      fixType: 'suggested',
      effortMinutes: 15,
    })
  }

  // 4. Check for logging (15 points)
  const hasLogging = files.some(f => 
    f.content.includes('console.log') || 
    f.content.includes('logger') ||
    f.content.includes('winston') ||
    f.content.includes('pino')
  ) || deps['winston'] || deps['pino']
  
  if (hasLogging) {
    detected.push('Logging configured')
    score += 15
  } else {
    gaps.push({
      id: 'backend-no-logging',
      category: 'backend',
      title: 'No structured logging detected',
      description: 'Add structured logging for debugging and monitoring',
      severity: 'info',
      confidence: 'high',
      fixType: 'instant',
      fixTemplate: 'logger',
      effortMinutes: 15,
    })
  }

  // 5. Check for health endpoint (15 points)
  const hasHealthCheck = files.some(f => 
    f.path.includes('/health') || 
    f.content.includes('/health') ||
    f.content.includes('healthcheck')
  )
  
  if (hasHealthCheck) {
    detected.push('Health endpoint present')
    score += 15
  } else {
    gaps.push({
      id: 'backend-no-health',
      category: 'backend',
      title: 'No health check endpoint',
      description: 'Add /health endpoint for load balancers and monitoring',
      severity: 'info',
      confidence: 'high',
      fixType: 'instant',
      fixTemplate: 'health-endpoint',
      effortMinutes: 5,
    })
  }

  return {
    category: 'backend',
    label,
    score: Math.min(100, score),
    detected,
    gaps,
    canGenerate: gaps.some(g => g.fixType === 'instant'),
  }
}


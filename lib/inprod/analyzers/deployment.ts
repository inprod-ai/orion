// =============================================================================
// DEPLOYMENT ANALYZER
// =============================================================================

import { CategoryScore, Gap, RepoContext } from '../types'
import { checkPlatformApplicability, getCategoryLabel } from '../platform'

export function analyzeDeployment(ctx: RepoContext): CategoryScore {
  const { files, techStack, packageJson } = ctx
  const label = getCategoryLabel('deployment', techStack.platform, 'Deployment')
  
  // Check platform applicability
  const platformCheck = checkPlatformApplicability('deployment', label, techStack.platform)
  if (platformCheck) return platformCheck
  
  const gaps: Gap[] = []
  const detected: string[] = []
  let score = 0
  
  const deps = packageJson ? { 
    ...((packageJson.dependencies as Record<string, string>) || {}),
    ...((packageJson.devDependencies as Record<string, string>) || {})
  } : {}

  // 1. Check for CI/CD (25 points)
  if (techStack.ciProvider) {
    detected.push(`CI/CD: ${techStack.ciProvider}`)
    score += 25
  } else {
    gaps.push({
      id: 'deploy-no-ci',
      category: 'deployment',
      title: 'No CI/CD pipeline',
      description: 'Add GitHub Actions for automated testing and deployment',
      severity: 'critical',
      confidence: 'proven',
      fixType: 'instant',
      fixTemplate: 'github-actions',
      effortMinutes: 20,
    })
  }

  // 2. Check for deployment platform (20 points)
  if (techStack.deploymentPlatform) {
    detected.push(`Platform: ${techStack.deploymentPlatform}`)
    score += 20
  } else {
    gaps.push({
      id: 'deploy-no-platform',
      category: 'deployment',
      title: 'No deployment platform detected',
      description: 'Configure deployment to Vercel, Railway, or similar',
      severity: 'warning',
      confidence: 'high',
      fixType: 'guided',
      effortMinutes: 30,
    })
  }

  // 3. Check for environment validation (15 points)
  const hasEnvValidation = files.some(f => 
    f.content.includes('env.mjs') || 
    f.content.includes('createEnv') ||
    f.content.includes('z.object') && f.content.includes('process.env')
  ) || deps['@t3-oss/env-nextjs']
  
  if (hasEnvValidation) {
    detected.push('Environment validation configured')
    score += 15
  } else {
    gaps.push({
      id: 'deploy-no-env-validation',
      category: 'deployment',
      title: 'No environment validation',
      description: 'Add runtime env validation to catch missing variables',
      severity: 'warning',
      confidence: 'high',
      fixType: 'instant',
      fixTemplate: 'env-validation',
      effortMinutes: 15,
    })
  }

  // 4. Check for Dockerfile (15 points) - for non-serverless
  const hasDocker = files.some(f => f.path === 'Dockerfile' || f.path === 'docker-compose.yml')
  
  if (hasDocker) {
    detected.push('Docker configuration present')
    score += 15
  } else if (!techStack.deploymentPlatform || !['vercel', 'netlify'].includes(techStack.deploymentPlatform)) {
    gaps.push({
      id: 'deploy-no-docker',
      category: 'deployment',
      title: 'No Docker configuration',
      description: 'Add Dockerfile for containerized deployments',
      severity: 'info',
      confidence: 'likely',
      fixType: 'instant',
      fixTemplate: 'dockerfile',
      effortMinutes: 15,
    })
  } else {
    score += 15 // Serverless doesn't need Docker
  }

  // 5. Check for production build script (10 points)
  const scripts = packageJson?.scripts as Record<string, string> || {}
  const hasBuildScript = scripts['build'] !== undefined
  
  if (hasBuildScript) {
    detected.push('Build script configured')
    score += 10
  } else {
    gaps.push({
      id: 'deploy-no-build',
      category: 'deployment',
      title: 'No build script',
      description: 'Add build script in package.json',
      severity: 'warning',
      confidence: 'verified',
      fixType: 'instant',
      fixTemplate: 'build-script',
      effortMinutes: 5,
    })
  }

  // 6. Check for preview deployments (10 points)
  const hasPreview = files.some(f => 
    f.content.includes('preview') && f.content.includes('deploy') ||
    f.content.includes('pull_request') && f.path.includes('.github/workflows')
  )
  
  if (hasPreview || techStack.deploymentPlatform === 'vercel') {
    detected.push('Preview deployments configured')
    score += 10
  }

  // 7. Check for monitoring/observability (5 points)
  const hasMonitoring = deps['@vercel/analytics'] || deps['@sentry/nextjs'] || 
                        deps['newrelic'] || deps['dd-trace']
  
  if (hasMonitoring) {
    detected.push('Production monitoring configured')
    score += 5
  }

  return {
    category: 'deployment',
    label,
    score: Math.min(100, score),
    detected,
    gaps,
    canGenerate: gaps.some(g => g.fixType === 'instant'),
  }
}


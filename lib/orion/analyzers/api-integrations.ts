// =============================================================================
// API INTEGRATIONS ANALYZER
// =============================================================================

import { CategoryScore, Gap, RepoContext } from '../types'
import { checkPlatformApplicability, getCategoryLabel } from '../platform'

export function analyzeApiIntegrations(ctx: RepoContext): CategoryScore {
  const { files, techStack, packageJson } = ctx
  const label = getCategoryLabel('apiIntegrations', techStack.platform, 'API Integrations')
  
  // Check platform applicability
  const platformCheck = checkPlatformApplicability('apiIntegrations', label, techStack.platform)
  if (platformCheck) return platformCheck
  
  const gaps: Gap[] = []
  const detected: string[] = []
  let score = 0
  
  const deps = packageJson ? { 
    ...((packageJson.dependencies as Record<string, string>) || {}),
    ...((packageJson.devDependencies as Record<string, string>) || {})
  } : {}
  
  // Check for external API integrations
  const hasStripe = deps['stripe'] || files.some(f => f.content.includes('stripe'))
  const hasOpenAI = deps['openai'] || deps['@anthropic-ai/sdk'] || files.some(f => f.content.includes('openai') || f.content.includes('anthropic'))
  const hasAWS = deps['@aws-sdk'] || deps['aws-sdk']
  const hasTwilio = deps['twilio']
  const hasSendgrid = deps['@sendgrid/mail']
  
  const hasExternalApis = hasStripe || hasOpenAI || hasAWS || hasTwilio || hasSendgrid
  
  if (!hasExternalApis) {
    return {
      category: 'apiIntegrations',
      label,
      score: 100, // N/A
      detected: ['No external API integrations detected'],
      gaps: [],
      canGenerate: false,
    }
  }

  if (hasStripe) detected.push('Stripe integration')
  if (hasOpenAI) detected.push('AI API integration')
  if (hasAWS) detected.push('AWS SDK')
  if (hasTwilio) detected.push('Twilio')
  if (hasSendgrid) detected.push('SendGrid')
  score += 20

  // 1. Check for retry logic (20 points)
  const hasRetry = files.some(f => 
    f.content.includes('retry') || 
    f.content.includes('maxRetries') ||
    f.content.includes('exponential')
  )
  
  if (hasRetry) {
    detected.push('Retry logic configured')
    score += 20
  } else {
    gaps.push({
      id: 'api-no-retry',
      category: 'apiIntegrations',
      title: 'No retry logic for API calls',
      description: 'Add exponential backoff retry for transient failures',
      severity: 'warning',
      confidence: 'high',
      fixType: 'instant',
      fixTemplate: 'api-retry',
      effortMinutes: 20,
    })
  }

  // 2. Check for webhook verification (20 points) - for Stripe
  if (hasStripe) {
    const hasWebhookVerify = files.some(f => 
      f.content.includes('constructEvent') || 
      f.content.includes('verifySignature') ||
      f.content.includes('STRIPE_WEBHOOK_SECRET')
    )
    
    if (hasWebhookVerify) {
      detected.push('Webhook signature verification')
      score += 20
    } else {
      gaps.push({
        id: 'api-no-webhook-verify',
        category: 'apiIntegrations',
        title: 'Webhook signature not verified',
        description: 'Verify webhook signatures to prevent spoofed events',
        severity: 'critical',
        confidence: 'likely',
        fixType: 'instant',
        fixTemplate: 'webhook-verify',
        effortMinutes: 15,
      })
    }
  } else {
    score += 20 // N/A
  }

  // 3. Check for API error handling (20 points)
  const hasApiErrorHandling = files.some(f => 
    f.content.includes('catch') && (
      f.content.includes('stripe') ||
      f.content.includes('openai') ||
      f.content.includes('fetch')
    )
  )
  
  if (hasApiErrorHandling) {
    detected.push('API error handling')
    score += 20
  } else {
    gaps.push({
      id: 'api-no-error-handling',
      category: 'apiIntegrations',
      title: 'Limited API error handling',
      description: 'Add specific error handling for external API failures',
      severity: 'warning',
      confidence: 'likely',
      fixType: 'suggested',
      effortMinutes: 30,
    })
  }

  // 4. Check for API key security (20 points)
  const hasEnvKeys = files.some(f => 
    f.content.includes('process.env.STRIPE') || 
    f.content.includes('process.env.OPENAI') ||
    f.content.includes('process.env.API_KEY')
  )
  
  if (hasEnvKeys) {
    detected.push('API keys in environment variables')
    score += 20
  } else {
    gaps.push({
      id: 'api-exposed-keys',
      category: 'apiIntegrations',
      title: 'API keys may be hardcoded',
      description: 'Move all API keys to environment variables',
      severity: 'critical',
      confidence: 'likely',
      fixType: 'instant',
      fixTemplate: 'env-keys',
      effortMinutes: 10,
    })
  }

  return {
    category: 'apiIntegrations',
    label,
    score: Math.min(100, score),
    detected,
    gaps,
    canGenerate: gaps.some(g => g.fixType === 'instant'),
  }
}


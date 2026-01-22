// =============================================================================
// AUTHENTICATION ANALYZER
// =============================================================================

import { CategoryScore, Gap, RepoContext } from '../types'
import { checkPlatformApplicability, getCategoryLabel } from '../platform'

export function analyzeAuthentication(ctx: RepoContext): CategoryScore {
  const { files, techStack, packageJson } = ctx
  const label = getCategoryLabel('authentication', techStack.platform, 'Authentication')
  
  // Check platform applicability
  const platformCheck = checkPlatformApplicability('authentication', label, techStack.platform)
  if (platformCheck) return platformCheck
  
  const gaps: Gap[] = []
  const detected: string[] = []
  let score = 0
  
  const deps = packageJson ? { 
    ...((packageJson.dependencies as Record<string, string>) || {}),
    ...((packageJson.devDependencies as Record<string, string>) || {})
  } : {}
  
  // Check if auth is present
  const hasAuth = deps['next-auth'] || deps['@clerk/nextjs'] || deps['@supabase/auth-helpers-nextjs'] ||
                  deps['passport'] || deps['jsonwebtoken'] || deps['bcrypt'] ||
                  files.some(f => f.path.includes('/auth/') || f.content.includes('session'))
  
  if (!hasAuth) {
    return {
      category: 'authentication',
      label,
      score: 100, // N/A
      detected: ['No authentication detected'],
      gaps: [],
      canGenerate: false,
    }
  }

  detected.push('Authentication system detected')
  score += 20

  // 1. Check for session encryption (20 points)
  const hasEncryption = files.some(f => 
    f.content.includes('encrypt') || 
    f.content.includes('cipher') ||
    f.content.includes('crypto') ||
    f.content.includes('AES')
  )
  
  if (hasEncryption) {
    detected.push('Session encryption detected')
    score += 20
  } else {
    gaps.push({
      id: 'auth-no-encryption',
      category: 'authentication',
      title: 'Session data may be unencrypted',
      description: 'Encrypt sensitive session data to protect against cookie theft',
      severity: 'critical',
      confidence: 'likely',
      fixType: 'instant',
      fixTemplate: 'encrypt-session',
      effortMinutes: 30,
    })
  }

  // 2. Check for CSRF protection (15 points)
  const hasCSRF = files.some(f => 
    f.content.includes('csrf') || 
    f.content.includes('CSRF') ||
    f.content.includes('csrfToken')
  )
  
  if (hasCSRF) {
    detected.push('CSRF protection detected')
    score += 15
  } else {
    gaps.push({
      id: 'auth-no-csrf',
      category: 'authentication',
      title: 'No CSRF protection detected',
      description: 'Add CSRF tokens to protect against cross-site request forgery',
      severity: 'warning',
      confidence: 'likely',
      fixType: 'suggested',
      effortMinutes: 20,
    })
  }

  // 3. Check for secure cookies (15 points)
  const hasSecureCookies = files.some(f => 
    f.content.includes('httpOnly: true') || 
    f.content.includes('secure: true') ||
    f.content.includes('sameSite')
  )
  
  if (hasSecureCookies) {
    detected.push('Secure cookie settings')
    score += 15
  } else {
    gaps.push({
      id: 'auth-insecure-cookies',
      category: 'authentication',
      title: 'Cookie security flags not detected',
      description: 'Set httpOnly, secure, and sameSite flags on auth cookies',
      severity: 'critical',
      confidence: 'likely',
      fixType: 'instant',
      fixTemplate: 'secure-cookies',
      effortMinutes: 10,
    })
  }

  // 4. Check for password hashing (15 points)
  const hasHashing = deps['bcrypt'] || deps['argon2'] || deps['bcryptjs'] ||
                     files.some(f => f.content.includes('hash') && f.content.includes('password'))
  
  if (hasHashing) {
    detected.push('Password hashing configured')
    score += 15
  }

  // 5. Check for session expiry (15 points)
  const hasExpiry = files.some(f => 
    f.content.includes('maxAge') || 
    f.content.includes('expiresIn') ||
    f.content.includes('expires')
  )
  
  if (hasExpiry) {
    detected.push('Session expiry configured')
    score += 15
  } else {
    gaps.push({
      id: 'auth-no-expiry',
      category: 'authentication',
      title: 'No session expiry detected',
      description: 'Set appropriate session expiry to limit exposure from token theft',
      severity: 'warning',
      confidence: 'likely',
      fixType: 'suggested',
      effortMinutes: 10,
    })
  }

  return {
    category: 'authentication',
    label,
    score: Math.min(100, score),
    detected,
    gaps,
    canGenerate: gaps.some(g => g.fixType === 'instant'),
  }
}


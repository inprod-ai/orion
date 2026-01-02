// =============================================================================
// SECURITY ANALYZER
// =============================================================================

import { CategoryScore, Gap, RepoContext } from '../types'

export function analyzeSecurity(ctx: RepoContext): CategoryScore {
  const gaps: Gap[] = []
  const detected: string[] = []
  let score = 0
  
  const { files, packageJson } = ctx
  const deps = packageJson ? { 
    ...((packageJson.dependencies as Record<string, string>) || {}),
    ...((packageJson.devDependencies as Record<string, string>) || {})
  } : {}

  // 1. Check for security headers (15 points)
  const hasSecurityHeaders = files.some(f => 
    f.content.includes('X-Frame-Options') || 
    f.content.includes('Content-Security-Policy') ||
    f.content.includes('X-Content-Type-Options') ||
    f.content.includes('Strict-Transport-Security') ||
    (f.path.includes('next.config') && f.content.includes('headers'))
  )
  
  if (hasSecurityHeaders) {
    detected.push('Security headers configured')
    score += 15
  } else {
    gaps.push({
      id: 'security-no-headers',
      category: 'security',
      title: 'No security headers detected',
      description: 'Add security headers (X-Frame-Options, CSP, HSTS)',
      severity: 'warning',
      confidence: 'high',
      fixType: 'instant',
      fixTemplate: 'security-headers',
      effortMinutes: 15,
    })
  }

  // 2. Check for input sanitization (15 points)
  const hasSanitization = files.some(f => 
    f.content.includes('sanitize') || 
    f.content.includes('escape') ||
    f.content.includes('DOMPurify') ||
    deps['dompurify'] || deps['xss']
  )
  
  if (hasSanitization) {
    detected.push('Input sanitization detected')
    score += 15
  } else if (files.some(f => f.content.includes('dangerouslySetInnerHTML'))) {
    gaps.push({
      id: 'security-no-sanitization',
      category: 'security',
      title: 'Using dangerouslySetInnerHTML without sanitization',
      description: 'Sanitize HTML content to prevent XSS attacks',
      severity: 'critical',
      confidence: 'proven',
      fixType: 'instant',
      fixTemplate: 'xss-sanitization',
      effortMinutes: 15,
    })
  } else {
    score += 15 // Not applicable
  }

  // 3. Check for secrets in code (15 points)
  const secretPatterns = [
    /sk[-_]live[-_][a-zA-Z0-9]{24,}/g, // Stripe
    /ghp_[a-zA-Z0-9]{36}/g, // GitHub
    /sk-[a-zA-Z0-9]{48}/g, // OpenAI
    /AIza[0-9A-Za-z_-]{35}/g, // Google
    /password\s*[:=]\s*["'][^"']{8,}["']/gi,
  ]
  
  let hasHardcodedSecrets = false
  for (const file of files) {
    if (file.path.includes('node_modules') || file.path.includes('.env')) continue
    for (const pattern of secretPatterns) {
      if (pattern.test(file.content)) {
        hasHardcodedSecrets = true
        gaps.push({
          id: `security-hardcoded-secret-${file.path}`,
          category: 'security',
          title: 'Hardcoded secret detected',
          description: `Potential secret found in ${file.path}`,
          severity: 'blocker',
          confidence: 'verified',
          file: file.path,
          fixType: 'instant',
          fixTemplate: 'extract-secret',
          effortMinutes: 5,
        })
        break
      }
    }
  }
  
  if (!hasHardcodedSecrets) {
    detected.push('No hardcoded secrets found')
    score += 15
  }

  // 4. Check for HTTPS enforcement (10 points)
  const hasHTTPS = files.some(f => 
    f.content.includes('https://') && !f.content.includes('http://localhost')
  ) || files.some(f => 
    f.content.includes("secure: process.env.NODE_ENV === 'production'")
  )
  
  if (hasHTTPS) {
    detected.push('HTTPS usage detected')
    score += 10
  }

  // 5. Check for .env.example (10 points)
  const hasEnvExample = files.some(f => f.path === '.env.example' || f.path === '.env.local.example')
  
  if (hasEnvExample) {
    detected.push('.env.example present')
    score += 10
  } else {
    gaps.push({
      id: 'security-no-env-example',
      category: 'security',
      title: 'No .env.example file',
      description: 'Add .env.example to document required environment variables',
      severity: 'info',
      confidence: 'high',
      fixType: 'instant',
      fixTemplate: 'env-example',
      effortMinutes: 10,
    })
  }

  // 6. Check for SQL injection protection (15 points)
  const hasRawSQL = files.some(f => 
    f.content.includes('${}') && f.content.includes('SELECT') ||
    f.content.includes("' + ") && f.content.includes('query')
  )
  
  if (!hasRawSQL) {
    detected.push('No SQL injection patterns detected')
    score += 15
  } else {
    gaps.push({
      id: 'security-sql-injection',
      category: 'security',
      title: 'Potential SQL injection vulnerability',
      description: 'Use parameterized queries instead of string concatenation',
      severity: 'critical',
      confidence: 'likely',
      fixType: 'suggested',
      effortMinutes: 30,
    })
  }

  // 7. Check for dependency audit (10 points)
  const hasAudit = files.some(f => 
    f.path.includes('.github/workflows') && 
    (f.content.includes('npm audit') || f.content.includes('snyk'))
  ) || deps['snyk']
  
  if (hasAudit) {
    detected.push('Dependency audit configured')
    score += 10
  }

  // 8. Check for encryption (10 points)
  const hasEncryption = files.some(f => 
    f.content.includes('crypto') || 
    f.content.includes('encrypt') ||
    f.content.includes('bcrypt')
  )
  
  if (hasEncryption) {
    detected.push('Encryption utilities present')
    score += 10
  }

  return {
    category: 'security',
    label: 'Security',
    score: Math.min(100, score),
    detected,
    gaps,
    canGenerate: gaps.some(g => g.fixType === 'instant'),
  }
}


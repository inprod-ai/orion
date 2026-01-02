// =============================================================================
// VERSION CONTROL ANALYZER
// =============================================================================

import { CategoryScore, Gap, RepoContext } from '../types'

export function analyzeVersionControl(ctx: RepoContext): CategoryScore {
  const gaps: Gap[] = []
  const detected: string[] = []
  let score = 0
  
  const { files, packageJson } = ctx
  const deps = packageJson ? { 
    ...((packageJson.dependencies as Record<string, string>) || {}),
    ...((packageJson.devDependencies as Record<string, string>) || {})
  } : {}

  // 1. Check for .gitignore (20 points)
  const hasGitignore = files.some(f => f.path === '.gitignore')
  
  if (hasGitignore) {
    const gitignore = files.find(f => f.path === '.gitignore')
    const hasNodeModules = gitignore?.content.includes('node_modules')
    const hasEnv = gitignore?.content.includes('.env')
    
    if (hasNodeModules && hasEnv) {
      detected.push('Comprehensive .gitignore')
      score += 20
    } else {
      detected.push('.gitignore present')
      score += 10
      gaps.push({
        id: 'vc-incomplete-gitignore',
        category: 'versionControl',
        title: 'Incomplete .gitignore',
        description: 'Add node_modules and .env to .gitignore',
        severity: 'warning',
        confidence: 'verified',
        fixType: 'instant',
        fixTemplate: 'gitignore-update',
        effortMinutes: 5,
      })
    }
  } else {
    gaps.push({
      id: 'vc-no-gitignore',
      category: 'versionControl',
      title: 'No .gitignore file',
      description: 'Add .gitignore to exclude build artifacts and secrets',
      severity: 'critical',
      confidence: 'proven',
      fixType: 'instant',
      fixTemplate: 'gitignore',
      effortMinutes: 5,
    })
  }

  // 2. Check for README (20 points)
  const hasReadme = files.some(f => f.path.toLowerCase() === 'readme.md')
  
  if (hasReadme) {
    detected.push('README.md present')
    score += 20
  } else {
    gaps.push({
      id: 'vc-no-readme',
      category: 'versionControl',
      title: 'No README.md',
      description: 'Add README with project description and setup instructions',
      severity: 'warning',
      confidence: 'proven',
      fixType: 'instant',
      fixTemplate: 'readme',
      effortMinutes: 20,
    })
  }

  // 3. Check for pre-commit hooks (15 points)
  const hasHooks = deps['husky'] || deps['lefthook'] || deps['lint-staged'] ||
                   files.some(f => f.path.includes('.husky/'))
  
  if (hasHooks) {
    detected.push('Pre-commit hooks configured')
    score += 15
  } else {
    gaps.push({
      id: 'vc-no-hooks',
      category: 'versionControl',
      title: 'No pre-commit hooks',
      description: 'Add Husky for pre-commit linting and testing',
      severity: 'info',
      confidence: 'high',
      fixType: 'instant',
      fixTemplate: 'husky-setup',
      effortMinutes: 15,
    })
  }

  // 4. Check for PR template (10 points)
  const hasPRTemplate = files.some(f => 
    f.path.includes('pull_request_template') || 
    f.path.includes('PULL_REQUEST_TEMPLATE')
  )
  
  if (hasPRTemplate) {
    detected.push('PR template present')
    score += 10
  } else {
    gaps.push({
      id: 'vc-no-pr-template',
      category: 'versionControl',
      title: 'No PR template',
      description: 'Add pull request template for consistent PR descriptions',
      severity: 'info',
      confidence: 'high',
      fixType: 'instant',
      fixTemplate: 'pr-template',
      effortMinutes: 10,
    })
  }

  // 5. Check for branch protection info (10 points)
  // Can't detect from code, but check for CODEOWNERS
  const hasCodeowners = files.some(f => f.path.includes('CODEOWNERS'))
  
  if (hasCodeowners) {
    detected.push('CODEOWNERS configured')
    score += 10
  }

  // 6. Check for changelog (10 points)
  const hasChangelog = files.some(f => 
    f.path.toLowerCase() === 'changelog.md' || 
    f.path.toLowerCase() === 'history.md'
  )
  
  if (hasChangelog) {
    detected.push('CHANGELOG present')
    score += 10
  }

  // 7. Check for license (10 points)
  const hasLicense = files.some(f => f.path.toLowerCase() === 'license' || f.path.toLowerCase() === 'license.md')
  
  if (hasLicense) {
    detected.push('LICENSE present')
    score += 10
  }

  // 8. Check for conventional commits (5 points)
  const hasCommitizen = deps['commitizen'] || deps['@commitlint/cli'] ||
                        files.some(f => f.path.includes('commitlint'))
  
  if (hasCommitizen) {
    detected.push('Conventional commits configured')
    score += 5
  }

  return {
    category: 'versionControl',
    label: 'Version Control',
    score: Math.min(100, score),
    detected,
    gaps,
    canGenerate: gaps.some(g => g.fixType === 'instant'),
  }
}


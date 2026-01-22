// =============================================================================
// FRONTEND ANALYZER
// =============================================================================

import { CategoryScore, Gap, RepoContext } from '../types'
import { checkPlatformApplicability, getCategoryLabel } from '../platform'

export function analyzeFrontend(ctx: RepoContext): CategoryScore {
  const { files, techStack, packageJson } = ctx
  const label = getCategoryLabel('frontend', techStack.platform, 'Frontend')
  
  // Check platform applicability
  const platformCheck = checkPlatformApplicability('frontend', label, techStack.platform)
  if (platformCheck) return platformCheck
  
  const gaps: Gap[] = []
  const detected: string[] = []
  let score = 0
  
  const deps = packageJson ? { 
    ...((packageJson.dependencies as Record<string, string>) || {}),
    ...((packageJson.devDependencies as Record<string, string>) || {})
  } : {}
  
  // Check if this is a frontend project
  const hasFrontend = techStack.frameworks.some(f => 
    ['react', 'vue', 'svelte', 'angular', 'next.js', 'nuxt', 'sveltekit'].includes(f)
  )
  
  if (!hasFrontend) {
    return {
      category: 'frontend',
      label,
      score: 100, // N/A
      detected: ['No frontend detected'],
      gaps: [],
      canGenerate: false,
    }
  }

  // 1. Check for UI framework (20 points)
  if (techStack.frameworks.includes('react') || techStack.frameworks.includes('vue')) {
    detected.push(`UI Framework: ${techStack.frameworks.find(f => ['react', 'vue', 'svelte', 'angular'].includes(f))}`)
    score += 20
  }

  // 2. Check for styling solution (15 points)
  if (deps['tailwindcss'] || deps['styled-components'] || deps['@emotion/react'] || deps['sass']) {
    detected.push('CSS Framework detected')
    score += 15
  } else {
    gaps.push({
      id: 'frontend-no-css-framework',
      category: 'frontend',
      title: 'No CSS framework detected',
      description: 'Consider adding Tailwind CSS or a CSS-in-JS solution for maintainable styles',
      severity: 'info',
      confidence: 'high',
      fixType: 'guided',
      effortMinutes: 30,
    })
  }

  // 3. Check for error boundaries (15 points)
  const hasErrorBoundary = files.some(f => 
    f.content.includes('ErrorBoundary') || 
    f.content.includes('error.tsx') ||
    f.content.includes('componentDidCatch')
  )
  if (hasErrorBoundary) {
    detected.push('Error boundary implemented')
    score += 15
  } else {
    gaps.push({
      id: 'frontend-no-error-boundary',
      category: 'frontend',
      title: 'No error boundary detected',
      description: 'Add error boundaries to gracefully handle runtime errors',
      severity: 'warning',
      confidence: 'high',
      fixType: 'instant',
      fixTemplate: 'error-boundary',
      effortMinutes: 15,
    })
  }

  // 4. Check for loading states (15 points)
  const hasLoadingStates = files.some(f => 
    f.content.includes('loading') || 
    f.content.includes('isLoading') ||
    f.content.includes('Skeleton') ||
    f.content.includes('Spinner')
  )
  if (hasLoadingStates) {
    detected.push('Loading states implemented')
    score += 15
  } else {
    gaps.push({
      id: 'frontend-no-loading-states',
      category: 'frontend',
      title: 'No loading states detected',
      description: 'Add loading indicators for async operations',
      severity: 'warning',
      confidence: 'likely',
      fixType: 'suggested',
      effortMinutes: 30,
    })
  }

  // 5. Check for meta tags / SEO (10 points)
  const hasMetaTags = files.some(f => 
    f.content.includes('metadata') || 
    f.content.includes('<title>') ||
    f.content.includes('Head') ||
    f.path.includes('layout.tsx')
  )
  if (hasMetaTags) {
    detected.push('SEO meta tags configured')
    score += 10
  } else {
    gaps.push({
      id: 'frontend-no-meta-tags',
      category: 'frontend',
      title: 'No meta tags detected',
      description: 'Add meta tags for SEO and social sharing',
      severity: 'info',
      confidence: 'high',
      fixType: 'instant',
      fixTemplate: 'meta-tags',
      effortMinutes: 10,
    })
  }

  // 6. Check for responsive design (10 points)
  const hasResponsive = files.some(f => 
    f.content.includes('@media') || 
    f.content.includes('sm:') ||
    f.content.includes('md:') ||
    f.content.includes('lg:')
  )
  if (hasResponsive) {
    detected.push('Responsive design detected')
    score += 10
  }

  // 7. Check for accessibility (15 points)
  const hasA11y = files.some(f => 
    f.content.includes('aria-') || 
    f.content.includes('role=') ||
    f.content.includes('alt=')
  )
  if (hasA11y) {
    detected.push('Accessibility attributes present')
    score += 15
  } else {
    gaps.push({
      id: 'frontend-no-a11y',
      category: 'frontend',
      title: 'Limited accessibility support',
      description: 'Add ARIA labels and roles for screen reader support',
      severity: 'warning',
      confidence: 'likely',
      fixType: 'guided',
      effortMinutes: 60,
    })
  }

  return {
    category: 'frontend',
    label,
    score: Math.min(100, score),
    detected,
    gaps,
    canGenerate: gaps.some(g => g.fixType === 'instant'),
  }
}


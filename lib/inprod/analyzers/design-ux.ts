// =============================================================================
// DESIGN/UX ANALYZER
// =============================================================================

import { CategoryScore, Gap, RepoContext } from '../types'

export function analyzeDesignUx(ctx: RepoContext): CategoryScore {
  const gaps: Gap[] = []
  const detected: string[] = []
  let score = 0
  
  const { files, techStack, packageJson } = ctx
  const deps = packageJson ? { 
    ...((packageJson.dependencies as Record<string, string>) || {}),
    ...((packageJson.devDependencies as Record<string, string>) || {})
  } : {}
  
  // Only relevant for frontend/mobile
  const hasUI = techStack.platform === 'web' || techStack.platform === 'ios' || techStack.platform === 'android'
  
  if (!hasUI) {
    return {
      category: 'designUx',
      label: 'Design/UX',
      score: 100, // N/A
      detected: ['No UI detected'],
      gaps: [],
      canGenerate: false,
    }
  }

  // 1. Check for UI component library (20 points)
  const hasUILib = deps['@radix-ui/react-dialog'] || deps['@headlessui/react'] || 
                   deps['@chakra-ui/react'] || deps['@mui/material'] || 
                   deps['antd'] || deps['@mantine/core']
  
  if (hasUILib) {
    detected.push('UI component library')
    score += 20
  }

  // 2. Check for design system / consistent styling (20 points)
  if (deps['tailwindcss']) {
    detected.push('Tailwind CSS for consistent styling')
    score += 20
  } else if (deps['styled-components'] || deps['@emotion/react']) {
    detected.push('CSS-in-JS for scoped styling')
    score += 15
  }

  // 3. Check for loading skeletons (15 points)
  const hasSkeletons = files.some(f => 
    f.content.includes('Skeleton') || 
    f.content.includes('skeleton') ||
    f.content.includes('Placeholder')
  )
  
  if (hasSkeletons) {
    detected.push('Loading skeletons')
    score += 15
  } else {
    gaps.push({
      id: 'ux-no-skeletons',
      category: 'designUx',
      title: 'No loading skeletons detected',
      description: 'Add skeleton loaders for better perceived performance',
      severity: 'info',
      confidence: 'high',
      fixType: 'suggested',
      effortMinutes: 30,
    })
  }

  // 4. Check for empty states (15 points)
  const hasEmptyStates = files.some(f => 
    f.content.includes('empty') || 
    f.content.includes('NoData') ||
    f.content.includes('EmptyState')
  )
  
  if (hasEmptyStates) {
    detected.push('Empty state handling')
    score += 15
  } else {
    gaps.push({
      id: 'ux-no-empty-states',
      category: 'designUx',
      title: 'No empty states detected',
      description: 'Add helpful empty state components for lists and data views',
      severity: 'info',
      confidence: 'likely',
      fixType: 'suggested',
      effortMinutes: 20,
    })
  }

  // 5. Check for toast/notification system (15 points)
  const hasToasts = deps['sonner'] || deps['react-hot-toast'] || deps['react-toastify'] ||
                    files.some(f => f.content.includes('toast') || f.content.includes('Toast'))
  
  if (hasToasts) {
    detected.push('Toast notifications')
    score += 15
  }

  // 6. Check for dark mode support (15 points)
  const hasDarkMode = files.some(f => 
    f.content.includes('dark:') || 
    f.content.includes('darkMode') ||
    f.content.includes('theme')
  )
  
  if (hasDarkMode) {
    detected.push('Dark mode support')
    score += 15
  }

  return {
    category: 'designUx',
    label: 'Design/UX',
    score: Math.min(100, score),
    detected,
    gaps,
    canGenerate: gaps.some(g => g.fixType === 'instant'),
  }
}


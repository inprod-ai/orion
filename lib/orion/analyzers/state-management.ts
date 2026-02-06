// =============================================================================
// STATE MANAGEMENT ANALYZER
// =============================================================================

import { CategoryScore, Gap, RepoContext } from '../types'
import { checkPlatformApplicability, getCategoryLabel } from '../platform'

export function analyzeStateManagement(ctx: RepoContext): CategoryScore {
  const { files, techStack, packageJson } = ctx
  const label = getCategoryLabel('stateManagement', techStack.platform, 'State Management')
  
  // Check platform applicability
  const platformCheck = checkPlatformApplicability('stateManagement', label, techStack.platform)
  if (platformCheck) return platformCheck
  
  const gaps: Gap[] = []
  const detected: string[] = []
  let score = 0
  
  const deps = packageJson ? { 
    ...((packageJson.dependencies as Record<string, string>) || {}),
    ...((packageJson.devDependencies as Record<string, string>) || {})
  } : {}
  
  // Only relevant for frontend projects
  const hasFrontend = techStack.frameworks.some(f => 
    ['react', 'vue', 'svelte', 'angular'].includes(f)
  )
  
  if (!hasFrontend) {
    return {
      category: 'stateManagement',
      label,
      score: 100, // N/A
      detected: ['No frontend state management needed'],
      gaps: [],
      canGenerate: false,
    }
  }

  // 1. Check for state management library (25 points)
  const hasStateLib = deps['zustand'] || deps['redux'] || deps['@reduxjs/toolkit'] || 
                      deps['jotai'] || deps['recoil'] || deps['mobx'] || deps['pinia']
  
  if (hasStateLib) {
    detected.push('State management library detected')
    score += 25
  }

  // 2. Check for data fetching library (25 points)
  // For Next.js App Router, Server Components handle data fetching natively
  const isNextAppRouter = deps['next'] && files.some(f => f.path.includes('app/'))
  const hasDataFetching = deps['@tanstack/react-query'] || deps['react-query'] || 
                          deps['swr'] || deps['@apollo/client'] || deps['urql']
  
  if (hasDataFetching) {
    detected.push('Data fetching library configured')
    score += 25
  } else if (isNextAppRouter) {
    // Next.js App Router uses Server Components for data fetching
    detected.push('Using Next.js Server Components for data fetching')
    score += 25
  } else {
    gaps.push({
      id: 'state-no-data-fetching',
      category: 'stateManagement',
      title: 'No data fetching library detected',
      description: 'Consider React Query or SWR for server state management with caching',
      severity: 'info',
      confidence: 'high',
      fixType: 'guided',
      effortMinutes: 45,
    })
  }

  // 3. Check for optimistic updates (20 points)
  const hasOptimistic = files.some(f => 
    f.content.includes('optimistic') || 
    f.content.includes('onMutate') ||
    f.content.includes('rollback')
  )
  
  if (hasOptimistic) {
    detected.push('Optimistic updates implemented')
    score += 20
  }

  // 4. Check for form state management (15 points)
  const hasFormLib = deps['react-hook-form'] || deps['formik'] || deps['@tanstack/react-form']
  
  if (hasFormLib) {
    detected.push('Form library configured')
    score += 15
  }

  // 5. Check for local storage persistence (15 points)
  const hasPersistence = files.some(f => 
    f.content.includes('localStorage') || 
    f.content.includes('persist') ||
    f.content.includes('zustand/middleware')
  )
  
  if (hasPersistence) {
    detected.push('State persistence configured')
    score += 15
  }

  // If no state management but simple app, give base score
  if (score === 0 && files.length < 20) {
    score = 70 // Simple apps don't need complex state management
    detected.push('Simple app, useState sufficient')
  }

  return {
    category: 'stateManagement',
    label,
    score: Math.min(100, score),
    detected,
    gaps,
    canGenerate: gaps.some(g => g.fixType === 'instant'),
  }
}


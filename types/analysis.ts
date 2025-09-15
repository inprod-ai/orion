export interface CategoryScore {
  name: string
  displayName: string
  score: number
  maxScore: number
  applicable: boolean
  description: string
  recommendations: string[]
  subcategories?: SubCategory[]
}

export interface SubCategory {
  name: string
  score: number
  maxScore: number
  issue?: string
}

export interface Finding {
  id: string
  title: string
  description: string
  category: 'security' | 'performance' | 'best-practices'
  severity: 'critical' | 'high' | 'medium' | 'low'
  points: number // Points that would be added if fixed
  effort: 'easy' | 'medium' | 'hard'
  estimatedTime: string // e.g., "< 1 hour", "1-4 hours", "> 4 hours"
  fix: string // Specific action to take
}

export interface AnalysisResult {
  repoUrl: string
  owner: string
  repo: string
  overallScore: number
  timestamp: Date
  categories: CategoryScore[]
  findings: Finding[] // Top findings with point values
  confidence: {
    level: 'low' | 'medium' | 'high'
    score: number // 0-100
    factors: string[] // What's missing for higher confidence
  }
  summary: {
    strengths: string[]
    weaknesses: string[]
    topPriorities: string[]
  }
  isFreeTier?: boolean // True if showing limited results
  totalFindings?: number // Total number of findings (before filtering)
}

export interface AnalysisProgress {
  stage: 'fetching' | 'analyzing' | 'scoring' | 'complete'
  message: string
  percentage: number
  currentCategory?: string
}

// Simplified categories with new weights: Security 40%, Performance 30%, Best Practices 30%
export const ANALYSIS_CATEGORIES = [
  // Security (40% total)
  { id: 'security', name: 'Security', weight: 40, category: 'security' },
  
  // Performance (30% total)
  { id: 'performance', name: 'Performance & Optimization', weight: 30, category: 'performance' },
  
  // Best Practices (30% total)
  { id: 'testing', name: 'Testing & Quality', weight: 10, category: 'best-practices' },
  { id: 'documentation', name: 'Documentation', weight: 5, category: 'best-practices' },
  { id: 'cicd', name: 'CI/CD & DevOps', weight: 10, category: 'best-practices' },
  { id: 'code-quality', name: 'Code Quality & Maintainability', weight: 5, category: 'best-practices' },
]

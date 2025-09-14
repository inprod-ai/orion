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

export interface AnalysisResult {
  repoUrl: string
  owner: string
  repo: string
  overallScore: number
  timestamp: Date
  categories: CategoryScore[]
  summary: {
    strengths: string[]
    weaknesses: string[]
    topPriorities: string[]
  }
}

export interface AnalysisProgress {
  stage: 'fetching' | 'analyzing' | 'scoring' | 'complete'
  message: string
  percentage: number
  currentCategory?: string
}

export const ANALYSIS_CATEGORIES = [
  { id: 'infrastructure', name: 'Infrastructure & Hosting', weight: 10 },
  { id: 'security', name: 'Security', weight: 15 },
  { id: 'performance', name: 'Performance & Optimization', weight: 10 },
  { id: 'monitoring', name: 'Monitoring & Observability', weight: 8 },
  { id: 'database', name: 'Database & Data Management', weight: 8 },
  { id: 'cicd', name: 'CI/CD & DevOps', weight: 10 },
  { id: 'testing', name: 'Testing', weight: 10 },
  { id: 'documentation', name: 'Documentation', weight: 7 },
  { id: 'error-handling', name: 'Error Handling & Recovery', weight: 8 },
  { id: 'legal', name: 'Legal & Compliance', weight: 5 },
  { id: 'ux', name: 'User Experience', weight: 7 },
  { id: 'business', name: 'Business Continuity', weight: 2 },
]

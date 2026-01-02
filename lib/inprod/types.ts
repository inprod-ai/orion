// =============================================================================
// INPROD.AI TYPE DEFINITIONS
// =============================================================================

export type Category =
  | 'frontend'
  | 'backend'
  | 'database'
  | 'authentication'
  | 'apiIntegrations'
  | 'stateManagement'
  | 'designUx'
  | 'testing'
  | 'security'
  | 'errorHandling'
  | 'versionControl'
  | 'deployment'

export const CATEGORIES: Category[] = [
  'frontend',
  'backend',
  'database',
  'authentication',
  'apiIntegrations',
  'stateManagement',
  'designUx',
  'testing',
  'security',
  'errorHandling',
  'versionControl',
  'deployment',
]

export const CATEGORY_LABELS: Record<Category, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  database: 'Database',
  authentication: 'Authentication',
  apiIntegrations: 'API Integrations',
  stateManagement: 'State Management',
  designUx: 'Design/UX',
  testing: 'Testing',
  security: 'Security',
  errorHandling: 'Error Handling',
  versionControl: 'Version Control',
  deployment: 'Deployment',
}

export type Severity = 'blocker' | 'critical' | 'warning' | 'info'
export type Confidence = 'proven' | 'verified' | 'high' | 'likely' | 'possible'
export type FixType = 'instant' | 'suggested' | 'guided'

export interface Gap {
  id: string
  category: Category
  title: string
  description: string
  severity: Severity
  confidence: Confidence
  file?: string
  line?: number
  fixType: FixType
  fixTemplate?: string
  effortMinutes?: number
}

export interface CategoryScore {
  category: Category
  label: string
  score: number // 0-100
  detected: string[] // What was detected
  gaps: Gap[] // What's missing
  canGenerate: boolean // Can we generate fixes?
}

export interface TechStack {
  platform: 'web' | 'ios' | 'android' | 'backend' | 'cli' | 'library' | 'monorepo'
  languages: string[]
  frameworks: string[]
  packageManager: string | null
  database: string | null
  testFramework: string | null
  ciProvider: string | null
  deploymentPlatform: string | null
  maturityLevel: 'prototype' | 'mvp' | 'production'
}

export interface CompletenessAnalysis {
  repoUrl: string
  techStack: TechStack
  overallScore: number // 0-100
  categories: CategoryScore[]
  totalGaps: number
  blockerCount: number
  criticalCount: number
  warningCount: number
  estimatedFixMinutes: number
  canAutoFix: number // Number of gaps that can be auto-fixed
}

export interface RepoFile {
  path: string
  content: string
  size: number
}

export interface RepoContext {
  files: RepoFile[]
  techStack: TechStack
  packageJson?: Record<string, unknown>
  readme?: string
}

export interface GeneratedFile {
  path: string
  content: string
  language: string
  category: Category
  confidence: number // 0-100
  isModification?: boolean
  originalContent?: string
  description?: string
}

export interface CompletionPlan {
  categories: {
    category: Category
    gaps: Gap[]
    estimatedFiles: number
    estimatedMinutes: number
  }[]
  totalFiles: number
  totalMinutes: number
  priority: Category[] // Ordered by importance
}


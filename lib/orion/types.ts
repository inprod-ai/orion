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

// Which categories apply to which platform types
export const PLATFORM_CATEGORIES: Record<TechStack['platform'], Category[]> = {
  web: ['frontend', 'backend', 'database', 'authentication', 'apiIntegrations', 'stateManagement', 'designUx', 'testing', 'security', 'errorHandling', 'versionControl', 'deployment'],
  ios: ['designUx', 'testing', 'security', 'errorHandling', 'versionControl', 'deployment', 'stateManagement'],
  android: ['designUx', 'testing', 'security', 'errorHandling', 'versionControl', 'deployment', 'stateManagement'],
  backend: ['backend', 'database', 'authentication', 'apiIntegrations', 'testing', 'security', 'errorHandling', 'versionControl', 'deployment'],
  cli: ['testing', 'security', 'errorHandling', 'versionControl', 'deployment'],
  library: ['testing', 'security', 'versionControl'],
  monorepo: ['frontend', 'backend', 'database', 'authentication', 'apiIntegrations', 'stateManagement', 'designUx', 'testing', 'security', 'errorHandling', 'versionControl', 'deployment'],
}

// Platform-specific category overrides (e.g., iOS uses XCTest not Vitest)
export const PLATFORM_OVERRIDES: Partial<Record<TechStack['platform'], Partial<Record<Category, { label: string; checks: string[] }>>>> = {
  ios: {
    testing: { label: 'Testing (XCTest)', checks: ['XCTest', 'Quick/Nimble', 'Fastlane scan'] },
    deployment: { label: 'App Store', checks: ['Fastlane', 'Xcode Cloud', 'TestFlight', 'App Store Connect'] },
    security: { label: 'iOS Security', checks: ['Keychain', 'ATS', 'Entitlements', 'Privacy Manifest'] },
  },
  android: {
    testing: { label: 'Testing (JUnit)', checks: ['JUnit', 'Espresso', 'Robolectric'] },
    deployment: { label: 'Play Store', checks: ['Fastlane', 'Google Play Console', 'Firebase App Distribution'] },
  },
  cli: {
    deployment: { label: 'Distribution', checks: ['Homebrew', 'npm', 'cargo', 'goreleaser'] },
  },
  library: {
    deployment: { label: 'Publishing', checks: ['npm', 'PyPI', 'crates.io', 'Maven Central'] },
  },
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

// =============================================================================
// ALTITUDE SYSTEM - Maps code quality to user capacity
// =============================================================================

export type AltitudeZone = 
  | 'runway'          // 0-99 users - grounded, major issues
  | 'troposphere'     // 100-999 users - basic flight
  | 'stratosphere'    // 1K-9.9K users - commercial flight  
  | 'mesosphere'      // 10K-99K users - high altitude
  | 'thermosphere'    // 100K-999K users - near space
  | 'exosphere'       // 1M-9.9M users - low earth orbit
  | 'orbit'           // 10M-99M users - stable orbit
  | 'lunar'           // 100M-999M users - lunar distance
  | 'interplanetary'  // 1B+ users - planetary scale

export interface AltitudeLevel {
  zone: AltitudeZone
  altitude: number           // Feet/km for display
  maxUsers: number           // Maximum concurrent users
  displayName: string        // Human readable
  color: string              // Gradient color for this zone
  backgroundClass: string    // Tailwind/CSS class for visual
}

export const ALTITUDE_ZONES: AltitudeLevel[] = [
  { zone: 'runway', altitude: 0, maxUsers: 99, displayName: 'Runway', color: '#4a5568', backgroundClass: 'bg-gradient-runway' },
  { zone: 'troposphere', altitude: 36000, maxUsers: 999, displayName: 'Troposphere', color: '#3182ce', backgroundClass: 'bg-gradient-troposphere' },
  { zone: 'stratosphere', altitude: 160000, maxUsers: 9999, displayName: 'Stratosphere', color: '#2b6cb0', backgroundClass: 'bg-gradient-stratosphere' },
  { zone: 'mesosphere', altitude: 280000, maxUsers: 99999, displayName: 'Mesosphere', color: '#1a365d', backgroundClass: 'bg-gradient-mesosphere' },
  { zone: 'thermosphere', altitude: 440000, maxUsers: 999999, displayName: 'Thermosphere', color: '#0d1b2a', backgroundClass: 'bg-gradient-thermosphere' },
  { zone: 'exosphere', altitude: 6200000, maxUsers: 9999999, displayName: 'Exosphere', color: '#0a0f1a', backgroundClass: 'bg-gradient-exosphere' },
  { zone: 'orbit', altitude: 22000000, maxUsers: 99999999, displayName: 'Stable Orbit', color: '#050810', backgroundClass: 'bg-gradient-orbit' },
  { zone: 'lunar', altitude: 238900000, maxUsers: 999999999, displayName: 'Lunar Distance', color: '#020408', backgroundClass: 'bg-gradient-lunar' },
  { zone: 'interplanetary', altitude: 1000000000, maxUsers: Infinity, displayName: 'Interplanetary', color: '#000000', backgroundClass: 'bg-gradient-interplanetary' },
]

// User capacity limits per category at different score levels
// Format: { scoreThreshold: maxUsersAtThisLevel }
export interface CategoryUserLimits {
  category: Category
  limits: { score: number; maxUsers: number; reason: string }[]
}

export const CATEGORY_USER_LIMITS: CategoryUserLimits[] = [
  {
    category: 'database',
    limits: [
      { score: 0, maxUsers: 10, reason: 'No database configured' },
      { score: 30, maxUsers: 100, reason: 'SQLite or basic setup' },
      { score: 45, maxUsers: 3200, reason: 'Single Postgres instance' },
      { score: 60, maxUsers: 25000, reason: 'Postgres with connection pooling' },
      { score: 80, maxUsers: 100000, reason: 'Read replicas + Redis cache' },
      { score: 95, maxUsers: 1000000, reason: 'Sharded + CDN + edge caching' },
    ]
  },
  {
    category: 'backend',
    limits: [
      { score: 0, maxUsers: 50, reason: 'No API structure' },
      { score: 30, maxUsers: 500, reason: 'Basic Express/Next.js API' },
      { score: 50, maxUsers: 5000, reason: 'API with validation + error handling' },
      { score: 70, maxUsers: 50000, reason: 'Rate limiting + logging + health checks' },
      { score: 85, maxUsers: 500000, reason: 'Load balanced + auto-scaling' },
      { score: 95, maxUsers: 5000000, reason: 'Multi-region + edge functions' },
    ]
  },
  {
    category: 'authentication',
    limits: [
      { score: 0, maxUsers: 20, reason: 'No auth system' },
      { score: 40, maxUsers: 1000, reason: 'Basic auth (vulnerable)' },
      { score: 60, maxUsers: 25000, reason: 'NextAuth/Auth0 standard setup' },
      { score: 80, maxUsers: 250000, reason: 'Session encryption + CSRF + secure cookies' },
      { score: 95, maxUsers: Infinity, reason: 'MFA + rate limiting + audit logs' },
    ]
  },
  {
    category: 'security',
    limits: [
      { score: 0, maxUsers: 10, reason: 'Critical vulnerabilities' },
      { score: 30, maxUsers: 100, reason: 'Basic security hygiene' },
      { score: 50, maxUsers: 5000, reason: 'Input validation + secrets management' },
      { score: 70, maxUsers: 100000, reason: 'Security headers + CSP + HTTPS' },
      { score: 85, maxUsers: 1000000, reason: 'Penetration tested + audit logs' },
      { score: 95, maxUsers: Infinity, reason: 'SOC2/ISO compliant' },
    ]
  },
  {
    category: 'errorHandling',
    limits: [
      { score: 0, maxUsers: 50, reason: 'Unhandled exceptions crash app' },
      { score: 40, maxUsers: 1000, reason: 'Basic try-catch' },
      { score: 60, maxUsers: 25000, reason: 'Error boundaries + graceful degradation' },
      { score: 80, maxUsers: 500000, reason: 'Sentry + structured logging' },
      { score: 95, maxUsers: Infinity, reason: 'Self-healing + circuit breakers' },
    ]
  },
  {
    category: 'testing',
    limits: [
      { score: 0, maxUsers: 100, reason: 'No tests = unknown bugs' },
      { score: 30, maxUsers: 1000, reason: 'Some unit tests' },
      { score: 50, maxUsers: 10000, reason: '50%+ coverage' },
      { score: 70, maxUsers: 100000, reason: '80%+ coverage + E2E' },
      { score: 90, maxUsers: Infinity, reason: 'Full coverage + integration + load tests' },
    ]
  },
  {
    category: 'deployment',
    limits: [
      { score: 0, maxUsers: 50, reason: 'Manual deployment' },
      { score: 40, maxUsers: 1000, reason: 'Basic CI/CD' },
      { score: 60, maxUsers: 25000, reason: 'Automated + rollback capability' },
      { score: 80, maxUsers: 500000, reason: 'Blue-green + canary deploys' },
      { score: 95, maxUsers: Infinity, reason: 'GitOps + multi-region + disaster recovery' },
    ]
  },
  {
    category: 'frontend',
    limits: [
      { score: 0, maxUsers: 500, reason: 'No framework = slow rendering' },
      { score: 40, maxUsers: 5000, reason: 'React/Vue but unoptimized' },
      { score: 60, maxUsers: 50000, reason: 'SSR/SSG + code splitting' },
      { score: 80, maxUsers: 500000, reason: 'Edge-cached + optimized images' },
      { score: 95, maxUsers: Infinity, reason: 'CDN + service workers + prefetching' },
    ]
  },
  {
    category: 'apiIntegrations',
    limits: [
      { score: 0, maxUsers: 100, reason: 'No error handling on external APIs' },
      { score: 40, maxUsers: 2000, reason: 'Basic error handling' },
      { score: 60, maxUsers: 20000, reason: 'Retries + timeouts' },
      { score: 80, maxUsers: 200000, reason: 'Circuit breakers + fallbacks' },
      { score: 95, maxUsers: Infinity, reason: 'Fully resilient + cached' },
    ]
  },
  {
    category: 'stateManagement',
    limits: [
      { score: 0, maxUsers: 1000, reason: 'Prop drilling chaos' },
      { score: 50, maxUsers: 25000, reason: 'Zustand/Redux basic' },
      { score: 75, maxUsers: 250000, reason: 'React Query + optimistic updates' },
      { score: 95, maxUsers: Infinity, reason: 'Normalized cache + real-time sync' },
    ]
  },
  {
    category: 'designUx',
    limits: [
      { score: 0, maxUsers: 500, reason: 'Poor UX = user churn' },
      { score: 50, maxUsers: 10000, reason: 'Decent design system' },
      { score: 75, maxUsers: 100000, reason: 'Accessible + responsive' },
      { score: 95, maxUsers: Infinity, reason: 'World-class UX' },
    ]
  },
  {
    category: 'versionControl',
    limits: [
      { score: 0, maxUsers: 100, reason: 'No VCS = team chaos' },
      { score: 50, maxUsers: 50000, reason: 'Git + basic workflow' },
      { score: 75, maxUsers: 500000, reason: 'Protected branches + PR reviews' },
      { score: 95, maxUsers: Infinity, reason: 'Trunk-based + feature flags' },
    ]
  },
]

export interface AltitudeResult {
  // The limiting factor (weakest category)
  bottleneck: {
    category: Category
    score: number
    maxUsers: number
    reason: string
  }
  // Maximum concurrent users the codebase can handle
  maxUsers: number
  // Current altitude zone
  zone: AltitudeLevel
  // All category contributions
  categoryLimits: {
    category: Category
    score: number
    maxUsers: number
    reason: string
    isBottleneck: boolean
  }[]
  // Potential users if top 3 gaps were fixed
  potentialUsers: number
  // What to fix first for biggest altitude gain
  topUpgrades: {
    category: Category
    currentUsers: number
    potentialUsers: number
    effort: 'easy' | 'medium' | 'hard'
  }[]
}


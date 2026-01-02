// =============================================================================
// DATABASE ANALYZER
// =============================================================================

import { CategoryScore, Gap, RepoContext } from '../types'

export function analyzeDatabase(ctx: RepoContext): CategoryScore {
  const gaps: Gap[] = []
  const detected: string[] = []
  let score = 0
  
  const { files, techStack, packageJson } = ctx
  const deps = packageJson ? { 
    ...((packageJson.dependencies as Record<string, string>) || {}),
    ...((packageJson.devDependencies as Record<string, string>) || {})
  } : {}
  
  if (!techStack.database) {
    return {
      category: 'database',
      label: 'Database',
      score: 100, // N/A
      detected: ['No database detected'],
      gaps: [],
      canGenerate: false,
    }
  }

  detected.push(`Database: ${techStack.database}`)
  score += 20

  // 1. Check for ORM/Query Builder (20 points)
  const hasORM = deps['prisma'] || deps['@prisma/client'] || deps['drizzle-orm'] || 
                 deps['typeorm'] || deps['sequelize'] || deps['mongoose']
  
  if (hasORM) {
    detected.push('ORM configured')
    score += 20
  } else {
    gaps.push({
      id: 'database-no-orm',
      category: 'database',
      title: 'No ORM detected',
      description: 'Using raw SQL queries increases SQL injection risk. Consider Prisma or Drizzle.',
      severity: 'warning',
      confidence: 'high',
      fixType: 'guided',
      effortMinutes: 60,
    })
  }

  // 2. Check for migrations (20 points)
  const hasMigrations = files.some(f => 
    f.path.includes('/migrations/') || 
    f.path.includes('prisma/migrations') ||
    f.path.includes('drizzle/')
  )
  
  if (hasMigrations) {
    detected.push('Database migrations present')
    score += 20
  } else {
    gaps.push({
      id: 'database-no-migrations',
      category: 'database',
      title: 'No database migrations',
      description: 'Add migrations for version-controlled schema changes',
      severity: 'warning',
      confidence: 'likely',
      fixType: 'guided',
      effortMinutes: 30,
    })
  }

  // 3. Check for indexes (15 points)
  const hasIndexes = files.some(f => 
    f.content.includes('@@index') || 
    f.content.includes('CREATE INDEX') ||
    f.content.includes('.index(')
  )
  
  if (hasIndexes) {
    detected.push('Database indexes defined')
    score += 15
  } else {
    gaps.push({
      id: 'database-no-indexes',
      category: 'database',
      title: 'No database indexes detected',
      description: 'Add indexes for frequently queried columns to improve performance',
      severity: 'info',
      confidence: 'likely',
      fixType: 'suggested',
      effortMinutes: 20,
    })
  }

  // 4. Check for connection pooling (15 points)
  const hasPooling = files.some(f => 
    f.content.includes('pool') || 
    f.content.includes('connectionLimit') ||
    f.content.includes('?pgbouncer=true')
  )
  
  if (hasPooling) {
    detected.push('Connection pooling configured')
    score += 15
  }

  // 5. Check for backup strategy (10 points)
  // This is hard to detect, so we'll be lenient
  if (techStack.database === 'supabase' || techStack.database === 'planetscale' || techStack.database === 'neon') {
    detected.push('Managed database with automatic backups')
    score += 10
  } else {
    gaps.push({
      id: 'database-no-backups',
      category: 'database',
      title: 'No backup strategy detected',
      description: 'Ensure database backups are configured for disaster recovery',
      severity: 'info',
      confidence: 'possible',
      fixType: 'guided',
      effortMinutes: 30,
    })
  }

  return {
    category: 'database',
    label: 'Database',
    score: Math.min(100, score),
    detected,
    gaps,
    canGenerate: gaps.some(g => g.fixType === 'instant'),
  }
}


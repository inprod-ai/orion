// =============================================================================
// README GENERATION
// =============================================================================

import { GeneratedFile, RepoContext } from '../types'

/**
 * Generate README.md
 */
export async function generateReadme(
  ctx: RepoContext
): Promise<GeneratedFile[]> {
  const { techStack, packageJson } = ctx
  
  const repoName = (packageJson?.name as string) || 'my-project'
  const description = (packageJson?.description as string) || 'A modern application.'
  
  const sections: string[] = []
  
  // Title and description
  sections.push(`# ${repoName}`)
  sections.push('')
  sections.push(description)
  sections.push('')
  
  // Badges
  sections.push('## Status')
  sections.push('')
  sections.push('![Build](https://github.com/username/repo/workflows/CI/badge.svg)')
  sections.push('')
  
  // Tech stack
  sections.push('## Tech Stack')
  sections.push('')
  for (const fw of techStack.frameworks) {
    sections.push(`- ${fw}`)
  }
  for (const lang of techStack.languages) {
    sections.push(`- ${lang}`)
  }
  if (techStack.database) {
    sections.push(`- ${techStack.database}`)
  }
  sections.push('')
  
  // Getting started
  sections.push('## Getting Started')
  sections.push('')
  sections.push('### Prerequisites')
  sections.push('')
  sections.push('- Node.js 20+')
  sections.push(`- ${techStack.packageManager || 'npm'}`)
  sections.push('')
  
  sections.push('### Installation')
  sections.push('')
  sections.push('```bash')
  sections.push('# Clone the repository')
  sections.push('git clone https://github.com/username/repo.git')
  sections.push('cd repo')
  sections.push('')
  sections.push('# Install dependencies')
  sections.push(`${techStack.packageManager || 'npm'} install`)
  sections.push('')
  sections.push('# Set up environment variables')
  sections.push('cp .env.example .env.local')
  sections.push('# Edit .env.local with your values')
  sections.push('')
  sections.push('# Run development server')
  sections.push(`${techStack.packageManager === 'pnpm' ? 'pnpm dev' : techStack.packageManager === 'yarn' ? 'yarn dev' : 'npm run dev'}`)
  sections.push('```')
  sections.push('')
  
  // Environment variables
  if (ctx.files.some(f => f.path === '.env.example')) {
    sections.push('## Environment Variables')
    sections.push('')
    sections.push('See `.env.example` for required environment variables.')
    sections.push('')
  }
  
  // Scripts
  const scripts = packageJson?.scripts as Record<string, string> | undefined
  if (scripts) {
    sections.push('## Available Scripts')
    sections.push('')
    sections.push('| Script | Description |')
    sections.push('|--------|-------------|')
    if (scripts.dev) sections.push(`| \`dev\` | Start development server |`)
    if (scripts.build) sections.push(`| \`build\` | Build for production |`)
    if (scripts.start) sections.push(`| \`start\` | Start production server |`)
    if (scripts.test) sections.push(`| \`test\` | Run tests |`)
    if (scripts.lint) sections.push(`| \`lint\` | Run linter |`)
    sections.push('')
  }
  
  // Project structure
  sections.push('## Project Structure')
  sections.push('')
  sections.push('```')
  sections.push('├── app/           # Next.js app router pages')
  sections.push('├── components/    # React components')
  sections.push('├── lib/           # Utility functions')
  sections.push('├── prisma/        # Database schema')
  sections.push('├── public/        # Static assets')
  sections.push('└── tests/         # Test files')
  sections.push('```')
  sections.push('')
  
  // License
  sections.push('## License')
  sections.push('')
  const license = (packageJson?.license as string) || 'MIT'
  sections.push(`${license} ${new Date().getFullYear()}`)
  sections.push('')
  
  return [{
    path: 'README.md',
    content: sections.join('\n'),
    language: 'markdown',
    category: 'versionControl',
    confidence: 80,
    description: 'Project README documentation',
  }]
}


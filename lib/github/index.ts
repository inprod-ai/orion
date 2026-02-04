// =============================================================================
// GITHUB API INTEGRATION - Secure repo fetching with SSRF protection
// =============================================================================
// Mirrors slopometer's robust GitHub integration.
// =============================================================================

import { RepoFile } from '@/lib/inprod/types'

// =============================================================================
// LIMITS (Cost Control)
// =============================================================================

export const LIMITS = {
  maxFilesToScan: 200,
  maxFileSizeBytes: 100_000, // 100KB
  maxTokensPerFile: 4000,
  maxTotalTokens: 50_000,
  scanTimeoutMs: 60_000,
} as const

// =============================================================================
// FILE EXTENSIONS TO SCAN
// =============================================================================

const SCANNABLE_EXTENSIONS = new Set([
  // JavaScript/TypeScript
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  // Python
  '.py', '.pyi',
  // Swift/iOS
  '.swift', '.m', '.h',
  // Kotlin/Java/Android
  '.kt', '.kts', '.java',
  // Rust
  '.rs',
  // Go
  '.go',
  // Ruby
  '.rb',
  // PHP
  '.php',
  // C/C++
  '.c', '.cpp', '.cc', '.hpp',
  // Config/Data
  '.json', '.yaml', '.yml', '.toml', '.xml', '.plist',
  // Web
  '.html', '.css', '.scss', '.sass',
  // Database
  '.sql', '.prisma',
  // Other
  '.md', '.mdx', '.txt', '.sh', '.gitignore',
])

// Special filenames without extensions
const SCANNABLE_FILENAMES = new Set([
  'Dockerfile',
  'Makefile',
  'Cargo.toml',
  'go.mod',
  'Package.swift',
  'Podfile',
  'Gemfile',
  'requirements.txt',
  'pyproject.toml',
  'docker-compose.yml',
  'docker-compose.yaml',
  '.gitignore',
  '.eslintrc',
  '.prettierrc',
  '.env.example',
])

// =============================================================================
// DIRECTORIES TO SKIP
// =============================================================================

const SKIP_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  '.build',
  'out',
  'coverage',
  '.nyc_output',
  'vendor',
  'Pods',
  '.pods',
  'venv',
  '.venv',
  'env',
  '__pycache__',
  '.pytest_cache',
  'target',
  '.gradle',
  '.idea',
  '.vscode',
  'DerivedData',
  '.cache',
])

// =============================================================================
// LANGUAGE DETECTION
// =============================================================================

const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.py': 'python',
  '.pyi': 'python',
  '.swift': 'swift',
  '.m': 'objective-c',
  '.h': 'c',
  '.kt': 'kotlin',
  '.kts': 'kotlin',
  '.java': 'java',
  '.rs': 'rust',
  '.go': 'go',
  '.rb': 'ruby',
  '.php': 'php',
  '.c': 'c',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.hpp': 'cpp',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.xml': 'xml',
  '.plist': 'plist',
  '.md': 'markdown',
  '.mdx': 'markdown',
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'sass',
  '.html': 'html',
  '.sql': 'sql',
  '.prisma': 'prisma',
  '.sh': 'shell',
}

// =============================================================================
// TYPES
// =============================================================================

export interface GitHubRepo {
  owner: string
  name: string
  url: string
}

export interface FetchProgressEvent {
  fetched: number
  total: number
  currentFile: string
  elapsedMs: number
}

export interface FetchRepoResult {
  files: RepoFile[]
  totalSize: number
  fileCount: number
  repoInfo: GitHubRepo
  isPrivate: boolean
  defaultBranch: string
}

// =============================================================================
// PARSE GITHUB URL - SSRF Protected
// =============================================================================

/**
 * Parse and validate a GitHub repository URL.
 * 
 * SECURITY: This function implements SSRF protection by:
 * 1. Only accepting URLs where github.com is the actual hostname
 * 2. Rejecting URLs with github.com in the path (e.g., evil.com/github.com/...)
 * 3. Rejecting subdomains (e.g., github.evil.com or evil.github.com)
 * 4. Rejecting localhost, IP addresses, and internal hosts
 */
export function parseGitHubUrl(url: string): GitHubRepo | null {
  // Normalize the URL
  let normalizedUrl = url.trim()
  
  // Add protocol if missing
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://') && !normalizedUrl.startsWith('git@')) {
    normalizedUrl = `https://${normalizedUrl}`
  }

  // Pattern 1: HTTPS URLs - must have github.com as the hostname (with optional www.)
  const httpsPattern = /^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9._-]+?)(?:\.git)?(?:[#?\/].*)?$/
  
  // Pattern 2: SSH URLs (git@github.com:owner/repo.git)
  const sshPattern = /^git@github\.com:([a-zA-Z0-9_-]+)\/([a-zA-Z0-9._-]+?)(?:\.git)?$/
  
  // Try HTTPS pattern first
  let match = normalizedUrl.match(httpsPattern)
  if (match) {
    const owner = match[1]
    const name = match[2]
    
    // Additional validation: reject reserved names
    if (isReservedName(owner) || isReservedName(name)) {
      return null
    }
    
    return {
      owner,
      name,
      url: `https://github.com/${owner}/${name}`,
    }
  }
  
  // Try SSH pattern
  match = normalizedUrl.match(sshPattern)
  if (match) {
    const owner = match[1]
    const name = match[2]
    
    if (isReservedName(owner) || isReservedName(name)) {
      return null
    }
    
    return {
      owner,
      name,
      url: `https://github.com/${owner}/${name}`,
    }
  }
  
  return null
}

/**
 * Check if a name is reserved or potentially dangerous
 */
function isReservedName(name: string): boolean {
  const reserved = [
    'api', 'raw', 'gist', 'assets', 'avatars',
    'codeload', 'status', 'security', 'settings',
    '..', '.', '',
  ]
  return reserved.includes(name.toLowerCase())
}

// =============================================================================
// GITHUB API TYPES
// =============================================================================

interface GitHubTreeItem {
  path: string
  type: 'blob' | 'tree'
  sha: string
  size?: number
  url: string
}

interface GitHubTreeResponse {
  sha: string
  url: string
  tree: GitHubTreeItem[]
  truncated: boolean
}

interface GitHubRepoResponse {
  default_branch: string
  private: boolean
  full_name: string
}

// =============================================================================
// GITHUB API HELPERS
// =============================================================================

async function fetchWithAuth(url: string, accessToken?: string): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'orion.archi/1.0',
  }
  
  // Use provided access token, or fall back to server token for public repos
  const token = accessToken || process.env.GITHUB_TOKEN
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  
  return fetch(url, { 
    headers,
    cache: 'no-store', // Bypass cache for fresh data
  })
}

async function getRepoInfo(
  owner: string,
  repo: string,
  accessToken?: string
): Promise<{ defaultBranch: string; isPrivate: boolean }> {
  const res = await fetchWithAuth(
    `https://api.github.com/repos/${owner}/${repo}`,
    accessToken
  )
  
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('Repository not found or access denied. Try signing in with GitHub for private repos.')
    }
    if (res.status === 403) {
      const rateLimitRemaining = res.headers.get('X-RateLimit-Remaining')
      const rateLimitReset = res.headers.get('X-RateLimit-Reset')
      if (rateLimitRemaining === '0') {
        const resetTime = rateLimitReset 
          ? new Date(parseInt(rateLimitReset) * 1000).toLocaleTimeString() 
          : 'soon'
        throw new Error(`GitHub API rate limit exceeded. Resets at ${resetTime}. Try signing in for higher limits.`)
      }
      throw new Error('Access forbidden. The repository may be private. Try signing in with GitHub.')
    }
    throw new Error(`GitHub API error: ${res.status}`)
  }
  
  const data: GitHubRepoResponse = await res.json()
  return {
    defaultBranch: data.default_branch || 'main',
    isPrivate: data.private,
  }
}

async function getRepoTree(
  owner: string,
  repo: string,
  branch: string,
  accessToken?: string
): Promise<GitHubTreeItem[]> {
  const res = await fetchWithAuth(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    accessToken
  )
  
  if (!res.ok) {
    if (res.status === 409) {
      throw new Error('Repository is empty or still being initialized. Please try a repo with code.')
    }
    if (res.status === 403) {
      const rateLimitRemaining = res.headers.get('X-RateLimit-Remaining')
      const rateLimitReset = res.headers.get('X-RateLimit-Reset')
      if (rateLimitRemaining === '0') {
        const resetTime = rateLimitReset 
          ? new Date(parseInt(rateLimitReset) * 1000).toLocaleTimeString() 
          : 'soon'
        throw new Error(`GitHub API rate limit exceeded. Resets at ${resetTime}. Try signing in for higher limits.`)
      }
      throw new Error('Access forbidden. The repository may be private. Try signing in with GitHub.')
    }
    if (res.status === 404) {
      throw new Error('Repository branch not found. The default branch may not exist.')
    }
    throw new Error(`Failed to fetch repo tree: ${res.status}`)
  }
  
  const data: GitHubTreeResponse = await res.json()
  
  if (data.truncated) {
    console.warn('[github] Repository tree was truncated (very large repo)')
  }
  
  return data.tree
}

function shouldScanFile(filePath: string): boolean {
  // Skip files in ignored directories
  const parts = filePath.split('/')
  for (const part of parts) {
    if (SKIP_DIRECTORIES.has(part)) {
      return false
    }
  }
  
  // Check extension
  const filename = parts[parts.length - 1]
  const ext = '.' + filename.split('.').pop()?.toLowerCase()
  
  // Match by filename first (for special files like Dockerfile)
  if (SCANNABLE_FILENAMES.has(filename)) {
    return true
  }
  
  // Then check extension
  if (SCANNABLE_EXTENSIONS.has(ext)) {
    return true
  }
  
  return false
}

async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  accessToken?: string
): Promise<string | null> {
  try {
    const res = await fetchWithAuth(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      accessToken
    )
    
    if (!res.ok) return null
    
    const data = await res.json()
    
    if (data.encoding === 'base64' && data.content) {
      // Decode base64 content
      return Buffer.from(data.content, 'base64').toString('utf-8')
    }
    
    return null
  } catch {
    return null
  }
}

// =============================================================================
// MAIN FETCH FUNCTION
// =============================================================================

/**
 * Fetch repository files from GitHub API.
 * Works in serverless environments (no git clone needed).
 */
export async function fetchRepoFiles(
  repoUrl: string,
  accessToken?: string,
  onProgress?: (event: FetchProgressEvent) => void
): Promise<FetchRepoResult> {
  const startTime = Date.now()
  
  // Parse and validate URL (SSRF protection)
  const repoInfo = parseGitHubUrl(repoUrl)
  if (!repoInfo) {
    throw new Error('Invalid GitHub URL format. Use: https://github.com/owner/repo')
  }
  
  // Get repo info (default branch, private status)
  const { defaultBranch, isPrivate } = await getRepoInfo(
    repoInfo.owner,
    repoInfo.name,
    accessToken
  )
  
  // Get all files in the repo
  const tree = await getRepoTree(
    repoInfo.owner,
    repoInfo.name,
    defaultBranch,
    accessToken
  )
  
  // Filter to scannable files
  const filesToFetch = tree
    .filter((item) => item.type === 'blob')
    .filter((item) => shouldScanFile(item.path))
    .filter((item) => (item.size || 0) <= LIMITS.maxFileSizeBytes)
    .slice(0, LIMITS.maxFilesToScan)
  
  // Fetch file contents in parallel (with concurrency limit) + streaming progress
  const files: RepoFile[] = []
  const BATCH_SIZE = 10
  let fetched = 0
  const total = filesToFetch.length
  
  for (let i = 0; i < filesToFetch.length; i += BATCH_SIZE) {
    const batch = filesToFetch.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(
      batch.map(async (item) => {
        const content = await fetchFileContent(
          repoInfo.owner,
          repoInfo.name,
          item.path,
          accessToken
        )
        
        // Stream progress for each file
        fetched++
        onProgress?.({
          fetched,
          total,
          currentFile: item.path,
          elapsedMs: Date.now() - startTime,
        })
        
        if (content === null) return null
        
        const ext = '.' + item.path.split('.').pop()?.toLowerCase()
        
        return {
          path: item.path,
          content,
          size: item.size || content.length,
          language: EXTENSION_TO_LANGUAGE[ext],
        } as RepoFile
      })
    )
    
    files.push(...results.filter((f): f is RepoFile => f !== null))
  }
  
  const totalSize = files.reduce((sum, f) => sum + f.size, 0)
  
  return {
    files,
    totalSize,
    fileCount: files.length,
    repoInfo,
    isPrivate,
    defaultBranch,
  }
}

// =============================================================================
// KEY FILE DETECTION
// =============================================================================

export interface KeyFiles {
  packageJson?: RepoFile
  cargoToml?: RepoFile
  pyprojectToml?: RepoFile
  requirementsTxt?: RepoFile
  buildGradle?: RepoFile
  packageSwift?: RepoFile
  podfile?: RepoFile
  goMod?: RepoFile
  gemfile?: RepoFile
  infoPlist?: RepoFile
  androidManifest?: RepoFile
  dockerfile?: RepoFile
  readme?: RepoFile
  gitignore?: RepoFile
}

export function findKeyFiles(files: RepoFile[]): KeyFiles {
  const result: KeyFiles = {}
  
  for (const file of files) {
    const name = file.path.split('/').pop() || ''
    const lower = name.toLowerCase()
    
    if (name === 'package.json' && !file.path.includes('node_modules')) {
      result.packageJson = result.packageJson || file
    } else if (name === 'Cargo.toml') result.cargoToml = file
    else if (name === 'pyproject.toml') result.pyprojectToml = file
    else if (name === 'requirements.txt') result.requirementsTxt = file
    else if (name === 'build.gradle' || name === 'build.gradle.kts') result.buildGradle = file
    else if (name === 'Package.swift') result.packageSwift = file
    else if (name === 'Podfile') result.podfile = file
    else if (name === 'go.mod') result.goMod = file
    else if (name === 'Gemfile') result.gemfile = file
    else if (lower === 'info.plist') result.infoPlist = file
    else if (name === 'AndroidManifest.xml') result.androidManifest = file
    else if (name === 'Dockerfile') result.dockerfile = file
    else if (lower === 'readme.md' || lower === 'readme') result.readme = file
    else if (name === '.gitignore') result.gitignore = file
  }
  
  return result
}

// =============================================================================
// USER ACCESS VALIDATION
// =============================================================================

/**
 * Validate that a user has access to a specific repository
 */
export async function validateRepoAccess(
  accessToken: string,
  owner: string,
  repo: string
): Promise<{ hasAccess: boolean; isPrivate: boolean }> {
  const res = await fetchWithAuth(
    `https://api.github.com/repos/${owner}/${repo}`,
    accessToken
  )
  
  if (res.status === 404) {
    return { hasAccess: false, isPrivate: false }
  }
  
  if (!res.ok) {
    throw new Error(`Failed to validate repo access: ${res.status}`)
  }
  
  const data = await res.json()
  return {
    hasAccess: true,
    isPrivate: data.private,
  }
}

/**
 * Fetch authenticated GitHub user info
 */
export async function getGitHubUser(accessToken: string): Promise<{
  id: number
  login: string
  avatar_url: string
  email: string | null
  name: string | null
}> {
  const res = await fetchWithAuth('https://api.github.com/user', accessToken)
  
  if (!res.ok) {
    throw new Error(`Failed to fetch GitHub user: ${res.status}`)
  }
  
  return res.json()
}

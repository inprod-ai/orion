// =============================================================================
// GITHUB OAUTH - Custom authentication for GitHub
// =============================================================================
// Simple, reliable OAuth flow without NextAuth complexity.
// =============================================================================

import { cookies } from 'next/headers'
import { encryptSession, decryptSession } from './crypto'

// =============================================================================
// CONFIGURATION
// =============================================================================

const GITHUB_CLIENT_ID = (process.env.GITHUB_CLIENT_ID || '').trim()
const GITHUB_CLIENT_SECRET = (process.env.GITHUB_CLIENT_SECRET || '').trim()
const APP_URL = (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').trim()
const GITHUB_REDIRECT_URI = `${APP_URL}/api/auth/callback`

const SCOPES = ['read:user', 'user:email', 'repo'].join(' ')

// =============================================================================
// TYPES
// =============================================================================

export interface GitHubUser {
  id: number
  login: string
  avatar_url: string
  email: string | null
  name: string | null
}

export interface GitHubTokenResponse {
  access_token: string
  token_type: string
  scope: string
  error?: string
  error_description?: string
}

export interface SessionUser {
  id: string
  name: string
  email: string | null
  image: string
  accessToken: string
}

// =============================================================================
// OAUTH FLOW
// =============================================================================

/**
 * Generate the GitHub OAuth authorization URL
 */
export function getGitHubAuthUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: GITHUB_REDIRECT_URI,
    scope: SCOPES,
    state: state || generateState(),
  })

  return `https://github.com/login/oauth/authorize?${params.toString()}`
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<GitHubTokenResponse> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: GITHUB_REDIRECT_URI,
    }),
  })

  if (!response.ok) {
    throw new Error(`GitHub token exchange failed: ${response.status}`)
  }

  const data = await response.json()
  
  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`)
  }

  return data
}

/**
 * Fetch authenticated user from GitHub
 */
export async function getGitHubUser(accessToken: string): Promise<GitHubUser> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch GitHub user: ${response.status}`)
  }

  return response.json()
}

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

const SESSION_COOKIE_NAME = 'inprod_session'
const STATE_COOKIE_NAME = 'oauth_state'
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days

/**
 * Generate a random state parameter for CSRF protection
 */
function generateState(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Store OAuth state in a cookie for verification
 */
export async function setOAuthState(state: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  })
}

/**
 * Verify OAuth state from cookie
 */
export async function verifyOAuthState(state: string): Promise<boolean> {
  const cookieStore = await cookies()
  const storedState = cookieStore.get(STATE_COOKIE_NAME)?.value
  
  if (storedState) {
    cookieStore.delete(STATE_COOKIE_NAME)
  }
  
  return storedState === state
}

/**
 * Set user session after successful authentication
 */
export async function setSession(userId: string, accessToken: string): Promise<void> {
  const cookieStore = await cookies()
  
  // Encrypt session data
  const encrypted = encryptSession({ userId, accessToken })
  
  cookieStore.set(SESSION_COOKIE_NAME, encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  })
}

/**
 * Get current session if exists
 */
export async function getSession(): Promise<{ userId: string; accessToken: string } | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value
  
  if (!sessionCookie) return null
  
  // Decrypt the session
  const session = decryptSession(sessionCookie)
  
  if (!session) {
    // Invalid session - clear it
    await clearSession()
    return null
  }
  
  return session
}

/**
 * Clear session (logout)
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

/**
 * Get access token from session for API calls
 */
export async function getAccessToken(): Promise<string | null> {
  const session = await getSession()
  return session?.accessToken || null
}

/**
 * Check if GitHub OAuth is properly configured
 */
export function isOAuthConfigured(): boolean {
  return !!(GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET)
}

/**
 * Get configuration errors for debugging
 */
export function getConfigErrors(): string[] {
  const errors: string[] = []
  if (!GITHUB_CLIENT_ID) errors.push('GITHUB_CLIENT_ID is not set')
  if (!GITHUB_CLIENT_SECRET) errors.push('GITHUB_CLIENT_SECRET is not set')
  if (!APP_URL || APP_URL === 'http://localhost:3000') {
    errors.push('NEXTAUTH_URL or NEXT_PUBLIC_APP_URL should be set to production URL')
  }
  return errors
}

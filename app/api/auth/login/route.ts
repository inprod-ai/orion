// =============================================================================
// GitHub OAuth Login - Redirect to GitHub
// =============================================================================

import { NextResponse } from 'next/server'
import { getGitHubAuthUrl, setOAuthState, isOAuthConfigured, getConfigErrors } from '@/lib/github-auth'

export async function GET() {
  // Check if OAuth is configured
  if (!isOAuthConfigured()) {
    const errors = getConfigErrors()
    console.error('GitHub OAuth not configured:', errors)
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    return NextResponse.redirect(`${baseUrl}?error=Configuration`)
  }

  // Generate state for CSRF protection
  const state = crypto.randomUUID()
  
  // Store state in cookie
  await setOAuthState(state)
  
  // Redirect to GitHub
  const authUrl = getGitHubAuthUrl(state)
  
  return NextResponse.redirect(authUrl)
}

// =============================================================================
// GitHub OAuth Callback - Handle authorization code
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import {
  exchangeCodeForToken,
  getGitHubUser,
  verifyOAuthState,
  setSession,
} from '@/lib/github-auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

  // Handle OAuth errors from GitHub
  if (error) {
    console.error('GitHub OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      `${baseUrl}?error=${encodeURIComponent(errorDescription || error)}`
    )
  }

  // Validate required parameters
  if (!code || !state) {
    return NextResponse.redirect(
      `${baseUrl}?error=${encodeURIComponent('Missing authorization code or state')}`
    )
  }

  // Verify state for CSRF protection
  const isValidState = await verifyOAuthState(state)
  if (!isValidState) {
    return NextResponse.redirect(
      `${baseUrl}?error=${encodeURIComponent('Invalid OAuth state - please try again')}`
    )
  }

  try {
    // Exchange code for access token
    const tokenResponse = await exchangeCodeForToken(code)

    // Get user info from GitHub
    const githubUser = await getGitHubUser(tokenResponse.access_token)

    // Upsert user in database
    const user = await prisma.user.upsert({
      where: { 
        email: githubUser.email || `${githubUser.id}@github.user` 
      },
      update: {
        name: githubUser.name || githubUser.login,
        image: githubUser.avatar_url,
      },
      create: {
        email: githubUser.email || `${githubUser.id}@github.user`,
        name: githubUser.name || githubUser.login,
        image: githubUser.avatar_url,
        tier: 'FREE',
        monthlyScans: 0,
      },
    })

    // Also create/update the account record to store the access token
    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: 'github',
          providerAccountId: String(githubUser.id),
        },
      },
      update: {
        access_token: tokenResponse.access_token,
      },
      create: {
        userId: user.id,
        type: 'oauth',
        provider: 'github',
        providerAccountId: String(githubUser.id),
        access_token: tokenResponse.access_token,
        token_type: tokenResponse.token_type,
        scope: tokenResponse.scope,
      },
    })

    // Set session cookie
    await setSession(user.id, tokenResponse.access_token)

    // Redirect to home with success
    return NextResponse.redirect(`${baseUrl}?auth=success`)
  } catch (err) {
    console.error('GitHub OAuth callback error:', err)
    return NextResponse.redirect(
      `${baseUrl}?error=${encodeURIComponent('Authentication failed. Please try again.')}`
    )
  }
}

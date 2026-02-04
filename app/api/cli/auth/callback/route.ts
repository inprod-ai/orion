import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

// GitHub OAuth callback for CLI auth
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code')
    const state = request.nextUrl.searchParams.get('state')

    if (!code || !state) {
      return new Response(errorPage('Missing code or state'), {
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      })
    }

    // Retrieve port from state
    const stateData = await prisma.rateLimit.findUnique({
      where: { key: `cli_auth_${state}` }
    })

    if (!stateData || stateData.resetAt < new Date()) {
      return new Response(errorPage('Invalid or expired state'), {
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      })
    }

    const port = stateData.count

    // Clean up state
    await prisma.rateLimit.delete({
      where: { key: `cli_auth_${state}` }
    })

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/cli/auth/callback`
      })
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      return new Response(errorPage(`GitHub error: ${tokenData.error_description}`), {
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      })
    }

    // Fetch user info from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })

    const githubUser = await userResponse.json()

    // Fetch user email
    const emailResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })

    const emails = await emailResponse.json()
    const primaryEmail = emails.find((e: any) => e.primary)?.email || githubUser.email

    // Find or create user
    let user = await prisma.user.findFirst({
      where: {
        Account: {
          some: {
            provider: 'github',
            providerAccountId: String(githubUser.id)
          }
        }
      }
    })

    if (!user) {
      // Create new user with account
      user = await prisma.user.create({
        data: {
          name: githubUser.name || githubUser.login,
          email: primaryEmail,
          image: githubUser.avatar_url,
          Account: {
            create: {
              type: 'oauth',
              provider: 'github',
              providerAccountId: String(githubUser.id),
              access_token: tokenData.access_token,
              token_type: tokenData.token_type,
              scope: tokenData.scope
            }
          }
        }
      })
    }

    // Create CLI session token
    const sessionToken = randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    await prisma.session.create({
      data: {
        sessionToken,
        userId: user.id,
        expires
      }
    })

    // Redirect to CLI callback
    const callbackUrl = new URL(`http://localhost:${port}/callback`)
    callbackUrl.searchParams.set('token', sessionToken)

    // Show success page that redirects to CLI
    return new Response(successPage(callbackUrl.toString(), user.name || githubUser.login), {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    })

  } catch (error) {
    console.error('CLI auth callback error:', error)
    return new Response(errorPage('Authentication failed'), {
      status: 500,
      headers: { 'Content-Type': 'text/html' }
    })
  }
}

function successPage(redirectUrl: string, userName: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>inprod - Authenticated</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
    }
    .container {
      text-align: center;
      padding: 40px;
      background: rgba(255,255,255,0.05);
      border-radius: 16px;
      backdrop-filter: blur(10px);
    }
    h1 { color: #00ff88; margin-bottom: 10px; }
    p { color: #888; margin: 10px 0; }
    .success { font-size: 48px; margin-bottom: 20px; }
  </style>
  <meta http-equiv="refresh" content="2;url=${redirectUrl}">
</head>
<body>
  <div class="container">
    <div class="success">✅</div>
    <h1>Authenticated!</h1>
    <p>Welcome, ${userName}</p>
    <p>Redirecting to CLI...</p>
    <p style="font-size: 12px;">If not redirected, <a href="${redirectUrl}" style="color: #00ff88;">click here</a></p>
  </div>
</body>
</html>
`
}

function errorPage(message: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>inprod - Error</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
    }
    .container {
      text-align: center;
      padding: 40px;
      background: rgba(255,255,255,0.05);
      border-radius: 16px;
    }
    h1 { color: #ff4444; }
    p { color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <h1>❌ Error</h1>
    <p>${message}</p>
    <p>Please try again from the CLI.</p>
  </div>
</body>
</html>
`
}


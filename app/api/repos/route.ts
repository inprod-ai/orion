// =============================================================================
// API: /api/repos - Fetch authenticated user's GitHub repositories
// =============================================================================

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Get authenticated session
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    // Get user's GitHub access token from the account table
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: 'github',
      },
      select: {
        access_token: true,
      },
    })
    
    if (!account?.access_token) {
      return NextResponse.json({ error: 'GitHub account not linked' }, { status: 401 })
    }
    
    // Fetch user's repos from GitHub API
    const response = await fetch(
      'https://api.github.com/user/repos?sort=updated&per_page=50&type=all',
      {
        headers: {
          Authorization: `Bearer ${account.access_token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'inprod.ai/1.0',
        },
        cache: 'no-store',
      }
    )
    
    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json({ error: 'GitHub token expired. Please sign in again.' }, { status: 401 })
      }
      throw new Error(`GitHub API error: ${response.status}`)
    }
    
    const repos = await response.json()
    
    // Return simplified repo data
    const simplifiedRepos = repos.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      url: repo.html_url,
      description: repo.description,
      private: repo.private,
      language: repo.language,
      updatedAt: repo.updated_at,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      defaultBranch: repo.default_branch,
    }))
    
    return NextResponse.json({ repos: simplifiedRepos })
  } catch (error) {
    console.error('Error fetching repos:', error)
    return NextResponse.json(
      { error: 'Failed to fetch repositories' },
      { status: 500 }
    )
  }
}

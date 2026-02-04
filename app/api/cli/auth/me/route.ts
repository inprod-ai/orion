import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Get current user info for CLI
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const session = await prisma.session.findFirst({
      where: { sessionToken: token },
      include: { User: true }
    })

    if (!session || session.expires < new Date()) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const user = session.User

    // Get usage stats for this month
    const thisMonth = new Date()
    thisMonth.setDate(1)
    thisMonth.setHours(0, 0, 0, 0)
    
    const completionsThisMonth = await prisma.scan.count({
      where: {
        userId: user.id,
        createdAt: { gte: thisMonth },
        source: 'cli'
      }
    })

    // Calculate limits based on tier
    const limits = {
      FREE: { completions: 3, generations: 10 },
      PRO: { completions: -1, generations: -1 } // -1 = unlimited
    }

    const userLimits = limits[user.tier as keyof typeof limits] || limits.FREE

    return NextResponse.json({
      id: user.id,
      login: user.name || user.email?.split('@')[0],
      email: user.email,
      avatarUrl: user.image,
      plan: user.tier.toLowerCase(),
      completionsRemaining: userLimits.completions === -1 
        ? -1 
        : Math.max(0, userLimits.completions - completionsThisMonth),
      completionsLimit: userLimits.completions,
      completionsUsed: completionsThisMonth
    })

  } catch (error) {
    console.error('CLI auth/me error:', error)
    return NextResponse.json({ error: 'Failed to get user info' }, { status: 500 })
  }
}


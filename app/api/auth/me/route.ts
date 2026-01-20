// =============================================================================
// Current User - Get authenticated user info
// =============================================================================

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/github-auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        tier: true,
        monthlyScans: true,
      },
    })

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ user: null }, { status: 200 })
  }
}

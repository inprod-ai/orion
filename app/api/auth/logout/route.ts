// =============================================================================
// Logout - Clear session
// =============================================================================

import { NextResponse } from 'next/server'
import { clearSession } from '@/lib/github-auth'

export async function POST() {
  await clearSession()
  return NextResponse.json({ success: true })
}

export async function GET() {
  await clearSession()
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  return NextResponse.redirect(baseUrl)
}

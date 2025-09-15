import { NextRequest, NextResponse } from 'next/server'
import { auth } from './lib/auth'

export async function middleware(request: NextRequest) {
  // Skip middleware for static files and API routes that don't need auth
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api/auth') ||
    request.nextUrl.pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // For now, allow all requests to pass through
  // We'll handle auth checks in the components/API routes themselves
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

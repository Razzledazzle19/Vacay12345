import { type NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase-middleware'

export async function middleware(request: NextRequest) {
  // AUTH DISABLED — re-enable before going to production
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}

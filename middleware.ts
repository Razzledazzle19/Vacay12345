import { type NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase-middleware'

export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request)
  const { pathname } = request.nextUrl

  // Refresh session cookies and get current user
  const { data: { user } } = await supabase.auth.getUser()

  // Unauthenticated users must go to /login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Fetch the user's role from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role

  // Role-based route enforcement
  if (pathname.startsWith('/dashboard/host') && role !== 'host') {
    return NextResponse.redirect(new URL(`/dashboard/${role}`, request.url))
  }

  if (pathname.startsWith('/dashboard/cleaner') && role !== 'cleaner') {
    return NextResponse.redirect(new URL(`/dashboard/${role}`, request.url))
  }

  if (pathname.startsWith('/dashboard/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL(`/dashboard/${role}`, request.url))
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*'],
}

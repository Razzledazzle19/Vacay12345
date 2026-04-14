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
    .maybeSingle()

  const role = profile?.role

  // If no profile yet (e.g. just confirmed email), let login page handle it
  if (!role) return NextResponse.redirect(new URL('/login', request.url))

  const roleDest =
    role === 'host'    ? '/dashboard/host' :
    role === 'admin'   ? '/dashboard/admin' :
                         '/dashboard/cleaner'

  // Role-based route enforcement — send to the correct dashboard
  if (pathname.startsWith('/dashboard/host')    && role !== 'host')    return NextResponse.redirect(new URL(roleDest, request.url))
  if (pathname.startsWith('/dashboard/cleaner') && role !== 'cleaner') return NextResponse.redirect(new URL(roleDest, request.url))
  if (pathname.startsWith('/dashboard/admin')   && role !== 'admin')   return NextResponse.redirect(new URL(roleDest, request.url))

  return response
}

export const config = {
  matcher: ['/dashboard/:path*'],
  // /cleaner-login and /login are intentionally excluded — no auth needed
}

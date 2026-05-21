import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function safeRedirectPath(path: string | null, prefix: string, fallback: string): string {
  if (!path || !path.startsWith(prefix) || path.includes('//')) return fallback
  return path
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()
  const pathname = req.nextUrl.pathname

  if (pathname.startsWith('/admin')) {
    if (pathname.startsWith('/admin/login')) {
      if (session) {
        const redirectTo = safeRedirectPath(
          req.nextUrl.searchParams.get('redirectTo'),
          '/admin',
          '/admin/orders',
        )
        return NextResponse.redirect(new URL(redirectTo, req.url))
      }
    } else if (!session) {
      const loginUrl = new URL('/admin/login', req.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  if (pathname.startsWith('/boss')) {
    if (pathname.startsWith('/boss/login')) {
      if (session) {
        const redirectTo = safeRedirectPath(
          req.nextUrl.searchParams.get('redirectTo'),
          '/boss',
          '/boss/new-order',
        )
        return NextResponse.redirect(new URL(redirectTo, req.url))
      }
    } else if (!session) {
      const loginUrl = new URL('/boss/login', req.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  if (pathname.startsWith('/production') && !pathname.startsWith('/production/login')) {
    if (!session) {
      const loginUrl = new URL('/production/login', req.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return res
}

export const config = {
  matcher: ['/admin/:path*', '/boss/:path*', '/production/:path*'],
}

import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSupabaseAnonKey, getSupabaseBaseUrl } from '@/lib/supabase-url'

function safeRedirectPath(path: string | null, prefix: string, fallback: string): string {
  if (!path || !path.startsWith(prefix) || path.includes('//')) return fallback
  return path
}

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req })

  const supabase = createServerClient(getSupabaseBaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return req.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
        res = NextResponse.next({ request: req })
        cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = req.nextUrl.pathname

  if (pathname.startsWith('/admin')) {
    if (pathname.startsWith('/admin/login')) {
      if (user) {
        const redirectTo = safeRedirectPath(
          req.nextUrl.searchParams.get('redirectTo'),
          '/admin',
          '/admin/orders',
        )
        return NextResponse.redirect(new URL(redirectTo, req.url))
      }
    } else if (!user) {
      const loginUrl = new URL('/admin/login', req.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  if (pathname.startsWith('/boss')) {
    if (pathname.startsWith('/boss/login')) {
      if (user) {
        const redirectTo = safeRedirectPath(
          req.nextUrl.searchParams.get('redirectTo'),
          '/boss',
          '/boss/new-order',
        )
        return NextResponse.redirect(new URL(redirectTo, req.url))
      }
    } else if (!user) {
      const loginUrl = new URL('/boss/login', req.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  if (pathname.startsWith('/production') && !pathname.startsWith('/production/login')) {
    if (!user) {
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

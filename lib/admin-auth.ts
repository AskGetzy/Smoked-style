import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase-server'

function getBearerToken(req?: NextRequest) {
  const authorization = req?.headers.get('authorization')
  const match = authorization?.match(/^Bearer\s+(.+)$/i)
  return match?.[1] ?? null
}

export async function requireAdmin(req?: NextRequest) {
  const authSupabase = createRouteHandlerClient({ cookies })
  const { data: sessionData, error: sessionError } = await authSupabase.auth.getSession()
  let email = sessionData.session?.user?.email ?? null
  let authError = sessionError?.message ?? null

  if (!email) {
    const bearerToken = getBearerToken(req)
    if (bearerToken) {
      const { data: userData, error: userError } = await authSupabase.auth.getUser(bearerToken)
      email = userData.user?.email ?? null
      authError = userError?.message ?? authError
    }
  }

  if (!email) {
    console.log('[boss-auth] No authorized Supabase user found', { authError })
    return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const normalizedEmail = email.trim()
  const supabase = createServerClient()
  console.log('[boss-auth] Checking admin user with service role', { email: normalizedEmail })
  const { data: adminUser, error: adminError } = await supabase
    .from('admin_users')
    .select('id, email, role')
    .ilike('email', normalizedEmail)
    .maybeSingle()

  console.log('[boss-auth] admin_users query result', {
    email: normalizedEmail,
    adminUser,
    adminError: adminError?.message ?? null,
  })

  if (adminError) {
    return { ok: false as const, response: NextResponse.json({ error: adminError.message }, { status: 500 }) }
  }

  if (!adminUser) {
    return { ok: false as const, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { ok: true as const, supabase, adminUser, email: normalizedEmail }
}

import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase-server'

export async function requireAdmin() {
  const authSupabase = createRouteHandlerClient({ cookies })
  const { data: sessionData, error: sessionError } = await authSupabase.auth.getSession()
  const email = sessionData.session?.user?.email

  if (sessionError || !email) {
    return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const supabase = createServerClient()
  console.log('[boss-auth] Checking admin user with service role', { email })
  const { data: adminUser, error: adminError } = await supabase
    .from('admin_users')
    .select('id, email, role')
    .ilike('email', email)
    .maybeSingle()

  console.log('[boss-auth] admin_users query result', {
    email,
    adminUser,
    adminError: adminError?.message ?? null,
  })

  if (adminError) {
    return { ok: false as const, response: NextResponse.json({ error: adminError.message }, { status: 500 }) }
  }

  if (!adminUser) {
    return { ok: false as const, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { ok: true as const, supabase, adminUser, email }
}

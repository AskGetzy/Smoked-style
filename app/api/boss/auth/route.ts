import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase-server'

export async function GET() {
  const authSupabase = createRouteHandlerClient({ cookies })
  const { data: sessionData, error: sessionError } = await authSupabase.auth.getSession()
  const email = sessionData.session?.user?.email?.trim()

  if (sessionError || !email) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
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
    return NextResponse.json({ error: adminError.message }, { status: 500 })
  }

  if (!adminUser) {
    return NextResponse.json({ error: 'not authorized' }, { status: 403 })
  }

  return NextResponse.json({
    user: sessionData.session?.user,
    adminUser,
  })
}

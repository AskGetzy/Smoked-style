import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteHandlerClient } from '@/lib/supabase-route-handler'
import { createServerClient } from '@/lib/supabase-server'

function getBearerToken(req?: NextRequest) {
  const authorization = req?.headers.get('authorization')
  const match = authorization?.match(/^Bearer\s+(.+)$/i)
  return match?.[1] ?? null
}

export async function requireAdmin(req?: NextRequest) {
  const authSupabase = await createSupabaseRouteHandlerClient()
  const bearerToken = getBearerToken(req)
  const { data: userData } = bearerToken
    ? await authSupabase.auth.getUser(bearerToken)
    : await authSupabase.auth.getUser()

  const email = userData.user?.email ?? null

  if (!email) {
    return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const normalizedEmail = email.trim()
  const supabase = createServerClient()
  const { data: adminUser, error: adminError } = await supabase
    .from('admin_users')
    .select('id, email, role')
    .ilike('email', normalizedEmail)
    .maybeSingle()

  if (adminError) {
    return { ok: false as const, response: NextResponse.json({ error: adminError.message }, { status: 500 }) }
  }

  if (!adminUser) {
    return { ok: false as const, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { ok: true as const, supabase, adminUser, email: normalizedEmail }
}

export async function requireOwner(req?: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return admin

  if (admin.adminUser.role !== 'owner') {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Owner access required' }, { status: 403 }),
    }
  }

  return admin
}

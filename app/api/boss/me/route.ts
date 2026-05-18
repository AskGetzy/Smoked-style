import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return admin.response

  return NextResponse.json({
    ok: true,
    email: admin.email,
    adminUser: admin.adminUser,
  })
}

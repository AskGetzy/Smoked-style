import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getCustomerPaymentProfile } from '@/lib/bulk-order-server'

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    if (!admin.ok) return admin.response

    const customerId = req.nextUrl.searchParams.get('customerId')?.trim()
    if (!customerId) {
      return NextResponse.json({ error: 'Missing customerId' }, { status: 400 })
    }

    const customer = await getCustomerPaymentProfile(admin.supabase, customerId)
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json({ customer })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load buyer details' },
      { status: 500 },
    )
  }
}

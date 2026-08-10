import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createBossOrder, type BossOrderCreateItem } from '@/lib/boss-order-create'
import type { CustomerSavedAddresses } from '@/lib/customer-saved-addresses'

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    if (!admin.ok) return admin.response

    const { supabase } = admin
    const body = await req.json()

    const result = await createBossOrder(supabase, {
      customer: body.customer ?? {},
      customerId: body.customerId as string | undefined,
      items: (Array.isArray(body.items) ? body.items : []) as BossOrderCreateItem[],
      orderType: body.orderType === 'pickup' ? 'pickup' : 'delivery',
      deliveryFee: Number(body.deliveryFee ?? 0),
      deliveryDate: String(body.deliveryDate || ''),
      notes: body.notes,
      deliverToDifferentAddress: Boolean(body.deliverToDifferentAddress),
      deliveryAddress: body.deliveryAddress,
      deliveryAreaId: body.deliveryAreaId,
      recipientName: body.recipientName,
      recipientPhone: body.recipientPhone,
      paymentIntentId: body.paymentIntentId as string | undefined,
      savedAddresses: body.savedAddresses as CustomerSavedAddresses | undefined,
    })

    return NextResponse.json(result)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Could not create boss order'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

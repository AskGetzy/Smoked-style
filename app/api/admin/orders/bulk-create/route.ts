import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { computeLineTotal } from '@/lib/checkout-pricing'
import { createBossOrder } from '@/lib/boss-order-create'
import type { DeliveryArea, Product } from '@/types'

const MAX_ROWS = 500

type BulkCreateRowInput = {
  full_name: string
  phone: string
  email: string | null
  product_id: string
  quantity: number
  selected_flavor: string | null
  selected_weight: number | null
  selected_size: string | null
  order_type: 'pickup' | 'delivery'
  delivery_area_id: string | null
  address: string | null
  delivery_date: string
  notes: string | null
  gift_message: string | null
  paymentIntentId?: string | null
}

type RowResult = {
  index: number
  success: boolean
  orderNumber?: string
  error?: string
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return admin.response

  try {
    const body = await req.json()
    const inputRows = (Array.isArray(body.rows) ? body.rows : []) as BulkCreateRowInput[]

    if (inputRows.length === 0) {
      return NextResponse.json({ error: 'No rows to create' }, { status: 400 })
    }
    if (inputRows.length > MAX_ROWS) {
      return NextResponse.json({ error: `Too many rows — max ${MAX_ROWS} orders per upload` }, { status: 400 })
    }

    const { supabase } = admin
    const [{ data: products, error: productsError }, { data: areas, error: areasError }] = await Promise.all([
      supabase.from('products').select('*'),
      supabase.from('delivery_areas').select('*'),
    ])
    if (productsError) throw new Error(productsError.message)
    if (areasError) throw new Error(areasError.message)

    const productsById = new Map((products as Product[] ?? []).map(p => [p.id, p]))
    const areasById = new Map((areas as DeliveryArea[] ?? []).map(a => [a.id, a]))

    const results: RowResult[] = []

    for (let index = 0; index < inputRows.length; index++) {
      const row = inputRows[index]
      try {
        // Never trust client-supplied pricing — re-derive it from the live
        // product every time, the same way the customer checkout route does.
        const product = productsById.get(row.product_id)
        if (!product) throw new Error('Product not found')

        const priced = computeLineTotal(product, {
          product_id: product.id,
          quantity: row.quantity,
          selected_flavor: row.selected_flavor,
          selected_weight: row.selected_weight,
          selected_size: row.selected_size,
        })

        let deliveryFee = 0
        if (row.order_type === 'delivery') {
          const area = row.delivery_area_id ? areasById.get(row.delivery_area_id) : undefined
          if (!area || !area.is_active) throw new Error('Delivery area not found or inactive')
          deliveryFee = Number(area.delivery_fee)
        }

        const result = await createBossOrder(supabase, {
          customer: { full_name: row.full_name, phone: row.phone, email: row.email },
          items: [
            {
              product_id: product.id,
              product_name: product.name,
              quantity: priced.quantity,
              selected_flavor: priced.selected_flavor,
              selected_weight: priced.selected_weight,
              selected_size: priced.selected_size,
              unit_price: priced.unit_price,
              line_total: priced.line_total,
            },
          ],
          orderType: row.order_type,
          deliveryFee,
          deliveryDate: row.delivery_date,
          notes: row.notes,
          giftMessage: row.gift_message,
          deliveryAddress: row.address ?? undefined,
          deliveryAreaId: row.delivery_area_id ?? undefined,
          paymentIntentId: row.paymentIntentId ?? undefined,
        })

        results.push({ index, success: true, orderNumber: result.orderNumber })
      } catch (e: unknown) {
        results.push({
          index,
          success: false,
          error: e instanceof Error ? e.message : 'Could not create this order',
        })
      }
    }

    const created = results.filter(r => r.success).length
    return NextResponse.json({ results, created, failed: results.length - created })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Could not process bulk upload'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

const ALLOWED_PATCH_KEYS = new Set([
  'price',
  'is_in_stock',
  'stock_quantity',
  'jerky_flavor_stock',
  'jerky_flavor_thresholds',
  'image_url',
])

type StockHistoryInput = {
  change_amount: number
  previous_quantity: number
  new_quantity: number
  reason: string
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return admin.response

  try {
    const { productId, patch, stockHistory } = await req.json()
    if (!productId || !patch || typeof patch !== 'object') {
      return NextResponse.json({ error: 'Missing productId or patch' }, { status: 400 })
    }

    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(patch)) {
      if (ALLOWED_PATCH_KEYS.has(key)) {
        sanitized[key] = value
      }
    }

    if (Object.keys(sanitized).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { supabase } = admin
    const { data: product, error } = await supabase
      .from('products')
      .update(sanitized)
      .eq('id', productId)
      .select('*')
      .single()

    if (error) {
      const message = error.message.includes('jerky_flavor')
        ? 'Missing jerky columns. Run Supabase migrations 004 and 005.'
        : error.message
      return NextResponse.json({ error: message }, { status: 500 })
    }

    if (stockHistory) {
      const history = stockHistory as StockHistoryInput
      const { error: historyError } = await supabase.from('stock_history').insert({
        product_id: productId,
        change_amount: history.change_amount,
        previous_quantity: history.previous_quantity,
        new_quantity: history.new_quantity,
        reason: history.reason,
      })
      if (historyError) {
        console.warn('[inventory] stock_history insert failed', historyError.message)
      }
    }

    return NextResponse.json({ product })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Could not update inventory'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

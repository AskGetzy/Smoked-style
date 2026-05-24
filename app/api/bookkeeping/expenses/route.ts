import { NextRequest, NextResponse } from 'next/server'
import { requireOwner } from '@/lib/admin-auth'
import { EXPENSE_CATEGORIES, inDateRange, monthKey, parseDateRangeFromSearchParams } from '@/lib/bookkeeping'

export async function GET(req: NextRequest) {
  const owner = await requireOwner(req)
  if (!owner.ok) return owner.response

  const params = new URL(req.url).searchParams
  const range = parseDateRangeFromSearchParams(params)
  const categoryFilter = params.get('category') || 'all'

  const { data, error } = await owner.supabase
    .from('expenses')
    .select('*')
    .order('date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []).filter(row => {
    const date = String(row.date)
    if (!inDateRange(date, range)) return false
    if (categoryFilter !== 'all' && row.category !== categoryFilter) return false
    return true
  })

  const byCategory = new Map<string, number>()
  const byMonth = new Map<string, number>()
  let total = 0

  for (const row of rows) {
    const amount = Number(row.amount) || 0
    total += amount
    byCategory.set(row.category, (byCategory.get(row.category) ?? 0) + amount)
    byMonth.set(monthKey(String(row.date)), (byMonth.get(monthKey(String(row.date))) ?? 0) + amount)
  }

  return NextResponse.json({
    range,
    rows,
    total,
    byCategory: Object.fromEntries(byCategory),
    byMonth: Object.fromEntries(byMonth),
    categories: EXPENSE_CATEGORIES,
  })
}

export async function POST(req: NextRequest) {
  const owner = await requireOwner(req)
  if (!owner.ok) return owner.response

  const body = await req.json()
  const date = String(body.date || '')
  const category = String(body.category || '')
  const description = String(body.description || '').trim() || null
  const amount = Number(body.amount)
  const receipt_url = body.receipt_url ? String(body.receipt_url) : null

  if (!date || !category || !Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: 'Date, category, and amount are required' }, { status: 400 })
  }

  if (!EXPENSE_CATEGORIES.includes(category as (typeof EXPENSE_CATEGORIES)[number])) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }

  const { data, error } = await owner.supabase
    .from('expenses')
    .insert({
      date,
      category,
      description,
      amount,
      receipt_url,
      created_by: owner.adminUser.id,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ expense: data })
}

export async function DELETE(req: NextRequest) {
  const owner = await requireOwner(req)
  if (!owner.ok) return owner.response

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing expense id' }, { status: 400 })

  const { error } = await owner.supabase.from('expenses').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

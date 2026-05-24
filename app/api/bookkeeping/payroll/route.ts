import { NextRequest, NextResponse } from 'next/server'
import { requireOwner } from '@/lib/admin-auth'
import { inDateRange, monthKey, parseDateRangeFromSearchParams } from '@/lib/bookkeeping'
import { parsePayrollExtras } from '@/lib/payroll-extras'

export async function GET(req: NextRequest) {
  const owner = await requireOwner(req)
  if (!owner.ok) return owner.response

  const range = parseDateRangeFromSearchParams(new URL(req.url).searchParams)

  const [staffRes, entriesRes] = await Promise.all([
    owner.supabase.from('staff_members').select('*').order('full_name'),
    owner.supabase
      .from('payroll_entries')
      .select('*, staff_members(full_name, role, pay_type, rate)')
      .order('period_end', { ascending: false }),
  ])

  if (staffRes.error) return NextResponse.json({ error: staffRes.error.message }, { status: 500 })
  if (entriesRes.error) return NextResponse.json({ error: entriesRes.error.message }, { status: 500 })

  const entries = (entriesRes.data ?? []).filter(entry => {
    const date = String(entry.period_end || entry.period_start)
    return inDateRange(date, range)
  })

  const byMonth = new Map<string, number>()
  let total = 0
  for (const entry of entries) {
    const amount = Number(entry.amount_paid) || 0
    total += amount
    byMonth.set(monthKey(String(entry.period_end)), (byMonth.get(monthKey(String(entry.period_end))) ?? 0) + amount)
  }

  return NextResponse.json({
    range,
    staff: staffRes.data ?? [],
    entries,
    total,
    byMonth: Object.fromEntries(byMonth),
  })
}

export async function POST(req: NextRequest) {
  const owner = await requireOwner(req)
  if (!owner.ok) return owner.response

  const body = await req.json()
  const type = String(body.type || '')

  if (type === 'staff') {
    const id = body.id ? String(body.id) : null
    const full_name = String(body.full_name || '').trim()
    const role = body.role ? String(body.role).trim() : null
    const pay_type = body.pay_type === 'salary' ? 'salary' : 'hourly'
    const rate = Number(body.rate)

    if (!full_name || !Number.isFinite(rate)) {
      return NextResponse.json({ error: 'Name and rate are required' }, { status: 400 })
    }

    if (id) {
      const { data, error } = await owner.supabase
        .from('staff_members')
        .update({ full_name, role, pay_type, rate })
        .eq('id', id)
        .select('*')
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ staff: data })
    }

    const { data, error } = await owner.supabase
      .from('staff_members')
      .insert({ full_name, role, pay_type, rate, is_active: true })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ staff: data })
  }

  if (type === 'entry') {
    const staff_member_id = String(body.staff_member_id || '')
    const period_start = String(body.period_start || '')
    const period_end = String(body.period_end || '')
    const hours_worked = body.hours_worked != null ? Number(body.hours_worked) : null
    const amount_paid = Number(body.amount_paid)
    const notes = body.notes ? String(body.notes).trim() : null
    const extras = parsePayrollExtras(body.extras)

    if (!staff_member_id || !period_start || !period_end || !Number.isFinite(amount_paid)) {
      return NextResponse.json({ error: 'Staff, period, and amount are required' }, { status: 400 })
    }

    const { data, error } = await owner.supabase
      .from('payroll_entries')
      .insert({
        staff_member_id,
        period_start,
        period_end,
        hours_worked,
        amount_paid,
        notes,
        extras,
      })
      .select('*, staff_members(full_name, role, pay_type, rate)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ entry: data })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}

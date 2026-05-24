import { NextRequest, NextResponse } from 'next/server'
import { requireOwner } from '@/lib/admin-auth'
import {
  inDateRange,
  orderIncomeDate,
  parseDateRangeFromSearchParams,
  weekKey,
} from '@/lib/bookkeeping'

const INCOME_STATUSES = ['approved', 'ready_for_pickup', 'out_for_delivery', 'delivered']

export async function GET(req: NextRequest) {
  const owner = await requireOwner(req)
  if (!owner.ok) return owner.response

  const range = parseDateRangeFromSearchParams(new URL(req.url).searchParams)
  const { supabase } = owner

  const [ordersRes, expensesRes, payrollRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id, total, status, created_at, delivery_date')
      .in('status', INCOME_STATUSES),
    supabase.from('expenses').select('date, amount, category'),
    supabase.from('payroll_entries').select('period_start, period_end, amount_paid'),
  ])

  if (ordersRes.error) return NextResponse.json({ error: ordersRes.error.message }, { status: 500 })
  if (expensesRes.error) return NextResponse.json({ error: expensesRes.error.message }, { status: 500 })
  if (payrollRes.error) return NextResponse.json({ error: payrollRes.error.message }, { status: 500 })

  let totalIncome = 0
  const weeklyMap = new Map<string, { income: number; expenses: number; payroll: number }>()

  for (const order of ordersRes.data ?? []) {
    const date = orderIncomeDate(order)
    if (!inDateRange(date, range)) continue
    const total = Number(order.total) || 0
    totalIncome += total
    const wk = weekKey(date)
    const row = weeklyMap.get(wk) ?? { income: 0, expenses: 0, payroll: 0 }
    row.income += total
    weeklyMap.set(wk, row)
  }

  let totalExpenses = 0
  for (const expense of expensesRes.data ?? []) {
    const date = String(expense.date)
    if (!inDateRange(date, range)) continue
    const amount = Number(expense.amount) || 0
    totalExpenses += amount
    const wk = weekKey(date)
    const row = weeklyMap.get(wk) ?? { income: 0, expenses: 0, payroll: 0 }
    row.expenses += amount
    weeklyMap.set(wk, row)
  }

  let totalPayroll = 0
  for (const entry of payrollRes.data ?? []) {
    const date = String(entry.period_end || entry.period_start)
    if (!inDateRange(date, range)) continue
    const amount = Number(entry.amount_paid) || 0
    totalPayroll += amount
    const wk = weekKey(date)
    const row = weeklyMap.get(wk) ?? { income: 0, expenses: 0, payroll: 0 }
    row.payroll += amount
    weeklyMap.set(wk, row)
  }

  const chart = Array.from(weeklyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, values]) => ({
      week,
      income: values.income,
      expenses: values.expenses,
      payroll: values.payroll,
      net: values.income - values.expenses - values.payroll,
    }))

  return NextResponse.json({
    range,
    totalIncome,
    totalExpenses,
    totalPayroll,
    netProfit: totalIncome - totalExpenses - totalPayroll,
    chart,
  })
}

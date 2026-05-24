import { NextRequest, NextResponse } from 'next/server'
import { requireOwner } from '@/lib/admin-auth'
import {
  inDateRange,
  orderIncomeDate,
  parseDateRangeFromSearchParams,
  rowsToCsv,
  toIifLine,
} from '@/lib/bookkeeping'

const INCOME_STATUSES = ['approved', 'ready_for_pickup', 'out_for_delivery', 'delivered']

export async function GET(req: NextRequest) {
  const owner = await requireOwner(req)
  if (!owner.ok) return owner.response

  const params = new URL(req.url).searchParams
  const format = params.get('format') || 'csv'
  const report = params.get('report') || 'combined'
  const range = parseDateRangeFromSearchParams(params)
  const { supabase } = owner

  const [ordersRes, expensesRes, payrollRes] = await Promise.all([
    supabase
      .from('orders')
      .select('order_number, total, created_at, delivery_date, buyer_name, status')
      .in('status', INCOME_STATUSES),
    supabase.from('expenses').select('date, category, description, amount'),
    supabase
      .from('payroll_entries')
      .select('period_start, period_end, hours_worked, amount_paid, staff_members(full_name)')
      .order('period_end'),
  ])

  if (ordersRes.error || expensesRes.error || payrollRes.error) {
    return NextResponse.json({ error: 'Failed to load export data' }, { status: 500 })
  }

  const incomeRows = (ordersRes.data ?? [])
    .filter(o => inDateRange(orderIncomeDate(o), range))
    .map(o => [
      orderIncomeDate(o),
      o.order_number,
      o.buyer_name ?? '',
      Number(o.total).toFixed(2),
      o.status,
    ])

  const expenseRows = (expensesRes.data ?? [])
    .filter(e => inDateRange(String(e.date), range))
    .map(e => [String(e.date), e.category, e.description ?? '', Number(e.amount).toFixed(2)])

  const payrollRows = (payrollRes.data ?? [])
    .filter(p => inDateRange(String(p.period_end), range))
    .map(p => [
      String(p.period_start),
      String(p.period_end),
      (p.staff_members as { full_name?: string } | null)?.full_name ?? '',
      p.hours_worked != null ? String(p.hours_worked) : '',
      Number(p.amount_paid).toFixed(2),
    ])

  const totalIncome = incomeRows.reduce((s, r) => s + Number(r[3]), 0)
  const totalExpenses = expenseRows.reduce((s, r) => s + Number(r[3]), 0)
  const totalPayroll = payrollRows.reduce((s, r) => s + Number(r[4]), 0)

  if (format === 'iif') {
    const lines: string[] = [
      '!TRNS\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO',
      '!SPL\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO',
      '!ENDTRNS',
    ]

    for (const row of incomeRows) {
      lines.push(
        toIifLine([
          'TRNS',
          'SALES RECEIPT',
          row[0],
          'Sales',
          row[2],
          row[3],
          `Order ${row[1]}`,
        ]),
      )
      lines.push(toIifLine(['SPL', 'SALES RECEIPT', row[0], 'Sales', row[2], row[3], row[1]]))
      lines.push(toIifLine(['ENDTRNS']))
    }

    for (const row of expenseRows) {
      lines.push(
        toIifLine([
          'TRNS',
          'EXPENSE',
          row[0],
          row[1],
          'Vendor',
          `-${row[3]}`,
          row[2],
        ]),
      )
      lines.push(toIifLine(['SPL', 'EXPENSE', row[0], row[1], 'Vendor', `-${row[3]}`, row[2]]))
      lines.push(toIifLine(['ENDTRNS']))
    }

    const body = lines.join('\n')
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'application/x-iif',
        'Content-Disposition': `attachment; filename="smoked-style-${range.start}-${range.end}.iif"`,
      },
    })
  }

  let csv = ''

  if (report === 'income') {
    csv = rowsToCsv(['Date', 'Order', 'Customer', 'Amount', 'Status'], incomeRows)
  } else if (report === 'expenses') {
    csv = rowsToCsv(['Date', 'Category', 'Description', 'Amount'], expenseRows)
  } else if (report === 'payroll') {
    csv = rowsToCsv(
      ['Period Start', 'Period End', 'Staff', 'Hours', 'Amount Paid'],
      payrollRows,
    )
  } else {
    csv = [
      'Smoked Style Profit & Loss',
      `Period,${range.start} to ${range.end}`,
      '',
      'Summary',
      'Total Income,' + totalIncome.toFixed(2),
      'Total Expenses,' + totalExpenses.toFixed(2),
      'Total Payroll,' + totalPayroll.toFixed(2),
      'Net Profit,' + (totalIncome - totalExpenses - totalPayroll).toFixed(2),
      '',
      'Income',
      rowsToCsv(['Date', 'Order', 'Customer', 'Amount', 'Status'], incomeRows),
      '',
      'Expenses',
      rowsToCsv(['Date', 'Category', 'Description', 'Amount'], expenseRows),
      '',
      'Payroll',
      rowsToCsv(['Period Start', 'Period End', 'Staff', 'Hours', 'Amount Paid'], payrollRows),
    ].join('\n')
  }

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="smoked-style-${report}-${range.start}-${range.end}.csv"`,
    },
  })
}

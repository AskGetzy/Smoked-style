import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { parseCsv, rowsToObjects, parseBulkOrderRows } from '@/lib/bulk-order-parse'
import { parseXlsxBuffer } from '@/lib/bulk-order-parse-xlsx'
import type { DeliveryArea, Product } from '@/types'

const MAX_ROWS = 500
const MAX_FILE_BYTES = 5 * 1024 * 1024

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return admin.response

  try {
    const formData = await req.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'File is too large (max 5MB)' }, { status: 400 })
    }

    const name = file.name.toLowerCase()
    const buffer = await file.arrayBuffer()

    let table: string[][]
    if (name.endsWith('.xlsx')) {
      table = await parseXlsxBuffer(buffer)
    } else if (name.endsWith('.csv')) {
      table = parseCsv(new TextDecoder('utf-8').decode(buffer))
    } else {
      return NextResponse.json({ error: 'File must be .csv or .xlsx' }, { status: 400 })
    }

    if (table.length <= 1) {
      return NextResponse.json({ error: 'No data rows found in the file' }, { status: 400 })
    }
    if (table.length - 1 > MAX_ROWS) {
      return NextResponse.json({ error: `Too many rows — max ${MAX_ROWS} orders per upload` }, { status: 400 })
    }

    const rawRows = rowsToObjects(table)

    const { supabase } = admin
    const [{ data: products, error: productsError }, { data: areas, error: areasError }] = await Promise.all([
      supabase.from('products').select('*'),
      supabase.from('delivery_areas').select('*'),
    ])
    if (productsError) throw new Error(productsError.message)
    if (areasError) throw new Error(areasError.message)

    const { rows, errors } = parseBulkOrderRows(
      rawRows,
      (products ?? []) as Product[],
      (areas ?? []) as DeliveryArea[],
    )

    return NextResponse.json({ rows, errors, totalRows: table.length - 1 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Could not parse file'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

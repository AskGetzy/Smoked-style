import { NextRequest, NextResponse } from 'next/server'
import { requireOwner } from '@/lib/admin-auth'

export async function POST(req: NextRequest) {
  const owner = await requireOwner(req)
  if (!owner.ok) return owner.response

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'File is required' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() || 'jpg'
  const path = `receipts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await owner.supabase.storage
    .from('product-images')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data } = owner.supabase.storage.from('product-images').getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}

import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { requireOwner } from '@/lib/admin-auth'
import { EXPENSE_CATEGORIES } from '@/lib/bookkeeping'

export const runtime = 'nodejs'

type ScanResult = {
  date: string | null
  amount: number | null
  vendor: string | null
  description: string | null
  category: string | null
}

function parseScanJson(text: string): ScanResult | null {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[0]) as ScanResult
    if (parsed.category && !EXPENSE_CATEGORIES.includes(parsed.category as (typeof EXPENSE_CATEGORIES)[number])) {
      parsed.category = 'Other'
    }
    return parsed
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const owner = await requireOwner(req)
  if (!owner.ok) return owner.response

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 500 })
  }

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Receipt file is required' }, { status: 400 })
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  const base64 = bytes.toString('base64')
  const mime = file.type || 'application/octet-stream'

  const isPdf = mime === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  const isImage = mime.startsWith('image/')

  if (!isPdf && !isImage) {
    return NextResponse.json({ error: 'Upload a JPG, PNG, WebP, or PDF receipt' }, { status: 400 })
  }

  const client = new Anthropic({ apiKey })

  const content: Anthropic.MessageCreateParams['messages'][0]['content'] = isPdf
    ? [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: base64,
          },
        },
        {
          type: 'text',
          text: `Analyze this receipt and extract the following information. Return ONLY a JSON object with no other text:
{
  "date": "YYYY-MM-DD format",
  "amount": number,
  "vendor": "store or vendor name",
  "description": "brief description of what was purchased",
  "category": "one of: Ingredients, Packaging, Rent, Utilities, Marketing, Equipment, Other"
}
If you cannot determine a field, use null.`,
        },
      ]
    : [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mime as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: base64,
          },
        },
        {
          type: 'text',
          text: `Analyze this receipt and extract the following information. Return ONLY a JSON object with no other text:
{
  "date": "YYYY-MM-DD format",
  "amount": number,
  "vendor": "store or vendor name",
  "description": "brief description of what was purchased",
  "category": "one of: Ingredients, Packaging, Rent, Utilities, Marketing, Equipment, Other"
}
If you cannot determine a field, use null.`,
        },
      ]

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content }],
    })

    const textBlock = response.content.find(block => block.type === 'text')
    const text = textBlock && textBlock.type === 'text' ? textBlock.text : ''
    const parsed = parseScanJson(text)

    if (!parsed) {
      return NextResponse.json({
        ok: false,
        error: 'Could not read receipt. Please fill in manually.',
      })
    }

    return NextResponse.json({ ok: true, data: parsed })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Receipt scan failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

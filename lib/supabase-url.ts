export function getSupabaseBaseUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!rawUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  }

  return new URL(rawUrl).origin
}

export function getSupabaseAnonKey() {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return anonKey
}

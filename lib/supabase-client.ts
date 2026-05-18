'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { getSupabaseAnonKey, getSupabaseBaseUrl } from '@/lib/supabase-url'

export function createBrowserSupabaseClient() {
  return createClientComponentClient({
    supabaseUrl: getSupabaseBaseUrl(),
    supabaseKey: getSupabaseAnonKey(),
  })
}

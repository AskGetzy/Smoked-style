'use client'

import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseAnonKey, getSupabaseBaseUrl } from '@/lib/supabase-url'

export function createBrowserSupabaseClient() {
  return createBrowserClient(getSupabaseBaseUrl(), getSupabaseAnonKey())
}

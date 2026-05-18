import { createClient } from '@supabase/supabase-js'
import { getSupabaseAnonKey, getSupabaseBaseUrl } from '@/lib/supabase-url'

export const supabase = createClient(getSupabaseBaseUrl(), getSupabaseAnonKey())

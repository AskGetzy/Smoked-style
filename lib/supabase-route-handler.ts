import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseAnonKey, getSupabaseBaseUrl } from '@/lib/supabase-url'

export async function createSupabaseRouteHandlerClient() {
  const cookieStore = await cookies()

  return createServerClient(getSupabaseBaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Called from a context where cookies can't be written (e.g. a Server Component render).
        }
      },
    },
  })
}

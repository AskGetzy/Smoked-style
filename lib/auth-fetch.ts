'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export async function fetchWithAuth(input: RequestInfo | URL, init: RequestInit = {}) {
  const supabase = createClientComponentClient()
  const { data } = await supabase.auth.getSession()
  const headers = new Headers(init.headers)

  if (data.session?.access_token) {
    headers.set('Authorization', `Bearer ${data.session.access_token}`)
  }

  return fetch(input, {
    credentials: 'include',
    cache: 'no-store',
    ...init,
    headers,
  })
}

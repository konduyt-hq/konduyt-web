import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnon) {
  throw new Error('Missing Supabase environment variables. Check .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseAnon)

// Helper — get current session token for API calls
export async function getToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token || null
}

// Helper — get current user
export async function getUser() {
  const { data } = await supabase.auth.getUser()
  return data.user || null
}

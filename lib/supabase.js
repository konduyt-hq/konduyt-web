// Supabase replaced by Clerk + Neon
// This mock prevents crashes from any remaining supabase.auth calls
// Safe to call — all methods return empty/null values without throwing

const noopSubscription = { data: { subscription: { unsubscribe: () => {} } } }

export const supabase = {
  auth: {
    getSession:         async () => ({ data: { session: null }, error: null }),
    getUser:            async () => ({ data: { user: null },    error: null }),
    signOut:            async () => ({ error: null }),
    signInWithPassword: async () => ({ data: null, error: null }),
    signUp:             async () => ({ data: null, error: null }),
    signInWithOAuth:    async () => ({ data: null, error: null }),
    onAuthStateChange:  (cb)   => { cb('INITIAL_SESSION', null); return noopSubscription },
    exchangeCodeForSession: async () => ({ data: null, error: null }),
  },
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
    }),
  },
}

export async function getToken() { return null }
export async function getUser()  { return null }

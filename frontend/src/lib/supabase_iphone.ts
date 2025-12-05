import { createClient } from '@supabase/supabase-js'

// Configure Supabase for iPhone/Safari with persistent session storage
export const supabase_iPhone = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!,
  {
    auth: {
      flowType: 'pkce',
      storage: window.localStorage,
      storageKey: 'durrah-auth-token',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
)

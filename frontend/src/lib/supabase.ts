import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

// Singleton instance used throughout the app
const supabaseInternal = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: window.localStorage,
        storageKey: 'durrah-auth-token',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
    },
});

// For backward compatibility and consistent imports
export const supabase = supabaseInternal;
export default supabaseInternal;

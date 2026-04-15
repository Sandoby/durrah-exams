import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const AUTH_STORAGE_KEY = 'durrah-auth-token';

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

const isRefreshTokenRequest = (input: RequestInfo | URL) => {
    const url = typeof input === 'string'
        ? input
        : input instanceof URL
            ? input.toString()
            : input.url;

    return url.includes('/auth/v1/token') && url.includes('grant_type=refresh_token');
};

const clearLocalAuthStorage = () => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
        // Remove legacy custom cache keys if present.
        window.localStorage.removeItem('cached_session');
        window.localStorage.removeItem('cached_user');
        window.localStorage.removeItem('session_timestamp');
    } catch {
        // ignore storage errors
    }
};

const guardedFetch: typeof fetch = async (input, init) => {
    const response = await fetch(input, init);

    if (isRefreshTokenRequest(input) && response.status === 429) {
        // Hard-stop local refresh loops after Supabase rate limiting.
        clearLocalAuthStorage();
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('durrah:auth-rate-limited'));
        }
    }

    return response;
};

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
    global: {
        fetch: guardedFetch,
    },
});

// For backward compatibility and consistent imports
export const supabase = supabaseInternal;
export default supabaseInternal;

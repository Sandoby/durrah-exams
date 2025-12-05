import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

// Singleton instance to prevent multiple clients
let supabaseInstance: SupabaseClient | null = null;

// Configure Supabase with persistent session storage
export const supabase = supabaseInstance || (supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        // Use localStorage for persistent sessions (default)
        // This ensures users stay logged in across browser sessions
        storage: window.localStorage,
        storageKey: 'durrah-auth-token',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
    },
}));

function isIphoneOrSafari() {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent.toLowerCase();
    // Only treat as iPhone/Safari if NOT in standalone/PWA mode
    const isIOS = ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod');
    const isSafari = ua.includes('safari') && !ua.includes('chrome');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    return (isIOS || isSafari) && !isStandalone;
}

import { supabase_iPhone } from './supabase_iphone';

const supabase_final = isIphoneOrSafari()
    ? supabase_iPhone
    : supabase;

export default supabase_final;

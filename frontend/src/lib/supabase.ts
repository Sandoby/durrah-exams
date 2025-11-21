import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}


export const supabase = createClient(supabaseUrl, supabaseAnonKey);

function isIphoneOrSafari() {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent.toLowerCase();
    return (
        ua.includes('iphone') ||
        ua.includes('ipad') ||
        ua.includes('ipod') ||
        (ua.includes('safari') && !ua.includes('chrome'))
    );
}

import { supabase_iPhone } from './supabase_iphone';

const supabase_final = isIphoneOrSafari()
    ? supabase_iPhone
    : supabase;

export default supabase_final;

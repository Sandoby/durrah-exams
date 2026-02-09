import { supabase } from './supabase';

export async function openDodoPortalSession(): Promise<{ success: boolean; error?: string }> {
  try {
    const convexUrl = import.meta.env.VITE_CONVEX_URL;
    if (!convexUrl) {
      return { success: false, error: 'Payment portal is not configured' };
    }

    const { data: authData } = await supabase.auth.getSession();
    const accessToken = authData?.session?.access_token;
    if (!accessToken) {
      return { success: false, error: 'Please login again' };
    }

    const siteUrl = convexUrl.replace('.cloud', '.site');
    const response = await fetch(`${siteUrl}/dodoPortalSession`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({})
    });

    const data = await response.json();
    if (!response.ok || !data?.portal_url) {
      return { success: false, error: data?.error || 'Could not open subscription portal' };
    }

    window.location.href = data.portal_url;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to open subscription portal' };
  }
}

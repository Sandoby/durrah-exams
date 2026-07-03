import { supabase } from './supabase';

/**
 * Ask Convex to reconcile the current user's Dodo subscription state.
 * This is used after auth settles so trial activations and missed webhooks
 * are pushed into Convex instead of living only in Supabase.
 */
export async function syncCurrentDodoSubscription(): Promise<boolean> {
  const convexUrl = import.meta.env.VITE_CONVEX_URL;
  if (!convexUrl) return false;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return false;

  const siteUrl = convexUrl.replace('.cloud', '.site');
  const response = await fetch(`${siteUrl}/syncDodoSubscription`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  return response.ok;
}

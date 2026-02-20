/**
 * Subscription Utilities — Single Source of Truth
 *
 * Use `hasActiveAccess` everywhere instead of checking `=== 'active'` directly.
 * This ensures 'trialing' users get the same premium access as 'active' users.
 */

export type SubscriptionStatus = 'active' | 'trialing' | 'payment_failed' | 'cancelled' | 'expired' | null;

/**
 * Returns true if the user has full premium access.
 * Both 'active' (paid) and 'trialing' (free trial) grant access.
 *
 * @param status   Current subscription_status string from the database.
 * @param endDate  Optional subscription_end_date ISO string.
 *                 When provided, 'active' subscriptions whose end date is in
 *                 the past are treated as expired (client-side safety guard).
 */
export function hasActiveAccess(
  status: string | null | undefined,
  endDate?: string | null,
): boolean {
  if (status !== 'active' && status !== 'trialing') return false;
  // Client-side guard: treat as expired if end date has already passed.
  // The cron job is the authoritative source, but this prevents a stale-cache
  // window of up to ~6 hours where a user retains access after expiry.
  if (endDate && new Date(endDate).getTime() < Date.now()) return false;
  return true;
}

/**
 * Returns the number of days remaining until a given date.
 * Returns 0 if the date is in the past or undefined.
 */
export function daysRemaining(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  const end = new Date(dateStr).getTime();
  const now = Date.now();
  const diff = end - now;
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

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
 */
export function hasActiveAccess(status: string | null | undefined): boolean {
  return status === 'active' || status === 'trialing';
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

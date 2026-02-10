import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Subscription Queries for Real-Time Frontend Updates
 *
 * These queries allow the frontend to subscribe to subscription state changes
 * and get instant updates when subscriptions are activated/deactivated via webhooks.
 */

// Get current subscription sync state for a user
export const getSubscriptionState = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const syncState = await ctx.db
      .query("subscriptionSync")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .first();

    return syncState ?? null;
  },
});

// Get recent webhook events for a user (for debugging)
export const getRecentWebhooks = query({
  args: {
    userId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    if (args.userId) {
      const webhooks = await ctx.db
        .query("webhookEvents")
        .filter((q) => q.eq(q.field("user_id"), args.userId))
        .order("desc")
        .take(limit);

      return webhooks;
    }

    // Return all recent webhooks (admin view)
    const webhooks = await ctx.db
      .query("webhookEvents")
      .withIndex("by_processed_at")
      .order("desc")
      .take(limit);

    return webhooks;
  },
});

// Get subscription sync statistics (for admin monitoring)
export const getSubscriptionStats = query({
  args: {},
  handler: async (ctx) => {
    const allSyncs = await ctx.db.query("subscriptionSync").collect();

    const stats = {
      total: allSyncs.length,
      active: allSyncs.filter((s) => s.last_status === 'active').length,
      cancelled: allSyncs.filter((s) => s.last_status === 'cancelled').length,
      expired: allSyncs.filter((s) => s.last_status === 'expired').length,
      payment_failed: allSyncs.filter((s) => s.last_status === 'payment_failed').length,
      errors: allSyncs.filter((s) => s.error_count > 0).length,
      recent_syncs: allSyncs
        .filter((s) => s.last_synced_at > Date.now() - 24 * 60 * 60 * 1000)
        .length,
    };

    return stats;
  },
});

// Get cron job metadata (for monitoring scheduled tasks)
export const getCronJobStatus = query({
  args: { jobKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.jobKey) {
      const jobKey = args.jobKey; // Extract to const to satisfy TypeScript
      const job = await ctx.db
        .query("jobsMeta")
        .withIndex("by_key", (q) => q.eq("job_key", jobKey))
        .first();

      return job ?? null;
    }

    // Return all jobs
    const jobs = await ctx.db.query("jobsMeta").collect();
    return jobs;
  },
});

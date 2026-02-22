import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Subscription Queries for Real-Time Frontend Updates
 *
 * These queries allow the frontend to subscribe to subscription state changes
 * and get instant updates when subscriptions are activated/deactivated via webhooks.
 */

// Get current subscription state for a user (from Convex subscriptions table)
export const getSubscriptionState = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
      .first();

    return sub ?? null;
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

// Get subscription statistics (for admin monitoring)
export const getSubscriptionStats = query({
  args: {},
  handler: async (ctx) => {
    const allSubs = await ctx.db.query("subscriptions").collect();

    const stats = {
      total: allSubs.length,
      active: allSubs.filter((s) => s.status === 'active').length,
      trialing: allSubs.filter((s) => s.status === 'trialing').length,
      cancelled: allSubs.filter((s) => s.status === 'cancelled').length,
      expired: allSubs.filter((s) => s.status === 'expired').length,
      on_hold: allSubs.filter((s) => s.status === 'on_hold').length,
      payment_failed: allSubs.filter((s) => s.status === 'payment_failed').length,
      pending: allSubs.filter((s) => s.status === 'pending').length,
      recent_updates: allSubs
        .filter((s) => s.updated_at && s.updated_at > Date.now() - 24 * 60 * 60 * 1000)
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

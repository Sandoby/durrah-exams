import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Webhook Deduplication Helpers
 * Persistent storage to prevent duplicate webhook processing across deployments
 */

// Check if webhook was already processed
export const isWebhookProcessed = internalQuery({
  args: {
    webhookId: v.string(),
    provider: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("webhookEvents")
      .withIndex("by_webhook_id", (q) => q.eq("webhook_id", args.webhookId))
      .first();

    if (!existing) return { processed: false };

    const hourAgo = Date.now() - (60 * 60 * 1000);
    const isRecent = existing.processed_at > hourAgo;

    return {
      processed: isRecent,
      event: existing,
    };
  },
});

// Record webhook as processed
export const recordWebhookProcessed = internalMutation({
  args: {
    webhookId: v.string(),
    eventType: v.string(),
    provider: v.string(),
    userId: v.optional(v.string()),
    subscriptionId: v.optional(v.string()),
    payloadHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("webhookEvents", {
      webhook_id: args.webhookId,
      event_type: args.eventType,
      provider: args.provider,
      processed_at: Date.now(),
      user_id: args.userId,
      subscription_id: args.subscriptionId,
      payload_hash: args.payloadHash,
    });

    return { success: true };
  },
});

// Cleanup old webhook records (called by cron)
export const cleanupOldWebhooks = internalMutation({
  args: {},
  handler: async (ctx) => {
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const oldWebhooks = await ctx.db
      .query("webhookEvents")
      .withIndex("by_processed_at")
      .filter((q) => q.lt(q.field("processed_at"), weekAgo))
      .collect();

    let deletedCount = 0;
    for (const webhook of oldWebhooks) {
      await ctx.db.delete(webhook._id);
      deletedCount++;
    }

    console.log(`[Webhook Cleanup] Deleted ${deletedCount} old webhook records`);
    return { deletedCount };
  },
});

/**
 * Subscription Sync State Helpers
 * Track subscription sync status for monitoring and debugging
 */

export const updateSubscriptionSyncState = internalMutation({
  args: {
    userId: v.string(),
    status: v.string(),
    endDate: v.optional(v.number()),
    dodoCustomerId: v.optional(v.string()),
    syncSource: v.string(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscriptionSync")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        last_synced_at: Date.now(),
        last_status: args.status,
        last_end_date: args.endDate,
        dodo_customer_id: args.dodoCustomerId ?? existing.dodo_customer_id,
        sync_source: args.syncSource,
        error_count: args.error ? existing.error_count + 1 : 0,
        last_error: args.error,
      });
    } else {
      await ctx.db.insert("subscriptionSync", {
        user_id: args.userId,
        last_synced_at: Date.now(),
        last_status: args.status,
        last_end_date: args.endDate,
        dodo_customer_id: args.dodoCustomerId,
        sync_source: args.syncSource,
        error_count: args.error ? 1 : 0,
        last_error: args.error,
      });
    }

    return { success: true };
  },
});

export const getSubscriptionSyncState = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const syncState = await ctx.db
      .query("subscriptionSync")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .first();

    return syncState ?? null;
  },
});

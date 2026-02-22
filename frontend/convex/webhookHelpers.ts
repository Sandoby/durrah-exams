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


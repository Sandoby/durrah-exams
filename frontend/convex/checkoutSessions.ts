import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Checkout Sessions
 *
 * Tracks every inline Dodo checkout session from creation through conversion.
 * Enables:
 *  - Webhook → session → user tracing (even if metadata is stripped)
 *  - "Abandoned checkout" analytics
 *  - Duplicate-session detection (prevent double-charging)
 */

// ─────────────────────────────────────────────────────────────────────────────
// MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

/** Store a new checkout session immediately after the Dodo API responds. */
export const store = internalMutation({
  args: {
    sessionId:    v.string(),
    userId:       v.string(),
    email:        v.optional(v.string()),
    billingCycle: v.string(),
    planId:       v.string(),
  },
  handler: async (ctx, args) => {
    // Upsert — if user retries and gets a second session, still track both
    await ctx.db.insert("checkoutSessions", {
      session_id:    args.sessionId,
      user_id:       args.userId,
      email:         args.email,
      billing_cycle: args.billingCycle,
      plan_id:       args.planId,
      status:        "pending",
      created_at:    Date.now(),
    });
  },
});

/** Mark a checkout session as converted when subscription.active webhook fires. */
export const markConverted = internalMutation({
  args: {
    userId:         v.string(),
    subscriptionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the most recent pending session for this user
    const sessions = await ctx.db
      .query("checkoutSessions")
      .withIndex("by_user_status", (q) =>
        q.eq("user_id", args.userId).eq("status", "pending")
      )
      .order("desc")
      .take(1);

    if (sessions.length === 0) return;

    await ctx.db.patch(sessions[0]._id, {
      status:          "converted",
      subscription_id: args.subscriptionId,
      converted_at:    Date.now(),
    });
  },
});

/** Mark all pending sessions for a user as expired (called when subscription.failed fires). */
export const markFailed = internalMutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("checkoutSessions")
      .withIndex("by_user_status", (q) =>
        q.eq("user_id", args.userId).eq("status", "pending")
      )
      .collect();

    for (const session of sessions) {
      await ctx.db.patch(session._id, { status: "failed" });
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────────────────────────────────────

/** Look up a checkout session by its Dodo session_id. */
export const getBySessionId = internalQuery({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("checkoutSessions")
      .withIndex("by_session_id", (q) => q.eq("session_id", args.sessionId))
      .first();
  },
});

/** Get all pending sessions for a user (useful for dedup checks). */
export const getPendingByUser = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("checkoutSessions")
      .withIndex("by_user_status", (q) =>
        q.eq("user_id", args.userId).eq("status", "pending")
      )
      .collect();
  },
});

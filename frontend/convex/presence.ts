import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Presence Mutations & Queries
 * 
 * Track online status, typing indicators, and user activity.
 */

// ============================================
// MUTATIONS
// ============================================

// Touch presence (heartbeat for online status)
export const touchPresence = mutation({
  args: {
    user_id: v.string(),
    display_name: v.string(),
    role: v.union(
      v.literal("student"),
      v.literal("tutor"),
      v.literal("agent"),
      v.literal("admin")
    ),
    scope: v.union(
      v.literal("global"),
      v.literal("exam"),
      v.literal("chat")
    ),
    scope_id: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("online"),
      v.literal("away"),
      v.literal("busy")
    )),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Find existing presence for this user/scope
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .filter((q) => 
        q.and(
          q.eq(q.field("scope"), args.scope),
          args.scope_id 
            ? q.eq(q.field("scope_id"), args.scope_id)
            : true
        )
      )
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        display_name: args.display_name,
        status: args.status ?? "online",
        last_seen: now,
      });
      return existing._id;
    }
    
    // Create new presence
    return await ctx.db.insert("presence", {
      user_id: args.user_id,
      display_name: args.display_name,
      role: args.role,
      scope: args.scope,
      scope_id: args.scope_id,
      status: args.status ?? "online",
      is_typing: false,
      last_seen: now,
      connected_at: now,
    });
  },
});

// Set typing status
export const setTyping = mutation({
  args: {
    user_id: v.string(),
    is_typing: v.boolean(),
    typing_in: v.optional(v.string()), // session_id
  },
  handler: async (ctx, args) => {
    const presence = await ctx.db
      .query("presence")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .first();
    
    if (!presence) {
      return null;
    }
    
    await ctx.db.patch(presence._id, {
      is_typing: args.is_typing,
      typing_in: args.is_typing ? args.typing_in : undefined,
      last_seen: Date.now(),
    });
    
    return presence._id;
  },
});

// Go offline
export const goOffline = mutation({
  args: {
    user_id: v.string(),
  },
  handler: async (ctx, args) => {
    const presences = await ctx.db
      .query("presence")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .collect();
    
    for (const p of presences) {
      await ctx.db.patch(p._id, {
        status: "offline",
        is_typing: false,
        last_seen: Date.now(),
      });
    }
    
    return presences.length;
  },
});

// Clear stale presence (for cron)
export const clearStalePresence = mutation({
  args: {
    stale_threshold_ms: v.number(), // e.g., 60000 for 1 minute
  },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.stale_threshold_ms;
    
    const stale = await ctx.db
      .query("presence")
      .withIndex("by_status", (q) => q.eq("status", "online"))
      .filter((q) => q.lt(q.field("last_seen"), cutoff))
      .collect();
    
    for (const p of stale) {
      await ctx.db.patch(p._id, {
        status: "offline",
        is_typing: false,
      });
    }
    
    return stale.length;
  },
});

// ============================================
// QUERIES
// ============================================

// Get presence for a scope (e.g., all users in an exam)
export const listPresence = query({
  args: {
    scope: v.union(
      v.literal("global"),
      v.literal("exam"),
      v.literal("chat")
    ),
    scope_id: v.optional(v.string()),
    online_only: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let presences = await ctx.db
      .query("presence")
      .withIndex("by_scope", (q) => q.eq("scope", args.scope).eq("scope_id", args.scope_id ?? undefined))
      .collect();
    
    if (args.online_only) {
      presences = presences.filter((p) => p.status === "online");
    }
    
    return presences;
  },
});

// Get presence for a specific user
export const getUserPresence = query({
  args: {
    user_id: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("presence")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .first();
  },
});

// Get typing users in a chat session
export const getTypingUsers = query({
  args: {
    session_id: v.string(),
    exclude_user_id: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const presences = await ctx.db
      .query("presence")
      .filter((q) => 
        q.and(
          q.eq(q.field("is_typing"), true),
          q.eq(q.field("typing_in"), args.session_id)
        )
      )
      .collect();
    
    if (args.exclude_user_id) {
      return presences.filter((p) => p.user_id !== args.exclude_user_id);
    }
    
    return presences;
  },
});

// Get online count for scope
export const getOnlineCount = query({
  args: {
    scope: v.union(
      v.literal("global"),
      v.literal("exam"),
      v.literal("chat")
    ),
    scope_id: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const presences = await ctx.db
      .query("presence")
      .withIndex("by_scope", (q) => q.eq("scope", args.scope).eq("scope_id", args.scope_id ?? undefined))
      .filter((q) => q.eq(q.field("status"), "online"))
      .collect();
    
    return presences.length;
  },
});

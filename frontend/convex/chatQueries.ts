import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Chat Queries
 * 
 * Real-time queries for chat sessions and messages.
 */

// ============================================
// LIST SESSIONS BY SCOPE
// ============================================
export const listSessions = query({
  args: {
    scope: v.union(v.literal("support"), v.literal("exam")),
    status: v.optional(v.union(
      v.literal("waiting"),
      v.literal("active"),
      v.literal("ended")
    )),
    assigned_to: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let sessions = await ctx.db
      .query("chatSessions")
      .withIndex("by_scope", (q) => q.eq("scope", args.scope))
      .collect();
    
    // Filter by status if provided
    if (args.status) {
      sessions = sessions.filter((s) => s.status === args.status);
    }
    
    // Filter by assigned agent if provided
    if (args.assigned_to) {
      sessions = sessions.filter((s) => s.assigned_to === args.assigned_to);
    }
    
    // Sort: waiting first, then by last_message_at desc
    const statusOrder: Record<string, number> = {
      waiting: 0,
      active: 1,
      ended: 2,
    };
    
    return sessions.sort((a, b) => {
      const orderDiff = statusOrder[a.status] - statusOrder[b.status];
      if (orderDiff !== 0) return orderDiff;
      return (b.last_message_at ?? b.created_at) - (a.last_message_at ?? a.created_at);
    });
  },
});

// ============================================
// GET SESSIONS FOR USER
// ============================================
export const getUserSessions = query({
  args: {
    user_id: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chatSessions")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .collect();
  },
});

// ============================================
// GET SESSIONS BY EXAM
// ============================================
export const getExamChatSessions = query({
  args: {
    exam_id: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chatSessions")
      .withIndex("by_exam", (q) => q.eq("exam_id", args.exam_id))
      .collect();
  },
});

// ============================================
// GET SESSION BY ID
// ============================================
export const getSession = query({
  args: {
    session_id: v.id("chatSessions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.session_id);
  },
});

// ============================================
// GET MESSAGES FOR SESSION
// ============================================
export const getMessages = query({
  args: {
    session_id: v.id("chatSessions"),
    limit: v.optional(v.number()),
    before: v.optional(v.number()), // For pagination
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    
    let messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_session_time", (q) => q.eq("session_id", args.session_id))
      .order("desc")
      .collect();
    
    // Filter by before timestamp if provided (pagination)
    if (args.before) {
      messages = messages.filter((m) => m.created_at < args.before!);
    }
    
    // Apply limit and reverse for chronological order
    return messages.slice(0, limit).reverse();
  },
});

// ============================================
// GET UNREAD COUNT FOR USER
// ============================================
export const getUnreadCount = query({
  args: {
    session_id: v.id("chatSessions"),
    user_id: v.string(),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_session", (q) => q.eq("session_id", args.session_id))
      .collect();
    
    return messages.filter(
      (m) => !m.read_by.includes(args.user_id) && m.sender_id !== args.user_id
    ).length;
  },
});

// ============================================
// GET WAITING SESSIONS COUNT (for agent badge)
// ============================================
export const getWaitingCount = query({
  args: {
    scope: v.union(v.literal("support"), v.literal("exam")),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("chatSessions")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .filter((q) => q.eq(q.field("scope"), args.scope))
      .collect();
    
    return sessions.length;
  },
});

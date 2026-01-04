import { v } from "convex/values";
import { mutation } from "./_generated/server";

/**
 * Chat Mutations
 * 
 * Handle real-time chat operations for support and exam chat rooms.
 */

// ============================================
// START CHAT SESSION
// ============================================
export const startChat = mutation({
  args: {
    scope: v.union(v.literal("support"), v.literal("exam")),
    exam_id: v.optional(v.string()),
    user_id: v.string(),
    user_name: v.string(),
    user_email: v.optional(v.string()),
    user_role: v.union(v.literal("student"), v.literal("tutor")),
    subject: v.optional(v.string()),
    priority: v.optional(v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high")
    )),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check for existing active session for this user
    const existing = await ctx.db
      .query("chatSessions")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .filter((q) => 
        q.and(
          q.eq(q.field("scope"), args.scope),
          q.neq(q.field("status"), "ended")
        )
      )
      .first();
    
    if (existing) {
      return existing._id;
    }
    
    // Create new session
    const sessionId = await ctx.db.insert("chatSessions", {
      scope: args.scope,
      exam_id: args.exam_id,
      user_id: args.user_id,
      user_name: args.user_name,
      user_email: args.user_email,
      user_role: args.user_role,
      status: "waiting",
      subject: args.subject,
      priority: args.priority ?? "medium",
      created_at: now,
    });
    
    // Add system message
    await ctx.db.insert("chatMessages", {
      session_id: sessionId,
      sender_id: "system",
      sender_name: "System",
      sender_role: "system",
      body: `Chat session started. ${args.scope === "support" ? "An agent will be with you shortly." : "You can now chat with the tutor."}`,
      read_by: [],
      created_at: now,
      message_type: "system",
    });
    
    return sessionId;
  },
});

// ============================================
// ASSIGN AGENT/TUTOR
// ============================================
export const assignAgent = mutation({
  args: {
    session_id: v.id("chatSessions"),
    agent_id: v.string(),
    agent_name: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const session = await ctx.db.get(args.session_id);
    if (!session) {
      throw new Error("Session not found");
    }
    
    await ctx.db.patch(args.session_id, {
      assigned_to: args.agent_id,
      assigned_name: args.agent_name,
      status: "active",
    });
    
    // Add system message
    await ctx.db.insert("chatMessages", {
      session_id: args.session_id,
      sender_id: "system",
      sender_name: "System",
      sender_role: "system",
      body: `${args.agent_name} has joined the chat.`,
      read_by: [],
      created_at: now,
      message_type: "system",
    });
    
    return args.session_id;
  },
});

// ============================================
// SEND MESSAGE
// ============================================
export const sendMessage = mutation({
  args: {
    session_id: v.id("chatSessions"),
    sender_id: v.string(),
    sender_name: v.string(),
    sender_role: v.union(
      v.literal("user"),
      v.literal("agent"),
      v.literal("tutor"),
      v.literal("system")
    ),
    body: v.string(),
    attachments: v.optional(v.array(v.object({
      url: v.string(),
      name: v.string(),
      type: v.string(),
      size: v.optional(v.number()),
    }))),
    message_type: v.optional(v.union(
      v.literal("text"),
      v.literal("image"),
      v.literal("file"),
      v.literal("system")
    )),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Verify session exists and is not ended
    const session = await ctx.db.get(args.session_id);
    if (!session || session.status === "ended") {
      throw new Error("Cannot send message to ended session");
    }
    
    // Create message
    const messageId = await ctx.db.insert("chatMessages", {
      session_id: args.session_id,
      sender_id: args.sender_id,
      sender_name: args.sender_name,
      sender_role: args.sender_role,
      body: args.body,
      attachments: args.attachments,
      read_by: [args.sender_id], // Sender has "read" their own message
      created_at: now,
      message_type: args.message_type ?? "text",
    });
    
    // Update session last_message_at
    await ctx.db.patch(args.session_id, {
      last_message_at: now,
    });
    
    return messageId;
  },
});

// ============================================
// MARK MESSAGES READ
// ============================================
export const markRead = mutation({
  args: {
    session_id: v.id("chatSessions"),
    user_id: v.string(),
    up_to_time: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const upToTime = args.up_to_time ?? Date.now();
    
    // Get unread messages in session
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_session", (q) => q.eq("session_id", args.session_id))
      .filter((q) => q.lte(q.field("created_at"), upToTime))
      .collect();
    
    // Mark each as read by this user
    for (const msg of messages) {
      if (!msg.read_by.includes(args.user_id)) {
        await ctx.db.patch(msg._id, {
          read_by: [...msg.read_by, args.user_id],
        });
      }
    }
    
    return messages.length;
  },
});

// ============================================
// END CHAT SESSION
// ============================================
export const endChat = mutation({
  args: {
    session_id: v.id("chatSessions"),
    ended_by: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const session = await ctx.db.get(args.session_id);
    if (!session) {
      throw new Error("Session not found");
    }
    
    await ctx.db.patch(args.session_id, {
      status: "ended",
      ended_at: now,
    });
    
    // Add system message
    await ctx.db.insert("chatMessages", {
      session_id: args.session_id,
      sender_id: "system",
      sender_name: "System",
      sender_role: "system",
      body: "Chat session has ended.",
      read_by: [],
      created_at: now,
      message_type: "system",
    });
    
    return args.session_id;
  },
});

// ============================================
// RATE SESSION
// ============================================
export const rateSession = mutation({
  args: {
    session_id: v.id("chatSessions"),
    rating: v.number(),        // 1-5
    feedback: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.session_id);
    if (!session) {
      throw new Error("Session not found");
    }
    
    // Validate rating
    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }
    
    await ctx.db.patch(args.session_id, {
      rating: args.rating,
      feedback: args.feedback,
    });
    
    return args.session_id;
  },
});

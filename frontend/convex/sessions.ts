import { v } from "convex/values";
import { mutation } from "./_generated/server";

/**
 * Proctoring Session Mutations
 * 
 * These mutations handle real-time exam proctoring:
 * - Student starts/ends session
 * - Heartbeat updates (progress, time remaining)
 * - Violation logging
 */

// ============================================
// START SESSION
// ============================================
export const startSession = mutation({
  args: {
    exam_id: v.string(),
    student_id: v.string(),
    student_name: v.string(),
    student_email: v.optional(v.string()),
    total_questions: v.number(),
    user_agent: v.optional(v.string()),
    screen_resolution: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check if session already exists for this student/exam
    const existing = await ctx.db
      .query("examSessions")
      .withIndex("by_exam_student", (q) => 
        q.eq("exam_id", args.exam_id).eq("student_id", args.student_id)
      )
      .filter((q) => q.neq(q.field("status"), "expired"))
      .first();
    
    if (existing) {
      // Reactivate if disconnected, otherwise return existing
      if (existing.status === "disconnected") {
        await ctx.db.patch(existing._id, {
          status: "active",
          last_heartbeat: now,
        });
      }
      return existing._id;
    }
    
    // Create new session
    const sessionId = await ctx.db.insert("examSessions", {
      exam_id: args.exam_id,
      student_id: args.student_id,
      student_name: args.student_name,
      student_email: args.student_email,
      status: "active",
      current_question: 0,
      answered_count: 0,
      total_questions: args.total_questions,
      violations: [],
      violations_count: 0,
      last_heartbeat: now,
      heartbeat_count: 1,
      started_at: now,
      user_agent: args.user_agent,
      screen_resolution: args.screen_resolution,
    });
    
    return sessionId;
  },
});

// ============================================
// HEARTBEAT
// ============================================
export const heartbeat = mutation({
  args: {
    exam_id: v.string(),
    student_id: v.string(),
    current_question: v.number(),
    answered_count: v.number(),
    time_remaining_seconds: v.optional(v.number()),
    network_quality: v.optional(v.union(
      v.literal("good"),
      v.literal("fair"),
      v.literal("poor")
    )),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Find active session
    const session = await ctx.db
      .query("examSessions")
      .withIndex("by_exam_student", (q) => 
        q.eq("exam_id", args.exam_id).eq("student_id", args.student_id)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
    
    if (!session) {
      throw new Error("No active session found");
    }
    
    // Rate limit: reject if less than 5s since last heartbeat
    if (now - session.last_heartbeat < 5000) {
      return { throttled: true, session_id: session._id };
    }
    
    // Update session
    await ctx.db.patch(session._id, {
      current_question: args.current_question,
      answered_count: args.answered_count,
      time_remaining_seconds: args.time_remaining_seconds,
      network_quality: args.network_quality,
      last_heartbeat: now,
      heartbeat_count: session.heartbeat_count + 1,
    });
    
    return { throttled: false, session_id: session._id };
  },
});

// ============================================
// LOG VIOLATION
// ============================================
export const logViolation = mutation({
  args: {
    exam_id: v.string(),
    student_id: v.string(),
    type: v.string(),
    detail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Find active session
    const session = await ctx.db
      .query("examSessions")
      .withIndex("by_exam_student", (q) => 
        q.eq("exam_id", args.exam_id).eq("student_id", args.student_id)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
    
    if (!session) {
      throw new Error("No active session found");
    }
    
    // Add violation to array
    const newViolation = {
      type: args.type,
      timestamp: now,
      detail: args.detail,
    };
    
    const updatedViolations = [...session.violations, newViolation];
    
    await ctx.db.patch(session._id, {
      violations: updatedViolations,
      violations_count: updatedViolations.length,
      last_heartbeat: now, // Also update heartbeat on violation
    });
    
    return {
      session_id: session._id,
      violations_count: updatedViolations.length,
    };
  },
});

// ============================================
// END SESSION
// ============================================
export const endSession = mutation({
  args: {
    exam_id: v.string(),
    student_id: v.string(),
    status: v.union(v.literal("submitted"), v.literal("expired")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Find session
    const session = await ctx.db
      .query("examSessions")
      .withIndex("by_exam_student", (q) => 
        q.eq("exam_id", args.exam_id).eq("student_id", args.student_id)
      )
      .first();
    
    if (!session) {
      return null;
    }
    
    await ctx.db.patch(session._id, {
      status: args.status,
      ended_at: now,
    });
    
    return session._id;
  },
});

// ============================================
// MARK DISCONNECTED (called by cleanup cron)
// ============================================
export const markDisconnected = mutation({
  args: {
    session_id: v.id("examSessions"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.session_id, {
      status: "disconnected",
    });
  },
});

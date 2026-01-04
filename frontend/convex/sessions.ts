import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Proctoring Session Mutations
 * 
 * These mutations handle real-time exam proctoring:
 * - Student starts/ends session
 * - Heartbeat updates (progress, time remaining)
 * - Violation logging
 * - Answer syncing (real-time backup)
 * - Server-side timer management
 */

// ============================================
// START SESSION (with server-side timer)
// ============================================
export const startSession = mutation({
  args: {
    exam_id: v.string(),
    student_id: v.string(),
    student_name: v.string(),
    student_email: v.optional(v.string()),
    student_data: v.optional(v.any()), // Full form data
    total_questions: v.number(),
    time_limit_seconds: v.optional(v.number()), // Exam duration
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
      .filter((q) => 
        q.and(
          q.neq(q.field("status"), "expired"),
          q.neq(q.field("status"), "submitted"),
          q.neq(q.field("status"), "auto_submitted")
        )
      )
      .first();
    
    if (existing) {
      // Reactivate if disconnected, return existing data
      if (existing.status === "disconnected") {
        await ctx.db.patch(existing._id, {
          status: "active",
          last_heartbeat: now,
        });
      }
      
      // Calculate remaining time from server-side timer
      let timeRemaining = existing.time_remaining_seconds;
      if (existing.server_started_at && existing.time_limit_seconds) {
        const elapsed = Math.floor((now - existing.server_started_at) / 1000);
        timeRemaining = Math.max(0, existing.time_limit_seconds - elapsed);
      }
      
      return {
        session_id: existing._id,
        is_resume: true,
        saved_answers: existing.saved_answers || {},
        time_remaining_seconds: timeRemaining,
        server_started_at: existing.server_started_at,
        violations: existing.violations,
        answered_count: existing.answered_count,
        current_question: existing.current_question,
      };
    }
    
    // Create new session with server-side timer
    const sessionId = await ctx.db.insert("examSessions", {
      exam_id: args.exam_id,
      student_id: args.student_id,
      student_name: args.student_name,
      student_email: args.student_email,
      student_data: args.student_data,
      status: "active",
      current_question: 0,
      answered_count: 0,
      total_questions: args.total_questions,
      time_limit_seconds: args.time_limit_seconds,
      server_started_at: now, // Server authoritative start time
      time_remaining_seconds: args.time_limit_seconds,
      saved_answers: {},
      violations: [],
      violations_count: 0,
      last_heartbeat: now,
      heartbeat_count: 1,
      started_at: now,
      auto_submit_scheduled: args.time_limit_seconds ? true : false,
      user_agent: args.user_agent,
      screen_resolution: args.screen_resolution,
    });
    
    return {
      session_id: sessionId,
      is_resume: false,
      saved_answers: {},
      time_remaining_seconds: args.time_limit_seconds,
      server_started_at: now,
      violations: [],
      answered_count: 0,
      current_question: 0,
    };
  },
});

// ============================================
// SYNC ANSWERS (real-time backup)
// ============================================
export const syncAnswers = mutation({
  args: {
    exam_id: v.string(),
    student_id: v.string(),
    answers: v.any(), // { questionId: { answer: value } }
    current_question: v.number(),
    answered_count: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Find active or disconnected session
    const session = await ctx.db
      .query("examSessions")
      .withIndex("by_exam_student", (q) => 
        q.eq("exam_id", args.exam_id).eq("student_id", args.student_id)
      )
      .filter((q) => 
        q.or(
          q.eq(q.field("status"), "active"),
          q.eq(q.field("status"), "disconnected")
        )
      )
      .first();
    
    if (!session) {
      throw new Error("No active session found");
    }
    
    // Merge new answers with existing (don't overwrite with empty)
    const mergedAnswers = {
      ...(session.saved_answers || {}),
      ...args.answers,
    };
    
    // Calculate server-side time remaining
    let timeRemaining = session.time_remaining_seconds;
    if (session.server_started_at && session.time_limit_seconds) {
      const elapsed = Math.floor((now - session.server_started_at) / 1000);
      timeRemaining = Math.max(0, session.time_limit_seconds - elapsed);
    }
    
    await ctx.db.patch(session._id, {
      saved_answers: mergedAnswers,
      last_answer_sync: now,
      current_question: args.current_question,
      answered_count: args.answered_count,
      time_remaining_seconds: timeRemaining,
      last_heartbeat: now,
      status: "active", // Reactivate if was disconnected
    });
    
    return {
      session_id: session._id,
      time_remaining_seconds: timeRemaining,
      synced_at: now,
    };
  },
});

// ============================================
// GET SERVER TIME (for timer sync)
// ============================================
export const getServerTime = query({
  args: {
    exam_id: v.string(),
    student_id: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const session = await ctx.db
      .query("examSessions")
      .withIndex("by_exam_student", (q) => 
        q.eq("exam_id", args.exam_id).eq("student_id", args.student_id)
      )
      .first();
    
    if (!session) {
      return null;
    }
    
    // Calculate authoritative time remaining
    let timeRemaining = session.time_remaining_seconds ?? null;
    if (session.server_started_at && session.time_limit_seconds) {
      const elapsed = Math.floor((now - session.server_started_at) / 1000);
      timeRemaining = Math.max(0, session.time_limit_seconds - elapsed);
    }
    
    return {
      server_time: now,
      time_remaining_seconds: timeRemaining,
      server_started_at: session.server_started_at,
      status: session.status,
      saved_answers: session.saved_answers,
    };
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
    status: v.union(
      v.literal("submitted"), 
      v.literal("expired"), 
      v.literal("auto_submitted")
    ),
    submission_result: v.optional(v.any()), // Result from grading
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
    
    const updateData: Record<string, unknown> = {
      status: args.status,
      ended_at: now,
      auto_submit_scheduled: false, // Disable auto-submit
    };
    
    if (args.status === "auto_submitted") {
      updateData.auto_submitted_at = now;
    }
    
    if (args.submission_result) {
      updateData.submission_result = args.submission_result;
    }
    
    await ctx.db.patch(session._id, updateData);
    
    return session._id;
  },
});

// ============================================
// GET SESSION FOR AUTO-SUBMIT
// ============================================
export const getSessionForAutoSubmit = query({
  args: {
    session_id: v.id("examSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.session_id);
    if (!session) return null;
    
    return {
      exam_id: session.exam_id,
      student_id: session.student_id,
      student_name: session.student_name,
      student_email: session.student_email,
      student_data: session.student_data,
      saved_answers: session.saved_answers,
      status: session.status,
    };
  },
});

// ============================================
// MARK AUTO-SUBMITTED (called after grading)
// ============================================
export const markAutoSubmitted = mutation({
  args: {
    session_id: v.id("examSessions"),
    submission_result: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    await ctx.db.patch(args.session_id, {
      status: "auto_submitted",
      auto_submitted_at: now,
      auto_submit_scheduled: false,
      ended_at: now,
      submission_result: args.submission_result,
    });
    
    return { success: true };
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

// ============================================
// MARK SYNCED TO SUPABASE
// Called after auto-submitted session is graded by Supabase
// ============================================
export const markSyncedToSupabase = mutation({
  args: {
    session_id: v.id("examSessions"),
    supabase_submission_id: v.optional(v.string()),
    score: v.optional(v.number()),
    max_score: v.optional(v.number()),
    percentage: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.session_id);
    if (!session) {
      throw new Error("Session not found");
    }
    
    // Update submission_result to mark as synced
    const updatedResult = {
      ...(session.submission_result || {}),
      pending_supabase_sync: false,
      supabase_synced_at: Date.now(),
      supabase_submission_id: args.supabase_submission_id,
      score: args.score,
      max_score: args.max_score,
      percentage: args.percentage,
    };
    
    await ctx.db.patch(args.session_id, {
      submission_result: updatedResult,
    });
    
    return { success: true };
  },
});

// ============================================
// DELETE SESSION FOR RETAKE
// Called when tutor allows student to retake exam
// ============================================
export const deleteSessionForRetake = mutation({
  args: {
    exam_id: v.string(),
    student_email: v.string(),
  },
  handler: async (ctx, args) => {
    // Find all sessions for this student/exam
    const sessions = await ctx.db
      .query("examSessions")
      .withIndex("by_exam_student")
      .filter((q) => 
        q.and(
          q.eq(q.field("exam_id"), args.exam_id),
          q.eq(q.field("student_email"), args.student_email)
        )
      )
      .collect();
    
    // Also try to find by student_id matching email (some sessions use email as student_id)
    const sessionsByStudentId = await ctx.db
      .query("examSessions")
      .withIndex("by_exam_student", (q) => 
        q.eq("exam_id", args.exam_id).eq("student_id", args.student_email)
      )
      .collect();
    
    // Combine and deduplicate
    const allSessions = [...sessions, ...sessionsByStudentId];
    const uniqueSessionIds = new Set(allSessions.map(s => s._id));
    
    // Delete all found sessions
    let deletedCount = 0;
    for (const sessionId of uniqueSessionIds) {
      await ctx.db.delete(sessionId);
      deletedCount++;
    }
    
    return { 
      success: true, 
      deleted_count: deletedCount,
      message: deletedCount > 0 
        ? `Deleted ${deletedCount} session(s) for retake`
        : "No sessions found to delete"
    };
  },
});

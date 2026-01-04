import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Proctoring Session Queries
 * 
 * These queries provide real-time views for tutors to monitor exams.
 */

// ============================================
// GET ALL SESSIONS FOR AN EXAM (Tutor Dashboard)
// ============================================
export const getExamSessions = query({
  args: {
    exam_id: v.string(),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("examSessions")
      .withIndex("by_exam", (q) => q.eq("exam_id", args.exam_id))
      .collect();
    
    // Sort by status (active first, then disconnected, then submitted/auto_submitted)
    const statusOrder: Record<string, number> = {
      active: 0,
      disconnected: 1,
      submitted: 2,
      auto_submitted: 2, // Same priority as submitted
      expired: 3,
    };
    
    return sessions.sort((a, b) => {
      const orderDiff = (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4);
      if (orderDiff !== 0) return orderDiff;
      // Within same status, sort by last heartbeat (most recent first)
      return b.last_heartbeat - a.last_heartbeat;
    });
  },
});

// ============================================
// GET SINGLE SESSION
// ============================================
export const getSession = query({
  args: {
    exam_id: v.string(),
    student_id: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("examSessions")
      .withIndex("by_exam_student", (q) => 
        q.eq("exam_id", args.exam_id).eq("student_id", args.student_id)
      )
      .first();
  },
});

// ============================================
// GET SESSION BY ID
// ============================================
export const getSessionById = query({
  args: {
    session_id: v.id("examSessions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.session_id);
  },
});

// ============================================
// GET ACTIVE SESSIONS COUNT
// ============================================
export const getActiveSessionsCount = query({
  args: {
    exam_id: v.string(),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("examSessions")
      .withIndex("by_exam", (q) => q.eq("exam_id", args.exam_id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
    
    return sessions.length;
  },
});

// ============================================
// GET SESSIONS WITH VIOLATIONS (Alert View)
// ============================================
export const getSessionsWithViolations = query({
  args: {
    exam_id: v.string(),
    min_violations: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const minViolations = args.min_violations ?? 1;
    
    const sessions = await ctx.db
      .query("examSessions")
      .withIndex("by_exam", (q) => q.eq("exam_id", args.exam_id))
      .collect();
    
    return sessions
      .filter((s) => s.violations_count >= minViolations)
      .sort((a, b) => b.violations_count - a.violations_count);
  },
});

// ============================================
// GET STALE SESSIONS (for cleanup cron)
// ============================================
export const getStaleSessions = query({
  args: {
    stale_threshold_ms: v.number(), // e.g., 120000 for 2 minutes
  },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.stale_threshold_ms;
    
    const sessions = await ctx.db
      .query("examSessions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    
    return sessions.filter((s) => s.last_heartbeat < cutoff);
  },
});

// ============================================
// GET EXAM STATS (Summary for tutor)
// ============================================
export const getExamStats = query({
  args: {
    exam_id: v.string(),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("examSessions")
      .withIndex("by_exam", (q) => q.eq("exam_id", args.exam_id))
      .collect();
    
    const stats = {
      total: sessions.length,
      active: 0,
      disconnected: 0,
      submitted: 0,
      auto_submitted: 0,
      expired: 0,
      total_violations: 0,
      avg_progress: 0,
    };
    
    let totalProgress = 0;
    
    for (const session of sessions) {
      if (session.status === "active") stats.active++;
      else if (session.status === "disconnected") stats.disconnected++;
      else if (session.status === "submitted") stats.submitted++;
      else if (session.status === "auto_submitted") stats.auto_submitted++;
      else if (session.status === "expired") stats.expired++;
      
      stats.total_violations += session.violations_count;
      
      if (session.total_questions > 0) {
        totalProgress += (session.answered_count / session.total_questions) * 100;
      }
    }
    
    if (sessions.length > 0) {
      stats.avg_progress = Math.round(totalProgress / sessions.length);
    }
    
    return stats;
  },
});

// ============================================
// GET PENDING AUTO-SUBMITS (for Supabase sync)
// Returns sessions that were auto-submitted by Convex cron
// and have pending_supabase_sync flag
// ============================================
export const getPendingAutoSubmits = query({
  args: {},
  handler: async (ctx) => {
    const sessions = await ctx.db
      .query("examSessions")
      .collect();
    
    // Filter for auto-submitted sessions that haven't been synced to Supabase
    return sessions
      .filter((s) => 
        s.status === "auto_submitted" && 
        s.submission_result?.pending_supabase_sync === true
      )
      .map((s) => ({
        session_id: s._id,
        exam_id: s.exam_id,
        student_id: s.student_id,
        student_name: s.student_name,
        student_email: s.student_email,
        student_data: s.student_data,
        saved_answers: s.saved_answers,
        violations: s.violations,
        violations_count: s.violations_count,
        auto_submitted_at: s.auto_submitted_at,
        started_at: s.started_at,
        time_limit_seconds: s.time_limit_seconds,
      }));
  },
});

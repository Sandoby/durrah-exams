import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Leaderboard Mutations & Queries
 * 
 * Real-time leaderboard for Kids Mode.
 * Scores are pushed from Supabase Edge Function after grading.
 */

// ============================================
// MUTATIONS
// ============================================

// Push score (called from grade-exam edge function via HTTP action)
export const pushScore = mutation({
  args: {
    quiz_code: v.string(),
    exam_id: v.string(),
    nickname: v.string(),
    student_id: v.optional(v.string()),
    avatar: v.optional(v.string()),
    score: v.number(),
    max_score: v.number(),
    percentage: v.number(),
    time_taken_seconds: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check for duplicate (same student + exam)
    if (args.student_id) {
      const existing = await ctx.db
        .query("leaderboardEntries")
        .withIndex("by_exam", (q) => q.eq("exam_id", args.exam_id))
        .filter((q) => q.eq(q.field("student_id"), args.student_id))
        .first();
      
      if (existing) {
        // Update if new score is higher
        if (args.score > existing.score) {
          await ctx.db.patch(existing._id, {
            score: args.score,
            max_score: args.max_score,
            percentage: args.percentage,
            time_taken_seconds: args.time_taken_seconds,
            submitted_at: now,
          });
        }
        return existing._id;
      }
    }
    
    // Create new entry
    const entryId = await ctx.db.insert("leaderboardEntries", {
      quiz_code: args.quiz_code,
      exam_id: args.exam_id,
      nickname: args.nickname,
      student_id: args.student_id,
      avatar: args.avatar ?? "🎓",
      score: args.score,
      max_score: args.max_score,
      percentage: args.percentage,
      submitted_at: now,
      time_taken_seconds: args.time_taken_seconds,
    });
    
    return entryId;
  },
});

// Clear leaderboard (for quiz reset)
export const clearLeaderboard = mutation({
  args: {
    quiz_code: v.string(),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("leaderboardEntries")
      .withIndex("by_quiz_code", (q) => q.eq("quiz_code", args.quiz_code))
      .collect();
    
    for (const entry of entries) {
      await ctx.db.delete(entry._id);
    }
    
    return entries.length;
  },
});

// ============================================
// QUERIES
// ============================================

// Get leaderboard for quiz (sorted by score desc, then time asc)
export const getLeaderboard = query({
  args: {
    quiz_code: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    
    const entries = await ctx.db
      .query("leaderboardEntries")
      .withIndex("by_quiz_code", (q) => q.eq("quiz_code", args.quiz_code))
      .collect();
    
    // Sort by score (desc), then by time taken (asc), then by submitted_at (asc)
    const sorted = entries.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.time_taken_seconds && b.time_taken_seconds) {
        return a.time_taken_seconds - b.time_taken_seconds;
      }
      return a.submitted_at - b.submitted_at;
    });
    
    // Add rank
    return sorted.slice(0, limit).map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
  },
});

// Get leaderboard entry for a student
export const getStudentEntry = query({
  args: {
    quiz_code: v.string(),
    student_id: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("leaderboardEntries")
      .withIndex("by_quiz_code", (q) => q.eq("quiz_code", args.quiz_code))
      .filter((q) => q.eq(q.field("student_id"), args.student_id))
      .first();
  },
});

// Get leaderboard stats
export const getLeaderboardStats = query({
  args: {
    quiz_code: v.string(),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("leaderboardEntries")
      .withIndex("by_quiz_code", (q) => q.eq("quiz_code", args.quiz_code))
      .collect();
    
    if (entries.length === 0) {
      return {
        total_entries: 0,
        average_score: 0,
        average_percentage: 0,
        highest_score: 0,
        perfect_scores: 0,
      };
    }
    
    const totalScore = entries.reduce((sum, e) => sum + e.score, 0);
    const totalPercentage = entries.reduce((sum, e) => sum + e.percentage, 0);
    const maxPossible = entries[0]?.max_score ?? 0;
    
    return {
      total_entries: entries.length,
      average_score: Math.round(totalScore / entries.length),
      average_percentage: Math.round(totalPercentage / entries.length),
      highest_score: Math.max(...entries.map((e) => e.score)),
      perfect_scores: entries.filter((e) => e.score === maxPossible).length,
    };
  },
});

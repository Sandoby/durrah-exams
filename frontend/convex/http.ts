import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * HTTP Routes for Convex
 * 
 * These endpoints can be called from external services like Supabase Edge Functions.
 */

const http = httpRouter();

// ============================================
// PUSH SCORE FROM GRADE-EXAM EDGE FUNCTION
// POST /pushScore
// ============================================
http.route({
  path: "/pushScore",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Verify shared secret
    const authHeader = request.headers.get("Authorization");
    const expectedSecret = process.env.CONVEX_WEBHOOK_SECRET;
    
    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    try {
      const body = await request.json();
      
      // Validate required fields
      const { quiz_code, exam_id, nickname, score, max_score, percentage } = body;
      
      if (!quiz_code || !exam_id || !nickname || score === undefined || !max_score) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      // Call the mutation
      const entryId = await ctx.runMutation(api.leaderboard.pushScore, {
        quiz_code,
        exam_id,
        nickname,
        student_id: body.student_id,
        avatar: body.avatar,
        score,
        max_score,
        percentage: percentage ?? Math.round((score / max_score) * 100),
        time_taken_seconds: body.time_taken_seconds,
      });
      
      return new Response(JSON.stringify({ success: true, entryId }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error pushing score:", error);
      return new Response(JSON.stringify({ error: "Internal error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// ============================================
// HEALTH CHECK
// GET /health
// ============================================
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(JSON.stringify({ 
      status: "ok", 
      timestamp: Date.now(),
      service: "durrah-exams-convex"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// ============================================
// GET PENDING AUTO-SUBMITTED SESSIONS
// GET /pendingAutoSubmits
// Returns sessions that were auto-submitted by Convex and need to be synced to Supabase
// ============================================
http.route({
  path: "/pendingAutoSubmits",
  method: "GET",
  handler: httpAction(async (ctx) => {
    try {
      // Get all auto-submitted sessions that haven't been synced to Supabase yet
      const sessions = await ctx.runQuery(api.sessionsQueries.getPendingAutoSubmits, {});
      
      return new Response(JSON.stringify({ 
        success: true, 
        sessions,
        count: sessions.length
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error getting pending auto-submits:", error);
      return new Response(JSON.stringify({ error: "Internal error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// ============================================
// MARK SESSION AS SYNCED TO SUPABASE
// POST /markSynced
// ============================================
http.route({
  path: "/markSynced",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { session_id, supabase_submission_id, score, max_score, percentage } = body;
      
      if (!session_id) {
        return new Response(JSON.stringify({ error: "Missing session_id" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      await ctx.runMutation(api.sessions.markSyncedToSupabase, {
        session_id,
        supabase_submission_id,
        score,
        max_score,
        percentage,
      });
      
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error marking session as synced:", error);
      return new Response(JSON.stringify({ error: "Internal error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

export default http;

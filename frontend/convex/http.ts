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

export default http;

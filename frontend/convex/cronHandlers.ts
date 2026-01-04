import { internalMutation } from "./_generated/server";

/**
 * Internal Cron Handlers
 * 
 * These mutations are called by the cron scheduler.
 * They are internal and cannot be called directly from the client.
 */

// ============================================
// AUTO-SUBMIT EXPIRED EXAMS
// ============================================
export const autoSubmitExpiredExams = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    // Find sessions that:
    // 1. Have auto_submit_scheduled = true
    // 2. Are active or disconnected
    // 3. Have server_started_at + time_limit_seconds < now (timer expired)
    
    const sessions = await ctx.db
      .query("examSessions")
      .collect();
    
    const expiredSessions = sessions.filter((s) => {
      // Must be scheduled for auto-submit
      if (!s.auto_submit_scheduled) return false;
      
      // Must be active or disconnected (not already submitted)
      if (s.status !== "active" && s.status !== "disconnected") return false;
      
      // Must have server timer data
      if (!s.server_started_at || !s.time_limit_seconds) return false;
      
      // Check if timer expired (add 5 second grace period)
      const expiryTime = s.server_started_at + (s.time_limit_seconds * 1000) + 5000;
      return now >= expiryTime;
    });
    
    // Process each expired session
    const results: { sessionId: string; success: boolean; error?: string }[] = [];
    
    for (const session of expiredSessions) {
      try {
        // Mark as auto-submitted with saved answers
        await ctx.db.patch(session._id, {
          status: "auto_submitted",
          auto_submitted_at: now,
          auto_submit_scheduled: false,
          ended_at: now,
          submission_result: {
            auto_submitted: true,
            submitted_at: now,
            saved_answers: session.saved_answers,
            student_data: session.student_data,
            pending_supabase_sync: true, // Flag for client to sync to Supabase
          },
        });
        
        results.push({ 
          sessionId: session._id, 
          success: true 
        });
        
        console.log(`[Auto-Submit] Session ${session._id} auto-submitted for student ${session.student_id}`);
      } catch (error) {
        results.push({ 
          sessionId: session._id, 
          success: false, 
          error: String(error) 
        });
        console.error(`[Auto-Submit] Failed for session ${session._id}:`, error);
      }
    }
    
    // Update job meta
    await updateJobMeta(ctx, "auto_submit_expired", results.filter(r => r.success).length);
    
    return {
      processed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    };
  },
});

// ============================================
// CLEANUP STALE PROCTORING SESSIONS
// ============================================
export const cleanupStaleSessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const STALE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes
    const cutoff = Date.now() - STALE_THRESHOLD_MS;
    
    // Find active sessions with old heartbeats
    const activeSessions = await ctx.db
      .query("examSessions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    
    const staleSessions = activeSessions.filter(
      (s) => s.last_heartbeat < cutoff
    );
    
    // Mark as disconnected
    for (const session of staleSessions) {
      await ctx.db.patch(session._id, {
        status: "disconnected",
      });
    }
    
    // Update job meta
    await updateJobMeta(ctx, "cleanup_stale_sessions", staleSessions.length);
    
    return staleSessions.length;
  },
});

// ============================================
// EXPIRE PRESENCE RECORDS
// ============================================
export const expirePresence = internalMutation({
  args: {},
  handler: async (ctx) => {
    const STALE_THRESHOLD_MS = 60 * 1000; // 60 seconds
    const cutoff = Date.now() - STALE_THRESHOLD_MS;
    
    // Find online presence with old last_seen
    const onlinePresence = await ctx.db
      .query("presence")
      .withIndex("by_status", (q) => q.eq("status", "online"))
      .collect();
    
    const stalePresence = onlinePresence.filter(
      (p) => p.last_seen < cutoff
    );
    
    // Mark as offline
    for (const presence of stalePresence) {
      await ctx.db.patch(presence._id, {
        status: "offline",
        is_typing: false,
      });
    }
    
    // Update job meta
    await updateJobMeta(ctx, "expire_presence", stalePresence.length);
    
    return stalePresence.length;
  },
});

// ============================================
// CLEANUP OLD LEADERBOARD ENTRIES
// ============================================
export const cleanupOldLeaderboards = internalMutation({
  args: {},
  handler: async (ctx) => {
    const RETENTION_DAYS = 30;
    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    
    // Find old entries
    const entries = await ctx.db
      .query("leaderboardEntries")
      .collect();
    
    const oldEntries = entries.filter((e) => e.submitted_at < cutoff);
    
    // Delete old entries
    for (const entry of oldEntries) {
      await ctx.db.delete(entry._id);
    }
    
    // Update job meta
    await updateJobMeta(ctx, "cleanup_old_leaderboards", oldEntries.length);
    
    return oldEntries.length;
  },
});

// ============================================
// HELPER: Update job metadata
// ============================================
async function updateJobMeta(
  ctx: any,
  jobKey: string,
  processedCount: number
) {
  const existing = await ctx.db
    .query("jobsMeta")
    .withIndex("by_key", (q: any) => q.eq("job_key", jobKey))
    .first();
  
  const now = Date.now();
  
  if (existing) {
    await ctx.db.patch(existing._id, {
      last_run_at: now,
      run_count: existing.run_count + 1,
      last_result: `Processed ${processedCount} items`,
      stats: {
        processed: (existing.stats?.processed ?? 0) + processedCount,
        errors: existing.stats?.errors ?? 0,
      },
    });
  } else {
    await ctx.db.insert("jobsMeta", {
      job_key: jobKey,
      last_run_at: now,
      run_count: 1,
      last_result: `Processed ${processedCount} items`,
      stats: {
        processed: processedCount,
        errors: 0,
      },
    });
  }
}

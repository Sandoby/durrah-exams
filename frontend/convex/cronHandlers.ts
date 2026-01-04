import { internalMutation } from "./_generated/server";

/**
 * Internal Cron Handlers
 * 
 * These mutations are called by the cron scheduler.
 * They are internal and cannot be called directly from the client.
 */

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

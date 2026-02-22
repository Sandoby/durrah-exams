import { internalMutation } from "./_generated/server";
import { performTransition } from "./subscriptions";

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
// CHECK SUBSCRIPTION EXPIRATIONS
// Every 6h: expire past-end-date subscriptions via Convex state machine
// Uses 24-hour grace buffer to avoid race conditions with renewals
// ============================================
export const checkSubscriptionExpirations = internalMutation({
  args: {},
  handler: async (ctx) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[Expiration Check] Missing Supabase configuration');
      return { error: 'Configuration missing' };
    }

    try {
      const now = new Date();
      // 24-hour grace buffer
      const graceCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Read from Convex subscriptions table
      const allSubs = await ctx.db
        .query("subscriptions")
        .collect();

      // Filter to subscriptions with an end_date
      const subsWithEndDate = allSubs.filter((s) => s.end_date != null);

      let processedCount = 0;
      let expiredCount = 0;
      let remindersCount = 0;

      for (const sub of subsWithEndDate) {
        const endDate = new Date(sub.end_date!);
        const hoursUntilExpiry = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        const daysUntilExpiry = Math.ceil(hoursUntilExpiry / 24);
        const lastReminder = sub.last_reminder_sent_at ? new Date(sub.last_reminder_sent_at) : null;
        const hoursSinceLastReminder = lastReminder ? (now.getTime() - lastReminder.getTime()) / (1000 * 60 * 60) : 999;

        // EXPIRE — only after 24h grace buffer, and only for non-active/non-trialing statuses
        if (
          endDate <= graceCutoff &&
          sub.status !== 'expired' &&
          sub.status !== 'cancelled' &&
          sub.status !== 'active' &&
          sub.status !== 'trialing'
        ) {
          const result = await performTransition(ctx.db, ctx.scheduler, {
            userId: sub.user_id,
            newStatus: 'expired',
            source: 'cron_expiration',
            metadata: { end_date: sub.end_date, reason: 'Subscription end date passed (6h cron check, 24h grace elapsed)' },
          });
          if (result.success) {
            console.log(`[Expiration Check] Expired user ${sub.user_id}`);
            expiredCount++;
            processedCount++;
          } else {
            console.error(`[Expiration Check] Transition failed for ${sub.user_id}: ${result.error}`);
          }
        }
        // 3-DAY REMINDER (only if notifications enabled)
        else if (daysUntilExpiry <= 3 && daysUntilExpiry > 0 && hoursSinceLastReminder >= 23) {
          if (!sub.email_notifications_enabled || !sub.email) continue;
          try {
            await fetch(`${supabaseUrl}/functions/v1/send-payment-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey },
              body: JSON.stringify({
                type: 'subscription_expiring',
                email: sub.email,
                daysRemaining: daysUntilExpiry,
                expiryDate: new Date(sub.end_date!).toISOString(),
                planName: sub.plan || 'Professional',
              }),
            });
            // Update reminder timestamp in Convex
            await ctx.db.patch(sub._id, { last_reminder_sent_at: now.getTime() });
            console.log(`[Expiration Check] Sent 3-day reminder to ${sub.email}`);
          } catch (emailErr) {
            console.error(`[Expiration Check] Reminder error for ${sub.email}:`, emailErr);
          }
          remindersCount++;
          processedCount++;
        }
        // 7-DAY REMINDER (only if notifications enabled)
        else if (daysUntilExpiry <= 7 && daysUntilExpiry > 3 && hoursSinceLastReminder >= 23) {
          if (!sub.email_notifications_enabled || !sub.email) continue;
          try {
            await fetch(`${supabaseUrl}/functions/v1/send-payment-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey },
              body: JSON.stringify({
                type: 'subscription_expiring',
                email: sub.email,
                daysRemaining: daysUntilExpiry,
                expiryDate: new Date(sub.end_date!).toISOString(),
                planName: sub.plan || 'Professional',
              }),
            });
            await ctx.db.patch(sub._id, { last_reminder_sent_at: now.getTime() });
            console.log(`[Expiration Check] Sent 7-day reminder to ${sub.email}`);
          } catch (emailErr) {
            console.error(`[Expiration Check] Reminder error for ${sub.email}:`, emailErr);
          }
          remindersCount++;
          processedCount++;
        }
      }

      await updateJobMeta(ctx, "check_subscription_expirations", processedCount);
      console.log(`[Expiration Check] Done: expired=${expiredCount}, reminders=${remindersCount}`);
      return { success: true, processed: processedCount, expired: expiredCount, reminders: remindersCount };
    } catch (error: any) {
      console.error('[Expiration Check] Error:', error);
      return { error: error.message };
    }
  },
});

// ============================================
// CHECK TRIAL EXPIRATIONS
// Handles trialing → expired → cancelled via Convex state machine
// ============================================
export const checkTrialExpirations = internalMutation({
  args: {},
  handler: async (ctx) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[Trial Check] Missing Supabase configuration');
      return { error: 'Configuration missing' };
    }

    try {
      const now = new Date();

      // Read trialing users from Convex
      const trialSubs = await ctx.db
        .query("subscriptions")
        .collect();

      // Filter to users with trial_activated = true
      const trialUsers = trialSubs.filter((s) => s.trial_activated === true);

      let processedCount = 0;
      let expiredCount = 0;
      let cancelledCount = 0;
      let warningsCount = 0;

      for (const sub of trialUsers) {
        const trialEndsAt = sub.trial_ends_at ? new Date(sub.trial_ends_at) : null;
        const graceEndsAt = sub.trial_grace_ends_at ? new Date(sub.trial_grace_ends_at) : null;
        const lastReminder = sub.last_reminder_sent_at ? new Date(sub.last_reminder_sent_at) : null;
        const hoursSinceLastReminder = lastReminder ? (now.getTime() - lastReminder.getTime()) / (1000 * 60 * 60) : 999;

        // 1. TRIAL ENDED → expire
        if (trialEndsAt && now >= trialEndsAt && sub.status === 'trialing') {
          const result = await performTransition(ctx.db, ctx.scheduler, {
            userId: sub.user_id,
            newStatus: 'expired',
            source: 'cron_trial',
            metadata: { trial_ends_at: sub.trial_ends_at, reason: 'Trial period ended' },
          });
          if (result.success) {
            console.log(`[Trial Check] Expired trial for user ${sub.user_id}`);
            expiredCount++;
            processedCount++;
          } else {
            console.error(`[Trial Check] Transition failed for ${sub.user_id}: ${result.error}`);
          }
        }
        // 2. GRACE PERIOD ENDED → cancel
        else if (graceEndsAt && now >= graceEndsAt && sub.status === 'expired' && sub.trial_activated) {
          const result = await performTransition(ctx.db, ctx.scheduler, {
            userId: sub.user_id,
            newStatus: 'cancelled',
            source: 'cron_trial',
            metadata: { grace_ends_at: sub.trial_grace_ends_at, reason: 'Grace period after trial ended' },
          });
          if (result.success) {
            console.log(`[Trial Check] Cancelled post-trial grace for user ${sub.user_id}`);
            cancelledCount++;
            processedCount++;
          } else {
            console.error(`[Trial Check] Transition failed for ${sub.user_id}: ${result.error}`);
          }
        }
        // 3. TRIAL ENDING SOON — send warning
        else if (trialEndsAt && sub.status === 'trialing' && sub.email_notifications_enabled && sub.email) {
          const daysUntilExpiry = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntilExpiry <= 2 && daysUntilExpiry > 0 && hoursSinceLastReminder >= 23) {
            try {
              await fetch(`${supabaseUrl}/functions/v1/send-payment-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey },
                body: JSON.stringify({
                  type: 'subscription_expiring',
                  email: sub.email,
                  daysRemaining: daysUntilExpiry,
                  expiryDate: new Date(sub.trial_ends_at!).toISOString(),
                  planName: 'Free Trial',
                }),
              });
              // Update reminder timestamp in Convex
              await ctx.db.patch(sub._id, { last_reminder_sent_at: now.getTime() });
              console.log(`[Trial Check] Trial warning sent to ${sub.email}, ${daysUntilExpiry}d remaining`);
            } catch (emailErr) {
              console.error(`[Trial Check] Warning email failed for ${sub.email}:`, emailErr);
            }
            warningsCount++;
            processedCount++;
          }
        }
      }

      await updateJobMeta(ctx, "check_trial_expirations", processedCount);
      console.log(`[Trial Check] Done: expired=${expiredCount}, cancelled=${cancelledCount}, warnings=${warningsCount}`);
      return { success: true, processed: processedCount, expired: expiredCount, cancelled: cancelledCount, warnings: warningsCount };
    } catch (error: any) {
      console.error('[Trial Check] Error:', error);
      return { error: error.message };
    }
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

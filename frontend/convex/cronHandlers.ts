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
// CHECK SUBSCRIPTION EXPIRATIONS
// Every 6h: expire past-end-date subscriptions via RPC state machine
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

    const rpcHeaders = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    };

    try {
      const now = new Date();
      // 24-hour grace buffer: only expire a subscription if end_date is more
      // than 24 hours in the past. This gives Dodo webhooks time to deliver
      // the renewal event before we mark the user expired.
      const graceCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const profilesRes = await fetch(
        `${supabaseUrl}/rest/v1/profiles?select=id,email,subscription_status,subscription_end_date,last_reminder_sent_at,email_notifications_enabled&subscription_end_date=not.is.null`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
      );

      if (!profilesRes.ok) {
        console.error('[Expiration Check] Failed to fetch profiles:', profilesRes.status);
        return { error: 'Failed to fetch profiles' };
      }

      const profiles = await profilesRes.json();
      let processedCount = 0;
      let expiredCount = 0;
      let remindersCount = 0;

      for (const profile of profiles) {
        const endDate = new Date(profile.subscription_end_date);
        const hoursUntilExpiry = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        const daysUntilExpiry = Math.ceil(hoursUntilExpiry / 24);
        const lastReminder = profile.last_reminder_sent_at ? new Date(profile.last_reminder_sent_at) : null;
        const hoursSinceLastReminder = lastReminder ? (now.getTime() - lastReminder.getTime()) / (1000 * 60 * 60) : 999;

        // EXPIRE — only after 24h grace buffer, and only for non-active/non-trialing statuses
        // 'active' and 'trialing' are guarded: renewals / trial-check cron handles those.
        if (
          endDate <= graceCutoff &&
          profile.subscription_status !== 'expired' &&
          profile.subscription_status !== 'cancelled' &&
          profile.subscription_status !== 'active' &&
          profile.subscription_status !== 'trialing'
        ) {
          // Use transition_subscription RPC — atomically validated, audited
          const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/transition_subscription`, {
            method: 'POST',
            headers: rpcHeaders,
            body: JSON.stringify({
              p_user_id: profile.id,
              p_new_status: 'expired',
              p_trigger_source: 'cron_expiration',
              p_reason: 'Subscription end date passed (6h cron check, 24h grace elapsed)',
              p_metadata: { end_date: profile.subscription_end_date },
            }),
          });
          if (!rpcRes.ok) {
            const err = await rpcRes.text();
            console.error(`[Expiration Check] RPC failed for ${profile.id}:`, err);
          } else {
            console.log(`[Expiration Check] Expired user ${profile.id}`);
            expiredCount++;
            processedCount++;
          }
        }
        // 3-DAY REMINDER (only if notifications enabled)
        else if (daysUntilExpiry <= 3 && daysUntilExpiry > 0 && hoursSinceLastReminder >= 23) {
          if (!profile.email_notifications_enabled) continue;
          try {
            await fetch(`${supabaseUrl}/functions/v1/send-payment-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey },
              body: JSON.stringify({
                type: 'subscription_expiring',
                email: profile.email,
                daysRemaining: daysUntilExpiry,
                expiryDate: profile.subscription_end_date,
                planName: profile.subscription_plan || 'Professional',
              }),
            });
            await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${profile.id}`, {
              method: 'PATCH',
              headers: rpcHeaders,
              body: JSON.stringify({ last_reminder_sent_at: now.toISOString() }),
            });
            console.log(`[Expiration Check] Sent 3-day reminder to ${profile.email}`);
          } catch (emailErr) {
            console.error(`[Expiration Check] Reminder error for ${profile.email}:`, emailErr);
          }
          remindersCount++;
          processedCount++;
        }
        // 7-DAY REMINDER (only if notifications enabled)
        else if (daysUntilExpiry <= 7 && daysUntilExpiry > 3 && hoursSinceLastReminder >= 23) {
          if (!profile.email_notifications_enabled) continue;
          try {
            await fetch(`${supabaseUrl}/functions/v1/send-payment-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey },
              body: JSON.stringify({
                type: 'subscription_expiring',
                email: profile.email,
                daysRemaining: daysUntilExpiry,
                expiryDate: profile.subscription_end_date,
                planName: profile.subscription_plan || 'Professional',
              }),
            });
            await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${profile.id}`, {
              method: 'PATCH',
              headers: rpcHeaders,
              body: JSON.stringify({ last_reminder_sent_at: now.toISOString() }),
            });
            console.log(`[Expiration Check] Sent 7-day reminder to ${profile.email}`);
          } catch (emailErr) {
            console.error(`[Expiration Check] Reminder error for ${profile.email}:`, emailErr);
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
// Handles trialing → expired → cancelled via RPC state machine
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

    const rpcHeaders = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    };

    // Helper: call transition_subscription RPC
    const callRpc = async (userId: string, newStatus: string, reason: string, metadata?: object) => {
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/transition_subscription`, {
        method: 'POST',
        headers: rpcHeaders,
        body: JSON.stringify({
          p_user_id: userId,
          p_new_status: newStatus,
          p_trigger_source: 'cron_trial',
          p_reason: reason,
          p_metadata: metadata || {},
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        console.error(`[Trial Check] RPC failed for ${userId} → ${newStatus}:`, err);
        return false;
      }
      return true;
    };

    try {
      const now = new Date();

      const profilesRes = await fetch(
        `${supabaseUrl}/rest/v1/profiles?select=id,email,subscription_status,trial_ends_at,trial_grace_ends_at,trial_activated,last_reminder_sent_at,email_notifications_enabled&trial_activated=eq.true`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
      );

      if (!profilesRes.ok) {
        console.error('[Trial Check] Failed to fetch profiles:', profilesRes.status);
        return { error: 'Failed to fetch profiles' };
      }

      const profiles = await profilesRes.json();
      let processedCount = 0;
      let expiredCount = 0;
      let cancelledCount = 0;
      let warningsCount = 0;

      for (const profile of profiles) {
        const trialEndsAt = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null;
        const graceEndsAt = profile.trial_grace_ends_at ? new Date(profile.trial_grace_ends_at) : null;
        const lastReminder = profile.last_reminder_sent_at ? new Date(profile.last_reminder_sent_at) : null;
        const hoursSinceLastReminder = lastReminder ? (now.getTime() - lastReminder.getTime()) / (1000 * 60 * 60) : 999;

        // 1. TRIAL ENDED → expire via RPC
        if (trialEndsAt && now >= trialEndsAt && profile.subscription_status === 'trialing') {
          const ok = await callRpc(profile.id, 'expired', 'Trial period ended', { trial_ends_at: profile.trial_ends_at });
          if (ok) {
            console.log(`[Trial Check] Expired trial for user ${profile.id}`);
            expiredCount++;
            processedCount++;
          }
        }
        // 2. GRACE PERIOD ENDED → cancel via RPC
        else if (graceEndsAt && now >= graceEndsAt && profile.subscription_status === 'expired' && profile.trial_activated) {
          const ok = await callRpc(profile.id, 'cancelled', 'Grace period after trial ended', { grace_ends_at: profile.trial_grace_ends_at });
          if (ok) {
            console.log(`[Trial Check] Cancelled post-trial grace for user ${profile.id}`);
            cancelledCount++;
            processedCount++;
          }
        }
        // 3. TRIAL ENDING SOON — send warning (respect notification prefs and rate limit)
        else if (trialEndsAt && profile.subscription_status === 'trialing' && profile.email_notifications_enabled) {
          const daysUntilExpiry = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntilExpiry <= 2 && daysUntilExpiry > 0 && hoursSinceLastReminder >= 23) {
            try {
              await fetch(`${supabaseUrl}/functions/v1/send-payment-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey },
                body: JSON.stringify({
                  type: 'subscription_expiring',
                  email: profile.email,
                  daysRemaining: daysUntilExpiry,
                  expiryDate: profile.trial_ends_at,
                  planName: 'Free Trial',
                }),
              });
              await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${profile.id}`, {
                method: 'PATCH',
                headers: rpcHeaders,
                body: JSON.stringify({ last_reminder_sent_at: now.toISOString() }),
              });
              console.log(`[Trial Check] Trial warning sent to ${profile.email}, ${daysUntilExpiry}d remaining`);
            } catch (emailErr) {
              console.error(`[Trial Check] Warning email failed for ${profile.email}:`, emailErr);
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

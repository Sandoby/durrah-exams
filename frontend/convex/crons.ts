import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

/**
 * Convex Cron Jobs
 * 
 * Scheduled tasks for cleanup, maintenance, and auto-submission.
 */

const crons = cronJobs();

// ============================================
// AUTO-SUBMIT EXPIRED EXAMS
// Every 30 seconds, check for exams where timer expired and auto-submit
// This ensures students don't lose their answers if they disconnect
// ============================================
crons.interval(
  "auto-submit expired exams",
  { seconds: 30 },
  internal.cronHandlers.autoSubmitExpiredExams
);

// ============================================
// CLEANUP STALE PROCTORING SESSIONS
// Every 2 minutes, mark sessions as disconnected if no heartbeat for 2 minutes
// ============================================
crons.interval(
  "cleanup stale sessions",
  { minutes: 2 },
  internal.cronHandlers.cleanupStaleSessions
);

// ============================================
// EXPIRE OLD PRESENCE RECORDS
// Every minute, mark presence as offline if no activity for 60 seconds
// ============================================
crons.interval(
  "expire presence",
  { minutes: 1 },
  internal.cronHandlers.expirePresence
);

// ============================================
// CLEANUP OLD LEADERBOARD ENTRIES
// Daily at midnight, remove entries older than 30 days
// ============================================
crons.daily(
  "cleanup old leaderboards",
  { hourUTC: 0, minuteUTC: 0 },
  internal.cronHandlers.cleanupOldLeaderboards
);

// ============================================
// CHECK SUBSCRIPTION EXPIRATIONS (REDUNDANT)
// Every 6 hours, check for expired subscriptions and send notifications
// This provides redundancy to the GitHub Actions cron job
// ============================================
crons.interval(
  "check subscription expirations",
  { hours: 6 },
  internal.cronHandlers.checkSubscriptionExpirations
);

// ============================================
// CHECK TRIAL EXPIRATIONS
// Every 6 hours, check for expired trials and grace periods
// Handles trial → expired → cancelled flow
// ============================================
crons.interval(
  "check trial expirations",
  { hours: 6 },
  internal.cronHandlers.checkTrialExpirations
);

// ============================================
// RECONCILE DODO SUBSCRIPTIONS
// Every 15 minutes, sync provider subscription states to Supabase profiles.
// This covers missed/delayed webhooks.
// ============================================
crons.interval(
  "reconcile dodo subscriptions",
  { minutes: 15 },
  internal.dodoPayments.reconcileSubscriptionsFromDodo,
  {}
);

// ============================================
// CLEANUP OLD WEBHOOK RECORDS
// Weekly, remove webhook deduplication records older than 7 days
// ============================================
crons.weekly(
  "cleanup old webhooks",
  { dayOfWeek: "monday", hourUTC: 3, minuteUTC: 0 },
  internal.webhookHelpers.cleanupOldWebhooks
);

export default crons;

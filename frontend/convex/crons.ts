import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

/**
 * Convex Cron Jobs
 * 
 * Scheduled tasks for cleanup and maintenance.
 */

const crons = cronJobs();

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

export default crons;

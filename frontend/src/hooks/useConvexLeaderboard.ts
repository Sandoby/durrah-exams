import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { CONVEX_FEATURES } from '../main';

/**
 * useConvexLeaderboard
 * 
 * Hook for kids mode real-time leaderboard:
 * - Subscribe to live score updates
 * - Get ranking and stats
 * 
 * Usage:
 * const { entries, stats, myEntry, isLoading } = useConvexLeaderboard({ quizCode: 'QUIZ123', studentId: 'student-456' });
 */

interface UseConvexLeaderboardOptions {
  quizCode: string;
  studentId?: string;
  limit?: number;
  enabled?: boolean;
}

export function useConvexLeaderboard(options: UseConvexLeaderboardOptions) {
  const {
    quizCode,
    studentId,
    limit = 50,
    enabled = CONVEX_FEATURES.leaderboard,
  } = options;

  // Subscribe to leaderboard - use "skip" for disabled
  const entries = useQuery(
    api.leaderboard.getLeaderboard,
    enabled ? { quiz_code: quizCode, limit } : 'skip'
  );

  // Get stats
  const stats = useQuery(
    api.leaderboard.getLeaderboardStats,
    enabled ? { quiz_code: quizCode } : 'skip'
  );

  // Get student's entry if provided
  const myEntry = useQuery(
    api.leaderboard.getStudentEntry,
    enabled && studentId ? { quiz_code: quizCode, student_id: studentId } : 'skip'
  );

  // Calculate student's rank
  type Entry = NonNullable<typeof entries>[number];
  const myRank = entries?.findIndex((e: Entry) => e.student_id === studentId);
  const myRankDisplay = myRank !== undefined && myRank >= 0 ? myRank + 1 : null;

  return {
    entries: entries ?? [],
    stats: stats ?? {
      total_entries: 0,
      average_score: 0,
      average_percentage: 0,
      highest_score: 0,
      perfect_scores: 0,
    },
    myEntry,
    myRank: myRankDisplay,
    isLoading: entries === undefined,
    enabled,
  };
}

/**
 * Utility: Format leaderboard entry for display
 */
export function formatLeaderboardEntry(entry: {
  nickname: string;
  avatar?: string;
  score: number;
  max_score: number;
  percentage: number;
  rank?: number;
  time_taken_seconds?: number;
}) {
  const timeFormatted = entry.time_taken_seconds
    ? formatTime(entry.time_taken_seconds)
    : null;

  return {
    ...entry,
    displayScore: `${entry.score}/${entry.max_score}`,
    displayPercentage: `${entry.percentage}%`,
    displayTime: timeFormatted,
    medal: getMedal(entry.rank),
  };
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getMedal(rank?: number): string | null {
  if (!rank) return null;
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return null;
}

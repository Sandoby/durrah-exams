import { useMemo } from 'react';
import { useConvexLeaderboard, formatLeaderboardEntry } from '../hooks/useConvexLeaderboard';
import { 
  Trophy, 
  Medal, 
  Award,
  TrendingUp,
  Users,
  Clock,
  RefreshCw,
  Crown
} from 'lucide-react';

interface ConvexLeaderboardProps {
  quizCode: string;
  examTitle?: string;
  currentUserId?: string;
  limit?: number;
  showStats?: boolean;
}

// Entry type from the hook
interface LeaderboardEntry {
  _id: string;
  student_id?: string;
  nickname: string;
  avatar?: string;
  score: number;
  max_score: number;
  percentage: number;
  rank?: number;
  time_taken_seconds?: number;
}

// Formatted entry type
interface FormattedEntry extends LeaderboardEntry {
  displayScore: string;
  displayPercentage: string;
  displayTime: string | null;
  medal: string | null;
}

/**
 * ConvexLeaderboard
 * 
 * Real-time leaderboard component powered by Convex.
 * Shows:
 * - Top N scores with live updates
 * - Current user's rank (highlighted)
 * - Completion times
 * - Animated rank changes
 */
export function ConvexLeaderboard({ 
  quizCode, 
  examTitle,
  currentUserId,
  limit = 10,
  showStats = true
}: ConvexLeaderboardProps) {
  const { 
    entries, 
    myEntry,
    myRank,
    stats, 
    isLoading, 
    enabled 
  } = useConvexLeaderboard({ quizCode, studentId: currentUserId, limit });

  // Format entries for display
  const formattedEntries = useMemo(() => {
    return (entries as LeaderboardEntry[]).slice(0, limit).map(entry => 
      formatLeaderboardEntry(entry) as FormattedEntry
    );
  }, [entries, limit]);

  const formattedUserEntry = useMemo(() => {
    return myEntry ? formatLeaderboardEntry(myEntry as LeaderboardEntry) as FormattedEntry : null;
  }, [myEntry]);

  if (!enabled) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-900/20 rounded-xl text-center">
        <Trophy className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500">Leaderboard is not enabled</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="h-7 w-7" />
              Leaderboard
            </h2>
            {examTitle && (
              <p className="text-white/80 mt-1">{examTitle}</p>
            )}
          </div>
          
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 rounded-full text-sm">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Live
          </div>
        </div>

        {/* Stats */}
        {showStats && stats && (
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.total_entries}</div>
              <div className="text-xs text-white/70 flex items-center justify-center gap-1">
                <Users className="h-3 w-3" />
                Participants
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.average_percentage}%</div>
              <div className="text-xs text-white/70 flex items-center justify-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Avg Score
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.perfect_scores}</div>
              <div className="text-xs text-white/70 flex items-center justify-center gap-1">
                <Crown className="h-3 w-3" />
                Perfect
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Top 3 Podium */}
      {formattedEntries.length >= 3 && (
        <div className="px-6 py-8 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900/50 dark:to-gray-800">
          <div className="flex items-end justify-center gap-4">
            {/* 2nd Place */}
            <PodiumPlace 
              entry={formattedEntries[1]} 
              place={2}
              isCurrentUser={formattedEntries[1]?.student_id === currentUserId}
            />
            
            {/* 1st Place */}
            <PodiumPlace 
              entry={formattedEntries[0]} 
              place={1}
              isCurrentUser={formattedEntries[0]?.student_id === currentUserId}
            />
            
            {/* 3rd Place */}
            <PodiumPlace 
              entry={formattedEntries[2]} 
              place={3}
              isCurrentUser={formattedEntries[2]?.student_id === currentUserId}
            />
          </div>
        </div>
      )}

      {/* Rest of the leaderboard */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {formattedEntries.slice(3).map((entry: FormattedEntry, index: number) => (
          <LeaderboardRow 
            key={entry._id} 
            entry={entry} 
            rank={index + 4}
            isCurrentUser={entry.student_id === currentUserId}
          />
        ))}

        {formattedEntries.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No submissions yet</p>
            <p className="text-sm">Be the first to complete the exam!</p>
          </div>
        )}
      </div>

      {/* Current user's position (if not in top N) */}
      {formattedUserEntry && myRank && myRank > limit && (
        <div className="border-t-2 border-indigo-500">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-center text-xs text-indigo-600 font-medium">
            Your Position
          </div>
          <LeaderboardRow 
            entry={formattedUserEntry}
            rank={myRank}
            isCurrentUser={true}
          />
        </div>
      )}
    </div>
  );
}

// Podium Place Component
function PodiumPlace({ 
  entry, 
  place, 
  isCurrentUser 
}: { 
  entry: FormattedEntry | undefined; 
  place: 1 | 2 | 3;
  isCurrentUser: boolean;
}) {
  const heights = { 1: 'h-28', 2: 'h-20', 3: 'h-16' };
  const colors = {
    1: 'from-yellow-400 to-yellow-600',
    2: 'from-gray-300 to-gray-500',
    3: 'from-orange-400 to-orange-600'
  };
  const icons = {
    1: <Crown className="h-6 w-6 text-yellow-500" />,
    2: <Medal className="h-5 w-5 text-gray-400" />,
    3: <Award className="h-5 w-5 text-orange-400" />
  };

  if (!entry) return <div className="w-24" />;

  return (
    <div className={`flex flex-col items-center ${place === 1 ? 'order-2' : place === 2 ? 'order-1' : 'order-3'}`}>
      {/* Avatar */}
      <div className={`relative mb-2 ${isCurrentUser ? 'ring-4 ring-indigo-500 ring-offset-2 rounded-full' : ''}`}>
        <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${colors[place]} flex items-center justify-center text-white text-xl font-bold shadow-lg`}>
          {entry.nickname.charAt(0).toUpperCase()}
        </div>
        <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-800 rounded-full p-0.5 shadow">
          {icons[place]}
        </div>
      </div>

      {/* Name */}
      <div className="text-sm font-medium text-center max-w-20 truncate">
        {entry.nickname}
      </div>

      {/* Score */}
      <div className="text-lg font-bold text-indigo-600">{entry.displayScore}</div>

      {/* Podium */}
      <div className={`w-20 ${heights[place]} bg-gradient-to-t ${colors[place]} rounded-t-lg mt-2 flex items-start justify-center pt-2`}>
        <span className="text-white text-2xl font-bold">{place}</span>
      </div>
    </div>
  );
}

// Leaderboard Row Component
function LeaderboardRow({ 
  entry, 
  rank, 
  isCurrentUser 
}: { 
  entry: FormattedEntry; 
  rank: number;
  isCurrentUser: boolean;
}) {
  return (
    <div className={`flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors ${
      isCurrentUser ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
    }`}>
      {/* Rank */}
      <div className="w-8 text-center">
        <span className={`font-bold ${rank <= 10 ? 'text-indigo-600' : 'text-gray-400'}`}>
          {rank}
        </span>
      </div>

      {/* Avatar */}
      <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-medium shadow ${
        isCurrentUser ? 'ring-2 ring-indigo-500' : ''
      }`}>
        {entry.nickname.charAt(0).toUpperCase()}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">
          {entry.nickname}
          {isCurrentUser && (
            <span className="ml-2 text-xs text-indigo-600 font-normal">(You)</span>
          )}
        </div>
        {entry.displayTime && (
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {entry.displayTime}
          </div>
        )}
      </div>

      {/* Score */}
      <div className="text-right">
        <div className="text-lg font-bold text-indigo-600">{entry.displayPercentage}</div>
        <div className="text-xs text-gray-400">
          {entry.displayScore}
        </div>
      </div>
    </div>
  );
}

// Compact Leaderboard for sidebars
export function CompactLeaderboard({ 
  quizCode, 
  currentUserId,
  limit = 5 
}: { 
  quizCode: string; 
  currentUserId?: string;
  limit?: number;
}) {
  const { entries, enabled, isLoading } = useConvexLeaderboard({ quizCode, studentId: currentUserId, limit });
  
  const topEntries = useMemo(() => {
    return (entries as LeaderboardEntry[]).slice(0, limit).map(entry => 
      formatLeaderboardEntry(entry) as FormattedEntry
    );
  }, [entries, limit]);

  if (!enabled || isLoading || topEntries.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-yellow-500" />
        <span className="font-medium text-sm">Top {limit}</span>
      </div>
      
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {topEntries.map((entry: FormattedEntry, index: number) => (
          <div 
            key={entry._id}
            className={`flex items-center gap-3 px-4 py-2 ${
              entry.student_id === currentUserId ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
            }`}
          >
            <span className={`w-5 text-sm font-medium ${
              index === 0 ? 'text-yellow-500' :
              index === 1 ? 'text-gray-400' :
              index === 2 ? 'text-orange-400' :
              'text-gray-400'
            }`}>
              {index + 1}
            </span>
            <span className="flex-1 text-sm truncate">{entry.nickname}</span>
            <span className="text-sm font-medium text-indigo-600">{entry.displayPercentage}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

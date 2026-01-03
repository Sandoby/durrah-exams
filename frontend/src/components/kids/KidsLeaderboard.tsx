import { useEffect, useMemo, useState } from 'react';
import { Trophy, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export type LeaderboardVisibility = 'hidden' | 'after_submit' | 'always';

type Row = {
  exam_id: string;
  nickname: string;
  percentage: number;
  score: number;
  max_score: number;
  submitted_at: string;
  submission_id: string;
};

export function KidsLeaderboard(props: {
  examId: string;
  nickname?: string;
  maxRows?: number;
  refreshKey?: string | number;
}) {
  const { examId, nickname, maxRows = 10, refreshKey } = props;

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const safeNick = useMemo(() => (nickname || '').trim(), [nickname]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: qErr } = await supabase
          .from('exam_leaderboard')
          .select('exam_id, nickname, percentage, score, max_score, submitted_at, submission_id')
          .eq('exam_id', examId)
          .order('percentage', { ascending: false })
          .order('score', { ascending: false })
          .order('submitted_at', { ascending: true })
          .limit(maxRows);

        if (qErr) throw qErr;
        if (!alive) return;
        setRows((data || []) as Row[]);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || 'Failed to load leaderboard');
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };

    if (examId) load();
    return () => {
      alive = false;
    };
  }, [examId, maxRows, refreshKey]);

  const myRank = useMemo(() => {
    if (!safeNick) return null;
    const idx = rows.findIndex((r) => r.nickname?.trim() === safeNick);
    return idx >= 0 ? idx + 1 : null;
  }, [rows, safeNick]);

  return (
    <div className="mt-4 rounded-3xl border-4 border-yellow-300 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 p-6 text-white shadow-2xl">
      <div className="flex items-center gap-3 justify-center">
        <Trophy className="h-8 w-8 text-yellow-300 animate-pulse" />
        <h3 className="text-2xl font-black">🏆 Leaderboard</h3>
      </div>
      {myRank && (
        <div className="mt-3 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/30 backdrop-blur border-2 border-white px-4 py-2 text-sm font-black">
            ⭐ Your Rank: #{myRank}
          </span>
        </div>
      )}

      {loading && (
        <div className="mt-4 flex items-center gap-2 text-white/80">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      )}

      {!loading && error && <div className="mt-3 text-sm text-red-200">{error}</div>}

      {!loading && !error && rows.length === 0 && <div className="mt-3 text-sm text-white/80">No scores yet.</div>}

      {!loading && !error && rows.length > 0 && (
        <ol className="mt-4 space-y-3">
          {rows.map((r, i) => {
            const rank = i + 1;
            const isMe = safeNick && r.nickname?.trim() === safeNick;
            const displayName = r.nickname?.trim() || 'Player';
            return (
              <li
                key={r.submission_id}
                className={`flex items-center gap-4 rounded-2xl p-4 transform transition-all ${
                  isMe 
                    ? 'bg-white border-4 border-yellow-300 scale-105 shadow-xl' 
                    : rank <= 3
                    ? 'bg-white/90 border-2 border-white shadow-lg'
                    : 'bg-white/80 border-2 border-white/50'
                }`}
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-full text-xl font-black ${
                  rank === 1 ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-900' :
                  rank === 2 ? 'bg-gradient-to-br from-gray-200 to-gray-400 text-gray-700' :
                  rank === 3 ? 'bg-gradient-to-br from-orange-300 to-orange-500 text-orange-900' :
                  'bg-gradient-to-br from-purple-200 to-purple-400 text-purple-900'
                }`}>
                  {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`truncate font-black ${
                    isMe ? 'text-purple-900 text-lg' : 'text-gray-900 text-base'
                  }`}>
                    {displayName} {isMe && '(You!)'}
                  </div>
                  <div className="text-sm font-bold text-gray-700">
                    {r.score} / {r.max_score} points
                  </div>
                </div>
                <div className={`text-right ${
                  isMe ? 'text-2xl' : 'text-xl'
                } font-black bg-gradient-to-br from-purple-600 to-pink-600 bg-clip-text text-transparent`}>
                  {Math.round(r.percentage)}%
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

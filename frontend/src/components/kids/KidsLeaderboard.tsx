import { useEffect, useMemo, useState } from 'react';
import { Trophy, Medal, Loader2 } from 'lucide-react';
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

function medalIcon(rank: number) {
  if (rank === 1) return <Medal className="h-4 w-4 text-yellow-400" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-gray-300" />;
  if (rank === 3) return <Medal className="h-4 w-4 text-amber-700" />;
  return <span className="inline-flex h-4 w-4 items-center justify-center text-xs font-bold text-white/80">{rank}</span>;
}

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
    <div className="mt-4 rounded-2xl border border-white/15 bg-white/10 p-4 text-white shadow-xl backdrop-blur">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-yellow-300" />
        <h3 className="text-base font-extrabold">Leaderboard</h3>
        {myRank && (
          <span className="ml-auto rounded-full bg-white/15 px-3 py-1 text-xs font-bold">Your rank: #{myRank}</span>
        )}
      </div>

      {loading && (
        <div className="mt-4 flex items-center gap-2 text-white/80">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      )}

      {!loading && error && <div className="mt-3 text-sm text-red-200">{error}</div>}

      {!loading && !error && rows.length === 0 && <div className="mt-3 text-sm text-white/80">No scores yet.</div>}

      {!loading && !error && rows.length > 0 && (
        <ol className="mt-3 space-y-2">
          {rows.map((r, i) => {
            const rank = i + 1;
            const isMe = safeNick && r.nickname?.trim() === safeNick;
            return (
              <li
                key={r.submission_id}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 ${isMe ? 'bg-white/20' : 'bg-white/10'}`}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black/20">
                  {medalIcon(rank)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{r.nickname || 'Anonymous'}</div>
                  <div className="text-xs text-white/70">
                    {Math.round(r.percentage)}% ({r.score}/{r.max_score})
                  </div>
                </div>
                <div className="text-sm font-extrabold">{Math.round(r.percentage)}%</div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

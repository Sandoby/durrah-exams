import { useEffect, useMemo, useState } from 'react';
import { Trophy, Loader2, Star, Sparkles } from 'lucide-react';
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
    <div className="mt-8 relative animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Decorative Glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-purple-600/20 blur opacity-50 rounded-[3rem]" />

      <div className="relative glass-panel rounded-[2.5rem] border-white/10 p-6 sm:p-10 shadow-3xl overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center gap-4 justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-yellow-500/10 rounded-2xl flex items-center justify-center border border-yellow-500/20">
              <Trophy className="h-6 w-6 text-yellow-500 animate-bounce" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Leaderboard</h3>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest leading-none">Global Mission Rankings</p>
            </div>
          </div>

          {myRank && (
            <div className="flex items-center gap-2 px-6 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-100 font-black text-sm">
              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
              YOUR POSITION: #{myRank}
            </div>
          )}
        </div>

        {loading && (
          <div className="py-12 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
            <p className="text-xs font-black text-indigo-200/40 uppercase tracking-[0.2em]">Synchronizing Data...</p>
          </div>
        )}

        {!loading && error && (
          <div className="py-12 text-center">
            <p className="text-red-400/80 font-bold tracking-tight">{error}</p>
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="py-12 text-center">
            <div className="h-16 w-16 mx-auto bg-white/5 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-white/10" />
            </div>
            <p className="text-indigo-200/30 font-black uppercase tracking-widest text-sm">No mission records found.</p>
          </div>
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="space-y-4">
            {rows.map((r, i) => {
              const rank = i + 1;
              const isMe = safeNick && r.nickname?.trim() === safeNick;
              const displayName = r.nickname?.trim() || 'Player';

              return (
                <div
                  key={r.submission_id}
                  className={`group relative overflow-hidden transition-all duration-300 rounded-[1.5rem] border-2 ${isMe
                      ? 'bg-indigo-500/10 border-indigo-500 shadow-lg shadow-indigo-500/20'
                      : 'bg-white/5 border-transparent hover:bg-white/[0.08] hover:border-white/10'
                    }`}
                >
                  <div className="flex items-center gap-4 p-4 relative z-10">
                    {/* Rank Indicator */}
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-xl font-black shadow-inner ${rank === 1 ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-900 ring-4 ring-yellow-500/20' :
                        rank === 2 ? 'bg-gradient-to-br from-indigo-200 to-indigo-400 text-indigo-900' :
                          rank === 3 ? 'bg-gradient-to-br from-orange-300 to-orange-500 text-orange-900' :
                            'bg-white/5 text-white/30 border border-white/10'
                      }`}>
                      {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`font-black uppercase tracking-tight truncate ${isMe ? 'text-white text-lg' : 'text-indigo-100/90'}`}>
                          {displayName}
                        </span>
                        {isMe && <span className="bg-indigo-500 text-[8px] font-black text-white px-2 py-0.5 rounded-full uppercase">YOU</span>}
                      </div>
                      <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest flex items-center gap-3">
                        <span>{r.score}/{r.max_score} XP</span>
                        <div className="w-1 h-1 rounded-full bg-white/10" />
                        <span>{new Date(r.submitted_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Percentage */}
                    <div className="text-right">
                      <div className={`text-2xl font-black ${isMe ? 'text-white' : 'text-transparent bg-clip-text bg-gradient-to-br from-indigo-300 to-purple-400 group-hover:from-white group-hover:to-white transition-all'}`}>
                        {Math.round(r.percentage)}%
                      </div>
                      <div className="h-1 w-12 bg-white/5 rounded-full ml-auto mt-1 overflow-hidden">
                        <div className={`h-full bg-indigo-500/50 rounded-full transition-all`} style={{ width: `${r.percentage}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Sparkles, Gamepad2, Ticket, Stars, PartyPopper } from 'lucide-react';
import { supabase } from '../lib/supabase';

type LeaderboardVisibility = 'hidden' | 'after_submit' | 'always';

export default function KidsLanding() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const normalizedCode = useMemo(() => code.trim().toUpperCase().replace(/\s+/g, ''), [code]);

  const handleEnter = async () => {
    const nick = nickname.trim();
    if (!nick) {
      toast.error('Please enter a nickname');
      return;
    }
    if (!normalizedCode) {
      toast.error('Please enter the quiz code');
      return;
    }

    setIsLoading(true);
    try {
      // Resolve exam by quiz_code
      const { data: exam, error } = await supabase
        .from('exams')
        .select('id, title, settings')
        .eq('quiz_code', normalizedCode)
        .single();

      if (error || !exam) {
        toast.error('Invalid code');
        return;
      }

      const settings: any = exam.settings || {};
      const childModeEnabled = !!settings.child_mode_enabled;
      if (!childModeEnabled) {
        toast.error('This quiz is not enabled for kids mode');
        return;
      }

      const attemptLimit: number | null = settings.attempt_limit ?? null;

      // Check attempts by nickname (MVP). Backend should also enforce.
      if (attemptLimit && attemptLimit > 0) {
        const { count, error: countError } = await supabase
          .from('submissions')
          .select('id', { count: 'exact', head: true })
          .eq('exam_id', exam.id)
          .eq('child_mode', true)
          .eq('nickname', nick);

        if (!countError && typeof count === 'number' && count >= attemptLimit) {
          toast.error(`No attempts left (limit: ${attemptLimit})`);
          // Still allow them to view leaderboard if tutor enabled it
          const visibility: LeaderboardVisibility = settings.leaderboard_visibility || 'hidden';
          navigate(`/kids/quiz/${exam.id}?code=${encodeURIComponent(normalizedCode)}&nick=${encodeURIComponent(nick)}&kid=1&locked=1&lb=${encodeURIComponent(visibility)}`);
          return;
        }
      }

      navigate(`/kids/quiz/${exam.id}?code=${encodeURIComponent(normalizedCode)}&nick=${encodeURIComponent(nick)}&kid=1`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to open quiz');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-rose-200 via-sky-100 to-lime-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Confetti dots */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute left-6 top-10 h-3 w-3 rounded-full bg-pink-500" />
        <div className="absolute left-24 top-24 h-2 w-2 rounded-full bg-indigo-500" />
        <div className="absolute left-1/3 top-16 h-2.5 w-2.5 rounded-full bg-yellow-400" />
        <div className="absolute right-10 top-20 h-3 w-3 rounded-full bg-emerald-400" />
        <div className="absolute right-24 top-40 h-2 w-2 rounded-full bg-purple-500" />
        <div className="absolute left-16 bottom-24 h-3 w-3 rounded-full bg-sky-500" />
        <div className="absolute left-1/2 bottom-12 h-2 w-2 rounded-full bg-orange-400" />
        <div className="absolute right-16 bottom-20 h-3 w-3 rounded-full bg-rose-500" />
      </div>

      {/* Big soft blobs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-pink-400/35 blur-3xl" />
      <div className="pointer-events-none absolute top-10 -right-24 h-[28rem] w-[28rem] rounded-full bg-indigo-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-1/3 h-[28rem] w-[28rem] rounded-full bg-lime-400/25 blur-3xl" />

      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          {/* Left: Hero */}
          <div className="order-2 lg:order-1">
            <div className="bg-white/75 dark:bg-gray-900/60 backdrop-blur border border-white/60 dark:border-gray-800 rounded-3xl shadow-2xl p-6 sm:p-10">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow">
                  <Gamepad2 className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white leading-tight">
                    Kids Quiz Time!
                  </h1>
                  <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">
                    Pick a nickname, enter the code, and play.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl bg-pink-50 border border-pink-200 p-4">
                  <div className="flex items-center gap-2 text-pink-700 font-extrabold">
                    <PartyPopper className="h-5 w-5" />
                    Fun
                  </div>
                  <p className="mt-1 text-xs text-pink-700/80">Bright & friendly</p>
                </div>
                <div className="rounded-2xl bg-indigo-50 border border-indigo-200 p-4">
                  <div className="flex items-center gap-2 text-indigo-700 font-extrabold">
                    <Stars className="h-5 w-5" />
                    Stars
                  </div>
                  <p className="mt-1 text-xs text-indigo-700/80">Beat your score</p>
                </div>
                <div className="rounded-2xl bg-yellow-50 border border-yellow-200 p-4">
                  <div className="flex items-center gap-2 text-yellow-800 font-extrabold">
                    <Sparkles className="h-5 w-5" />
                    Go!
                  </div>
                  <p className="mt-1 text-xs text-yellow-800/80">Enter and play</p>
                </div>
              </div>

              {/* Sticker row */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/60 dark:border-gray-800 bg-white/60 dark:bg-gray-950/20 p-4">
                <div className="flex items-center gap-2 rounded-xl bg-pink-100/80 border border-pink-200 px-3 py-2">
                  <PartyPopper className="h-5 w-5 text-pink-700" />
                  <span className="text-sm font-extrabold text-pink-800">High score!</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-indigo-100/80 border border-indigo-200 px-3 py-2">
                  <Stars className="h-5 w-5 text-indigo-700" />
                  <span className="text-sm font-extrabold text-indigo-800">Collect stars</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-yellow-100/80 border border-yellow-200 px-3 py-2">
                  <Sparkles className="h-5 w-5 text-yellow-700" />
                  <span className="text-sm font-extrabold text-yellow-800">Let’s go!</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Form */}
          <div className="order-1 lg:order-2">
            <div className="bg-white/85 dark:bg-gray-900/70 backdrop-blur border border-white/60 dark:border-gray-800 rounded-3xl shadow-2xl p-6 sm:p-10">
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">Enter the game</h2>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">Nickname shows on leaderboard (if tutor allows).</p>

              <div className="space-y-4 mt-6">
                <div>
                  <label className="block text-sm font-extrabold text-gray-800 dark:text-gray-200 mb-1">Nickname</label>
                  <input
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full rounded-2xl border-2 border-pink-200 focus:border-pink-400 focus:ring-pink-300/40 dark:border-gray-700 dark:focus:border-pink-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-3 focus:outline-none focus:ring-4"
                    placeholder="e.g. SuperTiger"
                  />
                </div>

                <div>
                  <label className="block text-sm font-extrabold text-gray-800 dark:text-gray-200 mb-1">Quiz Code</label>
                  <div className="relative">
                    <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-600" />
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full rounded-2xl border-2 border-indigo-200 focus:border-indigo-400 focus:ring-indigo-300/40 dark:border-gray-700 dark:focus:border-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white pl-12 pr-4 py-3 tracking-wider uppercase focus:outline-none focus:ring-4"
                      placeholder="KID-ABC123"
                    />
                  </div>
                  {normalizedCode && (
                    <p className="mt-2 text-xs text-gray-700 dark:text-gray-300">
                      Using code: <span className="font-mono font-extrabold">{normalizedCode}</span>
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleEnter}
                  disabled={isLoading}
                  className="w-full rounded-2xl bg-gradient-to-r from-pink-500 via-indigo-600 to-purple-600 hover:from-pink-600 hover:via-indigo-700 hover:to-purple-700 text-white font-extrabold py-3 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Sparkles className="h-5 w-5" />
                  {isLoading ? 'Opening…' : 'Play Now'}
                </button>

                <p className="text-xs text-gray-700 dark:text-gray-300">
                  If you can’t enter, ask your tutor for the correct code.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}






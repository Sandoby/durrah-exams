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
    <div className="min-h-screen overflow-hidden bg-[#7C3AED]">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Left hero (matches the reference vibe) */}
          <div>
            <div className="text-yellow-300 font-extrabold tracking-wide text-sm sm:text-base">DURRAH KIDS MODE</div>
            <h1 className="mt-4 text-yellow-300 font-extrabold leading-[0.95] text-5xl sm:text-6xl lg:text-7xl">
              Kids Quiz
              <br />
              Challenge
            </h1>
            <p className="mt-4 text-white/90 text-base sm:text-lg max-w-xl">
              Enter your nickname and the quiz code from your tutor to start playing.
            </p>

            {/* Decorative underline */}
            <div className="mt-8 h-1.5 w-40 rounded-full bg-white/25" />

            {/* Form card */}
            <div className="mt-8 rounded-3xl bg-white/10 backdrop-blur border border-white/20 p-5 sm:p-6 max-w-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-extrabold text-white mb-1">Nickname</label>
                  <input
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full rounded-2xl bg-white/95 text-gray-900 px-4 py-3 font-semibold border-2 border-transparent focus:border-yellow-300 focus:outline-none"
                    placeholder="e.g. SuperTiger"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-extrabold text-white mb-1">Quiz Code</label>
                  <div className="relative">
                    <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#7C3AED]" />
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full rounded-2xl bg-white/95 text-gray-900 pl-12 pr-4 py-3 font-extrabold tracking-wider uppercase border-2 border-transparent focus:border-yellow-300 focus:outline-none"
                      placeholder="KID-ABC123"
                    />
                  </div>
                  {normalizedCode && (
                    <p className="mt-2 text-xs text-white/85">
                      Using code: <span className="font-mono font-extrabold">{normalizedCode}</span>
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={handleEnter}
                    disabled={isLoading}
                    className="w-full rounded-2xl bg-yellow-300 text-[#4C1D95] hover:bg-yellow-200 font-extrabold py-3 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Sparkles className="h-5 w-5" />
                    {isLoading ? 'Opening…' : 'Start لعبة!'}
                  </button>
                  <p className="mt-3 text-xs text-white/85">
                    Ask your tutor for the code if you don’t have it.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right “illustration” area */}
          <div className="relative">
            <div className="absolute -top-10 -left-10 h-28 w-28 rounded-full bg-yellow-300/30 blur-2xl" />
            <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-white/15 blur-3xl" />

            <div className="rounded-3xl bg-white/10 border border-white/20 backdrop-blur p-6 sm:p-8">
              <div className="text-white/80 font-extrabold tracking-wider">PLAY • LEARN • WIN</div>
              <div className="mt-6 aspect-[16/10] rounded-2xl bg-gradient-to-br from-white/20 to-white/5 border border-white/20 flex items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-yellow-300 flex items-center justify-center shadow">
                    <Gamepad2 className="h-7 w-7 text-[#4C1D95]" />
                  </div>
                  <p className="mt-4 text-white font-extrabold">Your illustration goes here</p>
                  <p className="text-white/75 text-sm">(We can replace this with a real image later)</p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-white font-semibold">
                  <Stars className="h-4 w-4" /> Stars
                </span>
                <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-white font-semibold">
                  <PartyPopper className="h-4 w-4" /> Leaderboard
                </span>
                <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-white font-semibold">
                  <Sparkles className="h-4 w-4" /> Fun
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}






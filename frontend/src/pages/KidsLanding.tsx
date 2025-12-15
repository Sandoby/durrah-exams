import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Sparkles, Ticket, Stars, PartyPopper } from 'lucide-react';
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
    <div className="min-h-screen overflow-hidden bg-gradient-to-br from-[#FF6B9D] via-[#C94FF9] to-[#7C3AED]">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        {/* Vertical centered layout */}
        <div className="flex flex-col items-center text-center">
          {/* Top badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur border border-white/30 px-4 py-2">
            <Sparkles className="h-4 w-4 text-yellow-300" />
            <span className="text-white font-extrabold tracking-wide text-xs sm:text-sm">DURRAH KIDS MODE</span>
            <Sparkles className="h-4 w-4 text-yellow-300" />
          </div>

          {/* Main title */}
          <h1 className="mt-6 text-white font-black leading-tight text-5xl sm:text-6xl md:text-7xl drop-shadow-lg">
            🎈 Kids Quiz
            <br />
            <span className="text-yellow-300">Challenge!</span>
          </h1>

          <p className="mt-4 text-white/95 text-lg sm:text-xl font-semibold max-w-md">
            Enter your nickname and quiz code to start playing! 🎮
          </p>

          {/* Decorative stars */}
          <div className="mt-4 flex gap-3">
            <Stars className="h-8 w-8 text-yellow-300 animate-pulse" />
            <PartyPopper className="h-8 w-8 text-pink-300 animate-bounce" />
            <Stars className="h-8 w-8 text-yellow-300 animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>

          {/* Form card - colorful gradient */}
          <div className="mt-8 w-full max-w-md rounded-3xl bg-gradient-to-br from-white/95 to-white/90 backdrop-blur border-4 border-white shadow-2xl p-6 sm:p-8">
            <div className="space-y-5">
              {/* Nickname input */}
              <div>
                <label className="block text-left text-sm font-black text-purple-900 mb-2 flex items-center gap-2">
                  <span className="text-2xl">🦁</span>
                  Your Cool Nickname
                </label>
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 text-gray-900 px-5 py-4 font-bold text-lg border-3 border-purple-300 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-200 shadow-inner"
                  placeholder="SuperTiger 🐯"
                />
              </div>

              {/* Quiz code input */}
              <div>
                <label className="block text-left text-sm font-black text-purple-900 mb-2 flex items-center gap-2">
                  <span className="text-2xl">🎫</span>
                  Quiz Code
                </label>
                <div className="relative">
                  <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-purple-600" />
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full rounded-2xl bg-gradient-to-r from-yellow-50 to-orange-50 text-gray-900 pl-14 pr-5 py-4 font-black text-lg tracking-wider uppercase border-3 border-yellow-300 focus:border-yellow-500 focus:outline-none focus:ring-4 focus:ring-yellow-200 shadow-inner"
                    placeholder="KID-ABC123"
                  />
                </div>
                {normalizedCode && (
                  <p className="mt-2 text-xs text-purple-700 font-bold text-left">
                    ✅ Code: <span className="font-mono bg-purple-100 px-2 py-1 rounded">{normalizedCode}</span>
                  </p>
                )}
              </div>

              {/* Start button - big and colorful */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleEnter}
                  disabled={isLoading}
                  className="w-full rounded-2xl bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500 hover:from-yellow-300 hover:via-orange-300 hover:to-pink-400 text-white font-black py-5 text-xl shadow-2xl disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3 transform hover:scale-105 transition-transform"
                >
                  <Sparkles className="h-6 w-6" />
                  {isLoading ? 'Loading...' : 'START QUIZ! 🚀'}
                </button>
              </div>

              <p className="text-xs text-purple-600 font-semibold">
                💡 Ask your teacher for the code if you don't have it!
              </p>
            </div>
          </div>

          {/* Bottom fun badges */}
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur border border-white/30 px-4 py-2 text-white font-bold text-sm">
              ⭐ Earn Stars
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur border border-white/30 px-4 py-2 text-white font-bold text-sm">
              🏆 Win Prizes
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur border border-white/30 px-4 py-2 text-white font-bold text-sm">
              🎉 Have Fun
            </span>
          </div>

          {/* Decorative elements */}
          <div className="mt-8 text-6xl animate-bounce">🎮</div>
        </div>
      </div>

      {/* Background decorative blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 h-32 w-32 rounded-full bg-yellow-300/30 blur-3xl" />
        <div className="absolute top-1/4 right-20 h-40 w-40 rounded-full bg-pink-300/20 blur-3xl" />
        <div className="absolute bottom-20 left-1/4 h-36 w-36 rounded-full bg-purple-300/25 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
      </div>
    </div>
  );
}






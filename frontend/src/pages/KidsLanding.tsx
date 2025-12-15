import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Sparkles, Ticket, Lock } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header with logo */}
        <div className="pt-6 sm:pt-8 pb-4">
          <div className="max-w-2xl mx-auto px-4 flex flex-col items-center">
            {/* Logo */}
            <img 
              src="/illustrations/logo.jpeg" 
              alt="Durrah Logo" 
              className="h-16 sm:h-20 w-auto drop-shadow-lg"
            />
            
            {/* Kids Mode Badge */}
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500/20 to-blue-500/20 backdrop-blur border border-emerald-500/30 px-4 py-2">
              <Sparkles className="h-4 w-4 text-emerald-400 animate-spin" style={{ animationDuration: '3s' }} />
              <span className="text-emerald-300 font-bold text-xs sm:text-sm tracking-wide">KIDS QUIZ MODE</span>
              <Sparkles className="h-4 w-4 text-emerald-400 animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }} />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="max-w-xl w-full">
            {/* Headline */}
            <div className="text-center mb-8">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-2 leading-tight">
                Ready to Take the
                <span className="block bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Challenge?
                </span>
              </h1>
              <p className="text-gray-400 text-lg sm:text-xl max-w-md mx-auto mt-4">
                Enter your details below and show us what you've got! 🎯
              </p>
            </div>

            {/* Form Card */}
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 sm:p-10 shadow-2xl">
              <div className="space-y-6">
                {/* Nickname Input */}
                <div>
                  <label className="block text-sm font-bold text-emerald-300 mb-3 flex items-center gap-2">
                    <span className="text-xl">🎭</span>
                    Choose Your Player Name
                  </label>
                  <input
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full rounded-2xl bg-white/5 border-2 border-emerald-500/30 hover:border-emerald-500/50 focus:border-emerald-500 focus:bg-white/10 text-white px-6 py-3.5 font-semibold text-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                    placeholder="Enter your nickname"
                  />
                  <p className="mt-2 text-xs text-gray-400">Make it fun and unique! 🌟</p>
                </div>

                {/* Quiz Code Input */}
                <div>
                  <label className="block text-sm font-bold text-blue-300 mb-3 flex items-center gap-2">
                    <span className="text-xl">🎟️</span>
                    Quiz Code
                  </label>
                  <div className="relative">
                    <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-400" />
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full rounded-2xl bg-white/5 border-2 border-blue-500/30 hover:border-blue-500/50 focus:border-blue-500 focus:bg-white/10 text-white pl-14 pr-6 py-3.5 font-black text-lg tracking-wider uppercase placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                      placeholder="KID-ABC123"
                    />
                  </div>
                  {normalizedCode && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-emerald-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-mono">{normalizedCode}</span>
                    </div>
                  )}
                </div>

                {/* Start Button */}
                <button
                  type="button"
                  onClick={handleEnter}
                  disabled={isLoading || !nickname.trim() || !normalizedCode}
                  className="w-full mt-8 rounded-2xl bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 hover:from-emerald-400 hover:via-blue-400 hover:to-purple-400 disabled:from-gray-600 disabled:via-gray-600 disabled:to-gray-600 text-white font-black py-4 text-lg shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transform hover:scale-105 active:scale-95 transition-all duration-200"
                >
                  {isLoading ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <span>🚀 START QUIZ</span>
                    </>
                  )}
                </button>

                {/* Helper text */}
                <p className="text-center text-sm text-gray-400">
                  <Lock className="inline h-4 w-4 mr-1" />
                  Ask your teacher if you need the code
                </p>
              </div>
            </div>

            {/* Info Cards */}
            <div className="mt-10 grid grid-cols-3 gap-3">
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                <div className="text-3xl mb-2">⭐</div>
                <p className="text-xs font-bold text-emerald-300">Earn Points</p>
              </div>
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                <div className="text-3xl mb-2">🏆</div>
                <p className="text-xs font-bold text-blue-300">Get Ranked</p>
              </div>
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                <div className="text-3xl mb-2">🎉</div>
                <p className="text-xs font-bold text-purple-300">Have Fun</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="py-6 text-center">
          <p className="text-gray-500 text-xs">
            Powered by <span className="text-emerald-400 font-bold">Durrah</span> • Professional Learning Platform
          </p>
        </div>
      </div>
    </div>
  );
}






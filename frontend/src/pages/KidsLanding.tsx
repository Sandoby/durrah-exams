import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Sparkles, Ticket, Lock, Rocket, Trophy, Gamepad2 } from 'lucide-react';
import { Logo } from '../components/Logo';
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

      if (attemptLimit && attemptLimit > 0) {
        const { count, error: countError } = await supabase
          .from('submissions')
          .select('id', { count: 'exact', head: true })
          .eq('exam_id', exam.id)
          .eq('child_mode', true)
          .eq('nickname', nick);

        if (!countError && typeof count === 'number' && count >= attemptLimit) {
          toast.error(`No attempts left (limit: ${attemptLimit})`);
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
    <div dir="ltr" className="min-h-screen bg-gradient-to-b from-sky-400 via-sky-300 to-amber-100 overflow-hidden relative">
      {/* Custom animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(3deg); }
        }
        @keyframes float-reverse {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(-3deg); }
        }
        @keyframes bounce-soft {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
        .animate-float { animation: float 4s ease-in-out infinite; }
        .animate-float-reverse { animation: float-reverse 5s ease-in-out infinite; }
        .animate-bounce-soft { animation: bounce-soft 2s ease-in-out infinite; }
        .animate-wiggle { animation: wiggle 3s ease-in-out infinite; }
      `}</style>

      {/* Decorative clouds */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Fluffy clouds */}
        <div className="absolute top-10 left-10 w-32 h-16 bg-white/60 rounded-full blur-sm" />
        <div className="absolute top-8 left-20 w-24 h-12 bg-white/50 rounded-full blur-sm" />
        <div className="absolute top-20 right-20 w-40 h-20 bg-white/50 rounded-full blur-sm hidden sm:block" />
        <div className="absolute top-16 right-32 w-28 h-14 bg-white/40 rounded-full blur-sm hidden sm:block" />
        <div className="absolute bottom-40 left-1/4 w-36 h-18 bg-white/30 rounded-full blur-md hidden md:block" />
        
        {/* Sun glow */}
        <div className="absolute -top-20 right-1/4 w-60 h-60 bg-yellow-300/40 rounded-full blur-3xl" />
        
        {/* Floating Illustrations */}
        <img 
          src="/kids/image-1765886149420.png" 
          alt="" 
          className="absolute left-1 sm:left-4 md:left-8 top-16 w-20 sm:w-28 md:w-36 lg:w-44 animate-float drop-shadow-xl opacity-60 sm:opacity-100"
          style={{ animationDelay: '0s' }}
        />
        <img 
          src="/kids/image-1765886162298.png" 
          alt="" 
          className="absolute right-1 sm:right-4 md:right-8 top-14 w-16 sm:w-24 md:w-32 lg:w-36 animate-float-reverse drop-shadow-xl opacity-60 sm:opacity-100"
          style={{ animationDelay: '1s' }}
        />
        <img 
          src="/kids/image-1765886176188.png" 
          alt="" 
          className="absolute right-4 sm:right-16 bottom-28 w-24 sm:w-32 md:w-40 animate-float drop-shadow-xl hidden sm:block"
          style={{ animationDelay: '0.5s' }}
        />
        <img 
          src="/kids/image-1765886185739.png" 
          alt="" 
          className="absolute left-4 sm:left-16 bottom-24 w-24 sm:w-32 md:w-40 animate-float-reverse drop-shadow-xl hidden md:block"
          style={{ animationDelay: '2s' }}
        />
        <img 
          src="/kids/image-1765886195936.png" 
          alt="" 
          className="absolute right-1/4 top-1/4 w-20 sm:w-28 md:w-32 animate-float drop-shadow-xl hidden lg:block"
          style={{ animationDelay: '1.5s' }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 px-3 sm:px-4 py-3 sm:py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2 bg-white/80 backdrop-blur-md rounded-full px-3 sm:px-4 py-1.5 sm:py-2 shadow-md border border-white/50">
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
            <span className="text-xs sm:text-sm font-bold text-sky-700">Kids Quiz</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 shadow-lg">
            <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
            <span className="text-xs sm:text-sm font-bold text-white">Fun Learning</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-3 sm:px-4 pb-6 sm:pb-8">
        <div className="max-w-md mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-4 sm:mb-6">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-white/80 backdrop-blur-md rounded-full px-3 sm:px-5 py-2 sm:py-2.5 mb-3 sm:mb-4 shadow-md border border-white/50">
              <Gamepad2 className="h-4 w-4 sm:h-5 sm:w-5 text-sky-500" />
              <span className="text-xs sm:text-sm font-bold text-sky-700">Ready to Play?</span>
            </div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-sky-800 drop-shadow-sm mb-2 sm:mb-3 leading-tight">
              Let's Start the
              <span className="block bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 bg-clip-text text-transparent">
                Quiz Adventure!
              </span>
            </h1>
            <p className="text-sky-700/80 text-xs sm:text-base max-w-sm mx-auto px-2">
              Enter your name and the secret code to begin your fun journey!
            </p>
          </div>

          {/* Entry Card */}
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl p-4 sm:p-8 border-2 sm:border-4 border-white relative overflow-hidden">
            {/* Card decorations */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-200/50 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-sky-200/50 rounded-full blur-2xl" />
            
            {/* Corner decoration */}
            <img 
              src="/kids/image-1765886214428.png" 
              alt="" 
              className="absolute -top-6 -left-6 w-16 h-16 sm:w-20 sm:h-20"
            />

            <div className="relative space-y-4 sm:space-y-5">
              {/* Nickname Input */}
              <div>
                <label className="block text-sm font-bold text-sky-700 mb-2 flex items-center gap-2">
                  <span className="w-7 h-7 bg-gradient-to-br from-sky-400 to-blue-500 rounded-lg flex items-center justify-center shadow-md">
                    <Sparkles className="h-4 w-4 text-white" />
                  </span>
                  Your Super Name
                </label>
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full rounded-2xl border-2 border-sky-200 bg-sky-50/50 px-4 py-3.5 sm:py-4 text-sky-800 text-base sm:text-lg font-medium placeholder-sky-400 focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all"
                  placeholder="e.g., SuperStar"
                />
              </div>

              {/* Code Input */}
              <div>
                <label className="block text-sm font-bold text-sky-700 mb-2 flex items-center gap-2">
                  <span className="w-7 h-7 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shadow-md">
                    <span className="text-sm">🎟️</span>
                  </span>
                  Secret Code
                </label>
                <div className="relative">
                  <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full rounded-2xl border-2 border-amber-200 bg-amber-50/50 pl-12 sm:pl-14 pr-4 py-3.5 sm:py-4 text-sky-800 text-base sm:text-lg font-bold tracking-widest uppercase placeholder-amber-400 focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100 transition-all"
                    placeholder="KID-ABC123"
                  />
                </div>
                {normalizedCode && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-sky-600 font-semibold">Code:</span>
                    <span className="font-mono text-sm bg-gradient-to-r from-sky-100 to-amber-100 text-sky-700 px-3 py-1 rounded-lg font-bold border border-sky-200">
                      {normalizedCode}
                    </span>
                  </div>
                )}
              </div>

              {/* Launch Button */}
              <button
                type="button"
                onClick={handleEnter}
                disabled={isLoading || !nickname.trim() || !normalizedCode}
                className="w-full rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 hover:from-amber-500 hover:via-orange-600 hover:to-pink-600 text-white font-black text-lg sm:text-xl py-4 sm:py-5 shadow-xl shadow-orange-300/50 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-3"
              >
                {isLoading ? (
                  <>
                    <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Getting Ready...</span>
                  </>
                ) : (
                  <>
                    <Rocket className="h-6 w-6" />
                    <span>Start Adventure!</span>
                  </>
                )}
              </button>

              {/* Help text */}
              <div className="flex items-center justify-center gap-2 text-sky-500">
                <Lock className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Ask your teacher for the secret code</span>
              </div>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="mt-6 sm:mt-10">
            <h2 className="text-center text-base sm:text-xl font-bold text-sky-800 mb-3 sm:mb-4">✨ What's Waiting For You ✨</h2>
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
              <div className="bg-gradient-to-br from-sky-50 to-sky-100 rounded-2xl sm:rounded-3xl p-3 sm:p-5 text-center transform active:scale-95 sm:hover:scale-105 sm:hover:-rotate-1 transition-all duration-300 shadow-md sm:shadow-lg border-2 border-sky-300 group cursor-pointer">
                <div className="w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 mx-auto mb-2 sm:mb-3 relative">
                  <div className="absolute inset-0 bg-sky-400/20 rounded-full blur-lg sm:blur-xl group-hover:bg-sky-400/40 transition-all" />
                  <img src="/kids/image-1765886629120.png" alt="" className="w-full h-full object-contain relative z-10 group-hover:scale-110 transition-transform drop-shadow-md sm:drop-shadow-lg" />
                </div>
                <p className="text-sky-700 font-bold sm:font-black text-xs sm:text-sm md:text-base">🎯 Fun Quizzes</p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl sm:rounded-3xl p-3 sm:p-5 text-center transform active:scale-95 sm:hover:scale-105 sm:hover:rotate-1 transition-all duration-300 shadow-md sm:shadow-lg border-2 border-amber-300 group cursor-pointer">
                <div className="w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 mx-auto mb-2 sm:mb-3 relative">
                  <div className="absolute inset-0 bg-amber-400/20 rounded-full blur-lg sm:blur-xl group-hover:bg-amber-400/40 transition-all" />
                  <img src="/kids/image-1765886635294.png" alt="" className="w-full h-full object-contain relative z-10 group-hover:scale-110 transition-transform drop-shadow-md sm:drop-shadow-lg" />
                </div>
                <p className="text-amber-700 font-bold sm:font-black text-xs sm:text-sm md:text-base">🏆 Win Rewards</p>
              </div>
              <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl sm:rounded-3xl p-3 sm:p-5 text-center transform active:scale-95 sm:hover:scale-105 sm:hover:rotate-1 transition-all duration-300 shadow-md sm:shadow-lg border-2 border-pink-300 group cursor-pointer">
                <div className="w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 mx-auto mb-2 sm:mb-3 relative">
                  <div className="absolute inset-0 bg-pink-400/20 rounded-full blur-lg sm:blur-xl group-hover:bg-pink-400/40 transition-all" />
                  <img src="/kids/image-1765886645584.png" alt="" className="w-full h-full object-contain relative z-10 group-hover:scale-110 transition-transform drop-shadow-md sm:drop-shadow-lg" />
                </div>
                <p className="text-pink-700 font-bold sm:font-black text-xs sm:text-sm md:text-base">🎮 Cool Games</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl sm:rounded-3xl p-3 sm:p-5 text-center transform active:scale-95 sm:hover:scale-105 sm:hover:-rotate-1 transition-all duration-300 shadow-md sm:shadow-lg border-2 border-emerald-300 group cursor-pointer">
                <div className="w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 mx-auto mb-2 sm:mb-3 relative">
                  <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-lg sm:blur-xl group-hover:bg-emerald-400/40 transition-all" />
                  <img src="/kids/image-1765886652001.png" alt="" className="w-full h-full object-contain relative z-10 group-hover:scale-110 transition-transform drop-shadow-md sm:drop-shadow-lg" />
                </div>
                <p className="text-emerald-700 font-bold sm:font-black text-xs sm:text-sm md:text-base">⭐ Be a Star</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-4 py-6 sm:py-8 text-center">
        <div dir="ltr" className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-md rounded-full px-5 py-2.5 shadow-md border border-white/50">
          <span className="text-xs sm:text-sm text-sky-600 font-medium">Powered by</span>
          <Logo size="sm" />
        </div>
      </footer>
    </div>
  );
}






import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Sparkles, Ticket, Lock, Rocket, Star, Zap, Heart, Trophy, Gamepad2 } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 overflow-hidden relative">
      {/* Custom float animation */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-20 h-20 bg-yellow-300/30 rounded-full blur-2xl animate-pulse" />
        <div className="absolute top-1/4 right-10 w-32 h-32 bg-pink-300/30 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '300ms' }} />
        <div className="absolute bottom-1/4 left-1/4 w-24 h-24 bg-cyan-300/30 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '500ms' }} />
        <div className="absolute bottom-20 right-1/4 w-28 h-28 bg-green-300/30 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '700ms' }} />
        
        {/* Floating stars */}
        <Star className="absolute top-20 left-1/4 h-6 w-6 text-yellow-300/50 animate-bounce" style={{ animationDelay: '0.2s' }} />
        <Star className="absolute top-40 right-1/3 h-4 w-4 text-yellow-300/50 animate-bounce" style={{ animationDelay: '0.5s' }} />
        <Star className="absolute bottom-32 left-1/3 h-5 w-5 text-yellow-300/50 animate-bounce" style={{ animationDelay: '0.8s' }} />
        <Sparkles className="absolute top-1/3 left-10 h-5 w-5 text-white/40 animate-pulse" />
        <Sparkles className="absolute bottom-40 right-10 h-6 w-6 text-white/40 animate-pulse" style={{ animationDelay: '500ms' }} />
        
        {/* Floating illustration characters - hidden on mobile, shown on larger screens */}
        <img 
          src="https://illustrations.popsy.co/amber/student-going-to-school.svg" 
          alt="" 
          className="absolute -left-4 bottom-20 w-32 sm:w-40 md:w-52 opacity-90 hidden md:block animate-float"
          style={{ animationDuration: '4s' }}
        />
        <img 
          src="https://illustrations.popsy.co/violet/girl-reading.svg" 
          alt="" 
          className="absolute -right-4 top-32 w-28 sm:w-36 md:w-44 opacity-90 hidden lg:block animate-float"
          style={{ animationDuration: '5s', animationDelay: '1s' }}
        />
        <img 
          src="https://illustrations.popsy.co/rose/question-mark.svg" 
          alt="" 
          className="absolute right-10 bottom-40 w-20 sm:w-24 md:w-28 opacity-70 hidden lg:block animate-bounce"
          style={{ animationDuration: '3s' }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 px-4 py-4 sm:py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2">
              <Logo size="sm" />
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
              <Sparkles className="h-4 w-4 text-yellow-300" />
              <span className="text-xs font-bold text-white">Kids Zone</span>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
            <Trophy className="h-4 w-4 text-yellow-300" />
            <span className="text-xs font-medium text-white hidden sm:inline">Fun Learning</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-4 pb-8">
        <div className="max-w-lg mx-auto">
          {/* Hero Text */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-4">
              <Gamepad2 className="h-5 w-5 text-yellow-300" />
              <span className="text-sm font-bold text-white">Ready to Play?</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white drop-shadow-lg mb-3">
              Let's Start the
              <span className="block bg-gradient-to-r from-yellow-300 via-pink-300 to-cyan-300 bg-clip-text text-transparent">
                Quiz Adventure!
              </span>
            </h1>
            <p className="text-white/80 text-sm sm:text-base max-w-sm mx-auto">
              Enter your nickname and the secret code from your teacher
            </p>
          </div>

          {/* Entry Card */}
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-5 sm:p-8 border-4 border-white/50 relative">
            {/* Corner decorations */}
            <img 
              src="https://illustrations.popsy.co/amber/rocket.svg" 
              alt="" 
              className="absolute -top-6 -right-6 w-14 h-14 sm:w-16 sm:h-16 rotate-12 hidden sm:block"
            />
            
            {/* Fun decorative elements */}
            <div className="flex justify-center gap-3 mb-6">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6 hover:rotate-0 transition-transform">
                <Rocket className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-pink-400 to-rose-500 rounded-2xl flex items-center justify-center shadow-lg transform rotate-6 hover:rotate-0 transition-transform">
                <Heart className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3 hover:rotate-0 transition-transform">
                <Zap className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
            </div>

            <div className="space-y-4 sm:space-y-5">
              {/* Nickname Input */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 text-xs">👤</span>
                  Your Super Name
                </label>
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full rounded-2xl border-2 border-purple-200 px-4 py-3.5 sm:py-4 text-gray-900 text-base sm:text-lg font-medium placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all"
                  placeholder="e.g., SuperStar"
                />
              </div>

              {/* Code Input */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 text-xs">🎟️</span>
                  Secret Code
                </label>
                <div className="relative">
                  <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 sm:h-6 sm:w-6 text-purple-500" />
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full rounded-2xl border-2 border-purple-200 pl-12 sm:pl-14 pr-4 py-3.5 sm:py-4 text-gray-900 text-base sm:text-lg font-bold tracking-widest uppercase placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all"
                    placeholder="KID-ABC123"
                  />
                </div>
                {normalizedCode && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-purple-600 font-semibold">Code:</span>
                    <span className="font-mono text-sm bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 px-3 py-1 rounded-lg font-bold">
                      {normalizedCode}
                    </span>
                  </div>
                )}
              </div>

              {/* Start Button */}
              <button
                type="button"
                onClick={handleEnter}
                disabled={isLoading || !nickname.trim() || !normalizedCode}
                className="w-full rounded-2xl bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 hover:from-purple-700 hover:via-pink-600 hover:to-orange-600 text-white font-black text-lg sm:text-xl py-4 sm:py-5 shadow-xl shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-3"
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
              <div className="flex items-center justify-center gap-2 text-gray-500">
                <Lock className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Ask your teacher for the secret code</span>
              </div>
            </div>
          </div>

          {/* Fun Facts Cards with Illustrations */}
          <div className="mt-6 sm:mt-8 grid grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 sm:p-4 text-center transform hover:scale-105 transition-transform group">
              <img 
                src="https://illustrations.popsy.co/amber/target.svg" 
                alt="Fun Quizzes" 
                className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 group-hover:scale-110 transition-transform"
              />
              <p className="text-white font-bold text-xs sm:text-sm">Fun Quizzes</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 sm:p-4 text-center transform hover:scale-105 transition-transform group">
              <img 
                src="https://illustrations.popsy.co/amber/trophy.svg" 
                alt="Win Rewards" 
                className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 group-hover:scale-110 transition-transform"
              />
              <p className="text-white font-bold text-xs sm:text-sm">Win Rewards</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 sm:p-4 text-center transform hover:scale-105 transition-transform group">
              <img 
                src="https://illustrations.popsy.co/violet/app-launch.svg" 
                alt="Cool Games" 
                className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 group-hover:scale-110 transition-transform"
              />
              <p className="text-white font-bold text-xs sm:text-sm">Cool Games</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 sm:p-4 text-center transform hover:scale-105 transition-transform group">
              <img 
                src="https://illustrations.popsy.co/rose/star-struck.svg" 
                alt="Be a Star" 
                className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 group-hover:scale-110 transition-transform"
              />
              <p className="text-white font-bold text-xs sm:text-sm">Be a Star</p>
            </div>
          </div>

          {/* Character Illustrations Row - Mobile visible */}
          <div className="mt-6 flex justify-center gap-2 sm:gap-4 md:hidden">
            <img 
              src="https://illustrations.popsy.co/amber/student-going-to-school.svg" 
              alt="" 
              className="w-20 h-20 sm:w-24 sm:h-24"
            />
            <img 
              src="https://illustrations.popsy.co/violet/girl-reading.svg" 
              alt="" 
              className="w-20 h-20 sm:w-24 sm:h-24"
            />
            <img 
              src="https://illustrations.popsy.co/rose/question-mark.svg" 
              alt="" 
              className="w-16 h-16 sm:w-20 sm:h-20"
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-4 py-4 sm:py-6 text-center">
        <p className="text-white/60 text-xs sm:text-sm">
          © {new Date().getFullYear()} Durrah • Safe & Fun Learning
        </p>
      </footer>
    </div>
  );
}






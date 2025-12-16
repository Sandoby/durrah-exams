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
    <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-900 to-indigo-950 overflow-hidden relative">
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
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes rocket-fly {
          0%, 100% { transform: translateY(0px) rotate(-45deg); }
          50% { transform: translateY(-30px) rotate(-45deg); }
        }
        .animate-float { animation: float 4s ease-in-out infinite; }
        .animate-float-reverse { animation: float-reverse 5s ease-in-out infinite; }
        .animate-twinkle { animation: twinkle 2s ease-in-out infinite; }
        .animate-rocket { animation: rocket-fly 3s ease-in-out infinite; }
      `}</style>

      {/* Starry Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Stars */}
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-twinkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              opacity: Math.random() * 0.7 + 0.3,
            }}
          />
        ))}
        {/* Larger glowing stars */}
        {[...Array(15)].map((_, i) => (
          <div
            key={`big-${i}`}
            className="absolute w-2 h-2 bg-yellow-200 rounded-full animate-twinkle blur-[1px]"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
        
        {/* Floating Illustrations */}
        <img 
          src="/kids/image-1765886149420.png" 
          alt="" 
          className="absolute left-2 sm:left-8 top-20 w-28 sm:w-36 md:w-44 animate-float opacity-90 drop-shadow-2xl"
          style={{ animationDelay: '0s' }}
        />
        <img 
          src="/kids/image-1765886162298.png" 
          alt="" 
          className="absolute right-2 sm:right-8 top-16 w-20 sm:w-28 md:w-36 animate-float-reverse opacity-90 drop-shadow-xl"
          style={{ animationDelay: '1s' }}
        />
        <img 
          src="/kids/image-1765886176188.png" 
          alt="" 
          className="absolute right-4 sm:right-16 bottom-28 w-24 sm:w-32 md:w-40 animate-float opacity-90 drop-shadow-2xl hidden sm:block"
          style={{ animationDelay: '0.5s' }}
        />
        <img 
          src="/kids/image-1765886185739.png" 
          alt="" 
          className="absolute left-4 sm:left-16 bottom-24 w-24 sm:w-32 md:w-40 animate-float-reverse opacity-85 drop-shadow-xl hidden md:block"
          style={{ animationDelay: '2s' }}
        />
        <img 
          src="/kids/image-1765886195936.png" 
          alt="" 
          className="absolute right-1/4 top-1/4 w-20 sm:w-28 md:w-32 animate-float opacity-80 drop-shadow-2xl hidden lg:block"
          style={{ animationDelay: '1.5s' }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 px-4 py-4 sm:py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-2 border border-white/20">
              <Logo size="sm" />
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-purple-500/30 to-pink-500/30 backdrop-blur-md rounded-full px-4 py-2 border border-white/20">
              <Sparkles className="h-4 w-4 text-yellow-300" />
              <span className="text-sm font-bold text-white">Space Quiz</span>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500/30 to-orange-500/30 backdrop-blur-md rounded-full px-4 py-2 border border-white/20">
            <Trophy className="h-4 w-4 text-yellow-300" />
            <span className="text-xs sm:text-sm font-medium text-white">Fun Learning</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-4 pb-8">
        <div className="max-w-md mx-auto">
          {/* Hero Section with Illustration */}
          <div className="text-center mb-6">
            <img 
              src="/kids/image-1765886205296.png" 
              alt="Kids Learning" 
              className="w-36 sm:w-44 md:w-52 mx-auto mb-4 drop-shadow-2xl animate-float"
            />
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500/40 to-purple-500/40 backdrop-blur-md rounded-full px-5 py-2.5 mb-4 border border-white/20">
              <Gamepad2 className="h-5 w-5 text-cyan-300" />
              <span className="text-sm font-bold text-white">Ready for Liftoff?</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white drop-shadow-lg mb-3 leading-tight">
              Blast Off to
              <span className="block bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                Quiz Galaxy!
              </span>
            </h1>
            <p className="text-purple-200 text-sm sm:text-base max-w-sm mx-auto">
              Enter your space name and mission code to begin your adventure!
            </p>
          </div>

          {/* Entry Card */}
          <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl rounded-3xl shadow-2xl p-5 sm:p-8 border border-white/20 relative overflow-hidden">
            {/* Card glow effect */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/30 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-cyan-500/30 rounded-full blur-3xl" />
            
            {/* Corner decoration */}
            <img 
              src="/kids/image-1765886214428.png" 
              alt="" 
              className="absolute -top-6 -right-6 w-16 h-16 sm:w-20 sm:h-20 opacity-90"
            />

            <div className="relative space-y-4 sm:space-y-5">
              {/* Nickname Input */}
              <div>
                <label className="block text-sm font-bold text-purple-200 mb-2 flex items-center gap-2">
                  <span className="w-7 h-7 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center shadow-lg">
                    <span className="text-sm">🚀</span>
                  </span>
                  Your Space Name
                </label>
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full rounded-2xl border-2 border-purple-400/30 bg-white/10 backdrop-blur-sm px-4 py-3.5 sm:py-4 text-white text-base sm:text-lg font-medium placeholder-purple-300/50 focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/20 transition-all"
                  placeholder="e.g., StarPilot"
                />
              </div>

              {/* Code Input */}
              <div>
                <label className="block text-sm font-bold text-purple-200 mb-2 flex items-center gap-2">
                  <span className="w-7 h-7 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shadow-lg">
                    <span className="text-sm">🎟️</span>
                  </span>
                  Mission Code
                </label>
                <div className="relative">
                  <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 sm:h-6 sm:w-6 text-amber-400" />
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full rounded-2xl border-2 border-purple-400/30 bg-white/10 backdrop-blur-sm pl-12 sm:pl-14 pr-4 py-3.5 sm:py-4 text-white text-base sm:text-lg font-bold tracking-widest uppercase placeholder-purple-300/50 focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20 transition-all"
                    placeholder="KID-ABC123"
                  />
                </div>
                {normalizedCode && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-cyan-300 font-semibold">Code:</span>
                    <span className="font-mono text-sm bg-gradient-to-r from-cyan-500/30 to-purple-500/30 text-cyan-200 px-3 py-1 rounded-lg font-bold border border-cyan-400/30">
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
                className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 hover:from-cyan-400 hover:via-purple-400 hover:to-pink-400 text-white font-black text-lg sm:text-xl py-4 sm:py-5 shadow-xl shadow-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-3 border border-white/20"
              >
                {isLoading ? (
                  <>
                    <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Preparing Launch...</span>
                  </>
                ) : (
                  <>
                    <Rocket className="h-6 w-6" />
                    <span>Launch Mission!</span>
                  </>
                )}
              </button>

              {/* Help text */}
              <div className="flex items-center justify-center gap-2 text-purple-300/70">
                <Lock className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Ask your teacher for the mission code</span>
              </div>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="mt-6 sm:mt-8 grid grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 backdrop-blur-sm rounded-2xl p-4 text-center transform hover:scale-105 transition-transform border border-cyan-400/20 group">
              <div className="w-16 h-16 mx-auto mb-2 relative">
                <img src="/kids/image-1765886629120.png" alt="" className="w-full h-full object-contain group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-white font-bold text-xs sm:text-sm">Fun Quizzes</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 backdrop-blur-sm rounded-2xl p-4 text-center transform hover:scale-105 transition-transform border border-amber-400/20 group">
              <div className="w-16 h-16 mx-auto mb-2 relative">
                <img src="/kids/image-1765886635294.png" alt="" className="w-full h-full object-contain group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-white font-bold text-xs sm:text-sm">Win Rewards</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-2xl p-4 text-center transform hover:scale-105 transition-transform border border-purple-400/20 group">
              <div className="w-16 h-16 mx-auto mb-2 relative">
                <img src="/kids/image-1765886645584.png" alt="" className="w-full h-full object-contain group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-white font-bold text-xs sm:text-sm">Cool Games</p>
            </div>
            <div className="bg-gradient-to-br from-rose-500/20 to-red-500/20 backdrop-blur-sm rounded-2xl p-4 text-center transform hover:scale-105 transition-transform border border-rose-400/20 group">
              <div className="w-16 h-16 mx-auto mb-2 relative">
                <img src="/kids/image-1765886652001.png" alt="" className="w-full h-full object-contain group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-white font-bold text-xs sm:text-sm">Be a Star</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-4 py-4 sm:py-6 text-center">
        <p className="text-purple-300/50 text-xs sm:text-sm">
          © {new Date().getFullYear()} Durrah • Safe Space Adventures
        </p>
      </footer>
    </div>
  );
}






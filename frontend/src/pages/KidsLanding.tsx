import { useMemo, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Ticket, Rocket, Trophy, Orbit, Zap, Cpu, MousePointer2 } from 'lucide-react';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';

export default function KidsLanding() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const normalizedCode = useMemo(() => code.trim().toUpperCase().replace(/\s+/g, ''), [code]);

  // Interactive Particle Background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: any[] = [];
    const particleCount = 100;
    let mouse = { x: -100, y: -100 };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    class Particle {
      x: number; y: number; size: number; speedX: number; speedY: number; color: string;
      constructor() {
        this.x = Math.random() * canvas!.width;
        this.y = Math.random() * canvas!.height;
        this.size = Math.random() * 2 + 1;
        this.speedX = Math.random() * 1 - 0.5;
        this.speedY = Math.random() * 1 - 0.5;
        const colors = ['#6366f1', '#a855f7', '#ec4899', '#f59e0b', '#06b6d4'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x > canvas!.width) this.x = 0;
        if (this.x < 0) this.x = canvas!.width;
        if (this.y > canvas!.height) this.y = 0;
        if (this.y < 0) this.y = canvas!.height;

        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 150) {
          const forceDirectionX = dx / distance;
          const forceDirectionY = dy / distance;
          const force = (150 - distance) / 150;
          this.x -= forceDirectionX * force * 5;
          this.y -= forceDirectionY * force * 5;
        }
      }
      draw() {
        ctx!.fillStyle = this.color;
        ctx!.beginPath();
        ctx!.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    const init = () => {
      particles = [];
      for (let i = 0; i < particleCount; i++) particles.push(new Particle());
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', (e) => {
      mouse.x = e.x;
      mouse.y = e.y;
    });

    resize();
    init();
    animate();

    return () => window.removeEventListener('resize', resize);
  }, []);

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

      navigate(`/kids/quiz/${exam.id}?code=${encodeURIComponent(normalizedCode)}&nick=${encodeURIComponent(nick)}&kid=1`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to open quiz');
    } finally {
      setIsLoading(false);
    }
  };

  const isRTL = i18n.language === 'ar';

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-[#050616] overflow-hidden relative font-sans">
      <Helmet>
        <title>{t('kids.seo.title', 'Quiz Space Adventure | Durrah')}</title>
      </Helmet>

      {/* Particle Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none opacity-60" />

      {/* Background Blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2 animate-pulse delay-700" />

      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-20px) rotate(2deg); } }
        @keyframes glow { 0%, 100% { filter: drop-shadow(0 0 15px rgba(99, 102, 241, 0.5)); } 50% { filter: drop-shadow(0 0 25px rgba(99, 102, 241, 0.8)); } }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-glow { animation: glow 3s ease-in-out infinite; }
        .glass-panel { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.1); }
      `}</style>

      {/* Futuristic Header */}
      <header className="relative z-50 p-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="glass-panel px-4 py-2 rounded-full flex items-center gap-2 border-indigo-500/30">
            <Orbit className="h-5 w-5 text-indigo-400 animate-spin-slow" />
            <span className="text-sm font-bold text-indigo-100/80 tracking-widest uppercase">Space Comm Center</span>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="relative z-10 px-6 pt-8 pb-20">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-12">

          {/* Hero Content */}
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-bold mb-6">
              <Zap className="h-4 w-4 fill-current" />
              MISSION STARTING SOON
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight">
              Ready for <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 animate-gradient">Takeoff?</span>
            </h1>
            <p className="text-indigo-200/60 text-lg mb-8 max-w-lg leading-relaxed">
              Join the galaxy's smartest kids! Enter your secret access code and nickname to start your planetary quiz mission.
            </p>

            {/* Visual Indicators */}
            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <div className="glass-panel p-4 rounded-2xl flex items-center gap-3">
                <div className="h-10 w-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                  <Cpu className="text-indigo-400" />
                </div>
                <div>
                  <p className="text-xs text-indigo-300/50 font-bold">SMART TECH</p>
                  <p className="text-sm text-white font-bold">Anti-Cheat AI</p>
                </div>
              </div>
              <div className="glass-panel p-4 rounded-2xl flex items-center gap-3">
                <div className="h-10 w-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                  <Trophy className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-emerald-300/50 font-bold">REWARDS</p>
                  <p className="text-sm text-white font-bold">Earn Space XP</p>
                </div>
              </div>
            </div>
          </div>

          {/* Entry Card */}
          <div className="w-full max-w-md relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2.5rem] blur opacity-20" />
            <div className="glass-panel relative rounded-[2.5rem] p-8 md:p-10 border-white/10 shadow-3xl">

              <div className="flex justify-center mb-8">
                <div className="h-20 w-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center animate-glow">
                  <Rocket className="h-10 w-10 text-indigo-400" />
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-xs font-black text-indigo-400/70 tracking-[0.2em] uppercase mb-3 block">Explorer Nickname</label>
                  <div className="relative group">
                    <input
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className="w-full bg-white/5 border-2 border-white/10 rounded-2xl px-5 py-4 text-white text-lg placeholder-white/20 focus:outline-none focus:border-indigo-500/50 transition-all focus:ring-4 focus:ring-indigo-500/10 group-hover:border-white/20"
                      placeholder="e.g. CaptainCosmos"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-indigo-400/70 tracking-[0.2em] uppercase mb-3 block">Access Code</label>
                  <div className="relative">
                    <Ticket className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-indigo-500/50" />
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full bg-white/5 border-2 border-white/10 rounded-2xl pl-14 pr-5 py-4 text-white text-lg font-bold tracking-[0.3em] uppercase placeholder-white/20 focus:outline-none focus:border-indigo-500/50 transition-all focus:ring-4 focus:ring-indigo-500/10"
                      placeholder="ST-000"
                    />
                  </div>
                </div>

                <button
                  onClick={handleEnter}
                  disabled={isLoading}
                  className="w-full py-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-2xl text-white font-black text-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98] flex items-center justify-center gap-3 group overflow-hidden relative"
                >
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 slant" />
                  {isLoading ? <Loader2 className="animate-spin h-6 w-6" /> : (
                    <>
                      <span>BLAST OFF!</span>
                      <Rocket className="h-6 w-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </>
                  )}
                </button>

                <p className="text-center text-indigo-100/30 text-xs flex items-center justify-center gap-2">
                  <MousePointer2 className="h-3 w-3" />
                  Interactive Starfield Active
                </p>
              </div>
            </div>

            {/* Float Decorations */}
            <div className="absolute -top-12 -right-12 w-24 h-24 animate-float opacity-40">
              <img src="/kids/image-1765886162298.png" className="w-full h-full object-contain" />
            </div>
            <div className="absolute -bottom-20 -left-20 w-40 h-40 animate-float opacity-20 pointer-events-none hidden lg:block" style={{ animationDelay: '1.5s' }}>
              <img src="/kids/image-1765886149420.png" className="w-full h-full object-contain" />
            </div>
            <div className="absolute top-1/2 -right-40 w-32 h-32 animate-float opacity-10 pointer-events-none hidden xl:block" style={{ animationDelay: '3s' }}>
              <img src="/kids/image-1765886176188.png" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>

        {/* Brand Bar */}
        <div className="max-w-4xl mx-auto mt-20 flex justify-center">
          <div className="glass-panel px-6 py-3 rounded-2xl flex items-center gap-4">
            <span className="text-indigo-400/50 text-xs font-bold tracking-widest uppercase">System Powered By</span>
            <a href="/" className="hover:opacity-80 transition-opacity">
              <Logo showText={true} className="scale-75 origin-left" />
            </a>
          </div>
        </div>
      </main>

      <style>{`
        .slant { transform: skewX(-20deg); }
        .animate-spin-slow { animation: spin 8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-gradient { background-size: 200% auto; animation: gradient 4s linear infinite; }
        @keyframes gradient { 0% { background-position: 0% center; } 100% { background-position: 200% center; } }
      `}</style>
    </div>
  );
}

const Loader2 = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
);







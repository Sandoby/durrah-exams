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


  return (
    <div dir={i18n.language === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen bg-[#050616] overflow-hidden relative font-sans">
      <Helmet>
        <title>{t('kids.seo.title', 'Quiz Space Adventure | Durrah')}</title>
      </Helmet>

      {/* Particle Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none opacity-60" />

      {/* Background Blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2 animate-pulse delay-700" />

      {/* Floating Space Illustrations */}
      <div className="absolute top-[15%] left-[5%] w-24 sm:w-32 lg:w-40 opacity-40 animate-float pointer-events-none z-0">
        <img src="/kids/image-1765886162298.png" className="w-full h-full object-contain" alt="" />
      </div>
      <div className="absolute top-[60%] right-[3%] w-28 sm:w-36 lg:w-48 opacity-30 animate-float pointer-events-none z-0" style={{ animationDelay: '2s' }}>
        <img src="/kids/image-1765886176188.png" className="w-full h-full object-contain rotate-12" alt="" />
      </div>
      <div className="absolute bottom-[10%] right-[15%] w-20 sm:w-28 lg:w-32 opacity-40 animate-float pointer-events-none z-0" style={{ animationDelay: '1s' }}>
        <img src="/kids/image-1765886185739.png" className="w-full h-full object-contain -rotate-12" alt="" />
      </div>
      <div className="absolute top-[40%] left-[8%] w-16 sm:w-24 lg:w-28 opacity-25 animate-float pointer-events-none z-0" style={{ animationDelay: '3s' }}>
        <img src="/kids/image-1765886205296.png" className="w-full h-full object-contain" alt="" />
      </div>

      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-20px) rotate(2deg); } }
        @keyframes glow { 0%, 100% { filter: drop-shadow(0 0 15px rgba(99, 102, 241, 0.5)); } 50% { filter: drop-shadow(0 0 25px rgba(99, 102, 241, 0.8)); } }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-glow { animation: glow 3s ease-in-out infinite; }
        .glass-panel { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.1); }
        .slant { transform: skewX(-20deg); }
        .animate-spin-slow { animation: spin 8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-gradient { background-size: 200% auto; animation: gradient 4s linear infinite; }
        @keyframes gradient { 0% { background-position: 0% center; } 100% { background-position: 200% center; } }
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
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

          {/* Hero Content */}
          <div className="flex-1 text-center lg:text-left order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-bold mb-6">
              <Zap className="h-4 w-4 fill-current animate-pulse" />
              MISSION STARTING SOON
            </div>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white mb-6 leading-tight uppercase tracking-tight">
              Ready for <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 animate-gradient">Takeoff?</span>
            </h1>
            <p className="text-indigo-200/60 text-base sm:text-lg mb-8 max-w-lg mx-auto lg:mx-0 leading-relaxed font-medium">
              Join the galaxy's smartest kids! Enter your secret access code and nickname to start your planetary quiz mission.
            </p>

            {/* Visual Indicators */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-4">
              <div className="glass-panel p-4 rounded-2xl flex items-center gap-3 group hover:border-indigo-500/50 transition-all cursor-default">
                <div className="h-10 w-10 bg-indigo-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Cpu className="text-indigo-400" />
                </div>
                <div>
                  <p className="text-[10px] text-indigo-300/50 font-black tracking-widest uppercase">Smart Tech</p>
                  <p className="text-sm text-white font-black uppercase">Anti-Cheat AI</p>
                </div>
              </div>
              <div className="glass-panel p-4 rounded-2xl flex items-center gap-3 group hover:border-emerald-500/50 transition-all cursor-default">
                <div className="h-10 w-10 bg-emerald-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Trophy className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-[10px] text-emerald-300/50 font-black tracking-widest uppercase">Rewards</p>
                  <p className="text-sm text-white font-black uppercase">Earn Space XP</p>
                </div>
              </div>
            </div>
          </div>

          {/* Entry Card & Hero Illustration */}
          <div className="flex-1 w-full max-w-md relative mt-4 lg:mt-0 order-1 lg:order-2">
            {/* Hero Illustration - Astronaut on Cloud with planets */}
            <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-64 h-64 sm:w-80 sm:h-80 pointer-events-none z-0">
              <img
                src="/kids/image-1765886214428.png"
                className="w-full h-full object-contain animate-float"
                alt="Space Explorer"
              />
            </div>

            <div className="relative z-10">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2.5rem] blur opacity-20" />
              <div className="glass-panel relative rounded-[2.5rem] p-8 sm:p-10 border-white/10 shadow-3xl">

                <div className="flex justify-center mb-8">
                  <div className="h-20 w-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center animate-glow">
                    <Rocket className="h-10 w-10 text-indigo-400" />
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-indigo-400/70 tracking-[0.2em] uppercase mb-3 block">Explorer Nickname</label>
                    <div className="relative group">
                      <input
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        className="w-full bg-white/5 border-2 border-white/10 rounded-2xl px-5 py-4 text-white text-lg placeholder-white/20 focus:outline-none focus:border-indigo-500/50 transition-all focus:ring-4 focus:ring-indigo-500/10 group-hover:border-white/20 font-bold"
                        placeholder="e.g. CaptainCosmos"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-indigo-400/70 tracking-[0.2em] uppercase mb-3 block">Access Code</label>
                    <div className="relative">
                      <Ticket className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-indigo-500/50" />
                      <input
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="w-full bg-white/5 border-2 border-white/10 rounded-2xl pl-14 pr-5 py-4 text-white text-lg font-black tracking-[0.3em] uppercase placeholder-white/20 focus:outline-none focus:border-indigo-500/50 transition-all focus:ring-4 focus:ring-indigo-500/10"
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
                    {isLoading ? <div className="h-6 w-6 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : (
                      <>
                        <span>BLAST OFF!</span>
                        <Rocket className="h-6 w-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      </>
                    )}
                  </button>

                  <p className="text-center text-indigo-100/30 text-[10px] flex items-center justify-center gap-2 font-black tracking-widest uppercase">
                    <MousePointer2 className="h-3 w-3" />
                    Interactive Starfield Active
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Brand Bar */}
        <div className="max-w-6xl mx-auto mt-24 sm:mt-32 flex justify-center">
          <div className="glass-panel px-6 py-4 rounded-3xl flex flex-col sm:flex-row items-center gap-4 border-white/5 shadow-2xl">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
              <span className="text-indigo-400/70 text-[10px] font-black tracking-[0.2em] uppercase">System Powered By</span>
            </div>
            <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />
            <a href="/" className="group flex items-center gap-3">
              <Logo showText={false} size="sm" />
              <div className="flex flex-col">
                <span className="text-white font-black text-sm tracking-tight leading-none group-hover:text-indigo-400 transition-colors">Durrah <span className="text-indigo-500">for Tutors</span></span>
                <span className="text-indigo-300/30 text-[9px] font-bold tracking-tighter uppercase">Professional Exam Systems</span>
              </div>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

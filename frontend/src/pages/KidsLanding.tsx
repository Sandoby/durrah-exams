import { useMemo, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Ticket, Rocket, Trophy, Orbit, Zap, Cpu, Sparkles } from 'lucide-react';
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

  // Premium Multi-Layer Starfield & Shooting Stars
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Particle[] = [];
    let comets: Comet[] = [];
    const particleCount = 150;
    let mouse = { x: -1000, y: -1000 };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    class Particle {
      x: number;
      y: number;
      baseX: number;
      baseY: number;
      size: number;
      speed: number;
      layer: number; // 0: back, 1: mid, 2: front
      color: string;
      opacity: number;
      twinkleSpeed: number;

      constructor() {
        this.x = Math.random() * canvas!.width;
        this.y = Math.random() * canvas!.height;
        this.baseX = this.x;
        this.baseY = this.y;

        // Define Layers for depth
        const rand = Math.random();
        if (rand < 0.6) {
          this.layer = 0;
          this.size = Math.random() * 0.8 + 0.2;
          this.speed = 0.05;
        } else if (rand < 0.9) {
          this.layer = 1;
          this.size = Math.random() * 1.2 + 0.5;
          this.speed = 0.15;
        } else {
          this.layer = 2;
          this.size = Math.random() * 1.8 + 1;
          this.speed = 0.3;
        }

        const colors = ['#ffffff', '#a5b4fc', '#c084fc', '#f472b6'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.opacity = Math.random();
        this.twinkleSpeed = Math.random() * 0.02 + 0.005;
      }

      update() {
        // Drift
        this.y -= this.speed;
        if (this.y < 0) {
          this.y = canvas!.height;
          this.x = Math.random() * canvas!.width;
        }

        // Mouse Dodge (Liquid Physics)
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 180;

        if (dist < maxDist) {
          const force = (maxDist - dist) / maxDist;
          const directionX = dx / dist;
          const directionY = dy / dist;

          // Smooth repulsion
          this.x -= directionX * force * 3;
          this.y -= directionY * force * 3;
        }

        // Twinkle
        this.opacity += this.twinkleSpeed;
        if (this.opacity > 1 || this.opacity < 0.2) this.twinkleSpeed *= -1;
      }

      draw() {
        ctx!.globalAlpha = this.opacity;
        ctx!.fillStyle = this.color;
        ctx!.beginPath();
        ctx!.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.globalAlpha = 1;
      }
    }

    class Comet {
      x!: number;
      y!: number;
      length!: number;
      speed!: number;
      angle!: number;
      opacity!: number;
      active!: boolean;

      constructor() {
        this.active = false;
        this.reset();
      }

      reset() {
        this.x = Math.random() * canvas!.width;
        this.y = Math.random() * (canvas!.height * 0.3);
        this.length = Math.random() * 200 + 100;
        this.speed = Math.random() * 20 + 15; // Faster, per request
        this.angle = Math.PI / 4 + (Math.random() * 0.05 - 0.025);
        this.opacity = 0;
        this.active = false;
      }

      update() {
        if (!this.active) {
          if (Math.random() > 0.99) this.active = true; // More frequent, per request
          return;
        }

        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.opacity = Math.min(1, this.opacity + 0.15);

        if (this.x > canvas!.width + 300 || this.y > canvas!.height + 300) {
          this.reset();
        }
      }

      draw() {
        if (!this.active || this.opacity <= 0) return;

        ctx!.save();
        const gradient = ctx!.createLinearGradient(
          this.x, this.y,
          this.x - Math.cos(this.angle) * this.length,
          this.y - Math.sin(this.angle) * this.length
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${this.opacity})`);
        gradient.addColorStop(0.3, `rgba(129, 140, 248, ${this.opacity * 0.6})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx!.strokeStyle = gradient;
        ctx!.lineWidth = 3; // More prominent
        ctx!.lineCap = 'round';
        ctx!.beginPath();
        ctx!.moveTo(this.x, this.y);
        ctx!.lineTo(this.x - Math.cos(this.angle) * this.length, this.y - Math.sin(this.angle) * this.length);
        ctx!.stroke();

        // Glow
        ctx!.shadowBlur = 15;
        ctx!.shadowColor = '#818cf8';
        ctx!.stroke();
        ctx!.restore();
      }
    }

    const init = () => {
      particles = Array.from({ length: particleCount }, () => new Particle());
      comets = Array.from({ length: 3 }, () => new Comet());
    };

    const drawConstellations = () => {
      ctx!.save();
      for (let i = 0; i < particles.length; i++) {
        // Only draw lines for mid/front layers to prevent clutter
        if (particles[i].layer === 0) continue;

        for (let j = i + 1; j < particles.length; j++) {
          if (particles[j].layer === 0) continue;

          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const mouseToP1 = Math.sqrt(Math.pow(mouse.x - particles[i].x, 2) + Math.pow(mouse.y - particles[i].y, 2));

          if (dist < 80 && mouseToP1 < 140) {
            const opacity = (1 - dist / 80) * (1 - mouseToP1 / 140) * 0.4;
            ctx!.strokeStyle = `rgba(168, 85, 247, ${opacity})`;
            ctx!.lineWidth = 0.8;
            ctx!.beginPath();
            ctx!.moveTo(particles[i].x, particles[i].y);
            ctx!.lineTo(particles[j].x, particles[j].y);
            ctx!.stroke();
          }
        }
      }
      ctx!.restore();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background (parallax feel)
      particles.forEach(p => {
        p.update();
        p.draw();
      });

      drawConstellations();

      comets.forEach(c => {
        c.update();
        c.draw();
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
    <div dir={i18n.language === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen bg-[#050616] overflow-hidden relative font-sans selection:bg-indigo-500/30">
      <Helmet>
        <title>{t('kids.seo.title', 'Quiz Space Adventure | Durrah')}</title>
      </Helmet>

      {/* High-Fidelity Interactive Starfield */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />

      {/* Ambient Lighting */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[200px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[200px] translate-y-1/2 -translate-x-1/2" />

      {/* Wise Asset Selection: Minimal & Balanced Framing */}

      {/* 1. Subtle Background Planet (Bottom Left) */}
      <div className="absolute bottom-[-15%] left-[-10%] w-[500px] lg:w-[800px] opacity-10 animate-spin-slow pointer-events-none z-0 mix-blend-screen" style={{ animationDuration: '100s' }}>
        <img src="/kids/image-1765886176188.png" className="w-full h-full object-contain" alt="" />
      </div>

      {/* 2. Premium Space Nebula Decor (Top Right) */}
      <div className="absolute top-[5%] right-[-5%] w-64 lg:w-[500px] opacity-20 animate-float pointer-events-none z-0" style={{ animationDuration: '15s' }}>
        <img src="/kids/image-1765886629120.png" className="w-full h-full object-contain" alt="" />
      </div>

      {/* 3. Tiny Satellite (Balanced opposite to Rocket) */}
      <div className="absolute top-[25%] right-[15%] w-12 lg:w-20 opacity-30 animate-float pointer-events-none z-0" style={{ animationDelay: '2s' }}>
        <img src="/kids/image-1765886185739.png" className="w-full h-full object-contain rotate-45" alt="" />
      </div>

      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-30px) rotate(3deg); } }
        @keyframes glow { 0%, 100% { filter: drop-shadow(0 0 20px rgba(99, 102, 241, 0.4)); } 50% { filter: drop-shadow(0 0 40px rgba(99, 102, 241, 0.8)); } }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-float { animation: float 8s ease-in-out infinite; }
        .animate-glow { animation: glow 4s ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 120s linear infinite; }
        .glass-panel { background: rgba(255, 255, 255, 0.02); backdrop-filter: blur(30px); border: 1px solid rgba(255, 255, 255, 0.1); }
        .slant { transform: skewX(-20deg); }
        .animate-gradient { background-size: 200% auto; animation: gradient 5s linear infinite; }
        @keyframes gradient { 0% { background-position: 0% center; } 100% { background-position: 200% center; } }
      `}</style>

      {/* Premium Header */}
      <header className="relative z-50 p-6 sm:p-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="glass-panel px-6 py-2.5 rounded-full flex items-center gap-3 border-indigo-500/20 group hover:border-indigo-500/40 transition-all cursor-default shadow-xl">
            <Orbit className="h-5 w-5 text-indigo-400 animate-spin-slow" style={{ animationDuration: '10s' }} />
            <span className="text-[10px] font-black text-indigo-100/80 tracking-[0.3em] uppercase">Deep Space Mission</span>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="relative z-10 px-6 pt-2 pb-20">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 lg:gap-24">

          {/* Hero Content */}
          <div className="flex-1 text-center lg:text-left order-2 lg:order-1 relative">
            <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[10px] font-black tracking-widest uppercase mb-10 shadow-lg animate-pulse">
              <Zap className="h-4 w-4 fill-current" />
              Cosmic Engines Active
            </div>
            <h1 className="text-6xl sm:text-8xl lg:text-[100px] font-black text-white mb-8 leading-[0.85] uppercase tracking-tighter">
              Ready for <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 animate-gradient">Takeoff?</span>
            </h1>
            <p className="text-indigo-200/40 text-lg sm:text-2xl mb-14 max-w-xl mx-auto lg:mx-0 leading-relaxed font-bold tracking-tight">
              A planetary expedition awaits! Forge your callsign and secure your mission code to initiate launch sequence.
            </p>

            {/* Visual Indicators */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-6">
              <div className="glass-panel p-6 rounded-[2rem] flex items-center gap-5 group hover:border-indigo-400/50 transition-all cursor-default shadow-2xl">
                <div className="h-14 w-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform relative z-10 border border-indigo-500/20">
                  <Cpu className="text-indigo-400 h-7 w-7" />
                </div>
                <div>
                  <p className="text-[10px] text-indigo-300/30 font-black tracking-widest uppercase mb-1">Navigation</p>
                  <p className="text-lg text-white font-black uppercase tracking-tight">AI Command</p>
                </div>
              </div>
              <div className="glass-panel p-6 rounded-[2rem] flex items-center gap-5 group hover:border-emerald-400/50 transition-all cursor-default shadow-2xl">
                <div className="h-14 w-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform relative z-10 border border-emerald-500/20">
                  <Trophy className="text-emerald-400 h-7 w-7" />
                </div>
                <div>
                  <p className="text-[10px] text-emerald-300/30 font-black tracking-widest uppercase mb-1">Leaderboard</p>
                  <p className="text-lg text-white font-black uppercase tracking-tight">Star Legend</p>
                </div>
              </div>
            </div>
          </div>

          {/* Entry Card */}
          <div className="flex-1 w-full max-w-md relative mt-12 lg:mt-0 order-1 lg:order-2">

            {/* Main Hero Astronaut - The framing piece */}
            <div className="absolute -top-56 left-1/2 -translate-x-1/2 w-[400px] h-[400px] lg:w-[550px] lg:h-[550px] pointer-events-none z-0">
              <img
                src="/kids/image-1765886214428.png"
                className="w-full h-full object-contain animate-float drop-shadow-[0_0_80px_rgba(99,102,241,0.5)]"
                alt="Astronaut Hero"
              />
            </div>

            <div className="relative z-10">
              <div className="absolute -inset-2 bg-indigo-500/20 rounded-[3.5rem] blur-2xl opacity-20" />
              <div className="glass-panel relative rounded-[3.5rem] p-10 sm:p-14 border-white/10 shadow-3xl">

                <div className="flex justify-center mb-12">
                  <div className="h-28 w-28 bg-indigo-500/10 rounded-[2.5rem] flex items-center justify-center animate-glow relative group border border-indigo-500/20 shadow-2xl">
                    <Rocket className="h-14 w-14 text-indigo-400 relative z-10 transform -rotate-12 group-hover:rotate-0 transition-transform duration-700" />
                  </div>
                </div>

                <div className="space-y-8">
                  <div>
                    <label className="text-[11px] font-black text-indigo-400/50 tracking-[0.4em] uppercase mb-4 block pl-1">Target Callsign</label>
                    <div className="relative group">
                      <input
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        className="w-full bg-white/[0.03] border-2 border-white/5 rounded-2xl px-6 py-5 text-white text-xl placeholder-white/20 focus:outline-none focus:border-indigo-500/40 transition-all focus:ring-8 focus:ring-indigo-500/5 group-hover:border-white/10 font-black tracking-wide"
                        placeholder="e.g. COSMOS_ONE"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-indigo-400/50 tracking-[0.4em] uppercase mb-4 block pl-1">Access Protocol</label>
                    <div className="relative">
                      <Ticket className="absolute left-6 top-1/2 -translate-y-1/2 h-7 w-7 text-indigo-500/30" />
                      <input
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="w-full bg-white/[0.03] border-2 border-white/5 rounded-2xl pl-16 pr-6 py-5 text-white text-xl font-black tracking-[0.5em] uppercase placeholder-white/20 focus:outline-none focus:border-indigo-500/40 transition-all focus:ring-8 focus:ring-indigo-500/5"
                        placeholder="ST-000"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleEnter}
                    disabled={isLoading}
                    className="w-full py-6 bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 hover:from-indigo-600 hover:to-purple-600 rounded-3xl text-white font-black text-2xl shadow-2xl shadow-indigo-600/40 transition-all active:scale-[0.97] flex items-center justify-center gap-5 group overflow-hidden relative"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 slant" />
                    {isLoading ? <div className="h-8 w-8 border-[5px] border-white/20 border-t-white rounded-full animate-spin" /> : (
                      <>
                        <span className="tracking-[0.2em] ml-2 font-black">BLAST OFF!</span>
                        <Rocket className="h-7 w-7 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      </>
                    )}
                  </button>

                  <p className="text-center text-indigo-100/10 text-[10px] flex items-center justify-center gap-3 font-black tracking-[0.3em] uppercase pt-4">
                    <Sparkles className="h-4 w-4 animate-pulse text-indigo-500/50" />
                    Multi-Grid Security Validated
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Global Footer Branding */}
        <div className="max-w-7xl mx-auto mt-40 sm:mt-52 flex justify-center pb-16">
          <div className="glass-panel px-10 py-6 rounded-full flex flex-col sm:flex-row items-center gap-8 border-white/10 shadow-3xl relative group overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />

            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-indigo-500 animate-ping" />
              <span className="text-indigo-400/80 text-[11px] font-black tracking-[0.4em] uppercase">System Powered By</span>
            </div>

            <div className="h-6 w-[1px] bg-white/10 hidden sm:block" />

            <a href="/" className="group/logo flex items-center gap-5">
              <Logo showText={false} size="sm" />
              <div className="flex flex-col">
                <span className="text-white font-black text-base tracking-tight leading-none group-hover/logo:text-indigo-400 transition-colors uppercase">Durrah <span className="text-indigo-500">for Tutors</span></span>
                <span className="text-indigo-300/20 text-[9px] font-black tracking-[0.2em] uppercase mt-1.5 font-sans">Global Educational Architecture</span>
              </div>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

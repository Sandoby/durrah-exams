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

  // Interactive Particle & Constellation Background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Particle[] = [];
    let comets: Comet[] = [];
    const particleCount = 100;
    let mouse = { x: -1000, y: -1000 };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    class Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;

      constructor() {
        this.x = Math.random() * canvas!.width;
        this.y = Math.random() * canvas!.height;
        this.size = Math.random() * 1.5 + 0.5;
        this.speedX = Math.random() * 0.3 - 0.15;
        this.speedY = Math.random() * 0.3 - 0.15;
        const colors = ['#6366f1', '#a855f7', '#ffffff', '#818cf8'];
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
          const force = (150 - distance) / 150;
          this.x -= (dx / distance) * force * 1.5;
          this.y -= (dy / distance) * force * 1.5;
        }
      }

      draw() {
        ctx!.fillStyle = this.color;
        ctx!.beginPath();
        ctx!.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx!.fill();
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
        this.y = Math.random() * (canvas!.height * 0.4);
        this.length = Math.random() * 150 + 80;
        this.speed = Math.random() * 15 + 10;
        this.angle = Math.PI / 4 + (Math.random() * 0.1 - 0.05);
        this.opacity = 0;
        this.active = false;
      }

      update() {
        if (!this.active) {
          if (Math.random() > 0.995) this.active = true;
          return;
        }

        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.opacity = Math.min(1, this.opacity + 0.1);

        if (this.x > canvas!.width + 200 || this.y > canvas!.height + 200) {
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
        gradient.addColorStop(0.5, `rgba(99, 102, 241, ${this.opacity * 0.5})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx!.strokeStyle = gradient;
        ctx!.lineWidth = 2;
        ctx!.lineCap = 'round';
        ctx!.beginPath();
        ctx!.moveTo(this.x, this.y);
        ctx!.lineTo(this.x - Math.cos(this.angle) * this.length, this.y - Math.sin(this.angle) * this.length);
        ctx!.stroke();

        // Glowing head
        ctx!.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx!.beginPath();
        ctx!.arc(this.x, this.y, 1.5, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.shadowBlur = 10;
        ctx!.shadowColor = '#6366f1';
        ctx!.restore();
      }
    }

    const init = () => {
      particles = [];
      comets = Array.from({ length: 4 }, () => new Comet());
      for (let i = 0; i < particleCount; i++) particles.push(new Particle());
    };

    const drawConstellations = () => {
      ctx!.save();
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const mouseToParticle = Math.sqrt(Math.pow(mouse.x - particles[i].x, 2) + Math.pow(mouse.y - particles[i].y, 2));

          if (dist < 70 && mouseToParticle < 120) {
            const opacity = (1 - dist / 70) * (1 - mouseToParticle / 120) * 0.3;
            ctx!.strokeStyle = `rgba(168, 85, 247, ${opacity})`;
            ctx!.lineWidth = 0.5;
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
    <div dir={i18n.language === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen bg-[#050616] overflow-hidden relative font-sans">
      <Helmet>
        <title>{t('kids.seo.title', 'Quiz Space Adventure | Durrah')}</title>
      </Helmet>

      {/* Particle & Constellation Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none opacity-80" />

      {/* Background Blobs for depth */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px] translate-y-1/2 -translate-x-1/2 animate-pulse delay-700" />

      {/* Refined Illustration Grid */}
      {/* 1. Rocket - Small & Zooming near Hero Title */}
      <div className="absolute top-[12%] left-[10%] w-12 sm:w-16 lg:w-20 opacity-40 animate-float pointer-events-none z-0">
        <img src="/kids/image-1765886162298.png" className="w-full h-full object-contain -rotate-45" alt="" />
      </div>

      {/* 2. Giant Planet - Large, anchoring the bottom right */}
      <div className="absolute bottom-[-10%] right-[-5%] w-64 sm:w-80 lg:w-[450px] opacity-15 animate-spin-slow pointer-events-none z-0" style={{ animationDuration: '60s' }}>
        <img src="/kids/image-1765886176188.png" className="w-full h-full object-contain rotate-12" alt="" />
      </div>

      {/* 3. Small Satellite - Near Header Area */}
      <div className="absolute top-[8%] right-[20%] w-10 sm:w-14 lg:w-18 opacity-30 animate-float pointer-events-none z-0" style={{ animationDelay: '1.5s' }}>
        <img src="/kids/image-1765886185739.png" className="w-full h-full object-contain" alt="" />
      </div>

      {/* 4. UFO/Alien - Peeking from middle left */}
      <div className="absolute top-[45%] left-[-2%] w-16 sm:w-20 lg:w-24 opacity-25 animate-float pointer-events-none z-0" style={{ animationDelay: '4s' }}>
        <img src="/kids/image-1765886205296.png" className="w-full h-full object-contain" alt="" />
      </div>

      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-20px) rotate(5deg); } }
        @keyframes glow { 0%, 100% { filter: drop-shadow(0 0 15px rgba(99, 102, 241, 0.4)); } 50% { filter: drop-shadow(0 0 30px rgba(99, 102, 241, 0.7)); } }
        .animate-float { animation: float 10s ease-in-out infinite; }
        .animate-glow { animation: glow 3s ease-in-out infinite; }
        .glass-panel { background: rgba(255, 255, 255, 0.02); backdrop-filter: blur(25px); border: 1px solid rgba(255, 255, 255, 0.08); }
        .slant { transform: skewX(-20deg); }
        .animate-spin-slow { animation: spin 20s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-gradient { background-size: 200% auto; animation: gradient 4s linear infinite; }
        @keyframes gradient { 0% { background-position: 0% center; } 100% { background-position: 200% center; } }
      `}</style>

      {/* Modern Header */}
      <header className="relative z-50 p-6 sm:p-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="glass-panel px-5 py-2.5 rounded-full flex items-center gap-3 border-indigo-500/20 group hover:border-indigo-500/40 transition-all cursor-default shadow-lg shadow-indigo-500/5">
            <Orbit className="h-5 w-5 text-indigo-400 animate-spin-slow" />
            <span className="text-xs font-black text-indigo-100/90 tracking-[0.2em] uppercase">Space Mission Hub</span>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="relative z-10 px-6 pt-4 pb-20">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-24">

          {/* Hero Content */}
          <div className="flex-1 text-center lg:text-left order-2 lg:order-1 relative z-10">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[10px] font-black tracking-widest uppercase mb-8 shadow-inner">
              <Zap className="h-4 w-4 fill-current animate-pulse" />
              Engines Primed for Launch
            </div>
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black text-white mb-8 leading-[0.9] uppercase tracking-tighter">
              Ready for <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 animate-gradient drop-shadow-sm">Takeoff?</span>
            </h1>
            <p className="text-indigo-200/50 text-base sm:text-xl mb-12 max-w-lg mx-auto lg:mx-0 leading-relaxed font-semibold">
              Join the galaxy's elite explorers! Ignite your mission by entering your nickname and access code below.
            </p>

            {/* Mission Indicators */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-5">
              <div className="glass-panel p-5 rounded-3xl flex items-center gap-4 group hover:border-indigo-400/40 transition-all cursor-default relative overflow-hidden shadow-xl">
                <div className="h-12 w-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform relative z-10 border border-indigo-500/20">
                  <Cpu className="text-indigo-400 h-6 w-6" />
                </div>
                <div className="relative z-10">
                  <p className="text-[10px] text-indigo-300/40 font-black tracking-widest uppercase mb-0.5">Control Unit</p>
                  <p className="text-base text-white font-black uppercase tracking-tight">AI Assisted</p>
                </div>
              </div>
              <div className="glass-panel p-5 rounded-3xl flex items-center gap-4 group hover:border-emerald-400/40 transition-all cursor-default relative overflow-hidden shadow-xl">
                <div className="h-12 w-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform relative z-10 border border-emerald-500/20">
                  <Trophy className="text-emerald-400 h-6 w-6" />
                </div>
                <div className="relative z-10">
                  <p className="text-[10px] text-emerald-300/40 font-black tracking-widest uppercase mb-0.5">Hall of Fame</p>
                  <p className="text-base text-white font-black uppercase tracking-tight">Epic Rewards</p>
                </div>
              </div>
            </div>
          </div>

          {/* Entry Card */}
          <div className="flex-1 w-full max-w-md relative mt-8 lg:mt-0 order-1 lg:order-2">

            {/* Hero Astronaut */}
            <div className="absolute -top-48 left-1/2 -translate-x-1/2 w-80 h-80 sm:w-[450px] sm:h-[450px] pointer-events-none z-0">
              <img
                src="/kids/image-1765886214428.png"
                className="w-full h-full object-contain animate-float drop-shadow-[0_0_50px_rgba(99,102,241,0.4)]"
                alt="Astronaut"
              />
            </div>

            <div className="relative z-10">
              <div className="absolute -inset-1.5 bg-gradient-to-r from-indigo-500 via-purple-600 to-indigo-500 rounded-[3rem] blur opacity-20" />
              <div className="glass-panel relative rounded-[3rem] p-10 sm:p-12 border-white/10 shadow-3xl">

                <div className="flex justify-center mb-10">
                  <div className="h-24 w-24 bg-indigo-500/10 rounded-[2rem] flex items-center justify-center animate-glow relative group border border-indigo-500/20 shadow-2xl">
                    <Rocket className="h-12 w-12 text-indigo-400 relative z-10 transform -rotate-12 group-hover:rotate-0 transition-transform duration-500" />
                  </div>
                </div>

                <div className="space-y-7">
                  <div>
                    <label className="text-[10px] font-black text-indigo-400/60 tracking-[0.3em] uppercase mb-3.5 block pl-1">Explorer Callsign</label>
                    <div className="relative group">
                      <input
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        className="w-full bg-white/5 border-2 border-white/5 rounded-2xl px-6 py-4.5 text-white text-lg placeholder-white/20 focus:outline-none focus:border-indigo-500/40 transition-all focus:ring-8 focus:ring-indigo-500/5 group-hover:border-white/10 font-black"
                        placeholder="e.g. STAR_LORD"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-indigo-400/60 tracking-[0.3em] uppercase mb-3.5 block pl-1">Mission Key</label>
                    <div className="relative">
                      <Ticket className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-indigo-500/30" />
                      <input
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="w-full bg-white/5 border-2 border-white/5 rounded-2xl pl-16 pr-6 py-4.5 text-white text-lg font-black tracking-[0.4em] uppercase placeholder-white/20 focus:outline-none focus:border-indigo-500/40 transition-all focus:ring-8 focus:ring-indigo-500/5"
                        placeholder="ST-000"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleEnter}
                    disabled={isLoading}
                    className="w-full py-6 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-2xl text-white font-black text-xl shadow-2xl shadow-indigo-600/40 transition-all active:scale-[0.97] flex items-center justify-center gap-4 group overflow-hidden relative"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 slant" />
                    {isLoading ? <div className="h-7 w-7 border-4 border-white/20 border-t-white rounded-full animate-spin" /> : (
                      <>
                        <span className="tracking-[0.15em] ml-2 uppercase">Ignite Launch</span>
                        <Rocket className="h-6 w-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      </>
                    )}
                  </button>

                  <p className="text-center text-indigo-100/20 text-[10px] flex items-center justify-center gap-2.5 font-black tracking-[0.2em] uppercase pt-2">
                    <Sparkles className="h-3 w-3 animate-pulse text-indigo-500" />
                    Global Star-Network Online
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Brand Bar */}
        <div className="max-w-7xl mx-auto mt-32 sm:mt-40 flex justify-center pb-12">
          <div className="glass-panel px-8 py-5 rounded-[3rem] flex flex-col sm:flex-row items-center gap-6 border-white/5 shadow-2xl relative group overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
              <span className="text-indigo-400/60 text-[10px] font-black tracking-[0.3em] uppercase">Authorized System</span>
            </div>
            <div className="h-5 w-[1px] bg-white/10 hidden sm:block" />
            <a href="/" className="group/logo flex items-center gap-4">
              <Logo showText={false} size="sm" />
              <div className="flex flex-col">
                <span className="text-white font-black text-sm tracking-tight leading-none group-hover/logo:text-indigo-400 transition-colors uppercase">Durrah <span className="text-indigo-500">for Tutors</span></span>
                <span className="text-indigo-300/20 text-[8px] font-black tracking-widest uppercase mt-1">Global Education Grid</span>
              </div>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

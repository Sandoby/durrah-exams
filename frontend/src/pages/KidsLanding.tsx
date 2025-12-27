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

  // Premium Liquid Starfield with Spring Physics
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Particle[] = [];
    let comets: Comet[] = [];
    const particleCount = 120;
    let mouse = { x: -1000, y: -1000 };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    class Particle {
      x: number;
      y: number;
      anchorX: number;
      anchorY: number;
      vx: number = 0;
      vy: number = 0;
      size: number;
      color: string;
      opacity: number;
      twinkleSpeed: number;
      layer: number;

      constructor() {
        this.x = Math.random() * canvas!.width;
        this.y = Math.random() * canvas!.height;
        this.anchorX = this.x;
        this.anchorY = this.y;

        const rand = Math.random();
        if (rand < 0.7) {
          this.layer = 0;
          this.size = Math.random() * 0.8 + 0.2;
        } else {
          this.layer = 1;
          this.size = Math.random() * 1.5 + 0.5;
        }

        const colors = ['#ffffff', '#a5b4fc', '#c084fc', '#f472b6'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.opacity = Math.random();
        this.twinkleSpeed = Math.random() * 0.01 + 0.005;
      }

      update() {
        // Subtle floating drift around anchor
        const drift = Date.now() * 0.001;
        const driftX = Math.sin(drift + this.anchorX) * 2;
        const driftY = Math.cos(drift + this.anchorY) * 2;

        const targetX = this.anchorX + driftX;
        const targetY = this.anchorY + driftY;

        // Mouse repulsion (Liquid feel)
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 150;

        if (dist < maxDist) {
          const force = (maxDist - dist) / maxDist;
          this.vx -= (dx / dist) * force * 10;
          this.vy -= (dy / dist) * force * 10;
        }

        // Spring back to home
        this.vx += (targetX - this.x) * 0.03;
        this.vy += (targetY - this.y) * 0.03;

        // Friction
        this.vx *= 0.92;
        this.vy *= 0.92;

        this.x += this.vx;
        this.y += this.vy;

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
        this.length = Math.random() * 250 + 150;
        this.speed = Math.random() * 25 + 20;
        this.angle = Math.PI / 4 + (Math.random() * 0.02 - 0.01);
        this.opacity = 0;
        this.active = false;
      }

      update() {
        if (!this.active) {
          if (Math.random() > 0.992) this.active = true;
          return;
        }

        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.opacity = Math.min(1, this.opacity + 0.25);

        if (this.x > canvas!.width + 400 || this.y > canvas!.height + 400) {
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
        gradient.addColorStop(0.2, `rgba(99, 102, 241, ${this.opacity * 0.8})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx!.strokeStyle = gradient;
        ctx!.lineWidth = 4;
        ctx!.lineCap = 'round';
        ctx!.beginPath();
        ctx!.moveTo(this.x, this.y);
        ctx!.lineTo(this.x - Math.cos(this.angle) * this.length, this.y - Math.sin(this.angle) * this.length);
        ctx!.stroke();

        ctx!.shadowBlur = 20;
        ctx!.shadowColor = '#6366f1';
        ctx!.stroke();
        ctx!.restore();
      }
    }

    const init = () => {
      particles = Array.from({ length: particleCount }, () => new Particle());
      comets = Array.from({ length: 4 }, () => new Comet());
    };

    const drawConstellations = () => {
      ctx!.save();
      for (let i = 0; i < particles.length; i++) {
        if (particles[i].layer === 0) continue;
        for (let j = i + 1; j < particles.length; j++) {
          if (particles[j].layer === 0) continue;

          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const mouseToP1 = Math.sqrt(Math.pow(mouse.x - particles[i].x, 2) + Math.pow(mouse.y - particles[i].y, 2));

          if (dist < 90 && mouseToP1 < 160) {
            const opacity = (1 - dist / 90) * (1 - mouseToP1 / 160) * 0.4;
            ctx!.strokeStyle = `rgba(168, 85, 247, ${opacity})`;
            ctx!.lineWidth = 1;
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
      particles.forEach(p => { p.update(); p.draw(); });
      drawConstellations();
      comets.forEach(c => { c.update(); c.draw(); });
      requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', (e) => { mouse.x = e.x; mouse.y = e.y; });

    resize();
    init();
    animate();

    return () => window.removeEventListener('resize', resize);
  }, []);

  const handleEnter = async () => {
    const nick = nickname.trim();
    if (!nick) { toast.error('Please enter a nickname'); return; }
    if (!normalizedCode) { toast.error('Please enter the quiz code'); return; }

    setIsLoading(true);
    try {
      const { data: exam, error } = await supabase.from('exams').select('id, title, settings').eq('quiz_code', normalizedCode).single();
      if (error || !exam) { toast.error('Invalid code'); return; }
      const settings: any = exam.settings || {};
      if (!settings.child_mode_enabled) { toast.error('This quiz is not enabled for kids mode'); return; }
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

      {/* High-Fidelity Interactive Background dots */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />

      {/* Ambient Depth Lighting */}
      <div className="absolute top-0 right-0 w-[1000px] h-[1000px] bg-indigo-600/5 rounded-full blur-[250px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[1000px] h-[1000px] bg-purple-600/5 rounded-full blur-[250px] translate-y-1/2 -translate-x-1/2" />

      {/* Clean & Integrated Asset Composition (V5.0) */}

      {/* 1. Subtle Accent Asset (Top-Right) */}
      <div className="absolute top-[5%] right-0 w-64 lg:w-[450px] opacity-[0.08] animate-float pointer-events-none z-0 mix-blend-screen overflow-hidden">
        <img src="/kids/image-1765886629120.png" className="w-full h-full object-contain translate-x-1/4" alt="" />
      </div>

      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-30px) rotate(2deg); } }
        @keyframes glow { 0%, 100% { filter: drop-shadow(0 0 20px rgba(99, 102, 241, 0.4)); } 50% { filter: drop-shadow(0 0 40px rgba(99, 102, 241, 0.8)); } }
        .animate-float { animation: float 10s ease-in-out infinite; }
        .animate-glow { animation: glow 4s ease-in-out infinite; }
        .glass-panel { background: rgba(255, 255, 255, 0.01); backdrop-filter: blur(40px); border: 1px solid rgba(255, 255, 255, 0.08); }
        .slant { transform: skewX(-20deg); }
        .animate-gradient { background-size: 200% auto; animation: gradient 6s linear infinite; }
        @keyframes gradient { 0% { background-position: 0% center; } 100% { background-position: 200% center; } }
      `}</style>

      {/* Professional Header */}
      <header className="relative z-50 p-6 sm:p-12">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="glass-panel px-6 py-3 rounded-full flex items-center gap-4 border-indigo-500/20 shadow-2xl">
            <Orbit className="h-6 w-6 text-indigo-400 animate-spin" style={{ animationDuration: '15s' }} />
            <span className="text-[11px] font-black text-indigo-100/90 tracking-[0.4em] uppercase">Deep Space Mission Launchpad</span>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="relative z-10 px-6 pt-4 pb-20">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 lg:gap-32">

          {/* Hero Branding */}
          <div className="flex-1 text-center lg:text-left order-2 lg:order-1 relative">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[11px] font-black tracking-widest uppercase mb-12 shadow-xl animate-pulse">
              <Zap className="h-5 w-5 fill-current" />
              Mission Critical Status: Ready
            </div>
            <h1 className="text-6xl sm:text-8xl lg:text-[110px] font-black text-white mb-10 leading-[0.8] uppercase tracking-tighter">
              Ready for <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 animate-gradient">Takeoff?</span>
            </h1>
            <p className="text-indigo-200/40 text-lg sm:text-2xl mb-16 max-w-xl mx-auto lg:mx-0 leading-relaxed font-bold tracking-tight">
              A planetary expedition awaits! Forge your callsign and secure your mission code to initiate launch sequence.
            </p>

            <div className="flex flex-wrap justify-center lg:justify-start gap-8">
              <div className="glass-panel p-6 rounded-[2.5rem] flex items-center gap-6 group hover:border-indigo-400/50 transition-all cursor-default shadow-3xl">
                <div className="h-16 w-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform border border-indigo-500/20 shadow-inner">
                  <Cpu className="text-indigo-400 h-8 w-8" />
                </div>
                <div>
                  <p className="text-[10px] text-indigo-300/30 font-black tracking-widest uppercase mb-1.5">Commander Hub</p>
                  <p className="text-xl text-white font-black uppercase tracking-tight">AI Command</p>
                </div>
              </div>
              <div className="glass-panel p-6 rounded-[2.5rem] flex items-center gap-6 group hover:border-emerald-400/50 transition-all cursor-default shadow-3xl">
                <div className="h-16 w-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform border border-emerald-500/20 shadow-inner">
                  <Trophy className="text-emerald-400 h-8 w-8" />
                </div>
                <div>
                  <p className="text-[10px] text-emerald-300/30 font-black tracking-widest uppercase mb-1.5">Hall of Fame</p>
                  <p className="text-xl text-white font-black uppercase tracking-tight">Star Legend</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mission Card & Integrated Hero */}
          <div className="flex-1 w-full max-w-md relative mt-16 lg:mt-0 order-1 lg:order-2">

            {/* Primary Hero Illustration (The only one that overlaps) */}
            <div className="absolute -top-64 left-1/2 -translate-x-1/2 w-[450px] h-[450px] lg:w-[600px] lg:h-[600px] pointer-events-none z-0">
              <img
                src="/kids/image-1765886214428.png"
                className="w-full h-full object-contain animate-float drop-shadow-[0_0_100px_rgba(99,102,241,0.6)]"
                alt="Astronaut"
              />
            </div>

            <div className="relative z-10">
              <div className="absolute -inset-2 bg-indigo-500/30 rounded-[4rem] blur-3xl opacity-20" />
              <div className="glass-panel relative rounded-[4rem] p-12 sm:p-16 border-white/10 shadow-3xl">

                <div className="flex justify-center mb-14">
                  <div className="h-32 w-32 bg-indigo-500/10 rounded-[3rem] flex items-center justify-center animate-glow relative group border border-indigo-500/10 shadow-2xl">
                    <Rocket className="h-16 w-16 text-indigo-400 relative z-10 transform -rotate-12 group-hover:rotate-0 transition-transform duration-700" />
                  </div>
                </div>

                <div className="space-y-10">
                  <div>
                    <label className="text-[12px] font-black text-indigo-400/50 tracking-[0.5em] uppercase mb-5 block pl-1">Mission Callsign</label>
                    <div className="relative group">
                      <input
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        className="w-full bg-white/[0.02] border-2 border-white/5 rounded-2xl px-7 py-6 text-white text-2xl placeholder-white/20 focus:outline-none focus:border-indigo-500/40 transition-all focus:ring-12 focus:ring-indigo-500/5 group-hover:border-white/10 font-black tracking-wide"
                        placeholder="e.g. COSMOS_ONE"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[12px] font-black text-indigo-400/50 tracking-[0.5em] uppercase mb-5 block pl-1">Access Protocol</label>
                    <div className="relative">
                      <Ticket className="absolute left-7 top-1/2 -translate-y-1/2 h-8 w-8 text-indigo-500/30" />
                      <input
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="w-full bg-white/[0.02] border-2 border-white/5 rounded-2xl pl-20 pr-7 py-6 text-white text-2xl font-black tracking-[0.6em] uppercase placeholder-white/20 focus:outline-none focus:border-indigo-500/40 transition-all focus:ring-12 focus:ring-indigo-500/5"
                        placeholder="ST-000"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleEnter}
                    disabled={isLoading}
                    className="w-full py-8 bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-800 hover:from-indigo-600 hover:to-purple-600 rounded-[2.5rem] text-white font-black text-3xl shadow-2xl shadow-indigo-600/40 transition-all active:scale-[0.97] flex items-center justify-center gap-6 group overflow-hidden relative"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 slant" />
                    {isLoading ? <div className="h-10 w-10 border-[6px] border-white/20 border-t-white rounded-full animate-spin" /> : (
                      <>
                        <span className="tracking-[0.2em] font-black">BLAST OFF!</span>
                        <Rocket className="h-8 w-8 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      </>
                    )}
                  </button>

                  <p className="text-center text-indigo-100/10 text-[10px] flex items-center justify-center gap-3 font-black tracking-[0.4em] uppercase pt-6">
                    <Sparkles className="h-4 w-4 animate-pulse text-indigo-500/40" />
                    Powered by Durrah Galactic Infrastructure
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Corrected & Premium Footer Branding */}
        <div className="max-w-7xl mx-auto mt-48 sm:mt-64 flex justify-center pb-20">
          <div className="glass-panel px-12 py-8 rounded-full flex flex-col sm:flex-row items-center gap-10 border-white/10 shadow-3xl relative group overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-60" />

            <div className="flex items-center gap-4">
              <div className="w-4 h-4 rounded-full bg-indigo-500 animate-ping" />
              <span className="text-indigo-400/90 text-[12px] font-black tracking-[0.5em] uppercase">System Powered By</span>
            </div>

            <div className="h-8 w-[2px] bg-white/10 hidden sm:block" />

            <a href="/" className="group/logo flex items-center gap-6">
              <Logo showText={false} size="md" />
              <div className="flex flex-col">
                <span className="text-white font-black text-xl tracking-tight leading-none group-hover/logo:text-indigo-400 transition-colors uppercase">Durrah <span className="text-indigo-500">for Tutors</span></span>
                <span className="text-indigo-400/20 text-[10px] font-black tracking-[0.3em] uppercase mt-2 font-sans tracking-[0.5em]">Global Educational Hub</span>
              </div>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

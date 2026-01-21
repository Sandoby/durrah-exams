import { motion } from 'framer-motion';
import { Lightning, Medal, Rocket, ShieldCheck, Sparkle } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';

export function KidsFeature({ showNonCriticalEffects }: { showNonCriticalEffects: boolean }) {
    const { t } = useTranslation();
    const kidsSectionRef = useRef<HTMLElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [kidsSectionActive, setKidsSectionActive] = useState(false);

    // Only start the Kids section canvas animation when it is near the viewport.
    useEffect(() => {
        const node = kidsSectionRef.current;
        if (!node || kidsSectionActive) return;

        const observer = new IntersectionObserver(
            entries => {
                if (entries[0]?.isIntersecting) {
                    setKidsSectionActive(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '200px 0px' }
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, [kidsSectionActive]);

    // Interactive Particle & Constellation Background for Kids Section
    useEffect(() => {
        if (!showNonCriticalEffects || !kidsSectionActive) return;
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let particles: any[] = [];
        let comets: any[] = [];
        const particleCount = 40; // Halved for speed
        let mouse = { x: -1000, y: -1000 };
        let rafId = 0;

        const resize = () => {
            const container = canvas.parentElement;
            if (container) {
                canvas.width = container.clientWidth;
                canvas.height = container.clientHeight;
            }
        };

        class Particle {
            x: number; y: number; size: number; speedX: number; speedY: number; color: string;
            constructor(w: number, h: number) {
                this.x = Math.random() * w;
                this.y = Math.random() * h;
                this.size = Math.random() * 1.5 + 0.5;
                this.speedX = Math.random() * 0.3 - 0.15;
                this.speedY = Math.random() * 0.3 - 0.15;
                this.color = ['#6366f1', '#a855f7', '#ec4899', '#ffffff'][Math.floor(Math.random() * 4)];
            }
            update(w: number, h: number, mx: number, my: number) {
                this.x += this.speedX; this.y += this.speedY;
                if (this.x > w) this.x = 0; if (this.x < 0) this.x = w;
                if (this.y > h) this.y = 0; if (this.y < 0) this.y = h;
                const dx = mx - this.x; const dy = my - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < 150) {
                    const force = (150 - distance) / 150;
                    this.x -= (dx / distance) * force * 1.5;
                    this.y -= (dy / distance) * force * 1.5;
                }
            }
            draw() {
                if (!ctx) return;
                ctx.fillStyle = this.color; ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
            }
        }

        class Comet {
            x: number = 0; y: number = 0; length: number = 0; speed: number = 0; angle: number = 0; opacity: number = 0;
            constructor(w: number, h: number) { this.reset(w, h); }
            reset(w: number, h: number) {
                this.x = Math.random() * w; this.y = Math.random() * (h * 0.4);
                this.length = Math.random() * 150 + 80; this.speed = Math.random() * 12 + 8;
                this.angle = Math.PI / 4 + (Math.random() * 0.1 - 0.05); this.opacity = 0;
            }
            update(w: number, h: number) {
                if (this.opacity === 0 && Math.random() > 0.995) this.opacity = 0.01;
                if (this.opacity > 0) {
                    this.x += Math.cos(this.angle) * this.speed; this.y += Math.sin(this.angle) * this.speed;
                    this.opacity = Math.min(1, this.opacity + 0.1);
                    if (this.x > w + 200 || this.y > h + 200) this.reset(w, h);
                }
            }
            draw() {
                if (this.opacity <= 0 || !ctx) return;
                ctx.save();
                const grad = ctx.createLinearGradient(this.x, this.y, this.x - Math.cos(this.angle) * this.length, this.y - Math.sin(this.angle) * this.length);
                grad.addColorStop(0, `rgba(255, 255, 255, ${this.opacity})`);
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.strokeStyle = grad; ctx.lineWidth = 2; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x - Math.cos(this.angle) * this.length, this.y - Math.sin(this.angle) * this.length);
                ctx.stroke(); ctx.restore();
            }
        }

        const init = () => {
            particles = []; comets = [new Comet(canvas.width, canvas.height), new Comet(canvas.width, canvas.height)];
            for (let i = 0; i < particleCount; i++) particles.push(new Particle(canvas.width, canvas.height));
        };

        const animate = () => {
            if (!ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => { p.update(canvas.width, canvas.height, mouse.x, mouse.y); p.draw(); });
            comets.forEach(c => { c.update(canvas.width, canvas.height); c.draw(); });
            rafId = window.requestAnimationFrame(animate);
        };

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        };

        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', handleMouseMove);
        resize(); init(); animate();
        return () => {
            if (rafId) window.cancelAnimationFrame(rafId);
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, [kidsSectionActive, showNonCriticalEffects]);

    const fadeIn = {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
        transition: { duration: 0.6 }
    };

    const staggerContainer = {
        initial: {},
        whileInView: { transition: { staggerChildren: 0.1 } },
        viewport: { once: true }
    };

    return (
        <section ref={kidsSectionRef} className="py-32 relative overflow-hidden bg-[#050616] text-white">
            <div className="absolute inset-0 pointer-events-none" >
                <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-60" />
                <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-slate-900 via-[#050616]/80 to-transparent"></div>
                <div className="absolute bottom-0 left-0 w-full h-96 bg-gradient-to-t from-white dark:from-slate-900 via-[#050616]/50 to-transparent"></div>

                <div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-1/4 -right-1/4 w-[600px] h-[600px] bg-violet-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="flex justify-center mb-12">
                    <div className="glass-panel px-6 py-2 rounded-full flex items-center gap-2 border-indigo-500/30">
                        <Rocket weight="duotone" className="h-5 w-5 text-indigo-400 animate-spin-slow" />
                        <span className="text-sm font-bold text-indigo-100/80 tracking-widest uppercase">{t('kidsLanding.missionCenter', 'Mission Center')}</span>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="grid lg:grid-cols-2 gap-16 items-center"
                >
                    <div className="order-2 lg:order-1">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-bold mb-6"
                        >
                            <Lightning weight="fill" className="h-4 w-4 fill-current animate-pulse" />
                            <span>{t('kidsLanding.readySystem', 'SYSTEM READY FOR TAKEOFF')}</span>
                        </motion.div>

                        <div className="glass-panel p-8 sm:p-10 rounded-[2.5rem] border-white/10 shadow-3xl">
                            <motion.h2
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.1 }}
                                className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight uppercase"
                            >
                                {t('landing.marketing.kids.title', 'Kids Mode: The Ultimate Quiz Adventure').split(t('landing.marketing.kids.titleSpan', 'Ultimate'))[0]}
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 animate-gradient">{t('landing.marketing.kids.titleSpan', 'Ultimate')}</span>
                                {t('landing.marketing.kids.title', 'Kids Mode: The Ultimate Quiz Adventure').split(t('landing.marketing.kids.titleSpan', 'Ultimate'))[1]}
                            </motion.h2>
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.2 }}
                                className="text-lg text-indigo-100/70 mb-8 font-medium"
                            >
                                {t('landing.marketing.kids.desc', 'Transform assessments into a fun journey. Our Kids Mode features vibrant visuals, simplified navigation, and a world-class anti-cheating system that feels like a game, not a test.')}
                            </motion.p>
                            <motion.div
                                variants={staggerContainer}
                                initial="initial"
                                whileInView="whileInView"
                                viewport={{ once: true }}
                                className="grid grid-cols-2 gap-4 mb-8"
                            >
                                {[
                                    { icon: ShieldCheck, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
                                    { icon: Sparkle, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
                                    { icon: Medal, color: "text-pink-400", bg: "bg-pink-400/10", border: "border-pink-400/20" },
                                    { icon: Rocket, color: "text-cyan-400", bg: "bg-cyan-400/10", border: "border-cyan-400/20" }
                                ].map((item, i) => (
                                    <motion.div
                                        key={i}
                                        variants={fadeIn}
                                        className={`relative overflow-hidden rounded-2xl border ${item.border} bg-white/5 backdrop-blur-sm p-4 transition-all duration-300 hover:bg-white/10 hover:shadow-[0_0_20px_-5px_rgba(99,102,241,0.5)] group/card`}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity" />
                                        <div className={`${item.bg} w-10 h-10 rounded-xl flex items-center justify-center mb-3 group-hover/card:scale-110 transition-transform duration-300 border border-white/5`}>
                                            <item.icon className={`w-5 h-5 ${item.color} drop-shadow-lg`} />
                                        </div>
                                        <span className="relative z-10 text-white/90 text-sm font-bold block leading-tight tracking-wide">
                                            {t(`landing.marketing.kids.features.${i}`)}
                                        </span>
                                    </motion.div>
                                ))}
                            </motion.div>
                            <Link
                                to="/kids"
                                className="w-full py-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-2xl text-white font-black text-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98] flex items-center justify-center gap-3 group overflow-hidden relative"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 slant" />
                                <span className="tracking-widest uppercase">{t('landing.marketing.kids.cta', 'Blast Off!')}</span>
                                <Rocket className="h-6 w-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            </Link>
                        </div>
                    </div>
                    <div className="order-1 lg:order-2 relative flex justify-center items-center h-[400px]">
                        <motion.img
                            animate={{ y: [0, -20, 0], rotate: [0, 5, 0], scale: [1, 1.02, 1] }}
                            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                            src="/kids/image-1765886149420.png"
                            alt="Kids Space Illustration"
                            className="absolute w-32 h-32 z-20 drop-shadow-[0_0_20px_rgba(129,140,248,0.4)]"
                            width={128}
                            height={128}
                            loading="lazy"
                        />
                        <motion.img
                            animate={{ y: [0, 30, 0], rotate: [0, -8, 0] }}
                            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                            src="/kids/image-1765886176188.png"
                            alt="Floating Star Illustration"
                            className="absolute bottom-4 right-10 w-24 h-24 z-10 opacity-50 filter blur-[0.5px]"
                            width={96}
                            height={96}
                            loading="lazy"
                        />
                        <motion.img
                            animate={{ x: [0, 15, 0], y: [0, -15, 0] }}
                            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                            src="/kids/image-1765886214428.png"
                            alt="Rocket Path Illustration"
                            className="absolute top-4 left-10 w-20 h-20 z-10 opacity-30 filter blur-[1px]"
                            width={80}
                            height={80}
                            loading="lazy"
                        />
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

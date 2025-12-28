import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Check, Zap, Shield, Globe, Users, MessageCircle, ArrowRight, Star, Layout, Sparkles, Award, TrendingUp, Clock, Menu, X, Trophy, ChevronDown, Rocket, Orbit, Smartphone, Download, Bell } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Logo } from '../components/Logo';
import { LottiePlayer } from '../components/LottiePlayer';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useCurrency } from '../hooks/useCurrency';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
    const { t, i18n } = useTranslation();
    const { user, loading } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const registrationUrl = 'https://tutors.durrahsystem.tech/register';
    // Force language detection on mount (for main landing page)
    import('../lib/countryLanguageDetector').then(mod => mod.default.lookup());
    const isRTL = i18n.language === 'ar';

    // No auto-redirect - show authenticated UI instead

    const { price: monthlyPrice, currency: currencyCode, isLoading: isCurrencyLoading } = useCurrency(200);
    const { price: yearlyPrice } = useCurrency(2000);

    const [activeFaq, setActiveFaq] = useState<number | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Interactive Particle & Constellation Background for Kids Section
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let particles: any[] = [];
        let comets: any[] = [];
        const particleCount = 80; // Reduced for performance on landing page
        let mouse = { x: -1000, y: -1000 };

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
            requestAnimationFrame(animate);
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
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    const faqs = [
        {
            question: t('faq.q1.question', 'Is Durrah really safe for kids?'),
            answer: t('faq.q1.answer', 'Yes! We prioritize safety with filtered content, secure nickname-only access options, and zero data selling.')
        },
        {
            question: t('faq.q2.question', 'How does the anti-cheating system work?'),
            answer: t('faq.q2.answer', 'Our system uses AI to detect tab switching, fullscreen escapes, and suspicious behavior patterns without intrusive software.')
        },
        {
            question: t('faq.q3.question', 'Can I use Durrah for large school groups?'),
            answer: t('faq.q3.answer', 'Absolutely. Our "Professional" and "Yearly" plans are designed for high-capacity testing with detailed analytics.')
        },
        {
            question: t('faq.q4.question', 'Do students need an account?'),
            answer: t('faq.q4.answer', 'Students can join exams with just a code and nickname, or use the Student Portal to track their long-term progress.')
        }
    ];

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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950" dir={isRTL ? 'rtl' : 'ltr'}>
            <Helmet>
                <title>Fun, Secure Online Quizzes for Kids & Tutors | Durrah</title>
                <meta name="description" content="Durrah for Tutors: Safe, fun, and effective online quizzes for kids and schools. Advanced anti-cheating, kids mode, and real-time analytics." />
                <meta name="keywords" content="kids online quiz, safe kids exams, anti cheating online exam, child mode, secure quiz platform, fun learning for children, quiz for schools, quiz for tutors" />
                <meta property="og:title" content="Fun, Secure Online Quizzes for Kids & Tutors | Durrah" />
                <meta property="og:description" content="Safe, fun, and effective online quizzes for kids and schools. Advanced anti-cheating, kids mode, and real-time analytics." />
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://tutors.durrahsystem.tech/" />
                <meta property="og:image" content="https://tutors.durrahsystem.tech/illustrations/og-image.png" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="Fun, Secure Online Quizzes for Kids & Tutors | Durrah" />
                <meta name="twitter:description" content="Safe, fun, and effective online quizzes for kids and schools. Advanced anti-cheating, kids mode, and real-time analytics." />
                <meta name="twitter:image" content="https://tutors.durrahsystem.tech/illustrations/og-image.png" />
                <link rel="canonical" href="https://tutors.durrahsystem.tech/" />
                <script type="application/ld+json">{`
                                    {
                                        "@context": "https://schema.org",
                                        "@type": "WebSite",
                                        "name": "Durrah for Tutors",
                                        "url": "https://tutors.durrahsystem.tech/",
                                        "description": "Safe, fun, and effective online quizzes for kids and schools. Advanced anti-cheating, kids mode, and real-time analytics.",
                                        "inLanguage": "en",
                                        "publisher": {
                                            "@type": "Organization",
                                            "name": "Durrah for Tutors",
                                            "logo": "https://tutors.durrahsystem.tech/logo.png",
                                            "url": "https://tutors.durrahsystem.tech"
                                        }
                                    }
                                `}</script>
                <script type="application/ld+json">{`
                                    {
                                        "@context": "https://schema.org",
                                        "@type": "Organization",
                                        "name": "Durrah for Tutors",
                                        "url": "https://tutors.durrahsystem.tech",
                                        "logo": "https://tutors.durrahsystem.tech/logo.png",
                                        "description": "Create secure, professional exams in minutes. Durrah for Tutors offers powerful anti-cheating features, auto-grading, and detailed analytics for educators worldwide."
                                    }
                                `}</script>
                <script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js"></script>
            </Helmet>

            <style>{`
                @keyframes twinkle { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
                @keyframes blob { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } }
                @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
                @keyframes glow { 0%, 100% { filter: drop-shadow(0 0 15px rgba(99, 102, 241, 0.5)); } 50% { filter: drop-shadow(0 0 25px rgba(99, 102, 241, 0.8)); } }
                @keyframes gradient { 0% { background-position: 0% center; } 100% { background-position: 200% center; } }
                .animate-blob { animation: blob 7s infinite; }
                .animate-float { animation: float 3s ease-in-out infinite; }
                .animate-glow { animation: glow 3s ease-in-out infinite; }
                .animate-gradient { background-size: 200% auto; animation: gradient 4s linear infinite; }
                .animation-delay-2000 { animation-delay: 2s; }
                .animation-delay-4000 { animation-delay: 4s; }
                .star-field { position: absolute; inset: 0; background-image: radial-gradient(1px 1px at 10% 10%, white, transparent), radial-gradient(1px 1px at 25% 35%, white, transparent), radial-gradient(1.5px 1.5px at 45% 15%, white, transparent), radial-gradient(1px 1px at 65% 45%, white, transparent), radial-gradient(1px 1px at 85% 25%, white, transparent), radial-gradient(1px 1px at 15% 75%, white, transparent), radial-gradient(1.5px 1.5px at 35% 85%, white, transparent), radial-gradient(1px 1px at 55% 65%, white, transparent), radial-gradient(1px 1px at 75% 95%, white, transparent), radial-gradient(1px 1px at 95% 55%, white, transparent); background-size: 50% 50%; animation: twinkle 4s infinite ease-in-out; }
                .glass-panel { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.1); }
                .slant { transform: skewX(-20deg); }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin-slow { animation: spin 12s linear infinite; }
            `}</style>

            {/* Navigation */}
            <nav className="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-7xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl z-50 border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-xl shadow-indigo-500/5">
                <div className="px-6 py-3">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <Logo className="h-9 w-9" showText={false} />
                            <div className="flex flex-col">
                                <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">Durrah</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">for Tutors</span>
                            </div>
                        </div>
                        <div className="hidden lg:flex items-center gap-8">
                            <a href="#features" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{t('nav.features')}</a>
                            <a href="#pricing" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{t('nav.pricing')}</a>
                            <a href="#testimonials" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{t('nav.testimonials')}</a>
                            <Link to="/blog" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Blog</Link>
                            <LanguageSwitcher />
                            <div className="flex items-center gap-3">
                                {!loading && user ? (
                                    <>
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{user.email?.split('@')[0]}</span>
                                        <Link to="/dashboard" className="group relative bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white px-6 py-2.5 rounded-full font-medium text-sm shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:scale-105 transition-all duration-300">
                                            <span className="relative z-10">{t('nav.goToDashboard', 'Go to Dashboard')}</span>
                                            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        </Link>
                                    </>
                                ) : (
                                    <>
                                        <Link to="/login" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 transition-colors">{t('nav.login')}</Link>
                                        <Link to="/register" className="group relative bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white px-6 py-2.5 rounded-full font-medium text-sm shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:scale-105 transition-all duration-300">
                                            <span className="relative z-10">{t('nav.getStarted')}</span>
                                            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Mobile Menu Button */}
                        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />

                    {/* Menu Drawer */}
                    <div className={`fixed top-20 ${isRTL ? 'left-4' : 'right-4'} w-[calc(100%-2rem)] max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl z-50 lg:hidden border border-gray-200 dark:border-gray-700 overflow-hidden animate-in slide-in-from-top duration-300`}>
                        <div className="p-6 space-y-4">
                            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block py-3 px-4 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-colors">
                                {t('nav.features')}
                            </a>
                            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block py-3 px-4 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-colors">
                                {t('nav.pricing')}
                            </a>
                            <a href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="block py-3 px-4 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-colors">
                                {t('nav.testimonials')}
                            </a>
                            <Link to="/blog" onClick={() => setMobileMenuOpen(false)} className="block py-3 px-4 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-colors">
                                Blog
                            </Link>

                            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                <div className="mb-4">
                                    <LanguageSwitcher />
                                </div>
                                {!loading && user ? (
                                    <>
                                        <div className="py-3 px-4 text-center text-base font-medium text-gray-700 dark:text-gray-300 mb-3">
                                            {user.email?.split('@')[0]}
                                        </div>
                                        <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="block py-3 px-4 text-center bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white rounded-xl font-semibold text-base shadow-lg shadow-indigo-500/30">
                                            {t('nav.goToDashboard', 'Go to Dashboard')}
                                        </Link>
                                    </>
                                ) : (
                                    <>
                                        <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="block py-3 px-4 text-center text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors mb-3">
                                            {t('nav.login')}
                                        </Link>
                                        <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="block py-3 px-4 text-center bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white rounded-xl font-semibold text-base shadow-lg shadow-indigo-500/30">
                                            {t('nav.getStarted')}
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Hero Section */}
            <section className="pt-40 pb-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-1/2 w-96 h-96 bg-purple-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>

                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div className="text-center lg:text-left">
                            <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-full px-4 py-2 mb-6">
                                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{t('hero.trustedBadge')}</span>
                            </div>

                            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-gray-900 dark:text-white mb-6 leading-[1.1]">
                                {t('hero.title')}<br />
                                <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">{t('hero.titleHighlight')}</span>
                            </h1>

                            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto lg:mx-0">
                                {t('hero.subtitle')}
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                                <a href={registrationUrl} target="_blank" rel="noreferrer" className="group relative bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] transition-all duration-300 flex items-center justify-center">
                                    <span className="relative z-10 flex items-center gap-2">
                                        {t('hero.cta')}
                                        <ArrowRight className={`w-5 h-5 group-hover:translate-x-1 transition-transform ${isRTL ? 'rotate-180' : ''}`} />
                                    </span>
                                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                </a>
                                <Link to="/demo" className="group bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-8 py-4 rounded-2xl font-semibold text-lg border-2 border-gray-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-xl transition-all duration-300 flex items-center justify-center">
                                    {t('hero.watchDemo', 'Interactive Demo')}
                                    <svg className="w-5 h-5 ml-2 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                                    </svg>
                                </Link>
                            </div>

                            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-gray-600 dark:text-gray-400">
                                <div className="flex items-center gap-2"><Check className="w-5 h-5 text-green-500" /><span>{t('hero.features.noCreditCard')}</span></div>
                                <div className="flex items-center gap-2"><Check className="w-5 h-5 text-green-500" /><span>{t('hero.features.freeExams')}</span></div>
                                <div className="flex items-center gap-2"><Check className="w-5 h-5 text-green-500" /><span>{t('hero.features.cancelAnytime')}</span></div>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl shadow-indigo-500/10 p-8 border border-gray-100 dark:border-slate-700">
                                <LottiePlayer src="/illustrations/juicy-woman-focused-on-online-learning.json" background="transparent" speed={1} className="w-full h-80" autoplay loop />

                                <div className="absolute -top-6 -left-6 bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-indigo-500/10 p-4 border border-gray-100 dark:border-slate-700 animate-float">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center">
                                            <TrendingUp className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold text-gray-900 dark:text-white">98%</div>
                                            <div className="text-xs text-gray-600 dark:text-gray-400">{t('hero.stats.satisfaction')}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="absolute -bottom-6 -right-6 bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-violet-500/10 p-4 border border-gray-100 dark:border-slate-700 animate-float animation-delay-2000">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-gradient-to-br from-violet-400 to-purple-500 rounded-xl flex items-center justify-center">
                                            <Clock className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold text-gray-900 dark:text-white">2 min</div>
                                            <div className="text-xs text-gray-600 dark:text-gray-400">{t('hero.stats.setupTime')}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full">
                                <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-300/30 dark:bg-indigo-600/20 rounded-full filter blur-3xl"></div>
                                <div className="absolute bottom-0 left-0 w-72 h-72 bg-violet-300/30 dark:bg-violet-600/20 rounded-full filter blur-3xl"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Banner */}
            <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        <div className="text-center">
                            <div className="text-4xl font-bold text-white mb-2">10K+</div>
                            <div className="text-indigo-100">{t('stats.tutors')}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-white mb-2">500K+</div>
                            <div className="text-indigo-100">{t('stats.exams')}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-white mb-2">2M+</div>
                            <div className="text-indigo-100">{t('stats.students')}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-white mb-2">98%</div>
                            <div className="text-indigo-100">{t('stats.satisfaction')}</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-full px-4 py-2 mb-4">
                            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{t('features.badge')}</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">{t('features.title')}</h2>
                        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">{t('features.subtitle')}</p>
                    </div>
                    <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        whileInView="whileInView"
                        viewport={{ once: true }}
                        className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
                    >
                        {[
                            { icon: Zap, title: t('features.fastCreation.title'), desc: t('features.fastCreation.desc', 'Create professional exams in minutes'), gradient: 'from-yellow-400 to-orange-500' },
                            { icon: Shield, title: t('features.antiCheating.title'), desc: t('features.antiCheating.desc', 'Fullscreen mode, tab detection, violation tracking'), gradient: 'from-indigo-400 to-violet-500' },
                            { icon: Globe, title: t('features.globalAccess.title'), desc: t('features.globalAccess.desc', 'Students can take exams anywhere, anytime'), gradient: 'from-pink-400 to-rose-500' },
                            { icon: Users, title: t('features.unlimitedStudents.title'), desc: t('features.unlimitedStudents.desc', 'No limits on the number of students'), gradient: 'from-green-400 to-emerald-500' },
                            { icon: MessageCircle, title: t('features.support.title'), desc: t('features.support.desc', 'Always here to help you succeed'), gradient: 'from-blue-400 to-cyan-500' },
                            { icon: Layout, title: t('features.interface.title'), desc: t('features.interface.desc', 'Easy to use, powerful features'), gradient: 'from-purple-400 to-fuchsia-500' }
                        ].map((feature, index) => (
                            <motion.div
                                key={index}
                                variants={fadeIn}
                                className="group bg-white dark:bg-slate-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100 dark:border-slate-700 p-8"
                            >
                                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                                    <feature.icon className="w-7 h-7 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{feature.title}</h3>
                                <p className="text-gray-600 dark:text-gray-400">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-full px-4 py-2 mb-4">
                            <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{t('pricing.badge')}</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">{t('pricing.title')}</h2>
                        <p className="text-xl text-gray-600 dark:text-gray-300">{t('pricing.subtitle')}</p>
                    </div>
                    <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        whileInView="whileInView"
                        viewport={{ once: true }}
                        className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto"
                    >
                        <motion.div variants={fadeIn} className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-200 dark:border-slate-700 p-8">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('pricing.starter.title')}</h3>
                            <div className="mb-6"><span className="text-5xl font-bold text-gray-900 dark:text-white">{t('pricing.starter.price')}</span></div>
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-start"><Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" /><span className="text-gray-600 dark:text-gray-300">{t('pricing.starter.features.0')}</span></li>
                                <li className="flex items-start"><Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" /><span className="text-gray-600 dark:text-gray-300">{t('pricing.starter.features.1')}</span></li>
                                <li className="flex items-start"><Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" /><span className="text-gray-600 dark:text-gray-300">{t('pricing.starter.features.2')}</span></li>
                            </ul>
                            <a href={registrationUrl} target="_blank" rel="noreferrer" className="block w-full text-center bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white py-3 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition">{t('pricing.starter.cta')}</a>
                        </motion.div>
                        <motion.div
                            variants={fadeIn}
                            className="relative bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 rounded-3xl shadow-2xl p-8 transform hover:scale-105 transition-all duration-300"
                        >
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-gray-900 px-4 py-1 rounded-full font-bold text-sm shadow-lg">{t('pricing.professional.badge')}</div>
                            <h3 className="text-2xl font-bold text-white mb-2">{t('pricing.professional.title')}</h3>
                            <div className="mb-6">
                                <span className="text-5xl font-bold text-white">{isCurrencyLoading ? '...' : `${currencyCode} ${monthlyPrice}`}</span>
                                <span className="text-indigo-100">{t('pricing.professional.period')}</span>
                            </div>
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-start"><Check className="h-6 w-6 text-white mr-3 flex-shrink-0" /><span className="text-white/90">{t('pricing.professional.features.0')}</span></li>
                                <li className="flex items-start"><Check className="h-6 w-6 text-white mr-3 flex-shrink-0" /><span className="text-white/90">{t('pricing.professional.features.1')}</span></li>
                                <li className="flex items-start"><Check className="h-6 w-6 text-white mr-3 flex-shrink-0" /><span className="text-white/90">{t('pricing.professional.features.2')}</span></li>
                                <li className="flex items-start"><Check className="h-6 w-6 text-white mr-3 flex-shrink-0" /><span className="text-white/90">{t('pricing.professional.features.3')}</span></li>
                            </ul>
                            <a href={registrationUrl} target="_blank" rel="noreferrer" className="block w-full text-center bg-white text-indigo-600 py-3 rounded-xl font-semibold hover:bg-indigo-50 transition shadow-lg">{t('pricing.professional.cta')}</a>
                        </motion.div>
                        <motion.div variants={fadeIn} className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-2 border-indigo-200 dark:border-indigo-800 p-8">
                            <div className="inline-block bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full font-semibold text-sm mb-4">{t('pricing.yearly.badge')}</div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('pricing.yearly.title')}</h3>
                            <div className="mb-6">
                                <span className="text-5xl font-bold text-gray-900 dark:text-white">{isCurrencyLoading ? '...' : `${currencyCode} ${yearlyPrice}`}</span>
                                <span className="text-gray-600 dark:text-gray-400">{t('pricing.yearly.period')}</span>
                            </div>
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-start"><Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" /><span className="text-gray-600 dark:text-gray-300">{t('pricing.yearly.features.0')}</span></li>
                                <li className="flex items-start"><Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" /><span className="text-gray-600 dark:text-gray-300">{t('pricing.yearly.features.1')}</span></li>
                                <li className="flex items-start"><Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" /><span className="text-gray-600 dark:text-gray-300">{t('pricing.yearly.features.2')}</span></li>
                            </ul>
                            <a href={registrationUrl} target="_blank" rel="noreferrer" className="block w-full text-center bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition">{t('pricing.yearly.cta')}</a>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section id="testimonials" className="py-24 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">{t('testimonials.title')}</h2>
                        <p className="text-xl text-gray-600 dark:text-gray-300">{t('testimonials.subtitle')}</p>
                    </div>
                    <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        whileInView="whileInView"
                        viewport={{ once: true }}
                        className="grid md:grid-cols-3 gap-8"
                    >
                        {[
                            { name: t('testimonials.t1.name'), role: t('testimonials.t1.role'), content: t('testimonials.t1.content'), rating: 5 },
                            { name: t('testimonials.t2.name'), role: t('testimonials.t2.role'), content: t('testimonials.t2.content'), rating: 5 },
                            { name: t('testimonials.t3.name'), role: t('testimonials.t3.role'), content: t('testimonials.t3.content'), rating: 5 }
                        ].map((testimonial, index) => (
                            <motion.div
                                key={index}
                                variants={fadeIn}
                                className="group bg-white dark:bg-slate-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100 dark:border-slate-700 p-8"
                            >
                                <div className="flex mb-4">
                                    {[...Array(testimonial.rating)].map((_, i) => (
                                        <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                                    ))}
                                </div>
                                <p className="text-gray-600 dark:text-gray-300 mb-6 italic">"{testimonial.content}"</p>
                                <div>
                                    <div className="font-bold text-gray-900 dark:text-white">{testimonial.name}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">{testimonial.role}</div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-900/50">
                <div className="max-w-3xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            {t('faq.title', 'Frequently Asked Questions')}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400">
                            {t('faq.subtitle', 'Everything you need to know about Durrah')}
                        </p>
                    </motion.div>

                    <div className="space-y-4">
                        {faqs.map((faq, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                            >
                                <button
                                    onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                                    className="w-full px-6 py-5 text-left flex justify-between items-center group"
                                >
                                    <span className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        {t(`faq.q${index + 1}.question`, faq.question)}
                                    </span>
                                    <motion.div
                                        animate={{ rotate: activeFaq === index ? 180 : 0 }}
                                        className="text-gray-400"
                                    >
                                        <ChevronDown className="w-5 h-5" />
                                    </motion.div>
                                </button>
                                <AnimatePresence>
                                    {activeFaq === index && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                                        >
                                            <div className="px-6 pb-5 text-gray-600 dark:text-gray-400 text-sm leading-relaxed border-t border-gray-100 dark:border-slate-700/50 pt-4">
                                                {t(`faq.q${index + 1}.answer`, faq.answer)}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJsLTEtMWgtMWwtMS0xaC0ybC0xLTFoLTJsLTEgMWgtMWwtMSAxaC0ybC0xIDFoLTJsLTEgMWgtMWwtMSAxdjFsLTEgMXYxbC0xIDF2MWwtMSAxdjJsLTEgMXYxbC0xIDF2MmwtMSAxdjJsLTEgMXYxbDEgMXYxbDEgMXYxbDEgMXYxbDEgMXYxbDEgMXYxbDEgMXYxbDEgMXYxbDEgMWgxbDEgMWgxbDEgMWgxbDEgMWgybDEgMWgybDEgMWgybDEtMWgxbDEtMWgybDEtMWgybDEtMWgybDEtMWgxbDEtMWgxbDEtMWgxbDEtMXYtMWwxLTF2LTFsMS0xdi0xbDEtMXYtMWwxLTF2LTFsMS0xdi0ybDEtMXYtMWwxLTF2LTJsMS0xdi0ybC0xLTF2LTFsLTEtMXYtMWwtMS0xdi0xbC0xLTF2LTFsLTEtMXYtMWwtMS0xdi0xbC0xLTF2LTFsLTEtMWgtMWwtMS0xaC0xbC0xLTFoLTFsLTEtMWgtMmwtMS0xaC0yeiIvPjwvZz48L2c+PC9zdmc+')] opacity-10"></div>
                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">{t('ctaSection.title')}</h2>
                    <p className="text-xl text-indigo-100 mb-8">{t('ctaSection.subtitle')}</p>
                    <a href={registrationUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-white text-indigo-600 px-10 py-5 rounded-2xl text-lg font-bold hover:shadow-2xl hover:scale-105 transition-all duration-300">
                        {t('ctaSection.cta')}
                        <ArrowRight className={`w-6 h-6 ${isRTL ? 'rotate-180' : ''}`} />
                    </a>
                </div>
            </section>

            {/* Kids Mode Feature Section - Enhanced Space Theme */}
            <section className="py-32 relative overflow-hidden bg-[#050616] text-white">
                {/* Space Atmosphere Background */}
                <div className="absolute inset-0 pointer-events-none">
                    <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-60" />
                    <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-purple-900/40 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-[#050616] to-transparent"></div>

                    {/* Nebula Glows */}
                    <div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse"></div>
                    <div className="absolute bottom-1/4 -right-1/4 w-[600px] h-[600px] bg-violet-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="flex justify-center mb-12">
                        <div className="glass-panel px-6 py-2 rounded-full flex items-center gap-2 border-indigo-500/30">
                            <Orbit className="h-5 w-5 text-indigo-400 animate-spin-slow" />
                            <span className="text-sm font-bold text-indigo-100/80 tracking-widest uppercase">Mission Center</span>
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
                                <Zap className="h-4 w-4 fill-current animate-pulse" />
                                <span>SYSTEM READY FOR TAKEOFF</span>
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
                                <motion.ul
                                    variants={staggerContainer}
                                    initial="initial"
                                    whileInView="whileInView"
                                    viewport={{ once: true }}
                                    className="grid sm:grid-cols-2 gap-4 mb-8"
                                >
                                    {[0, 1, 2, 3].map((i) => (
                                        <motion.li key={i} variants={fadeIn} className="flex items-center gap-3">
                                            <div className="bg-indigo-500/20 p-1 rounded-full border border-indigo-400/20">
                                                <Check className="w-4 h-4 text-indigo-400" />
                                            </div>
                                            <span className="text-indigo-100 font-medium">{t(`landing.marketing.kids.features.${i}`)}</span>
                                        </motion.li>
                                    ))}
                                </motion.ul>
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
                            {/* Animated Space Assets scaled down for distance */}
                            <motion.img
                                animate={{ y: [0, -20, 0], rotate: [0, 5, 0], scale: [1, 1.02, 1] }}
                                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                                src="/kids/image-1765886149420.png"
                                alt=""
                                className="absolute w-32 h-32 z-20 drop-shadow-[0_0_20px_rgba(129,140,248,0.4)]"
                            />
                            <motion.img
                                animate={{ y: [0, 30, 0], rotate: [0, -8, 0] }}
                                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                                src="/kids/image-1765886176188.png"
                                alt=""
                                className="absolute bottom-4 right-10 w-24 h-24 z-10 opacity-50 filter blur-[0.5px]"
                            />
                            <motion.img
                                animate={{ x: [0, 15, 0], y: [0, -15, 0] }}
                                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                                src="/kids/image-1765886214428.png"
                                alt=""
                                className="absolute top-4 left-10 w-20 h-20 z-10 opacity-30 filter blur-[1px]"
                            />
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Student Portal Section - Modern Dashboard Style */}
            <section className="py-24 relative overflow-hidden bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="grid lg:grid-cols-2 gap-16 items-center"
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-violet-500 blur-3xl opacity-20 animate-pulse"></div>
                            <motion.img
                                animate={{ y: [0, -10, 0] }}
                                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                                src="/illustrations/techny-standardized-test-as-method-of-assessment.png"
                                alt="Student Portal Marketing"
                                className="relative z-10 rounded-3xl shadow-2xl"
                            />
                        </div>
                        <div>
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-full px-4 py-2 mb-6"
                            >
                                <Trophy className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{t('landing.marketing.student.badge', 'Track & Grow')}</span>
                            </motion.div>
                            <motion.h2
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.1 }}
                                className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-6 leading-tight"
                            >
                                {t('landing.marketing.student.title', 'Empower Students with a Unified Portal').split(t('landing.marketing.student.titleSpan', 'Unified Portal'))[0]}
                                <span className="text-indigo-600">{t('landing.marketing.student.titleSpan', 'Unified Portal')}</span>
                                {t('landing.marketing.student.title', 'Empower Students with a Unified Portal').split(t('landing.marketing.student.titleSpan', 'Unified Portal'))[1]}
                            </motion.h2>
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.2 }}
                                className="text-lg text-gray-600 dark:text-gray-300 mb-8"
                            >
                                {t('landing.marketing.student.desc', 'Give your students a central hub to manage their academic journey. From joining exams with a simple code to tracking past performances and reviewing deep analytics.')}
                            </motion.p>
                            <motion.ul
                                variants={staggerContainer}
                                initial="initial"
                                whileInView="whileInView"
                                viewport={{ once: true }}
                                className="space-y-4 mb-8"
                            >
                                {[0, 1, 2, 3].map((i) => (
                                    <motion.li key={i} variants={fadeIn} className="flex items-center gap-3">
                                        <div className="bg-indigo-100 dark:bg-indigo-900/50 p-1 rounded-full">
                                            <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <span className="text-gray-700 dark:text-gray-300 font-medium">{t(`landing.marketing.student.features.${i}`)}</span>
                                    </motion.li>
                                ))}
                            </motion.ul>
                            <Link to="/student-portal" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95">
                                {t('landing.marketing.student.cta', 'Visit Student Portal')}
                                <ArrowRight className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Mobile App Section */}
            <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <div className="inline-flex items-center justify-center p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full mb-4">
                            <Smartphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                            {t('landing.mobileApp.title', 'Get the Mobile App')}
                        </h2>
                        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                            {t('landing.mobileApp.subtitle', 'Access exams anywhere with our native Android application')}
                        </p>
                    </motion.div>

                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        {/* App Preview Card */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="relative"
                        >
                            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-3xl flex items-center justify-center shadow-lg">
                                        <img src="/logo.png" alt="Durrah" className="w-10 h-10" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Durrah Tutors</h3>
                                        <p className="text-gray-500 dark:text-gray-400">Version 1.1.0</p>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-8">
                                    {[
                                        { icon: Users, text: 'Tutor & Student Access' },
                                        { icon: Bell, text: 'Real-time Push Notifications' },
                                        { icon: Rocket, text: 'Kids Mode with Gamification' },
                                        { icon: Shield, text: 'Secure Exam Taking' }
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-3">
                                            <item.icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                            <span className="text-gray-700 dark:text-gray-300">{item.text}</span>
                                        </div>
                                    ))}
                                </div>

                                <a
                                    href="https://khogxhpnuhhebkevaqlg.supabase.co/storage/v1/object/public/app-releases/DurrahTutors-latest.apk"
                                    className="w-full inline-flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-4 rounded-xl font-bold text-lg shadow-lg transition-all hover:scale-105 active:scale-95"
                                >
                                    <Download className="w-6 h-6" />
                                    Download for Android
                                </a>

                                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
                                    Free • ~35 MB • Android 7.0+
                                </p>
                            </div>
                        </motion.div>

                        {/* Features Grid */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="grid sm:grid-cols-2 gap-6"
                        >
                            {[
                                {
                                    icon: Bell,
                                    title: 'Instant Alerts',
                                    desc: 'Get notified when tutors publish new exams'
                                },
                                {
                                    icon: Users,
                                    title: 'Multiple Modes',
                                    desc: 'Switch between tutor, student, and kids modes'
                                },
                                {
                                    icon: Rocket,
                                    title: 'Kids Adventure',
                                    desc: 'Gamified space-themed quizzes for children'
                                },
                                {
                                    icon: Shield,
                                    title: 'Secure & Fast',
                                    desc: 'Native performance with secure authentication'
                                }
                            ].map((feature, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.1 + idx * 0.1 }}
                                    className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors"
                                >
                                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center mb-4">
                                        <feature.icon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{feature.desc}</p>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer dir="ltr" className="bg-slate-900 text-gray-300 py-12 px-4 sm:px-6 lg:px-8 relative z-10 text-left">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-4 gap-8 mb-8">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Logo className="h-8 w-8" showText={false} />
                                <span className="text-xl font-bold text-white">Durrah</span>
                            </div>
                            <p className="text-gray-400">Modern exam platform for educators</p>
                        </div>
                        <div>
                            <h3 className="font-bold text-white mb-4">Product</h3>
                            <ul className="space-y-2">
                                <li><a href="#features" className="hover:text-white transition">Features</a></li>
                                <li><a href="#pricing" className="hover:text-white transition">Pricing</a></li>
                                <li><Link to="/blog" className="hover:text-white transition">Blog</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold text-white mb-4">Company</h3>
                            <ul className="space-y-2">
                                <li><Link to="/about" className="hover:text-white transition">About</Link></li>
                                <li><Link to="/contact" className="hover:text-white transition">Contact</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold text-white mb-4">Legal</h3>
                            <ul className="space-y-2">
                                <li><Link to="/privacy" className="hover:text-white transition">Privacy</Link></li>
                                <li><Link to="/terms" className="hover:text-white transition">Terms</Link></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
                        <p>&copy; 2025 Durrah. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div >
    );
}
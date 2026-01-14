import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Check, Zap, Shield, Globe, Users, ArrowRight, Layout, Sparkles, Award, Menu, X, Trophy, ChevronDown, Rocket, Orbit, Smartphone, Download, Bell, GraduationCap } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Logo } from '../components/Logo';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useCurrency } from '../hooks/useCurrency';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
    const { t, i18n } = useTranslation();
    const { user, loading, signOut } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userDropdownOpen, setUserDropdownOpen] = useState(false);
    const userDropdownRef = useRef<HTMLDivElement>(null);
    const registrationUrl = 'https://tutors.durrahsystem.tech/register';
    // Force language detection on mount (for main landing page)
    import('../lib/countryLanguageDetector').then(mod => mod.default.lookup());
    const isRTL = i18n.language === 'ar';

    // No auto-redirect - show authenticated UI instead

    const { price: monthlyPrice, currency: currencyCode, isLoading: isCurrencyLoading } = useCurrency(250);
    const { price: yearlyPrice } = useCurrency(2500);

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

        const handleClickOutside = (event: MouseEvent) => {
            if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
                setUserDropdownOpen(false);
            }
        };

        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mousedown', handleClickOutside);
        resize(); init(); animate();
        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const faqs = [
        {
            question: t('landing.faq.q1.question', 'Is Durrah really safe for kids?'),
            answer: t('landing.faq.q1.answer', 'Yes! We prioritize safety with filtered content, secure nickname-only access options, and zero data selling.')
        },
        {
            question: t('landing.faq.q2.question', 'How does the anti-cheating system work?'),
            answer: t('landing.faq.q2.answer', 'Our system uses AI to detect tab switching, fullscreen escapes, and suspicious behavior patterns without intrusive software.')
        },
        {
            question: t('landing.faq.q3.question', 'Can I use Durrah for large school groups?'),
            answer: t('landing.faq.q3.answer', 'Absolutely. Our "Professional" and "Yearly" plans are designed for high-capacity testing with detailed analytics.')
        },
        {
            question: t('landing.faq.q4.question', 'Do students need an account?'),
            answer: t('landing.faq.q4.answer', 'Students can join exams with just a code and nickname, or use the Student Portal to track their long-term progress.')
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
                {/* Primary Meta Tags */}
                <title>{t('landing.seo.title', 'Durrah for Tutors | Create Secure Online Exams')}</title>
                <meta name="description" content={t('landing.seo.description', 'Create professional exams in minutes. Durrah for Tutors offers powerful anti-cheating features, auto-grading, and detailed analytics for educators worldwide.')} />
                <meta name="keywords" content={t('landing.seo.keywords', 'online exams, anti-cheating, kids mode, educator tools, digital assessment, exam creator, quiz maker, online testing platform, secure exams, auto grading')} />
                <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
                <meta name="author" content="Durrah System" />
                <meta name="language" content={i18n.language === 'ar' ? 'Arabic' : 'English'} />
                <link rel="canonical" href="https://durrahtutors.com/" />

                {/* Open Graph / Facebook */}
                <meta property="og:type" content="website" />
                <meta property="og:site_name" content="Durrah for Tutors" />
                <meta property="og:url" content="https://durrahtutors.com/" />
                <meta property="og:title" content={t('landing.seo.title', 'Durrah for Tutors | Create Secure Online Exams')} />
                <meta property="og:description" content={t('landing.seo.description', 'Create professional exams in minutes. Durrah for Tutors offers powerful anti-cheating features, auto-grading, and detailed analytics for educators worldwide.')} />
                <meta property="og:image" content="https://durrahtutors.com/og-image.png" />
                <meta property="og:image:width" content="1200" />
                <meta property="og:image:height" content="630" />
                <meta property="og:image:alt" content="Durrah for Tutors - Online Exam Platform" />
                <meta property="og:locale" content={i18n.language === 'ar' ? 'ar_SA' : 'en_US'} />

                {/* Twitter */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:site" content="@durrahsystem" />
                <meta name="twitter:creator" content="@durrahsystem" />
                <meta name="twitter:url" content="https://durrahtutors.com/" />
                <meta name="twitter:title" content={t('landing.seo.title', 'Durrah for Tutors | Create Secure Online Exams')} />
                <meta name="twitter:description" content={t('landing.seo.description', 'Create professional exams in minutes. Durrah for Tutors offers powerful anti-cheating features, auto-grading, and detailed analytics for educators worldwide.')} />
                <meta name="twitter:image" content="https://durrahtutors.com/og-image.png" />
                <meta name="twitter:image:alt" content="Durrah for Tutors - Online Exam Platform" />

                {/* Additional SEO Meta Tags */}
                <meta name="theme-color" content="#6366f1" />
                <meta name="apple-mobile-web-app-title" content="Durrah for Tutors" />
                <meta name="application-name" content="Durrah for Tutors" />

                {/* Organization Schema - For Google Knowledge Panel & Logo */}
                <script type="application/ld+json">{`
                    {
                        "@context": "https://schema.org",
                        "@type": "Organization",
                        "@id": "https://durrahtutors.com/#organization",
                        "name": "Durrah for Tutors",
                        "alternateName": "Durrah System",
                        "url": "https://durrahtutors.com",
                        "logo": {
                            "@type": "ImageObject",
                            "@id": "https://durrahtutors.com/#logo",
                            "url": "https://durrahtutors.com/logo.png",
                            "contentUrl": "https://durrahtutors.com/logo.png",
                            "width": 512,
                            "height": 512,
                            "caption": "Durrah for Tutors Logo"
                        },
                        "brand": {
                            "@type": "Brand",
                            "name": "Durrah",
                            "logo": "https://durrahtutors.com/logo.png"
                        },
                        "image": {
                            "@type": "ImageObject",
                            "url": "https://durrahtutors.com/og-image.png"
                        },
                        "description": "Create professional exams in minutes. Durrah for Tutors offers powerful anti-cheating features, auto-grading, and detailed analytics for educators worldwide.",
                        "foundingDate": "2024",
                        "sameAs": ["https://durrahtutors.com"]
                    }
                `}</script>

                {/* FAQ Schema for Search Rich Snippets */}
                <script type="application/ld+json">{`
                    {
                        "@context": "https://schema.org",
                        "@type": "FAQPage",
                        "mainEntity": ${JSON.stringify(faqs.map(f => ({
                    "@type": "Question",
                    "name": f.question,
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": f.answer
                    }
                })))}
                    }
                `}</script>

                {/* WebSite Schema - For Sitelinks Search Box */}
                <script type="application/ld+json">{`
                    {
                        "@context": "https://schema.org",
                        "@type": "WebSite",
                        "@id": "https://tutors.durrahsystem.tech/#website",
                        "name": "Durrah for Tutors",
                        "url": "https://tutors.durrahsystem.tech/",
                        "description": "Create professional exams in minutes. Durrah for Tutors offers powerful anti-cheating features, auto-grading, and detailed analytics for educators worldwide.",
                        "inLanguage": "${i18n.language === 'ar' ? 'ar' : 'en'}",
                        "publisher": {
                            "@id": "https://tutors.durrahsystem.tech/#organization"
                        },
                        "potentialAction": {
                            "@type": "SearchAction",
                            "target": {
                                "@type": "EntryPoint",
                                "urlTemplate": "https://tutors.durrahsystem.tech/search?q={search_term_string}"
                            },
                            "query-input": "required name=search_term_string"
                        }
                    }
                `}</script>

                {/* SoftwareApplication Schema - For Rich Results */}
                <script type="application/ld+json">{`
                    {
                        "@context": "https://schema.org",
                        "@type": "SoftwareApplication",
                        "name": "Durrah for Tutors",
                        "applicationCategory": "EducationalApplication",
                        "operatingSystem": "Web, Android, iOS",
                        "offers": {
                            "@type": "Offer",
                            "price": "0",
                            "priceCurrency": "USD",
                            "description": "Free tier available"
                        },
                        "aggregateRating": {
                            "@type": "AggregateRating",
                            "ratingValue": "4.8",
                            "ratingCount": "150",
                            "bestRating": "5",
                            "worstRating": "1"
                        },
                        "description": "Create professional exams in minutes with powerful anti-cheating features, auto-grading, and detailed analytics.",
                        "screenshot": "https://tutors.durrahsystem.tech/og-image.png",
                        "featureList": "Anti-cheating detection, Auto-grading, Kids mode, Real-time analytics, Multiple question types"
                    }
                `}</script>

                {/* WebPage Schema */}
                <script type="application/ld+json">{`
                    {
                        "@context": "https://schema.org",
                        "@type": "WebPage",
                        "@id": "https://tutors.durrahsystem.tech/#webpage",
                        "url": "https://tutors.durrahsystem.tech/",
                        "name": "Durrah for Tutors | Create Secure Online Exams",
                        "description": "Create professional exams in minutes. Durrah for Tutors offers powerful anti-cheating features, auto-grading, and detailed analytics for educators worldwide.",
                        "isPartOf": {
                            "@id": "https://tutors.durrahsystem.tech/#website"
                        },
                        "about": {
                            "@id": "https://tutors.durrahsystem.tech/#organization"
                        },
                        "primaryImageOfPage": {
                            "@type": "ImageObject",
                            "url": "https://tutors.durrahsystem.tech/og-image.png"
                        },
                        "inLanguage": "${i18n.language === 'ar' ? 'ar' : 'en'}"
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
            <nav className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 pt-4">
                <div className="max-w-7xl mx-auto bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-xl shadow-indigo-500/5">
                    <div className="px-6 py-3">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Logo className="h-9 w-9" showText={false} />
                                <div className="flex flex-col">
                                    <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">Durrah</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">{t('common.forTutors')}</span>
                                </div>
                            </div>
                            <div className="hidden lg:flex items-center gap-8">
                                <a href="#features" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{t('nav.features')}</a>
                                <a href="#pricing" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{t('nav.pricing')}</a>
                                <a href="#testimonials" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{t('nav.testimonials')}</a>
                                <Link to="/blog" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{t('nav.blog', 'Blog')}</Link>
                                <LanguageSwitcher />
                                <div className="flex items-center gap-3">
                                    {!loading && user ? (
                                        <div className="relative" ref={userDropdownRef}>
                                            <button
                                                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                                    <Users className="w-4 h-4" />
                                                </div>
                                                <span className="max-w-[150px] truncate">{user.email}</span>
                                                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${userDropdownOpen ? 'rotate-180' : ''}`} />
                                            </button>

                                            <AnimatePresence>
                                                {userDropdownOpen && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                        className={`absolute top-full ${isRTL ? 'left-0' : 'right-0'} mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-2 z-[60]`}
                                                    >
                                                        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 mb-2">
                                                            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{t('nav.signedInAs', 'Signed in as')}</p>
                                                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.email}</p>
                                                        </div>
                                                        <Link to="/dashboard" onClick={() => setUserDropdownOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all">
                                                            <Layout className="w-4 h-4" />
                                                            {t('nav.goToDashboard', 'Go to Dashboard')}
                                                        </Link>
                                                        <Link to="/settings" onClick={() => setUserDropdownOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all">
                                                            <Trophy className="w-4 h-4" />
                                                            {t('nav.settings', 'Account Settings')}
                                                        </Link>
                                                        <div className="h-px bg-gray-100 dark:bg-gray-800 my-2 mx-2"></div>
                                                        <button
                                                            onClick={() => {
                                                                setUserDropdownOpen(false);
                                                                signOut();
                                                            }}
                                                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                                        >
                                                            <X className="w-4 h-4" />
                                                            {t('nav.signOut', 'Sign Out')}
                                                        </button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
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
                                {t('nav.blog', 'Blog')}
                            </Link>

                            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                <div className="mb-4">
                                    <LanguageSwitcher />
                                </div>
                                {!loading && user ? (
                                    <div className="space-y-2">
                                        <div className="py-4 px-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-gray-700 mb-4">
                                            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">{t('nav.signedInAs', 'Signed in as')}</p>
                                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.email}</p>
                                        </div>
                                        <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="block py-4 px-4 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white rounded-2xl font-bold text-center shadow-lg shadow-indigo-500/20">
                                            {t('nav.goToDashboard', 'Go to Dashboard')}
                                        </Link>
                                        <button
                                            onClick={() => {
                                                setMobileMenuOpen(false);
                                                signOut();
                                            }}
                                            className="w-full py-4 px-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl font-bold text-center border border-red-100 dark:border-red-900/30"
                                        >
                                            {t('nav.signOut', 'Sign Out')}
                                        </button>
                                    </div>
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
            <section className="relative pt-40 pb-32 overflow-hidden bg-slate-50 dark:bg-slate-950">
                {/* Background Grid & Noise */}
                <div className="absolute inset-0 bg-grid-pattern opacity-[0.4] pointer-events-none" />
                <div className="absolute inset-0 bg-noise pointer-events-none" />

                {/* Mesh Gradients */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-500/20 rounded-full blur-[100px] opacity-70 animate-pulse-slow pointer-events-none" />
                <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[80px] opacity-50 pointer-events-none" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center max-w-4xl mx-auto mb-20">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-indigo-100 dark:border-indigo-900/50 rounded-full px-4 py-2 mb-8 shadow-sm"
                        >
                            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span className="text-sm font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                                {t('hero.trustedBadge')}
                            </span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white mb-8 tracking-tight leading-[1.1]"
                        >
                            {t('hero.title')} <br />
                            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent pb-2">
                                {t('hero.titleHighlight')}
                            </span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 mb-10 leading-relaxed"
                        >
                            {t('hero.subtitle')}
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                        >
                            <a href={registrationUrl} target="_blank" rel="noreferrer" className="group relative bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-4 rounded-xl font-bold text-lg shadow-2xl hover:scale-[1.02] transition-all duration-300 shine-effect overflow-hidden">
                                <span className="relative z-10 flex items-center gap-2">
                                    {t('hero.cta')}
                                    <ArrowRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${isRTL ? 'rotate-180' : ''}`} />
                                </span>
                            </a>
                            <Link to="/demo" className="group px-8 py-4 rounded-xl font-bold text-lg text-slate-700 dark:text-slate-200 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-all flex items-center gap-2">
                                {t('hero.watchDemo', 'Interactive Demo')}
                                <Zap className="w-5 h-5" />
                            </Link>
                        </motion.div>
                    </div>

                    {/* 3D Dashboard Mockup */}
                    <motion.div
                        initial={{ opacity: 0, y: 60, rotateX: 20 }}
                        animate={{ opacity: 1, y: 0, rotateX: 10 }}
                        transition={{ duration: 0.8, type: "spring" }}
                        className="relative perspective-2000"
                    >
                        <div className="relative transform-style-3d rotate-x-12 mx-auto max-w-5xl">
                            <div className="relative bg-slate-900 rounded-2xl p-2 shadow-2xl border border-slate-700/50">
                                {/* Browser Chrome */}
                                <div className="h-8 bg-slate-800/50 rounded-t-xl flex items-center px-4 gap-2 border-b border-slate-700/50">
                                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                                    <div className="mx-auto w-1/2 h-5 bg-slate-700/30 rounded-md text-center text-[10px] text-slate-400 flex items-center justify-center font-mono">
                                        durrahtutors.com/dashboard
                                    </div>
                                </div>
                                {/* Mockup Content (Screenshot Placeholder) */}
                                <div className="aspect-[16/10] bg-slate-950 rounded-b-xl overflow-hidden relative">
                                    {/* Sidebar */}
                                    <div className="absolute left-0 top-0 bottom-0 w-64 bg-slate-900 border-r border-slate-800 p-4 hidden md:block">
                                        <div className="h-8 w-32 bg-indigo-500/20 rounded-lg mb-8" />
                                        <div className="space-y-4">
                                            {[1, 2, 3, 4, 5].map(i => (
                                                <div key={i} className="h-4 w-full bg-slate-800 rounded opacity-60" />
                                            ))}
                                        </div>
                                    </div>
                                    {/* Main Content */}
                                    <div className="absolute top-0 right-0 bottom-0 left-0 md:left-64 p-8 bg-slate-950/50 grid grid-cols-3 gap-6">
                                        {/* Cards */}
                                        <div className="col-span-2 h-48 bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                                            <div className="h-full w-full bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-lg flex items-center justify-center">
                                                <div className="text-slate-600 font-mono text-sm">Activity Chart</div>
                                            </div>
                                        </div>
                                        <div className="h-48 bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                                            <div className="h-8 w-8 rounded-full bg-emerald-500/20 mb-4" />
                                            <div className="h-4 w-12 bg-slate-800 rounded mb-2" />
                                            <div className="h-8 w-20 bg-slate-700 rounded" />
                                        </div>
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="h-32 bg-slate-900/50 border border-slate-800 rounded-xl" />
                                        ))}
                                    </div>

                                    {/* Floating Badges */}
                                    <motion.div
                                        animate={{ y: [0, -10, 0] }}
                                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                        className="absolute top-10 right-10 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-xl shadow-xl"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">A+</div>
                                            <div>
                                                <div className="text-xs text-white/60">Average Score</div>
                                                <div className="text-lg font-bold text-white">92%</div>
                                            </div>
                                        </div>
                                    </motion.div>

                                    <motion.div
                                        animate={{ y: [0, 15, 0] }}
                                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                                        className="absolute bottom-20 left-72 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-xl shadow-xl hidden md:block"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Shield className="w-8 h-8 text-indigo-400" />
                                            <div>
                                                <div className="text-xs text-white/60">Status</div>
                                                <div className="text-sm font-bold text-white">Anti-Cheat Active</div>
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
                            </div>

                            {/* Reflection on floor */}
                            <div className="absolute top-full left-0 right-0 h-40 bg-gradient-to-b from-indigo-500/10 to-transparent blur-3xl transform -scale-y-100 opacity-50 pointer-events-none" />
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Infinite Logo Marquee */}
            <div className="w-full py-10 bg-white dark:bg-slate-950 border-y border-slate-100 dark:border-slate-900 overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 text-center mb-6">
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">Trusted by educators at</p>
                </div>
                <div className="relative flex overflow-x-hidden group">
                    <div className="animate-marquee whitespace-nowrap flex gap-16 px-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                        {/* Placeholder Company Logos - Repeated */}
                        {[1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6].map((i, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xl font-bold font-serif text-slate-400">
                                <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-full" />
                                <span>University {i}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Features Section - Bento Grid */}
            <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 relative bg-white dark:bg-slate-950">
                <div className="absolute inset-0 bg-grid-pattern opacity-[0.3] pointer-events-none" />
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="text-center mb-16 max-w-3xl mx-auto">
                        <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-full px-4 py-2 mb-4">
                            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{t('features.badge')}</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">{t('features.title')}</h2>
                        <p className="text-xl text-slate-600 dark:text-slate-400">{t('features.subtitle')}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(250px,auto)]">
                        {/* 1. Large Feature - Anti Cheating */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="md:col-span-2 glass-card rounded-3xl p-8 relative overflow-hidden group hover:border-indigo-500/30 transition-colors"
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/20 transition-colors" />

                            <div className="relative z-10 h-full flex flex-col justify-between">
                                <div>
                                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center mb-6 text-indigo-600 dark:text-indigo-400">
                                        <Shield className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">{t('features.antiCheating.title')}</h3>
                                    <p className="text-slate-600 dark:text-slate-400 text-lg max-w-md">{t('features.antiCheating.desc')}</p>
                                </div>
                                <div className="mt-8 flex gap-3 text-sm font-medium text-slate-500">
                                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">Tab Detection</span>
                                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">Fullscreen Lock</span>
                                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">AI Proctor</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* 2. Tall Feature - Global Access */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="md:row-span-2 glass-card rounded-3xl p-8 relative overflow-hidden group hover:border-pink-500/30 transition-colors"
                        >
                            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-pink-500/5 to-transparent opacity-50" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl group-hover:bg-pink-500/30 transition-colors" />

                            <div className="relative z-10 flex flex-col h-full items-center text-center">
                                <div className="w-16 h-16 bg-pink-100 dark:bg-pink-900/50 rounded-2xl flex items-center justify-center mb-6 text-pink-600 dark:text-pink-400 shadow-lg shadow-pink-500/20">
                                    <Globe className="w-8 h-8" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">{t('features.globalAccess.title')}</h3>
                                <p className="text-slate-600 dark:text-slate-400 mb-8">{t('features.globalAccess.desc')}</p>

                                {/* Decoration: Rotating Globe/Map Graphic Placeholder */}
                                <div className="mt-auto relative w-full aspect-square opacity-80">
                                    <div className="absolute inset-0 border border-pink-200 dark:border-pink-800 rounded-full animate-spin-slow" />
                                    <div className="absolute inset-4 border border-pink-200 dark:border-pink-800 rounded-full animate-spin-slow animation-delay-2000" style={{ animationDirection: 'reverse' }} />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-2 h-2 bg-pink-500 rounded-full animate-ping" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* 3. Standard Feature - Fast Creation */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="glass-card rounded-3xl p-8 relative overflow-hidden group hover:border-yellow-500/30 transition-colors"
                        >
                            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/50 rounded-2xl flex items-center justify-center mb-4 text-yellow-600 dark:text-yellow-400">
                                <Zap className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('features.fastCreation.title')}</h3>
                            <p className="text-slate-600 dark:text-slate-400">{t('features.fastCreation.desc')}</p>
                        </motion.div>

                        {/* 4. Standard Feature - Unlimited Students */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 }}
                            className="glass-card rounded-3xl p-8 relative overflow-hidden group hover:border-green-500/30 transition-colors"
                        >
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-2xl flex items-center justify-center mb-4 text-green-600 dark:text-green-400">
                                <Users className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('features.unlimitedStudents.title')}</h3>
                            <p className="text-slate-600 dark:text-slate-400">{t('features.unlimitedStudents.desc')}</p>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Pricing Section - Modernized */}
            <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-900">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-full px-4 py-2 mb-4">
                            <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{t('pricing.badge')}</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">{t('pricing.title')}</h2>
                        <p className="text-xl text-slate-600 dark:text-slate-400">{t('pricing.subtitle')}</p>
                    </div>

                    <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        whileInView="whileInView"
                        viewport={{ once: true }}
                        className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto"
                    >
                        {/* Wrapper for Pricing Cards to keep them uniform height */}
                        <motion.div variants={fadeIn} className="flex flex-col bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 hover:shadow-xl transition-all duration-300">
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t('pricing.starter.title')}</h3>
                            <div className="mb-6"><span className="text-5xl font-black text-slate-900 dark:text-white tracking-tight">{t('pricing.starter.price')}</span></div>
                            <ul className="space-y-4 mb-8 flex-1">
                                <li className="flex items-start"><Check className="h-5 w-5 text-indigo-500 mr-3 flex-shrink-0" /><span className="text-slate-600 dark:text-slate-300 text-sm font-medium">{t('pricing.starter.features.0')}</span></li>
                                <li className="flex items-start"><Check className="h-5 w-5 text-indigo-500 mr-3 flex-shrink-0" /><span className="text-slate-600 dark:text-slate-300 text-sm font-medium">{t('pricing.starter.features.1')}</span></li>
                                <li className="flex items-start"><Check className="h-5 w-5 text-indigo-500 mr-3 flex-shrink-0" /><span className="text-slate-600 dark:text-slate-300 text-sm font-medium">{t('pricing.starter.features.2')}</span></li>
                            </ul>
                            <a href={registrationUrl} target="_blank" rel="noreferrer" className="block w-full text-center bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white py-4 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">{t('pricing.starter.cta')}</a>
                        </motion.div>

                        <motion.div
                            variants={fadeIn}
                            className="flex flex-col relative bg-slate-900 dark:bg-indigo-600 rounded-3xl shadow-2xl p-8 transform md:-translate-y-4 border border-slate-700 dark:border-indigo-500 ring-4 ring-indigo-500/10"
                        >
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-1 rounded-full font-bold text-xs uppercase tracking-wider shadow-lg">Most Popular</div>
                            <h3 className="text-2xl font-bold text-white mb-2">{t('pricing.professional.title')}</h3>
                            <div className="mb-6">
                                <span className="text-5xl font-black text-white tracking-tight">{isCurrencyLoading ? '...' : `${currencyCode} ${monthlyPrice}`}</span>
                                <span className="text-slate-400 dark:text-indigo-200 text-sm font-medium ml-2">{t('pricing.professional.period')}</span>
                            </div>
                            <ul className="space-y-4 mb-8 flex-1">
                                {[0, 1, 2, 3].map(i => (
                                    <li key={i} className="flex items-start"><Check className="h-5 w-5 text-green-400 mr-3 flex-shrink-0" /><span className="text-slate-300 dark:text-indigo-50 text-sm font-medium">{t(`pricing.professional.features.${i}`)}</span></li>
                                ))}
                            </ul>
                            <a href={registrationUrl} target="_blank" rel="noreferrer" className="block w-full text-center bg-white text-slate-900 dark:text-indigo-600 py-4 rounded-xl font-bold hover:bg-slate-100 transition-colors shadow-lg">{t('pricing.professional.cta')}</a>
                        </motion.div>

                        <motion.div variants={fadeIn} className="flex flex-col bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 hover:shadow-xl transition-all duration-300">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{t('pricing.yearly.title')}</h3>
                                <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-2 py-1 rounded-md font-bold">SAVE 20%</span>
                            </div>
                            <div className="mb-6">
                                <span className="text-5xl font-black text-slate-900 dark:text-white tracking-tight">{isCurrencyLoading ? '...' : `${currencyCode} ${yearlyPrice}`}</span>
                                <span className="text-slate-500 dark:text-slate-400 text-sm font-medium ml-2">{t('pricing.yearly.period')}</span>
                            </div>
                            <ul className="space-y-4 mb-8 flex-1">
                                {[0, 1, 2].map(i => (
                                    <li key={i} className="flex items-start"><Check className="h-5 w-5 text-indigo-500 mr-3 flex-shrink-0" /><span className="text-slate-600 dark:text-slate-300 text-sm font-medium">{t(`pricing.yearly.features.${i}`)}</span></li>
                                ))}
                            </ul>
                            <a href={registrationUrl} target="_blank" rel="noreferrer" className="block w-full text-center bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20">{t('pricing.yearly.cta')}</a>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* FAQ Section - Cleaned Up */}
            <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950/50 relative overflow-hidden">
                <div className="absolute inset-0 bg-noise opacity-50 pointer-events-none" />
                <div className="max-w-3xl mx-auto relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
                            {t('landing.faq.title', 'Frequently Asked Questions')}
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400">
                            {t('landing.faq.subtitle', 'Everything you need to know about Durrah')}
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
                                className={`bg-white dark:bg-slate-800 rounded-2xl border ${activeFaq === index ? 'border-indigo-500 dark:border-indigo-500 ring-4 ring-indigo-500/10' : 'border-slate-200 dark:border-slate-700'} overflow-hidden shadow-sm hover:shadow-md transition-all duration-300`}
                            >
                                <button
                                    onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                                    className="w-full px-6 py-5 text-left flex justify-between items-center group"
                                >
                                    <span className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        {t(`landing.faq.q${index + 1}.question`, faq.question)}
                                    </span>
                                    <motion.div
                                        animate={{ rotate: activeFaq === index ? 180 : 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <ChevronDown className={`w-5 h-5 ${activeFaq === index ? 'text-indigo-600' : 'text-slate-400'}`} />
                                    </motion.div>
                                </button>
                                <AnimatePresence>
                                    {activeFaq === index && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            <div className="px-6 pb-6 text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-700/50 pt-4">
                                                {t(`landing.faq.q${index + 1}.answer`, faq.answer)}
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
            <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 relative overflow-hidden" >
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
            <section className="py-32 relative overflow-hidden bg-[#050616] text-white" >
                {/* Space Atmosphere Background */}
                <div className="absolute inset-0 pointer-events-none" >
                    <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-60" />
                    {/* Top Fade: Blend from CTA purple to Space Dark */}
                    <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-[#4c1d95]/80 via-[#050616]/80 to-transparent"></div>
                    {/* Bottom Fade: Blend from Space Dark to next section (White/Slate) */}
                    <div className="absolute bottom-0 left-0 w-full h-96 bg-gradient-to-t from-white dark:from-slate-900 via-[#050616]/50 to-transparent"></div>

                    {/* Nebula Glows */}
                    <div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse"></div>
                    <div className="absolute bottom-1/4 -right-1/4 w-[600px] h-[600px] bg-violet-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="flex justify-center mb-12">
                        <div className="glass-panel px-6 py-2 rounded-full flex items-center gap-2 border-indigo-500/30">
                            <Orbit className="h-5 w-5 text-indigo-400 animate-spin-slow" />
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
                                <Zap className="h-4 w-4 fill-current animate-pulse" />
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
                                alt="Kids Space Illustration"
                                className="absolute w-32 h-32 z-20 drop-shadow-[0_0_20px_rgba(129,140,248,0.4)]"
                            />
                            <motion.img
                                animate={{ y: [0, 30, 0], rotate: [0, -8, 0] }}
                                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                                src="/kids/image-1765886176188.png"
                                alt="Floating Star Illustration"
                                className="absolute bottom-4 right-10 w-24 h-24 z-10 opacity-50 filter blur-[0.5px]"
                            />
                            <motion.img
                                animate={{ x: [0, 15, 0], y: [0, -15, 0] }}
                                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                                src="/kids/image-1765886214428.png"
                                alt="Rocket Path Illustration"
                                className="absolute top-4 left-10 w-20 h-20 z-10 opacity-30 filter blur-[1px]"
                            />
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Student Portal Section - Modern Dashboard Style */}
            <section className="py-24 relative overflow-hidden bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800" >
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

            {/* How to Section (SEO Optimization) */}
            <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-900/50 border-y border-gray-100 dark:border-slate-800" >
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-6">
                            {t('landing.howto.title', 'How to Create an Online Exam in 3 Simple Steps')}
                        </h2>
                        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                            {t('landing.howto.subtitle', 'Get your assessment up and running in minutes with our streamlined process.')}
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-12">
                        <div className="flex flex-col items-center text-center">
                            <div className="mb-6 w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">1</div>
                            <h3 className="text-2xl font-bold mb-4">{t('landing.howto.step1.title', '1. Build Your Content')}</h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                {t('landing.howto.step1.desc', 'Use our lightning-fast editor to create multiple-choice, numeric, or open-ended questions. Add images and math formulas with ease.')}
                            </p>
                        </div>
                        <div className="flex flex-col items-center text-center">
                            <div className="mb-6 w-16 h-16 bg-violet-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">2</div>
                            <h3 className="text-2xl font-bold mb-4">{t('landing.howto.step2.title', '2. Set Security Rules')}</h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                {t('landing.howto.step2.desc', 'Enable one-click anti-cheating features like tab detection, fullscreen enforcement, and violation tracking to ensure academic integrity.')}
                            </p>
                        </div>
                        <div className="flex flex-col items-center text-center">
                            <div className="mb-6 w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">3</div>
                            <h3 className="text-2xl font-bold mb-4">{t('landing.howto.step3.title', '3. Share & Analyze')}</h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                {t('landing.howto.step3.desc', 'Generate a unique exam link or QR code. Once students submit, get instant reports and beautiful per-student performance analytics.')}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Mobile App Section */}
            <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950" >
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
                                <div className="flex items-center gap-5 mb-8">
                                    <div className="w-20 h-20 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-[30%] flex items-center justify-center shadow-[0_20px_40px_-10px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] border border-white/60 dark:border-gray-600/50 transition-transform hover:scale-105 group relative overflow-hidden">
                                        {/* Subtle internal glow */}
                                        <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <GraduationCap className="w-12 h-12 text-indigo-600 dark:text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.3)]" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{t('landing.mobileApp.appName', 'Durrah Tutors')}</h3>
                                        <p className="text-gray-500 dark:text-gray-400 font-medium">{t('landing.mobileApp.version', 'Version 1.1.0')}</p>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-8">
                                    {[
                                        { icon: Users, text: t('landing.mobileApp.features.tutorAccess', 'Tutor & Student Access') },
                                        { icon: Bell, text: t('landing.mobileApp.features.notifications', 'Real-time Push Notifications') },
                                        { icon: Rocket, text: t('landing.mobileApp.features.kidsMode', 'Kids Mode with Gamification') },
                                        { icon: Shield, text: t('landing.mobileApp.features.secure', 'Secure Exam Taking') }
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
                                    {t('landing.mobileApp.download', 'Download for Android')}
                                </a>

                                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
                                    {t('landing.mobileApp.specs', 'Free • ~35 MB • Android 7.0+')}
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
                                    title: t('landing.mobileApp.grid.alerts.title', 'Instant Alerts'),
                                    desc: t('landing.mobileApp.grid.alerts.desc', 'Get notified when tutors publish new exams')
                                },
                                {
                                    icon: Users,
                                    title: t('landing.mobileApp.grid.modes.title', 'Multiple Modes'),
                                    desc: t('landing.mobileApp.grid.modes.desc', 'Switch between tutor, student, and kids modes')
                                },
                                {
                                    icon: Rocket,
                                    title: t('landing.mobileApp.grid.adventure.title', 'Kids Adventure'),
                                    desc: t('landing.mobileApp.grid.adventure.desc', 'Gamified space-themed quizzes for children')
                                },
                                {
                                    icon: Shield,
                                    title: t('landing.mobileApp.grid.security.title', 'Secure & Fast'),
                                    desc: t('landing.mobileApp.grid.security.desc', 'Native performance with secure authentication')
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
            <footer dir="ltr" className="bg-slate-900 text-gray-300 py-12 px-4 sm:px-6 lg:px-8 relative z-10 text-left" >
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
                            <ul className="space-y-4">
                                <li><Link to="/pricing" className="text-gray-400 hover:text-white transition-colors">{t('footer.links.pricing')}</Link></li>
                                <li><a href="#testimonials" className="text-gray-400 hover:text-white transition-colors">{t('footer.links.testimonials')}</a></li>
                                <li><Link to="/blog" className="text-gray-400 hover:text-white transition-colors">{t('footer.links.blog')}</Link></li>
                                <li><a href="mailto:abdelrahmansandoby@gmail.com" className="text-gray-400 hover:text-white transition-colors">{t('footer.links.contact')}</a></li>
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
                            <h4 className="text-white font-bold mb-6">{t('footer.legalTitle')}</h4>
                            <ul className="space-y-4">
                                <li><Link to="/privacy" className="text-gray-400 hover:text-white transition-colors">{t('footer.legal.privacy')}</Link></li>
                                <li><Link to="/terms" className="text-gray-400 hover:text-white transition-colors">{t('footer.legal.terms')}</Link></li>
                                <li><Link to="/refund-policy" className="text-gray-400 hover:text-white transition-colors">{t('footer.legal.refund')}</Link></li>
                                <li><Link to="/refund-policy" className="text-gray-400 hover:text-white transition-colors">{t('footer.legal.cancellation', 'Cancellation Policy')}</Link></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
                        <p>&copy; 2025 Durrah. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
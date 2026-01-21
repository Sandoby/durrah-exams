import { Link } from 'react-router-dom';
import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CaretDown, UsersThree, Medal, X, Layout, List } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../hooks/useCurrency';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { Logo } from '../components/Logo';
import { LandingPageSEO } from '../components/landing/LandingPageSEO';
import { HeroSection } from '../components/landing/HeroSection';
import { PlatformHighlights } from '../components/landing/PlatformHighlights';

const FeaturesBento = lazy(() => import('../components/landing/FeaturesBento').then(mod => ({ default: mod.FeaturesBento })));
const PricingSection = lazy(() => import('../components/landing/PricingSection').then(mod => ({ default: mod.PricingSection })));
const FAQSection = lazy(() => import('../components/landing/FAQSection').then(mod => ({ default: mod.FAQSection })));
const CTASection = lazy(() => import('../components/landing/CTASection').then(mod => ({ default: mod.CTASection })));
const KidsFeature = lazy(() => import('../components/landing/KidsFeature').then(mod => ({ default: mod.KidsFeature })));
const StudentPortalFeature = lazy(() => import('../components/landing/StudentPortalFeature').then(mod => ({ default: mod.StudentPortalFeature })));
const MobileAppSection = lazy(() => import('../components/landing/MobileAppSection').then(mod => ({ default: mod.MobileAppSection })));
const Footer = lazy(() => import('../components/landing/Footer').then(mod => ({ default: mod.Footer })));

const InteractiveHowTo = lazy(() =>
    import('../components/InteractiveHowTo').then(mod => ({ default: mod.InteractiveHowTo }))
);

export default function LandingPage() {
    const { t, i18n } = useTranslation();
    const { user, loading, signOut } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userDropdownOpen, setUserDropdownOpen] = useState(false);
    const userDropdownRef = useRef<HTMLDivElement>(null);
    const registrationUrl = 'https://tutors.durrahsystem.tech/register';
    const isRTL = i18n.language === 'ar';
    const [showNonCriticalEffects, setShowNonCriticalEffects] = useState(false);

    // Force language detection on mount (for main landing page)
    useEffect(() => {
        void import('../lib/countryLanguageDetector')
            .then(mod => mod.default.lookup())
            .catch(() => undefined);
    }, []);

    // Defer non-critical visuals/components until after initial paint/idle time.
    useEffect(() => {
        let cancelled = false;
        const enable = () => {
            if (!cancelled) setShowNonCriticalEffects(true);
        };

        const w = window as unknown as {
            requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
            cancelIdleCallback?: (id: number) => void;
        };

        if (typeof w.requestIdleCallback === 'function') {
            const id = w.requestIdleCallback(enable, { timeout: 1500 });
            return () => {
                cancelled = true;
                w.cancelIdleCallback?.(id);
            };
        }

        const id = window.setTimeout(enable, 0);
        return () => {
            cancelled = true;
            window.clearTimeout(id);
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
                setUserDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const { price: monthlyPrice, currency: currencyCode, isLoading: isCurrencyLoading } = useCurrency(5);
    const { price: yearlyPrice } = useCurrency(50);


    return (
        <div className="min-h-screen bg-white dark:bg-slate-950" dir={isRTL ? 'rtl' : 'ltr'}>
            <LandingPageSEO />

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
                                                    <UsersThree weight="duotone" className="w-4 h-4" />
                                                </div>
                                                <span className="max-w-[150px] truncate">{user.email}</span>
                                                <CaretDown weight="bold" className={`w-4 h-4 transition-transform duration-300 ${userDropdownOpen ? 'rotate-180' : ''}`} />
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
                                                            <Layout weight="duotone" className="w-4 h-4" />
                                                            {t('nav.goToDashboard', 'Go to Dashboard')}
                                                        </Link>
                                                        <Link to="/settings" onClick={() => setUserDropdownOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all">
                                                            <Medal weight="duotone" className="w-4 h-4" />
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
                                {mobileMenuOpen ? <X weight="bold" className="w-6 h-6" /> : <List weight="bold" className="w-6 h-6" />}
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

            <HeroSection registrationUrl={registrationUrl} showNonCriticalEffects={showNonCriticalEffects} />

            <PlatformHighlights />

            <Suspense fallback={<div className="py-24" />}>
                <FeaturesBento />
            </Suspense>

            <Suspense fallback={<div className="py-24" />}>
                <PricingSection
                    registrationUrl={registrationUrl}
                    isCurrencyLoading={isCurrencyLoading}
                    currencyCode={currencyCode || ''}
                    monthlyPrice={monthlyPrice || ''}
                    yearlyPrice={yearlyPrice || ''}
                />
            </Suspense>

            <Suspense fallback={<div className="py-24" />}>
                <FAQSection />
            </Suspense>


            <Suspense fallback={<div className="py-24" />}>
                <CTASection registrationUrl={registrationUrl} />
            </Suspense>

            <Suspense fallback={<div className="py-24" />}>
                <KidsFeature showNonCriticalEffects={showNonCriticalEffects} />
            </Suspense>

            <Suspense fallback={<div className="py-24" />}>
                <StudentPortalFeature />
            </Suspense>

            {showNonCriticalEffects && (
                <Suspense fallback={null}>
                    <InteractiveHowTo />
                </Suspense>
            )}

            <Suspense fallback={<div className="py-24" />}>
                <MobileAppSection showNonCriticalEffects={showNonCriticalEffects} />
            </Suspense>

            <Suspense fallback={<div className="py-24" />}>
                <Footer />
            </Suspense>
        </div>
    );
}

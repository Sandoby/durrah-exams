import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { ArrowRight, Sparkle } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { Suspense, lazy } from 'react';
import { HeroMascot } from '../HeroMascot';
import { OwlMascot } from '../OwlMascot';

const GridSpotlight = lazy(() =>
    import('../GridSpotlight').then(mod => ({ default: mod.GridSpotlight }))
);

export function HeroSection({ registrationUrl, showNonCriticalEffects }: { registrationUrl: string, showNonCriticalEffects: boolean }) {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';
    const { scrollY } = useScroll();

    const heroRotateXRaw = useTransform(scrollY, [0, 750], [8, 14]);
    const heroTranslateYRaw = useTransform(scrollY, [0, 750], [0, 48]);
    const heroScaleRaw = useTransform(scrollY, [0, 750], [1, 0.985]);

    const heroRotateX = useSpring(heroRotateXRaw, { stiffness: 120, damping: 28 });
    const heroTranslateY = useSpring(heroTranslateYRaw, { stiffness: 120, damping: 28 });
    const heroScale = useSpring(heroScaleRaw, { stiffness: 120, damping: 28 });

    const heroIllustrationYRaw = useTransform(scrollY, [0, 650], [0, 40]);
    const heroIllustrationRotateRaw = useTransform(scrollY, [0, 650], [-1.5, 1.5]);
    const heroIllustrationScaleRaw = useTransform(scrollY, [0, 650], [1, 0.985]);

    const heroIllustrationY = useSpring(heroIllustrationYRaw, { stiffness: 120, damping: 28 });
    const heroIllustrationRotate = useSpring(heroIllustrationRotateRaw, { stiffness: 120, damping: 28 });
    const heroIllustrationScale = useSpring(heroIllustrationScaleRaw, { stiffness: 120, damping: 28 });

    return (
        <section className="relative pt-32 pb-20 overflow-hidden bg-white dark:bg-slate-950 min-h-[90vh]">
            {showNonCriticalEffects && (
                <Suspense fallback={null}>
                    <GridSpotlight />
                </Suspense>
            )}

            <div className="absolute inset-0 bg-noise opacity-[0.4] pointer-events-none" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-500/20 rounded-full blur-[100px] opacity-70 animate-pulse-slow pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="mb-20 grid lg:grid-cols-2 lg:gap-10 items-center">
                    <div className="text-center max-w-4xl mx-auto lg:text-left lg:max-w-none lg:mx-0">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-indigo-100 dark:border-indigo-900/50 rounded-full px-4 py-2 mb-8 shadow-sm"
                        >
                            <Sparkle weight="fill" className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span className="text-sm font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                                {t('hero.trustedBadge')}
                            </span>
                        </motion.div>

                        <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-12 mb-12">
                            <div className="flex-shrink-0 order-first lg:order-none">
                                <HeroMascot className="transform scale-90 md:scale-110" />
                            </div>

                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="hero-title-neon text-5xl md:text-7xl font-black leading-[1.1]"
                            >
                                {t('hero.title')} <br />
                                <span className="hero-title-glow bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent pb-2">
                                    {t('hero.titleHighlight')}
                                </span>
                            </motion.h1>
                        </div>

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
                            transition={{ delay: 0.25 }}
                            className="flex justify-center mb-8"
                        >
                            <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 px-4 py-2 shadow-sm">
                                <OwlMascot
                                    variant="guide"
                                    className="h-10 w-10"
                                    alt="Durrah Owl mascot"
                                    loading="eager"
                                    width={40}
                                    height={40}
                                />
                                <div className="text-left">
                                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                        Your learning guide
                                    </div>
                                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                        Durrah Owl
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                        >
                            <a href={registrationUrl} target="_blank" rel="noreferrer" className="group relative bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-4 rounded-xl font-bold text-lg shadow-2xl hover:scale-[1.02] transition-all duration-300 shine-effect overflow-hidden">
                                <span className="relative z-10 flex items-center gap-2">
                                    {t('hero.cta')}
                                    <ArrowRight weight="bold" className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${isRTL ? 'rotate-180' : ''}`} />
                                </span>
                            </a>
                        </motion.div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 }}
                        className="hidden lg:flex justify-end lg:mt-[-60px]"
                        style={{ y: heroIllustrationY, rotate: heroIllustrationRotate, scale: heroIllustrationScale }}
                    >
                        <div className="w-full max-w-lg xl:max-w-xl rounded-[28px] bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/60 shadow-[0_40px_80px_-30px_rgba(15,23,42,0.35)] p-3">
                            <img
                                src="/illustrations/84406320_9963615.jpg"
                                alt="Durrah Learning Platform"
                                className="w-full h-auto rounded-2xl"
                                loading="eager"
                                width={500}
                                height={500}
                                style={{ fetchPriority: 'high' } as any}
                            />
                        </div>
                    </motion.div>

                    <div className="mt-10 flex justify-center lg:hidden">
                        <div className="w-full max-w-md rounded-[28px] bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/60 shadow-[0_35px_70px_-35px_rgba(15,23,42,0.35)] p-3">
                            <img
                                src="/illustrations/84406320_9963615.jpg"
                                alt="Durrah Learning Platform"
                                className="w-full h-auto rounded-2xl"
                                loading="eager"
                                width={400}
                                height={400}
                                style={{ fetchPriority: 'high' } as any}
                            />
                        </div>
                    </div>
                </div>

                <motion.div
                    style={{ rotateX: heroRotateX, y: heroTranslateY, scale: heroScale }}
                    initial={{ opacity: 0, y: 60 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, type: "spring", delay: 0.2 }}
                    className="relative perspective-2000"
                >
                    <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                        className="relative transform-style-3d rotate-x-6 mx-auto max-w-5xl"
                    >
                        <div className="relative bg-slate-900 rounded-2xl p-2 shadow-2xl border border-slate-700/50">
                            <div className="h-8 bg-slate-800/50 rounded-t-xl flex items-center px-4 gap-2 border-b border-slate-700/50">
                                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                                <div className="mx-auto w-1/2 h-5 bg-slate-700/30 rounded-md text-center text-[10px] text-slate-400 flex items-center justify-center font-mono">
                                    durrahtutors.com/dashboard
                                </div>
                            </div>
                            <div className="aspect-[16/10] bg-slate-950 rounded-b-xl overflow-hidden relative group">
                                <motion.img
                                    initial={{ opacity: 0, scale: 1.1 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 1 }}
                                    src="/mockups/dashboard-hero.png"
                                    alt="Durrah Dashboard Analytics"
                                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-700"
                                    width={1000}
                                    height={625}
                                    loading="eager"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export function HeroSection({ registrationUrl }: { registrationUrl: string }) {
    const { t } = useTranslation();
    const containerRef = useRef<HTMLDivElement>(null);

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end start"]
    });

    const logoScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.7]);
    const logoOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
    const logoY = useTransform(scrollYProgress, [0, 0.5], [0, -100]);

    return (
        <section ref={containerRef} className="relative pt-16 pb-20 md:pt-24 md:pb-32 overflow-hidden bg-white dark:bg-slate-950">
            {/* Ambient Stage Light (Background) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 blur-[100px] rounded-full pointer-events-none mix-blend-screen" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="flex flex-col items-center justify-center text-center">
                    {/* Logo Area */}
                    <motion.div
                        style={{ scale: logoScale, opacity: logoOpacity, y: logoY }}
                        initial={{ opacity: 1, scale: 1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8 }}
                        className="mb-12 relative flex items-center justify-center group"
                    >
                        {/* Logo Container */}
                        <div className="w-64 h-64 md:w-80 md:h-80 relative z-10 p-4">
                            {/* NEON HALO EFFECT */}
                            <motion.div
                                animate={{
                                    filter: [
                                        "drop-shadow(0 0 20px rgba(37,99,235,0.3))",
                                        "drop-shadow(0 0 50px rgba(37,99,235,0.6))",
                                        "drop-shadow(0 0 20px rgba(37,99,235,0.3))"
                                    ]
                                }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className="w-full h-full"
                            >
                                <img
                                    src="/brand/logo.png"
                                    className="w-full h-full object-contain relative z-20"
                                    alt="Durrah Logo"
                                />
                            </motion.div>

                            {/* Interactive Light Sheen (Reflection) */}
                            <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                                <motion.div
                                    animate={{ left: ['-100%', '200%'] }}
                                    transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5, ease: "easeInOut" }}
                                    className="absolute top-0 w-1/2 h-full -skew-x-12 bg-gradient-to-r from-transparent via-white/50 to-transparent mix-blend-overlay"
                                />
                            </div>
                        </div>

                        {/* Back Halo Glow (Static Anchor) */}
                        <div className="absolute inset-0 bg-blue-400/10 blur-[60px] rounded-full scale-75 pointer-events-none" />
                    </motion.div>

                    {/* Slogan */}
                    <motion.h1
                        initial={{ opacity: 1, y: 0 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter text-slate-900 dark:text-white leading-[1.1] mb-8 relative"
                    >
                        <span className="block mb-2 drop-shadow-lg">
                            {t('hero.slogan1')}
                        </span>

                        {/* Neon Text Glow */}
                        <span className="relative inline-block text-[#2563EB]">
                            <span className="relative z-10">
                                {t('hero.slogan2')}
                            </span>
                            {/* Text Halo */}
                            <motion.span
                                animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.02, 1] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute inset-0 text-[#2563EB] blur-lg -z-10 select-none"
                                aria-hidden="true"
                            >
                                {t('hero.slogan2')}
                            </motion.span>
                        </span>
                    </motion.h1>

                    {/* Free Trial Badge - SEO Optimized */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="mb-6"
                    >
                        <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-full shadow-lg">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                            <span className="text-base md:text-lg font-bold text-slate-900 dark:text-white">
                                {t('hero.trial', '14-Day Free Trial • No Credit Card Required')}
                            </span>
                        </div>
                    </motion.div>

                    {/* Subtitle - SEO Keywords */}
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                        className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mb-2 font-medium"
                    >
                        {t('hero.subtitle', 'Create professional online exams with anti-cheating features, live proctoring, and auto-grading. Start your free trial today and get full premium access.')}
                    </motion.p>

                    {/* CTA */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="mt-4 flex flex-col sm:flex-row gap-4 items-center"
                    >
                        <a
                            href={registrationUrl}
                            className="bg-[#2563EB] hover:bg-blue-700 text-white px-10 py-4 rounded-full font-bold text-lg transition-all shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-1 ring-2 ring-blue-500/20 ring-offset-2 ring-offset-white dark:ring-offset-slate-900"
                        >
                            {t('hero.cta', 'Start Free Trial')}
                        </a>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                            {t('hero.ctaSubtext', 'Join thousands of educators • Free for 14 days')}
                        </p>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}

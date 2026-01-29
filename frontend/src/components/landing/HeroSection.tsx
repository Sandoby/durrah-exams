import { motion } from 'framer-motion';
import { ArrowRight, Sparkle } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

export function HeroSection({ registrationUrl, showNonCriticalEffects }: { registrationUrl: string, showNonCriticalEffects: boolean }) {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';

    return (
        <section className="relative pt-28 pb-24 overflow-hidden bg-slate-50 dark:bg-slate-950">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-24 left-1/2 h-72 w-[520px] -translate-x-1/2 rounded-full bg-indigo-200/50 blur-[120px]" />
                {showNonCriticalEffects && (
                    <div className="absolute -bottom-20 right-10 h-72 w-72 rounded-full bg-blue-200/40 blur-[110px]" />
                )}
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="bg-white dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800/80 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.45)] rounded-[32px] p-8 sm:p-12 lg:p-14">
                    <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
                        <div className="text-center lg:text-left">
                            <motion.div
                                initial={{ opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="inline-flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-2 mb-6 shadow-sm"
                            >
                                <Sparkle weight="fill" className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                    {t('hero.trustedBadge')}
                                </span>
                            </motion.div>

                            <motion.h1
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white leading-tight"
                            >
                                {t('hero.title')}
                                <span className="block text-indigo-600 dark:text-indigo-400">
                                    {t('hero.titleHighlight')}
                                </span>
                            </motion.h1>

                            <motion.p
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="mt-6 text-lg md:text-xl text-slate-600 dark:text-slate-300 leading-relaxed"
                            >
                                {t('hero.subtitle')}
                            </motion.p>

                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
                            >
                                <a
                                    href={registrationUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="group inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 text-white px-6 py-3 text-base font-semibold shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-colors"
                                >
                                    {t('hero.cta')}
                                    <ArrowRight weight="bold" className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${isRTL ? 'rotate-180' : ''}`} />
                                </a>
                            </motion.div>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="flex justify-center lg:justify-end"
                        >
                            <div className="w-full max-w-md rounded-[28px] bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700/70 shadow-[0_25px_60px_-35px_rgba(15,23,42,0.45)] p-4">
                                <img
                                    src="/illustrations/84406320_9963615.jpg"
                                    srcSet="/illustrations/84406320_9963615-800w.jpeg 800w, /illustrations/84406320_9963615-1600w.jpeg 1600w"
                                    sizes="(max-width: 1024px) 100vw, 480px"
                                    alt="Durrah Learning Platform"
                                    className="w-full h-auto rounded-2xl"
                                    loading="eager"
                                    width={480}
                                    height={480}
                                    style={{ fetchPriority: 'high' } as any}
                                />
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
}

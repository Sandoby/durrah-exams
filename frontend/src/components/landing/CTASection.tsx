import { motion } from 'framer-motion';
import { ArrowRight, Sparkle } from '@phosphor-icons/react';

import { useTranslation } from 'react-i18next';

export function CTASection({ registrationUrl }: { registrationUrl: string }) {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';

    return (
        <section className="py-24 px-4 sm:px-6 lg:px-8 relative">
            <div className="max-w-6xl mx-auto relative group">
                {/* Outer Glow - Simplified */}
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-[2.5rem] blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200" />

                <div className="relative bg-white dark:bg-slate-900 rounded-[2rem] p-8 md:p-20 overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
                    {/* Dynamic Background - Simplified */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-50/50 dark:bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none" />


                    {/* Content */}
                    <div className="relative z-10 flex flex-col items-center text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-sm font-medium mb-8"
                        >
                            <Sparkle weight="fill" className="w-4 h-4" />
                            <span>{t('ctaSection.tagline', 'Join the Future of Assessment')}</span>
                        </motion.div>

                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white mb-6 tracking-tight"
                        >
                            {t('ctaSection.title', 'Ready to Transform?')}
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl leading-relaxed"
                        >
                            {t('ctaSection.subtitle', 'Join thousands of educators delivering secure, professional exams with Durrah.')}
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
                        >
                            <a
                                href={registrationUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-4 rounded-xl text-lg font-bold shadow-lg shadow-indigo-600/25 transition-all hover:-translate-y-1"
                            >
                                {t('ctaSection.cta', 'Start Free Trial')}
                                <ArrowRight className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
                            </a>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
}

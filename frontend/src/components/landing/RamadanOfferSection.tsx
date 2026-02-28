import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export function RamadanOfferSection({ registrationUrl }: { registrationUrl: string }) {
    const { t } = useTranslation();

    return (
        <section className="relative overflow-hidden py-16 px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
                {/* Main Content */}
                <div className="mx-auto max-w-4xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-8"
                    >
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">
                            {t('ramadan.section.title', 'Ramadan Special')}
                        </h2>
                        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
                            {t('ramadan.section.subtitle', 'Celebrate with one month of premium access—on us')}
                        </p>
                    </motion.div>

                    {/* Offer Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
                    >
                        {/* Image Section */}
                        <div className="relative aspect-[2.5/1] sm:aspect-[3/1] w-full overflow-hidden bg-slate-50 dark:bg-slate-800/50">
                            <img
                                src="/ramadan offer.png"
                                alt={t('ramadan.section.imageAlt', 'Ramadan Special Offer')}
                                className="w-full h-full object-cover"
                                loading="lazy"
                            />
                        </div>

                        {/* Content Section */}
                        <div className="p-6 sm:p-8">
                            <div className="mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                                {/* Left: Promo Code + Description */}
                                <div className="flex-1">
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                                        {t('ramadan.section.couponLabel', 'Promo code')}
                                    </p>
                                    <div className="inline-flex items-center gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 mb-3">
                                        <span className="font-mono text-lg font-bold tracking-wider text-slate-900 dark:text-white">
                                            RAMADAN
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                        {t('ramadan.section.description', 'Experience our complete platform with unlimited exams, advanced proctoring features, and comprehensive analytics. No credit card required.')}
                                    </p>
                                </div>

                                {/* Right: CTA */}
                                <div className="flex flex-col items-start sm:items-end gap-2">
                                    <a
                                        href={registrationUrl}
                                        className="inline-flex items-center justify-center px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-sm rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
                                    >
                                        {t('ramadan.section.cta', 'Get started')}
                                    </a>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {t('ramadan.section.terms', 'Limited time offer')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}

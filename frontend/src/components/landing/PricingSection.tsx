import { motion } from 'framer-motion';
import { Check, Medal } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

interface PricingSectionProps {
    registrationUrl: string;
    isCurrencyLoading: boolean;
    currencyCode: string;
    monthlyPrice: string | number;
    yearlyPrice: string | number;
}

export function PricingSection({ registrationUrl, isCurrencyLoading, currencyCode, monthlyPrice, yearlyPrice }: PricingSectionProps) {
    const { t } = useTranslation();

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
        <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-full px-4 py-2 mb-4">
                        <Medal weight="duotone" className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{t('pricing.badge')}</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">{t('pricing.title')}</h2>
                    <p className="text-xl text-slate-600 dark:text-slate-400">{t('pricing.subtitle')}</p>

                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.55, delay: 0.1 }}
                        className="mx-auto mt-8 max-w-4xl rounded-2xl border border-slate-200 bg-white/80 p-5 text-left shadow-[0_12px_30px_-28px_rgba(15,23,42,0.6)] backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/70 sm:p-6"
                    >
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400" />
                            <span>{t('hero.trial', '14-Day Free Trial • No Credit Card Required')}</span>
                        </div>
                        <p className="mt-3 text-base leading-relaxed text-slate-700 dark:text-slate-300 sm:text-lg">
                            {t('hero.subtitle', 'Create professional online exams with anti-cheating features, live proctoring, and auto-grading. Start your free trial today and get full premium access.')}
                        </p>
                    </motion.div>
                </div>

                <motion.div
                    variants={staggerContainer}
                    initial="initial"
                    whileInView="whileInView"
                    viewport={{ once: true }}
                    className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto"
                >
                    <motion.div variants={fadeIn} className="flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm hover:border-indigo-200 transition-colors">
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t('pricing.starter.title')}</h3>
                        <div className="mb-6"><span className="text-5xl font-black text-slate-900 dark:text-white tracking-tight">{t('pricing.starter.price')}</span></div>
                        <ul className="space-y-4 mb-8 flex-1">
                            <li className="flex items-start"><Check weight="bold" className="h-5 w-5 text-indigo-600 mr-3 flex-shrink-0" /><span className="text-slate-600 dark:text-slate-300 text-sm font-medium">{t('pricing.starter.features.0')}</span></li>
                            <li className="flex items-start"><Check weight="bold" className="h-5 w-5 text-indigo-600 mr-3 flex-shrink-0" /><span className="text-slate-600 dark:text-slate-300 text-sm font-medium">{t('pricing.starter.features.1')}</span></li>
                            <li className="flex items-start"><Check weight="bold" className="h-5 w-5 text-indigo-600 mr-3 flex-shrink-0" /><span className="text-slate-600 dark:text-slate-300 text-sm font-medium">{t('pricing.starter.features.2')}</span></li>
                        </ul>
                        <a href={registrationUrl} target="_blank" rel="noreferrer" className="block w-full text-center bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white py-4 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">{t('pricing.starter.cta')}</a>
                    </motion.div>

                    <motion.div
                        variants={fadeIn}
                        className="flex flex-col relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 transform md:-translate-y-4 border-2 border-indigo-600 dark:border-indigo-500"
                    >
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-1 rounded-full font-bold text-xs uppercase tracking-wider">{t('pricing.professional.badge')}</div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t('pricing.professional.title')}</h3>
                        <div className="mb-6">
                            <span className="text-5xl font-black text-slate-900 dark:text-white tracking-tight">{isCurrencyLoading ? '...' : `${currencyCode} ${monthlyPrice}`}</span>
                            <span className="text-slate-500 dark:text-slate-400 text-sm font-medium ml-2">{t('pricing.professional.period')}</span>
                            <div className="mt-1 text-indigo-600 text-xs font-semibold">{t('pricing.yearly.freeTrial')}</div>
                        </div>
                        <ul className="space-y-4 mb-8 flex-1">
                            {[0, 1, 2, 3].map(i => (
                                <li key={i} className="flex items-start"><Check weight="bold" className="h-5 w-5 text-indigo-600 mr-3 flex-shrink-0" /><span className="text-slate-600 dark:text-slate-300 text-sm font-medium">{t(`pricing.professional.features.${i}`)}</span></li>
                            ))}
                        </ul>
                        <a href={registrationUrl} target="_blank" rel="noreferrer" className="block w-full text-center bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20">{t('pricing.professional.cta')}</a>
                    </motion.div>

                    <motion.div variants={fadeIn} className="flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm hover:border-indigo-200 transition-colors">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{t('pricing.yearly.title')}</h3>
                            <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-2 py-1 rounded-md font-bold">{t('pricing.yearly.badge').toUpperCase()}</span>
                        </div>
                        <div className="mb-6">
                            <span className="text-5xl font-black text-slate-900 dark:text-white tracking-tight">{isCurrencyLoading ? '...' : `${currencyCode} ${yearlyPrice}`}</span>
                            <span className="text-slate-500 dark:text-slate-400 text-sm font-medium ml-2">{t('pricing.yearly.period')}</span>
                            <div className="mt-1 text-green-600 dark:text-green-400 text-xs font-semibold">{t('pricing.yearly.freeTrial', '14-day free trial')}</div>
                        </div>
                        <ul className="space-y-4 mb-8 flex-1">
                            {[0, 1, 2].map(i => (
                                <li key={i} className="flex items-start"><Check weight="bold" className="h-5 w-5 text-indigo-600 mr-3 flex-shrink-0" /><span className="text-slate-600 dark:text-slate-300 text-sm font-medium">{t(`pricing.yearly.features.${i}`)}</span></li>
                            ))}
                        </ul>
                        <a href={registrationUrl} target="_blank" rel="noreferrer" className="block w-full text-center bg-slate-900 text-white dark:bg-slate-700 py-4 rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors">{t('pricing.yearly.cta')}</a>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}

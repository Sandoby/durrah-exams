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
        <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-900">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-full px-4 py-2 mb-4">
                        <Medal weight="duotone" className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
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
                    <motion.div variants={fadeIn} className="flex flex-col bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 hover:shadow-xl transition-all duration-300">
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t('pricing.starter.title')}</h3>
                        <div className="mb-6"><span className="text-5xl font-black text-slate-900 dark:text-white tracking-tight">{t('pricing.starter.price')}</span></div>
                        <ul className="space-y-4 mb-8 flex-1">
                            <li className="flex items-start"><Check weight="bold" className="h-5 w-5 text-indigo-500 mr-3 flex-shrink-0" /><span className="text-slate-600 dark:text-slate-300 text-sm font-medium">{t('pricing.starter.features.0')}</span></li>
                            <li className="flex items-start"><Check weight="bold" className="h-5 w-5 text-indigo-500 mr-3 flex-shrink-0" /><span className="text-slate-600 dark:text-slate-300 text-sm font-medium">{t('pricing.starter.features.1')}</span></li>
                            <li className="flex items-start"><Check weight="bold" className="h-5 w-5 text-indigo-500 mr-3 flex-shrink-0" /><span className="text-slate-600 dark:text-slate-300 text-sm font-medium">{t('pricing.starter.features.2')}</span></li>
                        </ul>
                        <a href={registrationUrl} target="_blank" rel="noreferrer" className="block w-full text-center bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white py-4 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">{t('pricing.starter.cta')}</a>
                    </motion.div>

                    <motion.div
                        variants={fadeIn}
                        className="flex flex-col relative bg-slate-900 dark:bg-indigo-600 rounded-3xl shadow-2xl p-8 transform md:-translate-y-4 border border-slate-700 dark:border-indigo-500 ring-4 ring-indigo-500/10"
                    >
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-1 rounded-full font-bold text-xs uppercase tracking-wider shadow-lg">{t('pricing.professional.badge')}</div>
                        <h3 className="text-2xl font-bold text-white mb-2">{t('pricing.professional.title')}</h3>
                        <div className="mb-6">
                            <span className="text-5xl font-black text-white tracking-tight">{isCurrencyLoading ? '...' : `${currencyCode} ${monthlyPrice}`}</span>
                            <span className="text-slate-400 dark:text-indigo-200 text-sm font-medium ml-2">{t('pricing.professional.period')}</span>
                            <div className="mt-1 text-indigo-300 text-xs font-semibold">{t('pricing.yearly.freeTrial')}</div>
                        </div>
                        <ul className="space-y-4 mb-8 flex-1">
                            {[0, 1, 2, 3].map(i => (
                                <li key={i} className="flex items-start"><Check weight="bold" className="h-5 w-5 text-green-400 mr-3 flex-shrink-0" /><span className="text-slate-300 dark:text-indigo-50 text-sm font-medium">{t(`pricing.professional.features.${i}`)}</span></li>
                            ))}
                        </ul>
                        <a href={registrationUrl} target="_blank" rel="noreferrer" className="block w-full text-center bg-white text-slate-900 dark:text-indigo-600 py-4 rounded-xl font-bold hover:bg-slate-100 transition-colors shadow-lg">{t('pricing.professional.cta')}</a>
                    </motion.div>

                    <motion.div variants={fadeIn} className="flex flex-col bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 hover:shadow-xl transition-all duration-300">
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
                                <li key={i} className="flex items-start"><Check weight="bold" className="h-5 w-5 text-indigo-500 mr-3 flex-shrink-0" /><span className="text-slate-600 dark:text-slate-300 text-sm font-medium">{t(`pricing.yearly.features.${i}`)}</span></li>
                            ))}
                        </ul>
                        <a href={registrationUrl} target="_blank" rel="noreferrer" className="block w-full text-center bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20">{t('pricing.yearly.cta')}</a>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}

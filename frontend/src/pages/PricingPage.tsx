import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Award, ChevronDown } from 'lucide-react';
import { Logo } from '../components/Logo';
import { useCurrency } from '../hooks/useCurrency';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

const fadeIn = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
};

const staggerContainer = {
    initial: {},
    whileInView: {
        transition: {
            staggerChildren: 0.1
        }
    }
};

export default function PricingPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { t } = useTranslation();
    const [activeFaq, setActiveFaq] = useState<number | null>(null);

    // Currency hooks - now using USD base
    const { price: monthlyPrice, currency: currencyCode, isLoading: isCurrencyLoading } = useCurrency(5);
    const { price: yearlyPrice } = useCurrency(50);

    const registrationUrl = user ? '/dashboard' : '/register';

    const faqs = [
        {
            question: "How does the free trial work?",
            answer: "You get a 14-day free trial for any paid plan. You can explore all professional features without any commitment. After the trial, you can choose to subscribe or continue with the free starter plan."
        },
        {
            question: "Can I cancel my subscription anytime?",
            answer: "Yes, you can cancel your subscription at any time from your settings. You'll keep access until the end of your billing period."
        },
        {
            question: "What payment methods do you accept?",
            answer: "We accept all major credit cards, debit cards, and local payment methods like Fawry and Meeza in Egypt."
        },
        {
            question: "Is there a limit on the number of students?",
            answer: "The Professional and Yearly plans allow for unlimited students and exam attempts."
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 pt-4">
                <div className="max-w-7xl mx-auto bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-xl shadow-indigo-500/5 border border-slate-200/50 dark:border-slate-700/50">
                    <div className="h-16 px-6 flex items-center justify-between">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                            <Logo className="h-9 w-9" showText={false} />
                            <div className="flex flex-col">
                                <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">Durrah</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-[0.2em] uppercase leading-none">for Tutors</span>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate(-1)}
                            className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            {t('common.back', 'Back')}
                        </button>
                    </div>
                </div>
            </header>

            <main className="pt-32 pb-24 px-4 sm:px-6 lg:px-8">
                {/* Pricing Section */}
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-full px-4 py-2 mb-4"
                        >
                            <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{t('pricing.badge')}</span>
                        </motion.div>
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-4xl md:text-6xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight"
                        >
                            {t('pricing.title')}
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto"
                        >
                            {t('pricing.subtitle')}
                        </motion.p>
                    </div>

                    <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        animate="whileInView"
                        className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto"
                    >
                        {/* Starter Plan */}
                        <motion.div variants={fadeIn} className="flex flex-col bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 hover:shadow-xl transition-all duration-300">
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t('pricing.starter.title')}</h3>
                            <div className="mb-6"><span className="text-5xl font-black text-slate-900 dark:text-white tracking-tight">{t('pricing.starter.price')}</span></div>
                            <ul className="space-y-4 mb-8 flex-1">
                                <li className="flex items-start"><Check className="h-5 w-5 text-indigo-500 mr-3 flex-shrink-0" /><span className="text-slate-600 dark:text-slate-300 text-sm font-medium">{t('pricing.starter.features.0')}</span></li>
                                <li className="flex items-start"><Check className="h-5 w-5 text-indigo-500 mr-3 flex-shrink-0" /><span className="text-slate-600 dark:text-slate-300 text-sm font-medium">{t('pricing.starter.features.1')}</span></li>
                                <li className="flex items-start"><Check className="h-5 w-5 text-indigo-500 mr-3 flex-shrink-0" /><span className="text-slate-600 dark:text-slate-300 text-sm font-medium">{t('pricing.starter.features.2')}</span></li>
                            </ul>
                            <button onClick={() => navigate(registrationUrl)} className="block w-full text-center bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white py-4 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">{t('pricing.starter.cta')}</button>
                        </motion.div>

                        {/* Pro Plan */}
                        <motion.div
                            variants={fadeIn}
                            className="flex flex-col relative bg-slate-900 dark:bg-indigo-600 rounded-3xl shadow-2xl p-8 transform md:-translate-y-4 border border-slate-700 dark:border-indigo-500 ring-4 ring-indigo-500/10"
                        >
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-1 rounded-full font-bold text-xs uppercase tracking-wider shadow-lg">Most Popular</div>
                            <h3 className="text-2xl font-bold text-white mb-2">{t('pricing.professional.title')}</h3>
                            <div className="mb-6">
                                <span className="text-5xl font-black text-white tracking-tight">{isCurrencyLoading ? '...' : `${currencyCode} ${monthlyPrice}`}</span>
                                <span className="text-slate-400 dark:text-indigo-200 text-sm font-medium ml-2">{t('pricing.professional.period')}</span>
                                <div className="mt-1 text-indigo-300 text-xs font-semibold">{t('pricing.professional.freeTrial', '14-day free trial')}</div>
                            </div>
                            <ul className="space-y-4 mb-8 flex-1">
                                {[0, 1, 2, 3].map(i => (
                                    <li key={i} className="flex items-start"><Check className="h-5 w-5 text-green-400 mr-3 flex-shrink-0" /><span className="text-slate-300 dark:text-indigo-50 text-sm font-medium">{t(`pricing.professional.features.${i}`)}</span></li>
                                ))}
                            </ul>
                            <button onClick={() => navigate(registrationUrl)} className="block w-full text-center bg-white text-slate-900 dark:text-indigo-600 py-4 rounded-xl font-bold hover:bg-slate-100 transition-colors shadow-lg">{t('pricing.professional.cta')}</button>
                        </motion.div>

                        {/* Yearly Plan */}
                        <motion.div variants={fadeIn} className="flex flex-col bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 hover:shadow-xl transition-all duration-300">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{t('pricing.yearly.title')}</h3>
                                <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-2 py-1 rounded-md font-bold">SAVE 20%</span>
                            </div>
                            <div className="mb-6">
                                <span className="text-5xl font-black text-slate-900 dark:text-white tracking-tight">{isCurrencyLoading ? '...' : `${currencyCode} ${yearlyPrice}`}</span>
                                <span className="text-slate-500 dark:text-slate-400 text-sm font-medium ml-2">{t('pricing.yearly.period')}</span>
                                <div className="mt-1 text-green-600 dark:text-green-400 text-xs font-semibold">{t('pricing.yearly.freeTrial', '14-day free trial')}</div>
                            </div>
                            <ul className="space-y-4 mb-8 flex-1">
                                {[0, 1, 2].map(i => (
                                    <li key={i} className="flex items-start"><Check className="h-5 w-5 text-indigo-500 mr-3 flex-shrink-0" /><span className="text-slate-600 dark:text-slate-300 text-sm font-medium">{t(`pricing.yearly.features.${i}`)}</span></li>
                                ))}
                            </ul>
                            <button onClick={() => navigate(registrationUrl)} className="block w-full text-center bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20">{t('pricing.yearly.cta')}</button>
                        </motion.div>
                    </motion.div>
                </div>

                {/* FAQ Section */}
                <section className="mt-32 max-w-3xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
                            {t('landing.faq.title', 'Frequently Asked Questions')}
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400">
                            {t('landing.faq.subtitle', 'Everything you need to know about Durrah')}
                        </p>
                    </div>

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
                </section>
            </main>

            {/* Footer */}
            <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                <div className="max-w-7xl mx-auto text-center">
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        &copy; 2026 Durrah for Tutors. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}

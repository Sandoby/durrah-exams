import { motion, AnimatePresence } from 'framer-motion';
import { CaretDown } from '@phosphor-icons/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export function FAQSection() {
    const { t } = useTranslation();
    const [activeFaq, setActiveFaq] = useState<number | null>(null);

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

    return (
        <section className="py-24 px-4 sm:px-6 lg:px-8 relative">
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
                            className={`bg-white dark:bg-slate-900 rounded-xl border ${activeFaq === index ? 'border-indigo-500 ring-2 ring-indigo-500/10' : 'border-slate-200 dark:border-slate-800'} overflow-hidden shadow-sm hover:border-indigo-300 transition-all duration-300`}
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
                                    <CaretDown weight="bold" className={`w-5 h-5 ${activeFaq === index ? 'text-indigo-600' : 'text-slate-400'}`} />
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
                                        <div className="px-6 pb-6 text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-4">
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
    );
}

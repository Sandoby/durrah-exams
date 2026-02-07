import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { PenLine, ShieldCheck, BarChart3 } from 'lucide-react';

const steps = [
    {
        id: 1,
        icon: PenLine,
        color: 'blue',
        bgLight: 'bg-blue-50',
        bgDark: 'dark:bg-blue-950/30',
        borderColor: 'border-blue-200 dark:border-blue-800',
        iconColor: 'text-blue-600 dark:text-blue-400',
        lineGradient: 'from-blue-300 to-emerald-300',
    },
    {
        id: 2,
        icon: ShieldCheck,
        color: 'emerald',
        bgLight: 'bg-emerald-50',
        bgDark: 'dark:bg-emerald-950/30',
        borderColor: 'border-emerald-200 dark:border-emerald-800',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        lineGradient: 'from-emerald-300 to-indigo-300',
    },
    {
        id: 3,
        icon: BarChart3,
        color: 'indigo',
        bgLight: 'bg-indigo-50',
        bgDark: 'dark:bg-indigo-950/30',
        borderColor: 'border-indigo-200 dark:border-indigo-800',
        iconColor: 'text-indigo-600 dark:text-indigo-400',
        lineGradient: '',
    },
];

export function HowItWorks() {
    const { t } = useTranslation();

    return (
        <section className="py-24 md:py-32 bg-slate-50/50 dark:bg-slate-950/50 relative overflow-hidden">
            {/* Subtle background decoration */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-blue-100/30 to-transparent dark:from-blue-900/10 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-16 md:mb-20"
                >
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
                        {t('landing.howto.title', 'How It Works')}
                    </h2>
                    <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
                        {t('landing.howto.subtitle', 'Create secure online exams in three simple steps')}
                    </p>
                </motion.div>

                {/* Timeline */}
                <div className="relative">
                    {steps.map((step, index) => (
                        <motion.div
                            key={step.id}
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.5, delay: index * 0.15 }}
                            className="relative flex gap-6 md:gap-10 pb-12 last:pb-0"
                        >
                            {/* Timeline Line & Node */}
                            <div className="flex flex-col items-center">
                                {/* Node */}
                                <motion.div
                                    whileHover={{ scale: 1.1 }}
                                    className={`relative z-10 w-12 h-12 md:w-14 md:h-14 rounded-full ${step.bgLight} ${step.bgDark} border-2 ${step.borderColor} flex items-center justify-center shadow-sm`}
                                >
                                    <step.icon className={`w-5 h-5 md:w-6 md:h-6 ${step.iconColor}`} strokeWidth={1.5} />
                                </motion.div>

                                {/* Connecting Line */}
                                {index < steps.length - 1 && (
                                    <div className={`w-0.5 flex-1 mt-3 bg-gradient-to-b ${step.lineGradient} dark:opacity-50`} />
                                )}
                            </div>

                            {/* Content Card */}
                            <motion.div
                                whileHover={{ y: -4, boxShadow: '0 12px 40px -12px rgba(0,0,0,0.1)' }}
                                transition={{ duration: 0.2 }}
                                className={`flex-1 p-6 md:p-8 rounded-2xl bg-white dark:bg-slate-900 border ${step.borderColor} shadow-sm hover:shadow-md transition-shadow`}
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <span className={`text-sm font-medium ${step.iconColor} opacity-60`}>
                                        Step {step.id}
                                    </span>
                                </div>
                                <h3 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-white mb-2">
                                    {t(`landing.howto.step${step.id}.title`, `Step ${step.id}`)}
                                </h3>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                    {t(`landing.howto.step${step.id}.desc`, 'Description')}
                                </p>
                            </motion.div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

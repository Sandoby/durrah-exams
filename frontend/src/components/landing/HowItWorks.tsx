import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { BarChart3, PenLine, ShieldCheck } from 'lucide-react';

const stepMeta = [
    {
        id: 1,
        icon: PenLine,
        tone: 'from-sky-500/30 to-blue-500/10',
        iconColor: 'text-sky-600 dark:text-sky-400',
        ring: 'ring-sky-200/70 dark:ring-sky-700/60',
    },
    {
        id: 2,
        icon: ShieldCheck,
        tone: 'from-emerald-500/30 to-teal-500/10',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        ring: 'ring-emerald-200/70 dark:ring-emerald-700/60',
    },
    {
        id: 3,
        icon: BarChart3,
        tone: 'from-indigo-500/30 to-blue-500/10',
        iconColor: 'text-indigo-600 dark:text-indigo-400',
        ring: 'ring-indigo-200/70 dark:ring-indigo-700/60',
    },
];

export function HowItWorks() {
    const { t } = useTranslation();

    return (
        <section className="relative overflow-hidden py-24 md:py-28">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_45%,#000_62%,transparent_100%)]" />
            <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[860px] -translate-x-1/2 rounded-full bg-gradient-to-b from-slate-200/45 to-transparent blur-3xl dark:from-slate-800/35" />

            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.55, ease: 'easeOut' }}
                    className="mx-auto mb-14 max-w-3xl text-center md:mb-16"
                >
                    <div className="inline-flex items-center rounded-full border border-slate-200 bg-white/75 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900/75 dark:text-slate-400">
                        Product Workflow
                    </div>
                    <h2 className="mt-5 text-3xl font-semibold tracking-[-0.02em] text-slate-900 dark:text-white md:text-5xl">
                        {t('landing.howto.title', 'How It Works')}
                    </h2>
                    <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-400 md:text-lg">
                        {t('landing.howto.subtitle', 'Create secure online exams in three simple steps')}
                    </p>
                </motion.div>

                <div className="relative">
                    <div className="pointer-events-none absolute left-0 right-0 top-16 hidden h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent dark:via-slate-700 lg:block" />

                    <div className="grid gap-6 lg:grid-cols-3 lg:gap-7">
                        {stepMeta.map((step, index) => (
                            <motion.article
                                key={step.id}
                                initial={{ opacity: 0, y: 24 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-40px' }}
                                transition={{ duration: 0.5, delay: index * 0.12, ease: 'easeOut' }}
                                whileHover={{ y: -6 }}
                                className="group relative rounded-2xl border border-slate-200/85 bg-white/85 p-6 shadow-[0_12px_35px_-30px_rgba(15,23,42,0.55)] backdrop-blur-sm transition-colors dark:border-slate-700/75 dark:bg-slate-900/75 md:p-7"
                            >
                                <div className={`pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r ${step.tone}`} />

                                <div className="mb-6 flex items-center justify-between">
                                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 ring-1 ${step.ring} dark:bg-slate-950/70`}>
                                        <step.icon className={`h-5 w-5 ${step.iconColor}`} strokeWidth={1.7} />
                                    </div>
                                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                                        Step {step.id}
                                    </span>
                                </div>

                                <h3 className="text-xl font-semibold tracking-[-0.01em] text-slate-900 dark:text-white md:text-2xl">
                                    {t(`landing.howto.step${step.id}.title`, `Step ${step.id}`)}
                                </h3>
                                <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400 md:text-base">
                                    {t(`landing.howto.step${step.id}.desc`, 'Description')}
                                </p>

                                {index < stepMeta.length - 1 && (
                                    <div className="pointer-events-none absolute -bottom-3 left-1/2 h-6 w-px -translate-x-1/2 bg-gradient-to-b from-slate-300 to-transparent dark:from-slate-700 lg:hidden" />
                                )}
                            </motion.article>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

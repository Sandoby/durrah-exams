import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { BarChart3, PenLine, ShieldCheck } from 'lucide-react';

const steps = [
    {
        id: 1,
        icon: PenLine,
        titleKey: 'landing.howto.step1.title',
        descKey: 'landing.howto.step1.desc',
        fallbackTitle: 'Draft the exam',
        fallbackDesc: 'Structure sections, question banks, timing, and security in one pass.',
        accent: 'from-sky-200 to-blue-500/50'
    },
    {
        id: 2,
        icon: ShieldCheck,
        titleKey: 'landing.howto.step2.title',
        descKey: 'landing.howto.step2.desc',
        fallbackTitle: 'Lock it down',
        fallbackDesc: 'Apply proctoring, browser lock, identity checks, and grading rules.',
        accent: 'from-emerald-200 to-emerald-500/50'
    },
    {
        id: 3,
        icon: BarChart3,
        titleKey: 'landing.howto.step3.title',
        descKey: 'landing.howto.step3.desc',
        fallbackTitle: 'Launch & learn',
        fallbackDesc: 'Distribute via link/QR, then watch live analytics and automated reports.',
        accent: 'from-indigo-200 to-indigo-500/50'
    },
];

export function HowItWorks() {
    const { t } = useTranslation();

    return (
        <section className="relative overflow-hidden py-24 md:py-28">
            {/* Subtle grid + vignette that matches adjacent sections */}
            <div className="pointer-events-none absolute inset-0 opacity-70 bg-[linear-gradient(to_right,#e5e7eb33_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb26_1px,transparent_1px)] bg-[size:26px_26px] [mask-image:radial-gradient(ellipse_80%_70%_at_50%_45%,#000_70%,transparent_100%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(226,232,240,0.55),transparent_55%),radial-gradient(circle_at_50%_90%,rgba(226,232,240,0.35),transparent_55%)]" />

            <div className="relative mx-auto flex max-w-7xl flex-col gap-14 px-4 sm:px-6 lg:flex-row lg:items-start lg:gap-16 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.55, ease: 'easeOut' }}
                    className="lg:max-w-sm"
                >
                    <div className="inline-flex items-center rounded-full border border-slate-200/70 bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-sm">
                        Product workflow
                    </div>
                    <h2 className="mt-5 text-3xl font-semibold tracking-[-0.02em] text-slate-900 md:text-4xl">
                        {t('landing.howto.title', 'Build, secure, and launch in three calm steps.')}
                    </h2>
                    <p className="mt-4 text-base leading-relaxed text-slate-600 md:text-lg">
                        {t('landing.howto.subtitle', 'No fluff—just the key checkpoints to publish a compliant, proctored exam.')}
                    </p>
                </motion.div>

                <div className="relative flex-1">
                    <div className="absolute left-[22px] top-6 bottom-6 hidden w-[2px] bg-gradient-to-b from-slate-200 via-slate-300 to-transparent lg:block" />
                    <div className="space-y-6">
                        {steps.map((step, index) => (
                            <motion.article
                                key={step.id}
                                initial={{ opacity: 0, y: 24 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-40px' }}
                                transition={{ duration: 0.5, delay: index * 0.08, ease: 'easeOut' }}
                                className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/85 p-5 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.55)] backdrop-blur-sm lg:p-6"
                            >
                                <div className={`absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-r ${step.accent}`} />
                                <div className="relative flex items-start gap-4">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-slate-200 shadow-sm">
                                        <step.icon className="h-5 w-5 text-slate-700" strokeWidth={1.7} />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white text-[11px]">
                                                {String(step.id).padStart(2, '0')}
                                            </span>
                                            {t('landing.howto.step', 'Step')} {step.id}
                                        </div>
                                        <h3 className="text-xl font-semibold tracking-[-0.01em] text-slate-900 md:text-[22px]">
                                            {t(step.titleKey, step.fallbackTitle)}
                                        </h3>
                                        <p className="text-sm leading-relaxed text-slate-600 md:text-base">
                                            {t(step.descKey, step.fallbackDesc)}
                                        </p>
                                    </div>
                                </div>
                            </motion.article>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

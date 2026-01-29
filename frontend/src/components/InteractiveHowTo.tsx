import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    PencilCircle,
    ShieldCheck,
    ChartLineUp,
    CornersOut,
    Browsers,
    ClipboardText
} from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

export function InteractiveHowTo() {
    const { t } = useTranslation();
    const [activeStep, setActiveStep] = useState(0);

    const steps = [
        {
            id: 0,
            title: t('landing.howto.step1.title', 'Craft Your Questions'),
            subtitle: t('landing.howto.step1.desc', 'Intuitive editor for MCQs, essays, or math.'),
            icon: PencilCircle,
            color: 'text-indigo-500',
            bg: 'bg-indigo-500',
            border: 'border-indigo-200'
        },
        {
            id: 1,
            title: t('landing.howto.step2.title', 'Configure Security'),
            subtitle: t('landing.howto.step2.desc', 'AI proctoring and cheat prevention.'),
            icon: ShieldCheck,
            color: 'text-purple-500',
            bg: 'bg-purple-500',
            border: 'border-purple-200'
        },
        {
            id: 2,
            title: t('landing.howto.step3.title', 'Launch & Analyze'),
            subtitle: t('landing.howto.step3.desc', 'Real-time reports and analytics.'),
            icon: ChartLineUp,
            color: 'text-pink-500',
            bg: 'bg-pink-500',
            border: 'border-pink-200'
        }
    ];

    return (
        <section className="py-32 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-20">
                    <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">
                        {t('landing.howto.title', 'Go from Concept to Exam in Minutes')}
                    </h2>
                    <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                        {t('landing.howto.subtitle', 'Our streamlined process allows you to focus on education, not administration.')}
                    </p>
                </div>

                <div className="grid lg:grid-cols-12 gap-12 items-center">
                    {/* Left: Steps Navigation */}
                    <div className="lg:col-span-5 space-y-4">
                        {steps.map((step, idx) => (
                            <button
                                key={idx}
                                onClick={() => setActiveStep(idx)}
                                className={`w-full text-left p-6 rounded-2xl transition-all duration-300 border-2 group relative overflow-hidden ${activeStep === idx
                                    ? 'bg-white dark:bg-slate-800 border-indigo-500 shadow-xl shadow-indigo-500/10 scale-105'
                                    : 'bg-transparent border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                    }`}
                            >
                                <div className="flex items-start gap-4 relative z-10">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${activeStep === idx ? `${step.bg} text-white` : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                        }`}>
                                        <step.icon weight={activeStep === idx ? "duotone" : "regular"} className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className={`text-xl font-bold mb-1 transition-colors ${activeStep === idx ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
                                            }`}>
                                            {step.title}
                                        </h3>
                                        <p className={`text-sm leading-relaxed transition-colors ${activeStep === idx ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'
                                            }`}>
                                            {step.subtitle}
                                        </p>
                                    </div>
                                </div>
                                {activeStep === idx && (
                                    <motion.div
                                        layoutId="activeGlow"
                                        className="absolute inset-0 bg-gradient-to-r from-indigo-50/50 to-transparent dark:from-indigo-900/10 dark:to-transparent pointer-events-none"
                                    />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Right: Mock Interface Display */}
                    <div className="lg:col-span-7">
                        <div className="relative aspect-[4/3] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden ring-1 ring-slate-200/50 dark:ring-white/10">
                            {/* Window Chrome */}
                            <div className="absolute top-0 left-0 right-0 h-10 bg-slate-50/80 dark:bg-slate-800/50 backdrop-blur-md border-b border-slate-200 dark:border-white/5 flex items-center px-4 gap-2 z-20">
                                <div className="w-3 h-3 rounded-full bg-red-400/80" />
                                <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                                <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
                            </div>

                            {/* Content Area */}
                            <div className="absolute inset-0 pt-10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-3xl p-8">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeStep}
                                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -10, scale: 0.98 }}
                                        transition={{ duration: 0.3 }}
                                        className="w-full h-full"
                                    >
                                        {activeStep === 0 && <EditorMockup />}
                                        {activeStep === 1 && <SecurityMockup />}
                                        {activeStep === 2 && <AnalyticsMockup />}
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            {/* Decorative Blurs */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

// Sub-components for Mockups (Simplified CSS art)
function EditorMockup() {
    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="flex gap-4 mb-4">
                <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-lg text-xs font-mono text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 font-bold">Question 1 of 50</div>
                <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-lg text-xs font-mono text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 font-bold">Multiple Choice</div>
            </div>
            <div className="h-4 w-3/4 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-slate-100 dark:bg-slate-700 rounded animate-pulse opacity-60 mb-8" />

            {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-600 flex items-center justify-center text-xs text-slate-400">{String.fromCharCode(64 + i)}</div>
                    <div className="h-2 w-32 bg-slate-200 dark:bg-slate-600 rounded opacity-50" />
                </div>
            ))}
        </div>
    );
}

function SecurityMockup() {
    return (
        <div className="flex flex-col gap-4 h-full">
            {[
                { label: 'Fullscreen Force', desc: 'Prevents window minimization', icon: CornersOut, active: true },
                { label: 'Tab Detection', desc: 'Logs any tab switching', icon: Browsers, active: true },
                { label: 'Anti-Cheat Mode', desc: 'No copy-paste allowed', icon: ClipboardText, active: true },
            ].map((item, i) => (
                <div key={i} className="p-4 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-700/50 flex items-center justify-center border border-slate-100 dark:border-slate-700 shadow-sm">
                            <item.icon className="w-5 h-5 text-slate-600 dark:text-slate-300" weight="duotone" />
                        </div>
                        <div>
                            <span className="block text-sm font-bold text-slate-800 dark:text-slate-200">{item.label}</span>
                            <span className="text-xs text-slate-500">{item.desc}</span>
                        </div>
                    </div>

                    <div className={`w-10 h-5 rounded-full relative transition-colors ${item.active ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                        <div className={`absolute top-1 bottom-1 w-3 h-3 bg-white rounded-full transition-all ${item.active ? 'right-1' : 'left-1'}`} />
                    </div>
                </div>
            ))}
        </div>
    );
}

function AnalyticsMockup() {
    return (
        <div className="flex flex-col gap-6 h-full">
            <div className="flex gap-4">
                <div className="flex-1 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
                    <div className="text-xs text-indigo-600 dark:text-indigo-300 uppercase tracking-wider mb-1 font-bold">Pass Rate</div>
                    <div className="text-3xl font-bold text-slate-900 dark:text-white">84%</div>
                </div>
                <div className="flex-1 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
                    <div className="text-xs text-emerald-600 dark:text-emerald-300 uppercase tracking-wider mb-1 font-bold">Avg Score</div>
                    <div className="text-3xl font-bold text-slate-900 dark:text-white">72.5</div>
                </div>
            </div>

            <div className="flex-1 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 relative overflow-hidden flex items-end px-6 pb-6 gap-2">
                {[40, 65, 45, 80, 55, 70, 40].map((h, i) => (
                    <div key={i} className="flex-1 bg-indigo-500/50 rounded-t" style={{ height: `${h}%` }} />
                ))}
            </div>
        </div>
    );
}




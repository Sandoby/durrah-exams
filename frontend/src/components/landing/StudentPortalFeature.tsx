import { motion } from 'framer-motion';
import { ArrowRight, ChartLineUp, GraduationCap, Layout, Medal, ShieldCheck } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function StudentPortalFeature() {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';

    return (
        <section className="py-32 relative overflow-hidden bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/50">
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />
            <img
                src="/illustrations/freepik__talk__87937.png"
                alt=""
                className="absolute right-[-6%] top-1/2 -translate-y-1/2 w-[560px] max-w-[75vw] opacity-15 blur-[1px] mix-blend-multiply pointer-events-none select-none dark:opacity-10 dark:mix-blend-screen"
                width={560}
                height={500}
                loading="lazy"
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid lg:grid-cols-2 gap-20 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="relative perspective-2000"
                    >
                        <div className="relative transform-style-3d rotate-y-12">
                            <motion.div
                                animate={{ y: [0, -15, 0], x: [0, 10, 0] }}
                                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute -top-12 -right-8 w-full aspect-video bg-slate-800 rounded-2xl shadow-2xl border border-white/10 overflow-hidden opacity-40 blur-[1px]"
                            >
                                <img src="/mockups/exam-view.png" alt="Exam Interface" className="w-full h-full object-cover" width={800} height={450} loading="lazy" />
                            </motion.div>

                            <motion.div
                                className="relative z-10 w-full aspect-video bg-white dark:bg-slate-800 rounded-2xl shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] border border-slate-200 dark:border-slate-700 overflow-hidden"
                            >
                                <div className="h-10 bg-slate-50 dark:bg-slate-800/50 flex items-center px-4 gap-2 border-b border-slate-200 dark:border-slate-700">
                                    <div className="flex gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-700" />
                                        <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-700" />
                                        <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-700" />
                                    </div>
                                </div>
                                <img src="/mockups/student-portal-v2.png" alt="Student Dashboard" className="w-full h-full object-contain bg-slate-50 dark:bg-slate-900" width={1200} height={675} loading="lazy" />
                            </motion.div>

                            <motion.div
                                animate={{ y: [0, 20, 0] }}
                                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                                className="absolute -bottom-6 -left-6 z-20 glass-card p-4 rounded-2xl shadow-xl border border-indigo-500/20"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                        <Medal weight="duotone" className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">{t('landing.marketing.student.academicStanding')}</div>
                                        <div className="text-sm font-bold text-slate-900 dark:text-white">{t('landing.marketing.student.topClass')}</div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>

                    <div className="relative">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                        >
                            <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-full px-4 py-1.5 mb-6">
                                <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{t('landing.marketing.student.badge', 'Unified Hub')}</span>
                            </div>

                            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-8 tracking-tight leading-[1.1]">
                                {t('landing.marketing.student.title', 'One Place for Every Student Goal')}
                            </h2>

                            <p className="text-xl text-slate-600 dark:text-slate-400 mb-10 leading-relaxed">
                                {t('landing.marketing.student.desc', 'Give your students a central hub to manage their academic journey. From joining exams with a simple code to tracking past performances and reviewing deep analytics.')}
                            </p>

                            <div className="grid sm:grid-cols-2 gap-6 mb-12">
                                {[
                                    { icon: Layout, title: t('landing.marketing.student.features.centralized') },
                                    { icon: ChartLineUp, title: t('landing.marketing.student.features.performance') },
                                    { icon: Medal, title: t('landing.marketing.student.features.badges') },
                                    { icon: ShieldCheck, title: t('landing.marketing.student.features.history') }
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-4 group">
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                            <item.icon className="w-5 h-5" />
                                        </div>
                                        <span className="font-semibold text-slate-700 dark:text-slate-200">{item.title}</span>
                                    </div>
                                ))}
                            </div>

                            <Link to="/student-portal" className="group inline-flex items-center gap-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-4 rounded-2xl font-bold shadow-2xl hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:text-white transition-all transform hover:-translate-y-1">
                                {t('landing.marketing.student.cta')}
                                <ArrowRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${isRTL ? 'rotate-180' : ''}`} />
                            </Link>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
}

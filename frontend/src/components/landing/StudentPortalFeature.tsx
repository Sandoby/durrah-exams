import { motion } from 'framer-motion';
import { ArrowRight, ChartLineUp, GraduationCap, Layout, Medal, ShieldCheck } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function StudentPortalFeature() {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';

    return (
        <section className="py-24 md:py-32 relative overflow-hidden">
            {/* Premium Background Elements */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid lg:grid-cols-2 gap-16 md:gap-24 items-center">
                    {/* Left: Enhanced Mockup Area */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="relative"
                    >
                        {/* Main Dashboard Mockup */}
                        <div className="relative z-10 bg-white dark:bg-slate-900 rounded-[2rem] shadow-[0_32px_80px_-20px_rgba(15,23,42,0.15)] dark:shadow-[0_32px_80px_-20px_rgba(0,0,0,0.5)] border border-slate-200 dark:border-slate-800 overflow-hidden transform perspective-2000 rotate-y-[-4deg] rotate-x-[2deg]">
                            <div className="h-10 bg-slate-50 dark:bg-slate-800/50 flex items-center px-6 gap-2 border-b border-slate-200 dark:border-slate-800">
                                <div className="flex gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                                </div>
                            </div>
                            <img
                                src="/mockups/student-portal-v2.png"
                                alt="Student Dashboard"
                                className="w-full h-auto object-contain bg-white dark:bg-slate-900"
                                width={1200}
                                height={800}
                                loading="lazy"
                            />
                        </div>

                        {/* Floating elements for "Wow" factor */}
                        <motion.div
                            animate={{ y: [0, -20, 0] }}
                            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute -top-12 -right-8 z-20 hidden md:block"
                        >
                            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-4 rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">A+</div>
                                <div className="pr-4">
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{t('landing.highlights.reporting')}</div>
                                    <div className="text-sm font-bold text-slate-900 dark:text-white">New Exam Result</div>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            animate={{ y: [0, 20, 0] }}
                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                            className="absolute -bottom-10 -left-6 z-20 hidden md:block"
                        >
                            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-4 rounded-2xl shadow-xl border border-white/20 dark:border-slate-700/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                        <Medal weight="duotone" className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{t('landing.marketing.student.academicStanding')}</div>
                                        <div className="text-sm font-bold text-slate-900 dark:text-white">{t('landing.marketing.student.topClass')}</div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Right: Text & Content */}
                    <div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                        >
                            <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-full px-4 py-1.5 mb-8">
                                <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{t('landing.marketing.student.badge')}</span>
                            </div>

                            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white mb-8 tracking-tighter leading-[1.05]">
                                {t('landing.marketing.student.title')}
                            </h2>

                            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 leading-relaxed font-medium">
                                {t('landing.marketing.student.desc')}
                            </p>

                            <div className="grid sm:grid-cols-2 gap-y-6 gap-x-8 mb-12">
                                {[
                                    { icon: Layout, title: t('landing.marketing.student.features.centralized'), color: "text-blue-500" },
                                    { icon: ChartLineUp, title: t('landing.marketing.student.features.performance'), color: "text-emerald-500" },
                                    { icon: Medal, title: t('landing.marketing.student.features.badges'), color: "text-amber-500" },
                                    { icon: ShieldCheck, title: t('landing.marketing.student.features.history'), color: "text-indigo-500" }
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-4 group">
                                        <div className={`w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform`}>
                                            <item.icon className="w-6 h-6" />
                                        </div>
                                        <span className="font-bold text-slate-700 dark:text-slate-200">{item.title}</span>
                                    </div>
                                ))}
                            </div>

                            <Link
                                to="/student-portal"
                                className="group flex items-center justify-center sm:inline-flex gap-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-10 py-4 rounded-2xl font-bold shadow-xl hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:text-white transition-all transform hover:-translate-y-1"
                            >
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


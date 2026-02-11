import { motion } from 'framer-motion';
import { ArrowRight, ChartLineUp, GraduationCap, Layout, Medal, ShieldCheck } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function StudentPortalFeature() {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';
    const features = [
        { icon: Layout, title: t('landing.marketing.student.features.centralized') },
        { icon: ChartLineUp, title: t('landing.marketing.student.features.performance') },
        { icon: Medal, title: t('landing.marketing.student.features.badges') },
        { icon: ShieldCheck, title: t('landing.marketing.student.features.history') }
    ];

    return (
        <section className="relative overflow-hidden py-22 md:py-26">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_72%_60%_at_50%_50%,#000_66%,transparent_100%)]" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[980px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-indigo-500/6 via-slate-300/8 to-indigo-500/6 blur-3xl dark:from-indigo-500/10 dark:via-slate-700/10 dark:to-indigo-500/10" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.55, ease: 'easeOut' }}
                        className="relative order-2 lg:order-1"
                    >
                        <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-200/90 bg-white/90 shadow-[0_28px_70px_-35px_rgba(15,23,42,0.45)] backdrop-blur-sm dark:border-slate-700/80 dark:bg-slate-900/85">
                            <div className="flex h-10 items-center gap-2 border-b border-slate-200 px-5 dark:border-slate-800 dark:bg-slate-900/90">
                                <div className="flex gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                                </div>
                            </div>
                            <img
                                src="/mockups/student-portal-v2.png"
                                alt="Student Dashboard"
                                className="h-auto w-full object-contain bg-white dark:bg-slate-900"
                                width={1200}
                                height={800}
                                loading="lazy"
                            />
                        </div>

                        <motion.div
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                            className="absolute -right-2 top-6 z-20 hidden rounded-xl border border-slate-200/90 bg-white/88 px-4 py-3 shadow-[0_14px_28px_-20px_rgba(15,23,42,0.5)] backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/80 md:block"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
                                    <ChartLineUp className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{t('landing.highlights.reporting')}</p>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Live Performance</p>
                                </div>
                            </div>
                        </motion.div>
                        <motion.div
                            animate={{ y: [0, 10, 0] }}
                            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.35 }}
                            className="absolute -bottom-5 left-4 z-20 hidden rounded-xl border border-slate-200/90 bg-white/88 px-4 py-3 shadow-[0_14px_28px_-20px_rgba(15,23,42,0.5)] backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/80 md:block"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/35 dark:text-emerald-300">
                                    <Medal weight="duotone" className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{t('landing.marketing.student.academicStanding')}</p>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('landing.marketing.student.topClass')}</p>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.55, ease: 'easeOut', delay: 0.08 }}
                        className="order-1 lg:order-2"
                    >
                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-300/80 bg-white/85 px-4 py-1.5 dark:border-slate-700 dark:bg-slate-900/80">
                            <GraduationCap className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">{t('landing.marketing.student.badge')}</span>
                        </div>

                        <h2 className="mt-6 text-4xl font-semibold leading-[1.06] tracking-[-0.02em] text-slate-900 dark:text-white md:text-5xl lg:text-[3.5rem]">
                            {t('landing.marketing.student.title')}
                        </h2>

                        <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                            {t('landing.marketing.student.desc')}
                        </p>

                        <motion.div
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.45, delay: 0.16 }}
                            className="mt-9 grid gap-3 sm:grid-cols-2"
                        >
                            {features.map((item, index) => (
                                <motion.div
                                    key={item.title}
                                    initial={{ opacity: 0, y: 8 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.35, delay: 0.2 + index * 0.06 }}
                                    className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white/80 px-4 py-3 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300/90 hover:shadow-[0_12px_22px_-18px_rgba(15,23,42,0.45)] dark:border-slate-700/70 dark:bg-slate-900/75 dark:hover:border-slate-600"
                                >
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                        <item.icon className="h-5 w-5" />
                                    </div>
                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{item.title}</span>
                                </motion.div>
                            ))}
                        </motion.div>

                        <Link
                            to="/student-portal"
                            className="group mt-10 inline-flex items-center gap-3 rounded-2xl bg-slate-900 px-9 py-4 text-sm font-semibold text-white shadow-[0_18px_40px_-22px_rgba(15,23,42,0.7)] ring-1 ring-slate-900/10 transition-all hover:-translate-y-0.5 hover:bg-indigo-600 dark:bg-white dark:text-slate-900 dark:ring-white/20 dark:hover:bg-indigo-500 dark:hover:text-white sm:text-base"
                        >
                            {t('landing.marketing.student.cta')}
                            <ArrowRight className={`h-5 w-5 transition-transform group-hover:translate-x-1 ${isRTL ? 'rotate-180' : ''}`} />
                        </Link>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}


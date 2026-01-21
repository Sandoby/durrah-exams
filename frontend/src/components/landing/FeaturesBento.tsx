import { motion } from 'framer-motion';
import { GlobeHemisphereWest, Lightning, ShieldCheck, Sparkle, UsersThree } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

export function FeaturesBento() {
    const { t } = useTranslation();

    return (
        <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 relative bg-white dark:bg-slate-950">
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.3] pointer-events-none" />
            <div className="max-w-7xl mx-auto relative z-10">
                <div className="text-center mb-16 max-w-3xl mx-auto">
                    <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-full px-4 py-2 mb-4">
                        <Sparkle weight="fill" className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{t('features.badge')}</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">{t('features.title')}</h2>
                    <p className="text-xl text-slate-600 dark:text-slate-400">{t('features.subtitle')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(250px,auto)]">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="md:col-span-2 glass-card rounded-3xl p-8 relative overflow-hidden group hover:border-indigo-500/30 transition-colors"
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/20 transition-colors" />

                        <div className="relative z-10 h-full flex flex-col justify-between">
                            <div>
                                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center mb-6 text-indigo-600 dark:text-indigo-400">
                                    <ShieldCheck weight="duotone" className="w-6 h-6" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">{t('features.antiCheating.title')}</h3>
                                <p className="text-slate-600 dark:text-slate-400 text-lg max-w-md">{t('features.antiCheating.desc')}</p>
                            </div>
                            <div className="mt-8 flex gap-3 text-sm font-medium text-slate-500">
                                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">Tab Detection</span>
                                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">Fullscreen Lock</span>
                                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">AI Proctor</span>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="md:row-span-2 glass-card rounded-3xl p-8 relative overflow-hidden group hover:border-pink-500/30 transition-colors"
                    >
                        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-pink-500/5 to-transparent opacity-50" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl group-hover:bg-pink-500/30 transition-colors" />

                        <div className="relative z-10 flex flex-col h-full items-center text-center">
                            <div className="w-16 h-16 bg-pink-100 dark:bg-pink-900/50 rounded-2xl flex items-center justify-center mb-6 text-pink-600 dark:text-pink-400 shadow-lg shadow-pink-500/20">
                                <GlobeHemisphereWest weight="duotone" className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">{t('features.globalAccess.title')}</h3>
                            <p className="text-slate-600 dark:text-slate-400 mb-8">{t('features.globalAccess.desc')}</p>

                            <div className="mt-auto relative w-full aspect-square opacity-80">
                                <div className="absolute inset-0 border border-pink-200 dark:border-pink-800 rounded-full animate-spin-slow" />
                                <div className="absolute inset-4 border border-pink-200 dark:border-pink-800 rounded-full animate-spin-slow animation-delay-2000" style={{ animationDirection: 'reverse' }} />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-2 h-2 bg-pink-500 rounded-full animate-ping" />
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="glass-card rounded-3xl p-8 relative overflow-hidden group hover:border-yellow-500/30 transition-colors"
                    >
                        <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/50 rounded-2xl flex items-center justify-center mb-4 text-yellow-600 dark:text-yellow-400">
                            <Lightning weight="duotone" className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('features.fastCreation.title')}</h3>
                        <p className="text-slate-600 dark:text-slate-400">{t('features.fastCreation.desc')}</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 }}
                        className="glass-card rounded-3xl p-8 relative overflow-hidden group hover:border-green-500/30 transition-colors"
                    >
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-2xl flex items-center justify-center mb-4 text-green-600 dark:text-green-400">
                            <UsersThree weight="duotone" className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('features.unlimitedStudents.title')}</h3>
                        <p className="text-slate-600 dark:text-slate-400">{t('features.unlimitedStudents.desc')}</p>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}

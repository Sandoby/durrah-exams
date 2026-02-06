import { motion } from 'framer-motion';
import { Bell, DeviceMobile, DownloadSimple, Lock, Rocket, ShieldCheck } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { Suspense, lazy } from 'react';

const MobileWelcome = lazy(() => import('../../pages/MobileWelcome'));

export function MobileAppSection() {
    const { t } = useTranslation();

    return (
        <section className="py-32 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-950 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />

            <div className="max-w-7xl mx-auto relative z-10">
                <div className="grid lg:grid-cols-2 gap-20 items-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="flex justify-center relative"
                    >
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />

                        <div className="phone-frame scale-[0.7] sm:scale-90 md:scale-100 rotate-y-n12 transform-style-3d">
                            <div className="absolute inset-0 bg-slate-900 overflow-hidden">
                                <div className="w-full h-full flex items-center justify-center bg-gray-900 select-none overflow-hidden">
                                    <div
                                        style={{ width: '360px', height: '770px', transform: 'scale(0.733)' }}
                                        className="flex-shrink-0 bg-gray-50 dark:bg-gray-950 pointer-events-none origin-center"
                                    >
                                        <Suspense
                                            fallback={
                                                <div className="h-full w-full bg-gray-50 dark:bg-gray-950" />
                                            }
                                        >
                                            <MobileWelcome className="h-full" />
                                        </Suspense>
                                    </div>
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/40 via-transparent to-transparent pointer-events-none" />
                            </div>
                        </div>

                        <motion.div
                            animate={{ y: [0, -15, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute -bottom-8 -right-4 md:right-0 bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-20 flex flex-col items-center"
                        >
                            <div className="w-24 h-24 bg-slate-100 dark:bg-slate-900 rounded-xl mb-3 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                                <img
                                    src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://khogxhpnuhhebkevaqlg.supabase.co/storage/v1/object/public/app-releases/DurrahTutors-latest.apk"
                                    alt="QR Code"
                                    className="w-16 h-16 opacity-80"
                                    width={64}
                                    height={64}
                                    loading="lazy"
                                />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('landing.mobileApp.scan')}</span>
                        </motion.div>
                    </motion.div>

                    <div>
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <div className="inline-flex items-center gap-2 bg-pink-50 dark:bg-pink-900/30 border border-pink-200 dark:border-pink-800 rounded-full px-4 py-1.5 mb-6">
                                <DeviceMobile weight="duotone" className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-pink-600 dark:text-pink-400">{t('landing.mobileApp.mobileFirst')}</span>
                            </div>

                            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-8 tracking-tight leading-[1.1]">
                                {t('landing.mobileApp.title', 'Assessments on the Move')}
                            </h2>

                            <p className="text-xl text-slate-600 dark:text-slate-400 mb-10 leading-relaxed">
                                {t('landing.mobileApp.subtitle', 'Access exams anywhere with our native Android application. Seamlessly transition between desktop and mobile.')}
                            </p>

                            <div className="grid sm:grid-cols-2 gap-4 mb-12">
                                {[
                                    { icon: Bell, text: t('landing.mobileApp.featuresList.push'), color: "bg-indigo-500" },
                                    { icon: ShieldCheck, text: t('landing.mobileApp.featuresList.biometric'), color: "bg-emerald-500" },
                                    { icon: Rocket, text: t('landing.mobileApp.featuresList.kids'), color: "bg-purple-500" },
                                    { icon: Lock, text: t('landing.mobileApp.featuresList.offline'), color: "bg-amber-500" }
                                ].map((feat, i) => (
                                    <div key={i} className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 backdrop-blur-sm transition-colors hover:border-indigo-500/30 group">
                                        <feat.icon className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform" />
                                        <span className="font-semibold text-slate-700 dark:text-slate-200">{feat.text}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-wrap gap-4 items-center">
                                <a
                                    href="https://khogxhpnuhhebkevaqlg.supabase.co/storage/v1/object/public/app-releases/DurrahTutors-latest.apk"
                                    className="inline-flex items-center gap-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-4 rounded-2xl font-bold shadow-xl hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:text-white transition-all transform hover:-translate-y-1"
                                >
                                    <DownloadSimple className="w-5 h-5" />
                                    {t('landing.mobileApp.download', 'Download APK')}
                                </a>

                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Coming Soon to</span>
                                    <div className="flex gap-4 opacity-40 grayscale">
                                        <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Play Store" className="h-8" width={110} height={32} loading="lazy" />
                                        <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="App Store" className="h-8" width={110} height={32} loading="lazy" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
}

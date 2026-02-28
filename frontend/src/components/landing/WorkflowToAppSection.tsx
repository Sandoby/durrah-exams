import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValueEvent, useScroll, useSpring } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export const WorkflowToAppSection = () => {
    const { t } = useTranslation();
    const [isAppMode, setIsAppMode] = useState(false);
    const containerRef = useRef<HTMLElement | null>(null);

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "end start"]
    });

    const progressSpring = useSpring(scrollYProgress, { stiffness: 110, damping: 22, mass: 0.9 });

    useMotionValueEvent(progressSpring, "change", (value) => {
        // switch mode when user has scrolled halfway through the section
        setIsAppMode(value > 0.5);
    });

    useEffect(() => {
        // ensure initial mode matches initial scroll position (e.g., on refresh mid-page)
        setIsAppMode(progressSpring.get() > 0.5);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <section
            ref={containerRef}
            className="relative min-h-[180vh] md:min-h-[220vh] bg-white dark:bg-slate-950 border-y border-slate-200 dark:border-slate-800"
        >
            <div className="sticky top-16 md:top-24 py-8 md:py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-8 md:mb-12">
                        <p className="text-sm sm:text-base md:text-xl text-slate-600 dark:text-slate-400 mb-6 max-w-2xl mx-auto">
                            {t('landing.workflow.description', 'Maximize your team ability, by automatically generating a simplified UI')}
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-8">
                            <h2 className={`text-2xl sm:text-3xl md:text-6xl font-bold transition-colors duration-500 ${!isAppMode ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-600'}`}>
                                {t('landing.workflow.from', 'From Workflow')}
                            </h2>
                            
                            <button
                                onClick={() => setIsAppMode(!isAppMode)}
                                className={`relative w-16 h-8 sm:w-20 sm:h-10 md:w-24 md:h-12 rounded-full p-1 md:p-1.5 transition-colors duration-500 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-950 ${isAppMode ? 'bg-sky-100 dark:bg-sky-900/50 focus:ring-sky-400' : 'bg-slate-200 dark:bg-slate-800 focus:ring-slate-400'}`}
                                aria-label="Toggle view mode"
                            >
                                <motion.div
                                    className={`w-6 h-6 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full shadow-md ${isAppMode ? 'bg-sky-500 dark:bg-sky-400' : 'bg-white dark:bg-slate-400'}`}
                                    animate={{ x: isAppMode ? (window.innerWidth < 640 ? 32 : window.innerWidth < 768 ? 40 : 48) : 0 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                />
                            </button>

                        <h2 className={`text-2xl sm:text-3xl md:text-6xl font-bold transition-colors duration-500 ${isAppMode ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-600'}`}>
                            <span className="relative inline-block">
                                <motion.span
                                    className="relative z-10 inline-block"
                                    animate={
                                        isAppMode
                                            ? {
                                                filter: [
                                                    'drop-shadow(0 0 10px rgba(14,165,233,0.35)) drop-shadow(0 0 22px rgba(59,130,246,0.25))',
                                                    'drop-shadow(0 0 22px rgba(14,165,233,0.55)) drop-shadow(0 0 44px rgba(59,130,246,0.35))',
                                                    'drop-shadow(0 0 10px rgba(14,165,233,0.35)) drop-shadow(0 0 22px rgba(59,130,246,0.25))',
                                                ],
                                            }
                                            : { filter: 'none' }
                                    }
                                    transition={{ duration: 2.6, repeat: isAppMode ? Infinity : 0, ease: 'easeInOut' }}
                                >
                                    {t('landing.workflow.to', 'to App Mode')}
                                </motion.span>
                                {isAppMode && (
                                    <>
                                        <motion.span
                                            aria-hidden="true"
                                            className="pointer-events-none absolute inset-0 -z-10 select-none text-sky-500/75 blur-2xl"
                                            animate={{ opacity: [0.35, 0.95, 0.35], scale: [1, 1.035, 1] }}
                                            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                                        >
                                            {t('landing.workflow.to', 'to App Mode')}
                                        </motion.span>
                                        <motion.span
                                            aria-hidden="true"
                                            className="pointer-events-none absolute -inset-x-10 -inset-y-6 -z-20 rounded-full bg-[radial-gradient(circle,rgba(14,165,233,0.24)_0%,rgba(59,130,246,0.12)_38%,transparent_74%)] blur-2xl"
                                            animate={{ opacity: [0.55, 0.95, 0.55], y: [0, -2, 0] }}
                                            transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
                                        />
                                        <motion.span
                                            aria-hidden="true"
                                            className="pointer-events-none absolute inset-y-[-18%] left-[-60%] right-[-60%] -z-10 skew-x-[-18deg] bg-gradient-to-r from-transparent via-sky-300/25 to-transparent blur-md"
                                            animate={{ x: ['-30%', '30%', '-30%'], opacity: [0.25, 0.6, 0.25] }}
                                            transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
                                        />
                                    </>
                                )}
                            </span>
                        </h2>
                    </div>
                </div>

                    <div className={`relative w-full max-w-5xl mx-auto aspect-[4/3] sm:aspect-[16/9] md:aspect-[21/9] bg-slate-50 dark:bg-slate-900 rounded-xl md:rounded-[2rem] border transition-all duration-700 overflow-hidden ${isAppMode ? 'border-sky-200 dark:border-sky-800 shadow-[0_0_60px_-15px_rgba(14,165,233,0.4)] dark:shadow-[0_0_60px_-15px_rgba(14,165,233,0.2)]' : 'border-slate-200 dark:border-slate-800 shadow-sm'}`}>
                        <AnimatePresence mode="wait">
                            {!isAppMode ? (
                                <motion.div
                                    key="workflow"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.4, ease: "easeInOut" }}
                                    className="absolute inset-0 p-4 sm:p-6 md:p-16 flex flex-col justify-center"
                                >
                                    <div className="space-y-4 sm:space-y-6 md:space-y-8 max-w-2xl">
                                        <h3 className="text-xl sm:text-2xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight">
                                            {t('landing.workflow.manual.title', 'Manual & Paper Exams')}
                                        </h3>
                                        <ul className="space-y-2 sm:space-y-3 md:space-y-5 text-slate-600 dark:text-slate-400 text-sm sm:text-base md:text-2xl font-medium">
                                            <li className="flex items-start gap-2 sm:gap-3 md:gap-4">
                                                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-slate-400 mt-1.5 sm:mt-2 flex-shrink-0" />
                                                <span>{t('landing.workflow.manual.point1', 'Printing and distributing physical papers')}</span>
                                            </li>
                                            <li className="flex items-start gap-2 sm:gap-3 md:gap-4">
                                                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-slate-400 mt-1.5 sm:mt-2 flex-shrink-0" />
                                                <span>{t('landing.workflow.manual.point2', 'Manual grading and data entry')}</span>
                                            </li>
                                            <li className="flex items-start gap-2 sm:gap-3 md:gap-4">
                                                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-slate-400 mt-1.5 sm:mt-2 flex-shrink-0" />
                                                <span>{t('landing.workflow.manual.point3', 'Time-consuming result analysis')}</span>
                                            </li>
                                        </ul>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="app"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.4, ease: "easeInOut" }}
                                    className="absolute inset-0 p-4 sm:p-6 md:p-16 flex flex-col justify-center items-end text-right"
                                >
                                    <div className="space-y-4 sm:space-y-6 md:space-y-8 max-w-2xl">
                                        <h3 className="text-xl sm:text-2xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight">
                                            {t('landing.workflow.automated.title', 'Online & Automated Exams')}
                                        </h3>
                                        <ul className="space-y-2 sm:space-y-3 md:space-y-5 text-slate-600 dark:text-slate-400 text-sm sm:text-base md:text-2xl font-medium flex flex-col items-end">
                                            <li className="flex items-start gap-2 sm:gap-3 md:gap-4 flex-row-reverse">
                                                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-sky-500 dark:bg-sky-400 mt-1.5 sm:mt-2 flex-shrink-0" />
                                                <span>{t('landing.workflow.automated.point1', 'Instant digital distribution')}</span>
                                            </li>
                                            <li className="flex items-start gap-2 sm:gap-3 md:gap-4 flex-row-reverse">
                                                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-sky-500 dark:bg-sky-400 mt-1.5 sm:mt-2 flex-shrink-0" />
                                                <span>{t('landing.workflow.automated.point2', 'Automatic grading and instant feedback')}</span>
                                            </li>
                                            <li className="flex items-start gap-2 sm:gap-3 md:gap-4 flex-row-reverse">
                                                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-sky-500 dark:bg-sky-400 mt-1.5 sm:mt-2 flex-shrink-0" />
                                                <span>{t('landing.workflow.automated.point3', 'Real-time analytics and insights')}</span>
                                            </li>
                                        </ul>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </section>
    );
};

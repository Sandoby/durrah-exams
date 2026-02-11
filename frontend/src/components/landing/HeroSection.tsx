import { useEffect, useRef } from 'react';
import {
    motion,
    useMotionValue,
    useReducedMotion,
    useScroll,
    useSpring,
    useTransform
} from 'framer-motion';
import { useTranslation } from 'react-i18next';

export function HeroSection({ registrationUrl }: { registrationUrl: string }) {
    const { t } = useTranslation();
    const containerRef = useRef<HTMLDivElement>(null);
    const pointerTargetRef = useRef({ x: 0, y: 0 });
    const shouldReduceMotion = useReducedMotion();

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end start"]
    });

    const logoScaleRaw = useTransform(scrollYProgress, [0, 0.28, 0.55], [1, 0.9, 0.72]);
    const logoOpacityRaw = useTransform(scrollYProgress, [0, 0.38, 0.62], [1, 0.9, 0]);
    const logoYRaw = useTransform(scrollYProgress, [0, 0.62], [0, -130]);

    const logoScale = useSpring(logoScaleRaw, { stiffness: 120, damping: 24, mass: 0.8 });
    const logoOpacity = useSpring(logoOpacityRaw, { stiffness: 130, damping: 26, mass: 0.8 });
    const logoY = useSpring(logoYRaw, { stiffness: 120, damping: 24, mass: 0.8 });

    const pointerX = useMotionValue(0);
    const pointerY = useMotionValue(0);
    const pointerXSoft = useSpring(pointerX, { stiffness: 70, damping: 20, mass: 0.8 });
    const pointerYSoft = useSpring(pointerY, { stiffness: 70, damping: 20, mass: 0.8 });

    const logoRotateX = useTransform(pointerYSoft, [-1, 1], [3, -3]);
    const logoRotateY = useTransform(pointerXSoft, [-1, 1], [-5, 5]);
    const stageShiftX = useTransform(pointerXSoft, [-1, 1], [-34, 34]);
    const stageShiftY = useTransform(pointerYSoft, [-1, 1], [-22, 22]);
    const meshShiftX = useTransform(pointerXSoft, [-1, 1], [-24, 24]);
    const meshShiftY = useTransform(pointerYSoft, [-1, 1], [-16, 16]);
    const haloShiftX = useTransform(pointerXSoft, [-1, 1], [-14, 14]);
    const haloShiftY = useTransform(pointerYSoft, [-1, 1], [-12, 12]);
    const spotlightX = useTransform(pointerXSoft, [-1, 1], ['20%', '80%']);
    const spotlightY = useTransform(pointerYSoft, [-1, 1], ['18%', '74%']);

    useEffect(() => {
        if (shouldReduceMotion) return;

        let frameId = 0;
        const animatePointer = () => {
            const target = pointerTargetRef.current;
            pointerX.set(pointerX.get() + (target.x - pointerX.get()) * 0.08);
            pointerY.set(pointerY.get() + (target.y - pointerY.get()) * 0.08);
            frameId = window.requestAnimationFrame(animatePointer);
        };

        frameId = window.requestAnimationFrame(animatePointer);
        return () => window.cancelAnimationFrame(frameId);
    }, [pointerX, pointerY, shouldReduceMotion]);

    const handleMouseMove = (event: React.MouseEvent<HTMLElement>) => {
        if (shouldReduceMotion) return;

        const bounds = event.currentTarget.getBoundingClientRect();
        const nx = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
        const ny = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
        pointerTargetRef.current = {
            x: Math.max(-1, Math.min(1, nx)),
            y: Math.max(-1, Math.min(1, ny))
        };
    };

    const handleMouseLeave = () => {
        pointerTargetRef.current = { x: 0, y: 0 };
    };

    return (
        <section
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="relative overflow-hidden bg-white pb-14 pt-12 dark:bg-slate-950 md:pb-20 md:pt-16"
        >
            <div className="pointer-events-none absolute inset-0 opacity-60 bg-[linear-gradient(to_right,#80808010_1px,transparent_1px),linear-gradient(to_bottom,#80808010_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_75%_60%_at_50%_55%,#000_68%,transparent_100%)]" />

            <motion.div
                aria-hidden="true"
                style={{
                    left: shouldReduceMotion ? '50%' : spotlightX,
                    top: shouldReduceMotion ? '40%' : spotlightY
                }}
                className="pointer-events-none absolute z-[1] h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.16)_0%,rgba(59,130,246,0.08)_35%,rgba(59,130,246,0.03)_58%,transparent_75%)] blur-xl"
            />

            <motion.div
                aria-hidden="true"
                style={{ x: stageShiftX, y: stageShiftY }}
                className="pointer-events-none absolute left-1/2 top-1/2 h-[760px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/5 blur-[96px] mix-blend-screen"
            />
            <motion.div
                aria-hidden="true"
                style={{ x: meshShiftX, y: meshShiftY }}
                className="pointer-events-none absolute left-1/2 top-[38%] h-[520px] w-[900px] -translate-x-1/2 rounded-[100%] bg-gradient-to-r from-slate-300/10 via-blue-300/10 to-slate-300/10 blur-3xl dark:from-slate-700/10 dark:via-blue-700/10 dark:to-slate-700/10"
            />

            <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col items-center justify-center text-center">
                    <motion.div
                        style={{
                            scale: logoScale,
                            opacity: logoOpacity,
                            y: logoY,
                            rotateX: shouldReduceMotion ? 0 : logoRotateX,
                            rotateY: shouldReduceMotion ? 0 : logoRotateY,
                            transformPerspective: 1200
                        }}
                        initial={{ opacity: 1, scale: 1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8 }}
                        className="group relative mb-8 flex items-center justify-center will-change-transform md:mb-10"
                    >
                        <div className="relative z-10 h-56 w-56 p-3 md:h-72 md:w-72 md:p-4">
                            <motion.div
                                animate={{
                                    filter: [
                                        "drop-shadow(0 0 20px rgba(37,99,235,0.3))",
                                        "drop-shadow(0 0 50px rgba(37,99,235,0.6))",
                                        "drop-shadow(0 0 20px rgba(37,99,235,0.3))"
                                    ]
                                }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className="h-full w-full will-change-transform"
                            >
                                <img
                                    src="/brand/logo.png"
                                    className="relative z-20 h-full w-full object-contain"
                                    alt="Durrah Logo"
                                />
                            </motion.div>

                            <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden rounded-full opacity-0 transition-opacity duration-700 group-hover:opacity-100">
                                <motion.div
                                    animate={{ left: ['-100%', '200%'] }}
                                    transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5, ease: "easeInOut" }}
                                    className="absolute top-0 h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/50 to-transparent mix-blend-overlay"
                                />
                            </div>
                        </div>

                        <motion.div
                            aria-hidden="true"
                            style={{ x: haloShiftX, y: haloShiftY }}
                            className="pointer-events-none absolute inset-0 scale-75 rounded-full bg-blue-400/10 blur-[60px]"
                        />
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 1, y: 0 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="relative mb-5 text-4xl font-black leading-[1.08] tracking-tighter text-slate-900 dark:text-white md:mb-6 md:text-6xl lg:text-7xl"
                    >
                        <span className="mb-2 block drop-shadow-lg">
                            {t('hero.slogan1')}
                        </span>

                        <span className="relative inline-block text-[#2563EB]">
                            <span className="relative z-10">
                                {t('hero.slogan2')}
                            </span>
                            <motion.span
                                animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.02, 1] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute inset-0 -z-10 select-none text-[#2563EB] blur-lg"
                                aria-hidden="true"
                            >
                                {t('hero.slogan2')}
                            </motion.span>
                        </span>
                    </motion.h1>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="mt-3 flex flex-col items-center gap-3 sm:flex-row"
                    >
                        <a
                            href={registrationUrl}
                            className="rounded-full bg-[#2563EB] px-10 py-4 text-lg font-bold text-white shadow-xl shadow-blue-500/25 transition-all ring-2 ring-blue-500/20 ring-offset-2 ring-offset-white hover:-translate-y-1 hover:bg-blue-700 hover:shadow-blue-500/40 dark:ring-offset-slate-900"
                        >
                            {t('hero.cta', 'Start Free Trial')}
                        </a>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            {t('hero.ctaSubtext', 'Join thousands of educators - Free for 14 days')}
                        </p>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}

import { DeviceMobile, GlobeHemisphereWest, Lightning, ShieldCheck } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

export function PlatformHighlights() {
    const { t } = useTranslation();
    const highlights = [
        { label: t('landing.highlights.availability'), value: t('landing.highlights.uptime'), icon: GlobeHemisphereWest },
        { label: t('landing.highlights.security'), value: t('landing.highlights.ssl'), icon: ShieldCheck },
        { label: t('landing.highlights.global'), value: t('landing.highlights.anyDevice'), icon: DeviceMobile },
        { label: t('landing.highlights.reporting'), value: t('landing.highlights.instantResult'), icon: Lightning },
    ];

    const rollingHighlights = [...highlights, ...highlights];

    return (
        <section className="w-full py-14 sm:py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/85 shadow-[0_10px_35px_-28px_rgba(15,23,42,0.5)] backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-900/65">
                    <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-white via-white/85 to-transparent dark:from-slate-950 dark:via-slate-950/80" />
                    <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-white via-white/85 to-transparent dark:from-slate-950 dark:via-slate-950/80" />

                    <div className="py-5 sm:py-6">
                        <div className="landing-kpi-marquee flex w-max items-stretch gap-4 px-2 sm:gap-5 sm:px-3">
                            {rollingHighlights.map((item, index) => (
                                <article
                                    key={`${item.label}-${index}`}
                                    className="min-w-[260px] rounded-xl border border-slate-200/90 bg-slate-50/80 px-4 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_24px_-18px_rgba(15,23,42,0.55)] dark:border-slate-700/80 dark:bg-slate-900/80 dark:hover:border-slate-600 sm:min-w-[290px] sm:px-5 sm:py-4"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white/90 text-slate-500 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-400 sm:h-11 sm:w-11">
                                            <item.icon weight="regular" className="h-5 w-5 sm:h-[22px] sm:w-[22px]" />
                                        </div>
                                        <div className="leading-tight">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 sm:text-xs">
                                                {item.label}
                                            </p>
                                            <h3 className="mt-1 text-[1.42rem] font-semibold tracking-[-0.01em] text-slate-800 dark:text-slate-100 sm:text-[1.58rem]">
                                                {item.value}
                                            </h3>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .landing-kpi-marquee {
                    animation: landing-kpi-roll 34s linear infinite;
                    will-change: transform;
                }
                .group:hover .landing-kpi-marquee {
                    animation-play-state: paused;
                }
                @keyframes landing-kpi-roll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                @media (max-width: 640px) {
                    .landing-kpi-marquee {
                        animation-duration: 24s;
                    }
                }
                @media (prefers-reduced-motion: reduce) {
                    .landing-kpi-marquee {
                        animation: none;
                        transform: none;
                    }
                }
            `}</style>
        </section>
    );
}

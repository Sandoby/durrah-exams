import { motion } from 'framer-motion';
import {
    GlobeHemisphereWest,
    Headset,
    Lightning,
    MagicWand,
    ShieldCheck,
    Sparkle,
    UsersThree,
} from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';

type FeatureTileProps = {
    title: string;
    desc: string;
    icon: ReactNode;
    eyebrow?: string;
    tags?: string[];
    accent?: string;
    className?: string;
};

function FeatureTile({
    title,
    desc,
    icon,
    eyebrow,
    tags = [],
    accent = 'from-blue-500/12 via-sky-400/8 to-transparent',
    className = ''
}: FeatureTileProps) {
    return (
        <motion.article
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            whileHover={{ y: -4 }}
            className={[
                'group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/85 p-7 shadow-[0_18px_55px_-52px_rgba(15,23,42,0.8)] backdrop-blur-sm',
                'transition-colors hover:border-slate-300/80',
                'dark:border-slate-800/70 dark:bg-slate-900/65 dark:hover:border-slate-700/70',
                className
            ].join(' ')}
        >
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent} opacity-60`} />
            <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-slate-200/30 blur-3xl dark:bg-slate-700/25" />

            <div className="relative flex flex-col gap-4">
                <div className="flex items-start justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm dark:bg-slate-950/70 dark:ring-slate-800">
                            <div className="text-slate-800 dark:text-slate-200">{icon}</div>
                        </div>
                        {eyebrow && (
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                                {eyebrow}
                            </div>
                        )}
                    </div>
                    <div className="h-10 w-10 rounded-2xl bg-white/70 ring-1 ring-slate-200/80 shadow-sm opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:bg-slate-950/40 dark:ring-slate-800/70" />
                </div>

                <div className="space-y-2">
                    <h3 className="text-xl font-semibold tracking-[-0.01em] text-slate-900 dark:text-white md:text-[22px]">
                        {title}
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 md:text-base">
                        {desc}
                    </p>
                </div>

                {tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                        {tags.map((tag) => (
                            <span
                                key={tag}
                                className="rounded-full bg-white/80 px-3 py-1 ring-1 ring-slate-200/80 dark:bg-slate-950/35 dark:ring-slate-800/80"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </motion.article>
    );
}

export function FeaturesBento() {
    const { t } = useTranslation();

    return (
        <section id="features" className="relative overflow-hidden py-24 md:py-28">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_45%,#000_62%,transparent_100%)]" />
            <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[860px] -translate-x-1/2 rounded-full bg-gradient-to-b from-slate-200/55 to-transparent blur-3xl dark:from-slate-800/35" />

            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.55, ease: 'easeOut' }}
                    className="mx-auto mb-14 max-w-3xl text-center md:mb-16"
                >
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400">
                        <Sparkle weight="fill" className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                        {t('features.badge', 'Features')}
                    </div>
                    <h2 className="mt-5 text-3xl font-semibold tracking-[-0.02em] text-slate-900 dark:text-white md:text-5xl">
                        {t('features.title', 'Everything You Need to Excel')}
                    </h2>
                    <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-400 md:text-lg">
                        {t('features.subtitle', 'Powerful features designed specifically for modern educators')}
                    </p>
                </motion.div>

                <div className="grid gap-6 md:grid-cols-12">
                    <FeatureTile
                        className="md:col-span-7"
                        eyebrow={t('features.badge', 'Features')}
                        icon={<ShieldCheck weight="duotone" className="h-6 w-6" />}
                        title={t('features.antiCheating.title', 'Advanced Anti-Cheating')}
                        desc={t('features.antiCheating.desc', 'Fullscreen mode, tab switching detection, copy-paste prevention, and violation tracking.')}
                        tags={[
                            t('features.tags.tabDetection', 'Tab Detection'),
                            t('features.tags.fullscreenLock', 'Fullscreen Lock'),
                            t('features.tags.aiProctor', 'AI Proctor')
                        ]}
                        accent="from-blue-500/14 via-sky-400/10 to-transparent"
                    />
                    <FeatureTile
                        className="md:col-span-5"
                        icon={<GlobeHemisphereWest weight="duotone" className="h-6 w-6" />}
                        title={t('features.globalAccess.title', 'Global Accessibility')}
                        desc={t('features.globalAccess.desc', 'Share exams worldwide with unique links. Students can access from any device, anywhere.')}
                        accent="from-indigo-500/12 via-blue-400/8 to-transparent"
                    />
                    <FeatureTile
                        className="md:col-span-4"
                        icon={<Lightning weight="duotone" className="h-6 w-6" />}
                        title={t('features.fastCreation.title', 'Lightning Fast Creation')}
                        desc={t('features.fastCreation.desc', 'Create professional exams in minutes with our intuitive interface. Multiple question types supported.')}
                        accent="from-amber-500/10 via-orange-400/6 to-transparent"
                    />
                    <FeatureTile
                        className="md:col-span-4"
                        icon={<UsersThree weight="duotone" className="h-6 w-6" />}
                        title={t('features.unlimitedStudents.title', 'Unlimited Students')}
                        desc={t('features.unlimitedStudents.desc', 'No limits on the number of students who can take your exams. Scale effortlessly.')}
                        accent="from-emerald-500/10 via-teal-400/6 to-transparent"
                    />
                    <FeatureTile
                        className="md:col-span-4"
                        icon={<MagicWand weight="duotone" className="h-6 w-6" />}
                        title={t('features.interface.title', 'Intuitive Interface')}
                        desc={t('features.interface.desc', 'Easy to use, powerful features')}
                        accent="from-slate-500/10 via-slate-400/6 to-transparent"
                    />
                    <FeatureTile
                        className="md:col-span-12"
                        icon={<Headset weight="duotone" className="h-6 w-6" />}
                        title={t('features.support.title', '24/7 Support')}
                        desc={t('features.support.desc', 'Get help whenever you need it with our dedicated support team and comprehensive documentation.')}
                        accent="from-sky-500/10 via-blue-400/6 to-transparent"
                    />
                </div>
            </div>
        </section>
    );
}

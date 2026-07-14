import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

interface AboutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
    const { t, i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={onClose} />

            <div 
                className="relative w-full max-w-lg bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-6 sm:p-8 shadow-xl text-zinc-900 dark:text-zinc-100 transition-all duration-300 animate-in zoom-in-95"
                dir={isRtl ? 'rtl' : 'ltr'}
            >
                {/* Close Button */}
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                    aria-label="Close"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="mb-6">
                    <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                        {t('footer.about', 'About Durrah')}
                    </h3>
                    <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1">
                        {t('about.hero.badge', 'Our Story & Mission')}
                    </p>
                </div>

                {/* Body Content */}
                <div className="space-y-4 text-sm leading-relaxed text-zinc-650 dark:text-zinc-300">
                    <p>
                        {t('about.hero.subtitle', 'We started with a frustration every tutor knows — exam tools built for IT departments, not teachers. Durrah changes that.')}
                    </p>
                    <p>
                        {t('about.mission.p1', 'Education is the most leveraged profession in the world — one great tutor impacts thousands of students. Yet the tools tutors use are decades behind.')}
                    </p>
                    <p>
                        {t('about.mission.p2', 'We give independent tutors and small academies the same quality exam infrastructure that top universities pay millions for — at a price that makes sense.')}
                    </p>
                </div>

                {/* Values Bullet Points */}
                <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                        {t('about.values.title', 'What We Stand For')}
                    </h4>
                    <ul className="grid grid-cols-2 gap-2 text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                        <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            {t('about.values.education.title', 'Education First')}
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {t('about.values.trust.title', 'Radical Trust')}
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            {t('about.values.simplicity.title', 'Elegant Simplicity')}
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                            {t('about.values.global.title', 'Globally Inclusive')}
                        </li>
                    </ul>
                </div>

                {/* Footer Action */}
                <div className="mt-8 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                    <button 
                        onClick={onClose} 
                        className="bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-semibold text-xs px-4 py-2 rounded-lg transition-colors shadow-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

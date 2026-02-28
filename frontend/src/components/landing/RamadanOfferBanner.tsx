import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useState } from 'react';

export function RamadanOfferBanner() {
    const { t } = useTranslation();
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="fixed top-0 left-0 right-0 z-40 border-b border-slate-200 bg-white/95 py-2 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95"
        >
            <div className="mx-auto max-w-7xl px-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-1 items-center justify-center gap-2 text-sm sm:gap-3">
                        <span className="text-slate-600 dark:text-slate-400">
                            {t('ramadan.banner.text', 'Ramadan Special: Get 1 month free with code')}
                        </span>
                        <span className="rounded-md bg-slate-900 px-2.5 py-1 font-mono text-xs font-semibold tracking-wide text-white dark:bg-white dark:text-slate-900">
                            RAMADAN
                        </span>
                    </div>
                    <button
                        onClick={() => setIsVisible(false)}
                        className="flex-shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                        aria-label="Close banner"
                    >
                        <X size={16} strokeWidth={2} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

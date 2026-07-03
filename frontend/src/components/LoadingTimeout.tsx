import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface LoadingTimeoutProps {
    isLoading: boolean;
    onRetry: () => void;
    timeoutMs?: number;
    children: React.ReactNode;
}

export const LoadingTimeout: React.FC<LoadingTimeoutProps> = ({
    isLoading,
    onRetry,
    timeoutMs = 15000,
    children,
}) => {
    const { t, i18n } = useTranslation();
    const [hasTimedOut, setHasTimedOut] = useState(false);

    useEffect(() => {
        let timer: NodeJS.Timeout;

        if (isLoading) {
            setHasTimedOut(false);
            timer = setTimeout(() => {
                setHasTimedOut(true);
            }, timeoutMs);
        } else {
            setHasTimedOut(false);
        }

        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [isLoading, timeoutMs]);

    if (!isLoading) {
        return null;
    }

    if (hasTimedOut) {
        const isRtl = i18n.language === 'ar';
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-amber-50/50 dark:bg-slate-900/50 border border-amber-200/50 dark:border-slate-800 rounded-2xl shadow-sm text-center max-w-lg mx-auto my-8">
                <AlertCircle className="w-12 h-12 text-amber-500 mb-4 animate-pulse" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {t('loading.timeout.title', isRtl ? 'يبدو أن التحميل يستغرق وقتاً أطول من المعتاد' : 'Loading is taking longer than usual')}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    {t('loading.timeout.description', isRtl ? 'قد يكون ذلك بسبب ضعف الاتصال بالإنترنت. يرجى المحاولة مرة أخرى.' : 'This might be due to a slow internet connection. Please try again.')}
                </p>
                <button
                    onClick={() => {
                        setHasTimedOut(false);
                        onRetry();
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-md shadow-indigo-200 dark:shadow-none transition-all hover:scale-105"
                >
                    <RefreshCw className="w-4 h-4" />
                    <span>{t('common.retry', isRtl ? 'إعادة المحاولة' : 'Retry')}</span>
                </button>
            </div>
        );
    }

    return <>{children}</>;
};

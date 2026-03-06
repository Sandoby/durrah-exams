/**
 * CheckoutError component
 *
 * Shown when the checkout session or SDK fails to load.
 * Provides Retry and optional "Open in new tab" fallback actions.
 */

import { AlertCircle, RefreshCw, ArrowRight, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CheckoutErrorProps {
  message: string;
  retryable?: boolean;
  onRetry: () => void;
  onOpenFallback?: () => void;
  isFallbackLoading?: boolean;
}

export function CheckoutError({
  message,
  retryable = true,
  onRetry,
  onOpenFallback,
  isFallbackLoading = false,
}: CheckoutErrorProps) {
  const { t } = useTranslation();

  return (
    <div className="p-6">
      <div className="rounded-2xl border border-red-200/50 dark:border-red-900/30 bg-red-50/60 dark:bg-red-950/20 px-5 py-4 text-sm text-red-800 dark:text-red-200">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-200/60 dark:border-red-800/40 flex items-center justify-center shrink-0 mt-0.5">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-red-800 dark:text-red-200">
              {t('checkout.sessionError', 'Could not load checkout')}
            </div>
            <div className="mt-1 text-red-600/80 dark:text-red-400/80 text-xs break-words leading-relaxed">{message}</div>

            <div className="mt-3 flex gap-2 flex-wrap">
              {retryable && (
                <button
                  onClick={onRetry}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold text-xs px-3.5 py-2 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {t('checkout.retry', 'Retry')}
                </button>
              )}

              {onOpenFallback && (
                <button
                  onClick={onOpenFallback}
                  disabled={isFallbackLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 font-semibold text-xs px-3.5 py-2 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50"
                >
                  {isFallbackLoading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <ArrowRight className="w-3.5 h-3.5" />}
                  {t('checkout.openTab', 'Open in new tab')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

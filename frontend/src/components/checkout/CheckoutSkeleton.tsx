/**
 * CheckoutSkeleton component
 *
 * Animated skeleton shown inside the checkout iframe container while the Dodo SDK
 * is loading (before the checkout.opened event fires).
 */

import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function CheckoutSkeleton() {
  const { t } = useTranslation();

  return (
    <div className="p-7">
      <div className="animate-pulse space-y-3">
        {/* Label rows */}
        <div className="h-4 bg-slate-100 dark:bg-white/[0.06] rounded-lg w-2/3" />
        <div className="h-3 bg-slate-100 dark:bg-white/[0.04] rounded-lg w-1/2" />

        {/* Input fields */}
        <div className="mt-5 h-11 bg-slate-100 dark:bg-white/[0.05] rounded-xl w-full" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-11 bg-slate-100 dark:bg-white/[0.05] rounded-xl" />
          <div className="h-11 bg-slate-100 dark:bg-white/[0.05] rounded-xl" />
        </div>
        <div className="h-11 bg-slate-100 dark:bg-white/[0.05] rounded-xl w-full" />
        <div className="h-11 bg-slate-100 dark:bg-white/[0.05] rounded-xl w-full" />

        <div className="pt-3" />

        {/* Pay button */}
        <div className="h-12 bg-blue-100 dark:bg-blue-500/[0.12] rounded-xl w-full" />

        {/* Security row */}
        <div className="flex items-center justify-center gap-2 pt-1">
          <div className="h-3 bg-slate-100 dark:bg-white/[0.04] rounded w-4" />
          <div className="h-3 bg-slate-100 dark:bg-white/[0.04] rounded w-28" />
        </div>
      </div>

      <p className="mt-6 text-xs text-center text-slate-400 dark:text-slate-600 flex items-center justify-center gap-1.5">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        {t('checkout.loadingCheckout', 'Loading your secure checkout form...')}
      </p>
    </div>
  );
}

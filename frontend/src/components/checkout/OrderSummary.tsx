/**
 * OrderSummary component
 *
 * Shows a live-updating order summary driven by Dodo SDK checkout.breakdown events.
 * Falls back to static display prices until the SDK fires the first breakdown event.
 */

import type { CheckoutBreakdownData } from 'dodopayments-checkout';
import { useTranslation } from 'react-i18next';
import { Tag, RefreshCw } from 'lucide-react';

type BillingCycle = 'monthly' | 'yearly';

interface OrderSummaryProps {
  planName: string;
  billingCycle: BillingCycle;
  displayPrice: string;
  displayPriceLoading: boolean;
  breakdown: CheckoutBreakdownData | null;
}

function formatCents(cents: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function OrderSummary({
  planName,
  billingCycle,
  displayPrice,
  displayPriceLoading,
  breakdown,
}: OrderSummaryProps) {
  const { t } = useTranslation();

  const hasBreakdown = !!breakdown;
  const currency = breakdown?.finalTotalCurrency ?? breakdown?.currency ?? 'USD';

  const subtotal = hasBreakdown ? formatCents(breakdown!.subTotal ?? 0, currency) : null;
  const discount = hasBreakdown && (breakdown!.discount ?? 0) > 0
    ? formatCents(breakdown!.discount!, currency)
    : null;
  const tax = hasBreakdown ? breakdown!.tax ?? 0 : null;
  const taxFormatted = tax !== null && tax > 0 ? formatCents(tax, currency) : null;
  const total = hasBreakdown
    ? formatCents((breakdown!.finalTotal ?? breakdown!.total ?? 0), currency)
    : null;

  return (
    <div className="rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 backdrop-blur p-5">
      <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
        {t('checkout.orderSummary', 'Order summary')}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-base font-semibold text-slate-900 dark:text-white">{planName}</span>
        <span className="inline-flex items-center rounded-full border border-slate-200/70 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300 capitalize">
          {billingCycle === 'monthly'
            ? t('checkout.monthly', 'Monthly')
            : t('checkout.yearly', 'Yearly')}
        </span>
      </div>

      <div className="mt-4 space-y-2.5 text-sm">
        {hasBreakdown ? (
          <>
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>{t('checkout.subtotal', 'Subtotal')}</span>
              <span className="tabular-nums">{subtotal}</span>
            </div>

            {discount && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  {t('checkout.discount', 'Discount')}
                </span>
                <span className="tabular-nums">−{discount}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>{t('checkout.tax', 'Tax / VAT')}</span>
              <span className="tabular-nums">
                {taxFormatted ?? (
                  <span className="text-slate-400 dark:text-slate-500 text-xs italic">
                    {t('checkout.taxPending', 'Calculated at checkout')}
                  </span>
                )}
              </span>
            </div>

            <div className="pt-3 mt-1 border-t border-slate-200 dark:border-slate-700 flex justify-between items-baseline">
              <span className="font-semibold text-slate-900 dark:text-white">
                {t('checkout.total', 'Total')}
              </span>
              <span className="text-xl font-semibold text-slate-900 dark:text-white tabular-nums">
                {total}
              </span>
            </div>

            {breakdown!.finalTotalCurrency && breakdown!.finalTotalCurrency !== breakdown!.currency && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 text-right">
                {t('checkout.currencyConverted', 'Converted to')} {breakdown!.finalTotalCurrency}
              </p>
            )}
          </>
        ) : (
          // Static fallback before first breakdown event
          <>
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>{t('checkout.price', 'Price')}</span>
              <span className="tabular-nums font-medium">
                {displayPriceLoading ? (
                  <span className="inline-block w-16 h-4 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
                ) : (
                  displayPrice
                )}
              </span>
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500">
              {t('checkout.taxNote', 'Tax calculated based on your location')}
            </div>
            <div className="pt-3 mt-1 border-t border-slate-200 dark:border-slate-700 flex justify-between items-baseline">
              <span className="font-semibold text-slate-900 dark:text-white">
                {t('checkout.total', 'Total')}
              </span>
              <span className="text-xl font-semibold text-slate-900 dark:text-white tabular-nums">
                {displayPriceLoading ? (
                  <span className="inline-block w-20 h-6 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
                ) : (
                  displayPrice
                )}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
        <RefreshCw className="w-3 h-3 shrink-0" />
        <span>
          {billingCycle === 'monthly'
            ? t('checkout.renewsMonthly', 'Renews monthly. Cancel anytime.')
            : t('checkout.renewsYearly', 'Renews yearly. Save 17% vs monthly.')}
        </span>
      </div>
    </div>
  );
}

/**
 * BillingCycleToggle component
 *
 * Monthly / Yearly toggle pill with a "Save 17%" badge on the yearly option.
 * Disabled while a checkout session is being created.
 */

import { useTranslation } from 'react-i18next';

type BillingCycle = 'monthly' | 'yearly';

interface BillingCycleToggleProps {
  value: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
  disabled?: boolean;
}

export function BillingCycleToggle({ value, onChange, disabled = false }: BillingCycleToggleProps) {
  const { t } = useTranslation();

  return (
    <div
      className={`inline-flex rounded-2xl bg-slate-900/5 dark:bg-white/10 p-1 ${
        disabled ? 'opacity-60 pointer-events-none' : ''
      }`}
    >
      {(['monthly', 'yearly'] as const).map((cycle) => {
        const isActive = value === cycle;
        return (
          <button
            key={cycle}
            type="button"
            onClick={() => onChange(cycle)}
            disabled={disabled}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
              isActive
                ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {cycle === 'monthly'
              ? t('checkout.monthly', 'Monthly')
              : t('checkout.yearly', 'Yearly')}

            {/* Show "Save 17%" badge only on the yearly button when NOT currently selected */}
            {cycle === 'yearly' && !isActive && (
              <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 text-[10px] font-bold leading-none text-emerald-700 dark:text-emerald-300">
                {t('checkout.save17', '-17%')}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

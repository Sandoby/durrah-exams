/**
 * BillingCycleToggle Component
 *
 * Toggle between monthly and yearly billing cycles
 * Apple-like segmented control design
 */

import React from 'react';
import { Calendar, Zap } from 'lucide-react';
import type { BillingCycleToggleProps } from '../../types/dodo';

const BillingCycleToggle: React.FC<BillingCycleToggleProps> = ({
  cycle,
  onCycleChange,
  disabled = false,
  showDiscount = true,
  discountPercentage = 17,
}) => {
  const options = [
    {
      value: 'monthly' as const,
      label: 'Monthly',
      icon: Calendar,
      description: 'Billed monthly',
    },
    {
      value: 'yearly' as const,
      label: 'Yearly',
      icon: Zap,
      description: `Save ${discountPercentage}%`,
      badge: showDiscount ? `Save ${discountPercentage}%` : undefined,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
          Billing Cycle
        </h3>
        {showDiscount && cycle === 'yearly' && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold rounded-full">
            <Zap className="w-3 h-3" />
            {discountPercentage}% Discount
          </span>
        )}
      </div>

      {/* Segmented Control */}
      <div className="relative bg-gray-100 dark:bg-gray-800 rounded-xl p-1 grid grid-cols-2 gap-1">
        {options.map((option) => {
          const isSelected = cycle === option.value;
          const Icon = option.icon;

          return (
            <button
              key={option.value}
              onClick={() => !disabled && onCycleChange(option.value)}
              disabled={disabled}
              className={`
                relative px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200
                ${
                  isSelected
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }
                ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-center justify-center gap-2">
                <Icon className="w-4 h-4" />
                <span>{option.label}</span>
              </div>

              {/* Optional badge (for yearly discount) */}
              {option.badge && isSelected && (
                <div className="absolute -top-2 -right-2">
                  <span className="inline-block px-1.5 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded-full shadow-lg">
                    {option.badge}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Description text */}
      <div className="text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {cycle === 'yearly'
            ? `💰 Save $${(5 * 12 * discountPercentage) / 100} per year with yearly billing`
            : 'Cancel anytime, no commitments'}
        </p>
      </div>
    </div>
  );
};

export default BillingCycleToggle;

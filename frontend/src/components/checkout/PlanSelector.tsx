/**
 * PlanSelector Component
 *
 * Compact plan selection for inline checkout
 * Apple-like design with smooth animations
 */

import React from 'react';
import { Check, Sparkles } from 'lucide-react';
import type { PlanSelectorProps } from '../../types/dodo';

const PlanSelector: React.FC<PlanSelectorProps> = ({
  selectedPlan,
  onPlanChange,
  disabled = false,
}) => {
  const plans = [
    {
      id: 'basic' as const,
      name: 'Basic',
      description: 'Essential features for students',
      price: 5,
      isPopular: false,
    },
    {
      id: 'pro' as const,
      name: 'Pro',
      description: 'Full access with advanced features',
      price: 5,
      isPopular: true,
    },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
        Select Plan
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {plans.map((plan) => {
          const isSelected = selectedPlan === plan.id;

          return (
            <button
              key={plan.id}
              onClick={() => !disabled && onPlanChange(plan.id)}
              disabled={disabled}
              className={`
                relative p-4 rounded-xl border-2 text-left transition-all duration-200
                ${
                  isSelected
                    ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-lg scale-[1.02]'
                    : 'border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 hover:border-gray-300 dark:hover:border-gray-600'
                }
                ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {/* Popular Badge */}
              {plan.isPopular && (
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold rounded-full shadow-lg">
                    <Sparkles className="w-3 h-3" />
                    Popular
                  </span>
                </div>
              )}

              {/* Radio indicator */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white text-base">
                    {plan.name}
                  </h4>
                </div>
                <div
                  className={`
                  w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                  ${
                    isSelected
                      ? 'border-blue-600 dark:border-blue-500 bg-blue-600 dark:bg-blue-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }
                `}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{plan.description}</p>

              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">${plan.price}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">/month</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PlanSelector;

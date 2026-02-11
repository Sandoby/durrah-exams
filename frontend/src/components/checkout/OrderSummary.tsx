/**
 * OrderSummary Component
 *
 * Displays order details, price breakdown, and total with real-time updates
 * Apple-like professional design with glassmorphism
 */

import React from 'react';
import { CheckCircle2, Lock, Sparkles } from 'lucide-react';
import type { OrderSummaryProps } from '../../types/dodo';

const OrderSummary: React.FC<OrderSummaryProps> = ({
  plan,
  billingCycle,
  breakdown,
  couponCode,
  loading = false,
}) => {
  // Format currency amounts
  const formatAmount = (amount: number | null | undefined, currency: string = 'USD') => {
    if (amount == null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  };

  // Get currency from breakdown
  const currency = breakdown?.finalTotalCurrency || breakdown?.currency || 'USD';

  // Plan information
  const planName = plan === 'pro' ? 'Pro Plan' : 'Basic Plan';
  const cycleText = billingCycle === 'yearly' ? 'Yearly' : 'Monthly';

  // Plan features based on plan type
  const planFeatures =
    plan === 'pro'
      ? ['Unlimited exam access', 'Advanced analytics', 'Priority support', 'Offline mode']
      : ['Limited exam access', 'Basic analytics', 'Email support'];

  return (
    <div className="space-y-6">
      {/* Plan Header Card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-2xl p-6 border border-blue-100 dark:border-blue-900/50">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{planName}</h3>
              {plan === 'pro' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold rounded-full">
                  <Sparkles className="w-3 h-3" />
                  Popular
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Billed {cycleText}</p>
          </div>
        </div>

        {/* Features List */}
        <div className="space-y-2">
          {planFeatures.map((feature, index) => (
            <div key={index} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Price Breakdown Card */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-lg">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 uppercase tracking-wide">
          Order Summary
        </h4>

        <div className="space-y-3">
          {/* Subtotal */}
          {breakdown?.subTotal != null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {loading ? (
                  <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                ) : (
                  formatAmount(breakdown.subTotal, currency)
                )}
              </span>
            </div>
          )}

          {/* Discount */}
          {breakdown?.discount != null && breakdown.discount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Discount {couponCode && <span className="text-xs text-green-600 dark:text-green-400">({couponCode})</span>}
              </span>
              <span className="font-medium text-green-600 dark:text-green-400">
                {loading ? (
                  <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                ) : (
                  `-${formatAmount(breakdown.discount, currency)}`
                )}
              </span>
            </div>
          )}

          {/* Tax */}
          {breakdown?.tax != null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Tax</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {loading ? (
                  <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                ) : (
                  formatAmount(breakdown.tax, currency)
                )}
              </span>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
            {/* Total */}
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-gray-900 dark:text-white">Total</span>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {loading ? (
                  <div className="h-7 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                ) : breakdown?.finalTotal != null || breakdown?.total != null ? (
                  formatAmount(breakdown.finalTotal ?? breakdown.total, currency)
                ) : (
                  '—'
                )}
              </span>
            </div>

            {/* Billing cycle note */}
            {billingCycle === 'yearly' && breakdown?.finalTotal != null && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                That's {formatAmount(Math.floor((breakdown.finalTotal ?? 0) / 12), currency)} per month
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Security Badge */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <Lock className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white">Secure Payment</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              Powered by Dodo Payments • PCI DSS compliant
            </p>
          </div>
        </div>
      </div>

      {/* Money-back guarantee or other trust signals */}
      <div className="text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          🔒 Your payment information is secure and encrypted
        </p>
      </div>
    </div>
  );
};

export default OrderSummary;

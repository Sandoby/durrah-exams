/**
 * DodoInlineCheckout Component
 *
 * Wrapper for Dodo Payments inline checkout iframe
 * Handles SDK initialization, loading states, and error display
 */

import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useDodoCheckout } from '../../hooks/useDodoCheckout';
import { DURRAH_DODO_THEME } from '../../config/dodoTheme';
import type { DodoInlineCheckoutProps } from '../../types/dodo';

const DodoInlineCheckout: React.FC<DodoInlineCheckoutProps> = ({
  checkoutUrl,
  mode,
  onBreakdownUpdate,
  onStatusUpdate,
  onError,
  onRedirectRequested,
}) => {
  const [mounted, setMounted] = useState(false);
  const [timeoutError, setTimeoutError] = useState(false);

  console.log('[DodoInlineCheckout] Component rendered with props:', {
    hasCheckoutUrl: !!checkoutUrl,
    checkoutUrlLength: checkoutUrl?.length || 0,
    mode,
    mounted
  });

  useEffect(() => {
    console.log('[DodoInlineCheckout] Mounting component');
    setMounted(true);

    // Set a timeout to show error if checkout doesn't load in 15 seconds
    const timeout = setTimeout(() => {
      console.warn('[DodoInlineCheckout] Timeout after 15 seconds');
      setTimeoutError(true);
    }, 15000);

    return () => {
      console.log('[DodoInlineCheckout] Unmounting component');
      clearTimeout(timeout);
      setMounted(false);
    };
  }, []);

  // Track checkoutUrl changes
  useEffect(() => {
    if (checkoutUrl) {
      console.log('[DodoInlineCheckout] Checkout URL received:', checkoutUrl);
    }
  }, [checkoutUrl]);

  const { isReady, error } = useDodoCheckout({
    mode,
    checkoutUrl,
    elementId: 'dodo-inline-checkout-frame',
    onBreakdownUpdate,
    onStatusUpdate,
    onError,
    onRedirectRequested,
    themeConfig: DURRAH_DODO_THEME,
  });

  // Debug logging
  useEffect(() => {
    console.log('[DodoInlineCheckout] State:', {
      mounted,
      isReady,
      hasError: !!error,
      checkoutUrl,
      mode
    });
  }, [mounted, isReady, error, checkoutUrl, mode]);

  if (!mounted) {
    return null;
  }

  return (
    <div className="relative">
      {/* Loading State */}
      {!isReady && !error && !timeoutError && (
        <div className="min-h-[600px] flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-800">
          <div className="text-center p-8">
            <Loader2 className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-4" />
            <p className="text-sm font-medium text-gray-900 dark:text-white">Loading secure checkout...</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">This should only take a moment</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
              Debug: {checkoutUrl ? 'URL loaded' : 'Waiting for URL'}
            </p>
          </div>
        </div>
      )}

      {/* Timeout Error */}
      {timeoutError && !isReady && !error && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-8">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/40 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-1">Checkout Taking Longer Than Expected</h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                The payment form is taking longer than usual to load. This might be due to a slow connection.
              </p>
              <div className="text-xs text-yellow-700 dark:text-yellow-300 mb-3">
                Debug info:
                <ul className="list-disc list-inside mt-1">
                  <li>Mode: {mode}</li>
                  <li>URL: {checkoutUrl ? 'Present' : 'Missing'}</li>
                  <li>SDK Ready: {isReady ? 'Yes' : 'No'}</li>
                </ul>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">Checkout Error</h3>
              <p className="text-sm text-red-800 dark:text-red-200 mb-3">{error.message}</p>
              {error.code && (
                <p className="text-xs text-red-700 dark:text-red-300 mb-3">Error code: {error.code}</p>
              )}
              {error.retryable && (
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Checkout Container - Always render but hide when not ready */}
      <div
        className={`bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden transition-opacity duration-300 ${
          isReady && !error ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
        }`}
        style={{ minHeight: '600px' }}
      >
        {/* Dodo Checkout Iframe will be injected here */}
        <div id="dodo-inline-checkout-frame" className="w-full min-h-[600px]" />
      </div>
    </div>
  );
};

export default DodoInlineCheckout;

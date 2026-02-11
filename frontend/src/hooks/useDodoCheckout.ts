/**
 * useDodoCheckout Hook
 *
 * Manages Dodo Payments SDK initialization and inline checkout lifecycle
 * Handles events, state management, and cleanup
 */

import { useEffect, useState, useCallback } from 'react';
import { DodoPayments } from 'dodopayments-checkout';
import type { CheckoutEvent, CheckoutBreakdownData } from 'dodopayments-checkout';
import type {
  UseDodoCheckoutOptions,
  UseDodoCheckoutReturn,
  CheckoutError,
} from '../types/dodo';

export const useDodoCheckout = ({
  mode,
  checkoutUrl,
  elementId,
  onBreakdownUpdate,
  onStatusUpdate,
  onError,
  onRedirectRequested,
  themeConfig,
}: UseDodoCheckoutOptions): UseDodoCheckoutReturn => {
  const [isReady, setIsReady] = useState(false);
  const [breakdown, setBreakdown] = useState<CheckoutBreakdownData | null>(null);
  const [error, setError] = useState<CheckoutError | null>(null);

  // Handle checkout events (use string event type for SDK version compatibility)
  const handleEvent = useCallback(
    (event: CheckoutEvent) => {
      const eventType = event.event_type as string;
      console.log('[Dodo Checkout Event]', eventType, event.data);

      try {
        switch (eventType) {
          case 'checkout.opened':
            console.log('Checkout iframe loaded');
            break;

          case 'checkout.breakdown': {
            const breakdownData = event.data?.message as CheckoutBreakdownData;
            if (breakdownData) {
              console.log('Breakdown updated:', breakdownData);
              setBreakdown(breakdownData);
              onBreakdownUpdate?.(breakdownData);
            }
            break;
          }

          case 'checkout.customer_details_submitted':
            console.log('Customer details submitted');
            break;

          case 'checkout.status': {
            const status = (event.data?.message as any)?.status;
            if (status) {
              console.log('Payment status:', status);
              onStatusUpdate?.(status);
            }
            break;
          }

          case 'checkout.redirect':
            console.log('Checkout redirect initiated');
            break;

          case 'checkout.redirect_requested': {
            const redirectUrl = (event.data?.message as any)?.redirect_to;
            if (redirectUrl) {
              console.log('Redirect requested:', redirectUrl);
              // Save state before redirect (e.g., for 3DS authentication)
              sessionStorage.setItem('pendingCheckout', checkoutUrl);
              sessionStorage.setItem('checkoutElementId', elementId);
              onRedirectRequested?.(redirectUrl);
              window.location.href = redirectUrl;
            }
            break;
          }

          case 'checkout.link_expired': {
            console.warn('Checkout session expired');
            const expiredError: CheckoutError = {
              message: 'Your checkout session has expired. Please start again.',
              code: 'SESSION_EXPIRED',
              retryable: true,
            };
            setError(expiredError);
            onError?.(expiredError);
            break;
          }

          case 'checkout.error': {
            const errorMessage = (event.data?.message as string) || 'An error occurred during checkout';
            console.error('Checkout error:', errorMessage);
            const checkoutError: CheckoutError = {
              message: errorMessage,
              code: 'CHECKOUT_ERROR',
              retryable: true,
            };
            setError(checkoutError);
            onError?.(checkoutError);
            break;
          }

          default:
            if (eventType === 'checkout.form_ready') {
              console.log('Checkout form ready for user input');
              setIsReady(true);
              setError(null);
              break;
            }
            if (eventType === 'checkout.pay_button_clicked') {
              console.log('Pay button clicked');
              break;
            }
            console.log('Unhandled event:', eventType);
        }
      } catch (err) {
        console.error('Error handling checkout event:', err);
        const handlerError: CheckoutError = {
          message: 'Failed to process checkout event',
          code: 'EVENT_HANDLER_ERROR',
          retryable: false,
        };
        setError(handlerError);
        onError?.(handlerError);
      }
    },
    [checkoutUrl, elementId, onBreakdownUpdate, onStatusUpdate, onError, onRedirectRequested]
  );

  // Initialize SDK once
  useEffect(() => {
    console.log('[Dodo SDK] Initializing with mode:', mode);

    // Monkey-patch console.error to suppress iframe-resizer origin errors
    const originalError = console.error;
    console.error = (...args: any[]) => {
      const errorMessage = args[0]?.toString() || '';
      // Suppress iframe-resizer origin check errors
      if (errorMessage.includes('Unexpected message received from') ||
          errorMessage.includes('checkOrigin')) {
        return; // Silently ignore these errors
      }
      originalError.apply(console, args);
    };

    try {
      DodoPayments.Initialize({
        mode,
        displayType: 'overlay', // Changed from 'inline' to 'overlay' to avoid iframe communication issues
        onEvent: handleEvent,
      });

      console.log('Dodo SDK initialized successfully');
    } catch (err) {
      console.error('Failed to initialize Dodo SDK:', err);
      const initError: CheckoutError = {
        message: 'Failed to initialize payment system. Please refresh the page.',
        code: 'SDK_INIT_ERROR',
        retryable: true,
      };
      setError(initError);
      onError?.(initError);
    }

    // Cleanup on unmount
    return () => {
      console.log('[Dodo SDK] Cleaning up checkout');
      // Restore original console.error
      console.error = originalError;
      try {
        DodoPayments.Checkout.close();
      } catch (err) {
        console.warn('Warning during cleanup:', err);
      }
    };
  }, [mode, handleEvent, onError]);

  // Open checkout when URL is available AND element exists in DOM
  useEffect(() => {
    if (!checkoutUrl || !elementId) {
      console.log('[Dodo Checkout] Waiting for checkout URL and element ID');
      return;
    }

    // Wait for DOM element to be available
    const checkElement = () => {
      const element = document.getElementById(elementId);
      if (!element) {
        console.log(`[Dodo Checkout] Element #${elementId} not yet in DOM, waiting...`);
        return false;
      }
      return true;
    };

    // Try immediately first
    if (!checkElement()) {
      // If not available, wait a bit for React to render it
      const timeoutId = setTimeout(() => {
        if (!checkElement()) {
          console.error(`Element #${elementId} still not found after timeout`);
          const openError: CheckoutError = {
            message: 'Failed to initialize checkout container.',
            code: 'ELEMENT_NOT_FOUND',
            retryable: true,
          };
          setError(openError);
          onError?.(openError);
          return;
        }

        openCheckout();
      }, 100); // Small delay to let React render

      return () => clearTimeout(timeoutId);
    }

    openCheckout();

    function openCheckout() {
      console.log('[Dodo Checkout] Opening inline checkout');
      console.log('  URL:', checkoutUrl);
      console.log('  Element ID:', elementId);

      try {
        DodoPayments.Checkout.open({
          checkoutUrl,
          elementId,
          options: {
            showTimer: true,
            showSecurityBadge: true,
            manualRedirect: true,
            themeConfig,
          },
          // Disable iframe origin checking to allow Dodo domain
          checkOrigin: false,
        } as any);

        console.log('Checkout opened successfully');
      } catch (err) {
        console.error('Failed to open checkout:', err);
        const openError: CheckoutError = {
          message: 'Failed to load checkout. Please try again.',
          code: 'CHECKOUT_OPEN_ERROR',
          retryable: true,
        };
        setError(openError);
        onError?.(openError);
      }
    }
  }, [checkoutUrl, elementId, themeConfig, onError]);

  // Check for return from redirect (e.g., 3DS authentication)
  useEffect(() => {
    const pendingCheckout = sessionStorage.getItem('pendingCheckout');
    if (pendingCheckout) {
      console.log('User returned from redirect, resuming checkout');
      sessionStorage.removeItem('pendingCheckout');
      sessionStorage.removeItem('checkoutElementId');
      // The verification hook will handle status polling
    }
  }, []);

  return {
    isReady,
    breakdown,
    error,
  };
};

export default useDodoCheckout;

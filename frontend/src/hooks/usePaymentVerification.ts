/**
 * usePaymentVerification Hook
 *
 * Polls backend to verify payment/subscription status after checkout completion
 * Implements exponential backoff and timeout handling
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import type {
  UsePaymentVerificationOptions,
  UsePaymentVerificationReturn,
  CheckoutError,
  PaymentVerificationResponse,
} from '../types/dodo';

const DEFAULT_MAX_ATTEMPTS = 15; // 30 seconds total at 2s interval
const DEFAULT_POLL_INTERVAL = 2000; // 2 seconds

export const usePaymentVerification = ({
  userId,
  shouldVerify,
  onSuccess,
  onFailed,
  onTimeout,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  pollInterval = DEFAULT_POLL_INTERVAL,
}: UsePaymentVerificationOptions): UsePaymentVerificationReturn => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<CheckoutError | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Verify payment status
  const verifyPayment = useCallback(async (): Promise<boolean> => {
    if (!userId) {
      console.error('[Payment Verification] No userId provided');
      return false;
    }

    try {
      const convexUrl = import.meta.env.VITE_CONVEX_URL;
      if (!convexUrl) {
        throw new Error('VITE_CONVEX_URL not configured');
      }

      // Use .site domain for authenticated requests
      const siteUrl = convexUrl.replace('.cloud', '.site');

      console.log(`[Payment Verification] Attempt ${attempts + 1}/${maxAttempts}`);
      console.log(`[Payment Verification] Calling: ${siteUrl}/verifyDodoPayment`);

      const response = await fetch(`${siteUrl}/verifyDodoPayment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
        }),
      });

      console.log('[Payment Verification] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Payment Verification] Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: PaymentVerificationResponse = await response.json();
      console.log('[Payment Verification] Result:', result);

      // Check if payment succeeded
      if (result.status === 'active' || result.status === 'trialing') {
        console.log('✅ Payment verified successfully:', result.status);
        return true;
      }

      // Check if payment failed
      if (result.status === 'payment_failed') {
        console.error('❌ Payment failed:', result);
        const failedError: CheckoutError = {
          message: 'Payment failed. Please try again or contact support.',
          code: 'PAYMENT_FAILED',
          retryable: true,
        };
        setError(failedError);
        cleanup();
        setIsVerifying(false);
        if (isMountedRef.current) {
          onFailed();
        }
        return false;
      }

      // Still processing
      console.log('⏳ Payment still processing, status:', result.status);
      return false;
    } catch (err) {
      console.error('[Payment Verification] Error:', err);

      // Don't treat network errors as fatal - continue polling
      const verifyError: CheckoutError = {
        message: err instanceof Error ? err.message : 'Verification failed',
        code: 'VERIFICATION_ERROR',
        retryable: true,
      };
      setError(verifyError);

      return false;
    }
  }, [userId, attempts, maxAttempts, onFailed, cleanup]);

  // Start verification polling
  useEffect(() => {
    // Reset state when shouldVerify changes
    if (!shouldVerify) {
      cleanup();
      setIsVerifying(false);
      setAttempts(0);
      setError(null);
      return;
    }

    if (!userId) {
      console.warn('[Payment Verification] Cannot verify without userId');
      return;
    }

    console.log('[Payment Verification] Starting verification polling');
    setIsVerifying(true);
    setAttempts(0);
    setError(null);

    // Start polling
    let currentAttempt = 0;

    const poll = async () => {
      if (!isMountedRef.current) {
        cleanup();
        return;
      }

      currentAttempt++;
      setAttempts(currentAttempt);

      const isSuccessful = await verifyPayment();

      if (!isMountedRef.current) {
        cleanup();
        return;
      }

      if (isSuccessful) {
        // Payment verified successfully
        cleanup();
        setIsVerifying(false);
        onSuccess();
      } else if (currentAttempt >= maxAttempts) {
        // Max attempts reached
        console.warn('[Payment Verification] Max attempts reached, giving up');
        cleanup();
        setIsVerifying(false);

        const timeoutError: CheckoutError = {
          message:
            'Payment verification is taking longer than expected. Your payment may still be processing. Please check your email for confirmation or contact support.',
          code: 'VERIFICATION_TIMEOUT',
          retryable: false,
        };
        setError(timeoutError);

        if (onTimeout) {
          onTimeout();
        } else {
          // Default behavior: show timeout message
          console.log('⏰ Verification timeout - waiting for webhook');
        }
      }
      // Otherwise, continue polling
    };

    // Initial verification
    poll();

    // Set up interval for subsequent attempts
    intervalRef.current = setInterval(poll, pollInterval);

    // Cleanup
    return () => {
      cleanup();
    };
  }, [shouldVerify, userId, maxAttempts, pollInterval, verifyPayment, onSuccess, onTimeout, cleanup]);

  // Track component mount status
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    isVerifying,
    attempts,
    error,
  };
};

export default usePaymentVerification;

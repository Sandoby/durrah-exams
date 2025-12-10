import { supabase } from './supabase';

export interface PaymentStatus {
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  data?: any;
}

/**
 * Poll payment status from database
 * Since payment providers don't support webhooks, we poll the payment record
 * to check if payment was processed by the provider's backend processing
 */
export async function pollPaymentStatus(
  orderId: string,
  maxAttempts: number = 30, // 30 attempts * 2 seconds = 60 seconds max wait
  intervalMs: number = 2000
): Promise<PaymentStatus> {
  let attempts = 0;

  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      attempts++;

      try {
        // Fetch payment record from database
        const { data: payment, error } = await supabase
          .from('payments')
          .select('*')
          .eq('merchant_reference', orderId)
          .single();

        if (error) {
          console.error('Error fetching payment:', error);
          if (attempts >= maxAttempts) {
            clearInterval(interval);
            reject(new Error('Payment verification failed: Payment record not found'));
          }
          return;
        }

        console.log(`[Poll ${attempts}/${maxAttempts}] Payment status for ${orderId}:`, payment.status);

        // Check if payment status has been updated (not pending anymore)
        if (payment.status !== 'pending') {
          clearInterval(interval);
          resolve({
            status: payment.status,
            data: payment
          });
          return;
        }

        // Max attempts reached
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          // If still pending after max attempts, treat as completed 
          // (user might have paid but provider backend is slow)
          if (payment.status === 'pending') {
            resolve({
              status: 'pending',
              data: payment
            });
          } else {
            resolve({
              status: payment.status,
              data: payment
            });
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          reject(error);
        }
      }
    }, intervalMs);

    // Set overall timeout (fallback safety)
    setTimeout(() => {
      if (interval) {
        clearInterval(interval);
        reject(new Error('Payment verification timeout'));
      }
    }, maxAttempts * intervalMs + 5000);
  });
}

/**
 * Alternative: Fetch payment status immediately (single attempt)
 * Useful for checking payment status from payment-history page
 */
export async function getPaymentStatus(orderId: string): Promise<PaymentStatus> {
  try {
    const { data: payment, error } = await supabase
      .from('payments')
      .select('*')
      .eq('merchant_reference', orderId)
      .single();

    if (error) {
      throw new Error('Payment not found');
    }

    return {
      status: payment.status,
      data: payment
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Verify payment using payment provider API directly
 * This can be called as a backend edge function for additional verification
 */
export async function verifyPaymentWithProvider(
  orderId: string,
  paymentMethod: 'kashier' | 'paysky'
): Promise<{ verified: boolean; status: string }> {
  try {
    // Call backend edge function to verify with payment provider
    const { data, error } = await supabase.functions.invoke('verify-payment', {
      body: {
        orderId,
        paymentMethod
      }
    });

    if (error) {
      console.error('Provider verification error:', error);
      return { verified: false, status: 'verification_failed' };
    }

    return {
      verified: data.verified,
      status: data.status
    };
  } catch (error) {
    console.error('Error verifying payment with provider:', error);
    return { verified: false, status: 'error' };
  }
}

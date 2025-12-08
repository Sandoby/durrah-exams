import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { kashierIntegration } from '../lib/kashier';

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing payment...');

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Kashier returns orderId or merchantOrderId in callback
        const orderId = searchParams.get('orderId') || searchParams.get('merchantOrderId');
        const paymentStatus = searchParams.get('paymentStatus');
        
        console.log('Payment callback params:', { orderId, paymentStatus, allParams: Object.fromEntries(searchParams) });

        if (!orderId) {
          throw new Error('No order ID provided in callback');
        }

        // Retrieve stored payment metadata
        const metadata = kashierIntegration.getPaymentMetadata(orderId);
        if (!metadata) {
          throw new Error('Payment session expired. Please contact support if payment was successful.');
        }

        const { userId, planId, billingCycle } = metadata;

        // Check payment status from Kashier callback params
        // Kashier returns: paymentStatus=success/failure/pending
        if (paymentStatus === 'success' || paymentStatus === 'SUCCESS') {
          console.log('✅ Payment confirmed by Kashier callback');
          
          // Update payment record
          await kashierIntegration.updatePaymentRecord(orderId, 'completed', {
            paymentStatus,
            callbackParams: Object.fromEntries(searchParams)
          });

          // Activate subscription instantly
          await kashierIntegration.updateUserProfile(userId, planId, billingCycle);

          // Record coupon usage if applicable
          const pendingCoupon = localStorage.getItem('pendingCoupon');
          if (pendingCoupon) {
            try {
              const couponData = JSON.parse(pendingCoupon);
              const { error: usageError } = await supabase
                .from('coupon_usage')
                .insert({
                  coupon_id: couponData.id,
                  user_id: userId,
                });

              if (!usageError) {
                await supabase
                  .from('coupons')
                  .update({ used_count: couponData.used_count + 1 })
                  .eq('id', couponData.id);
              }

              localStorage.removeItem('pendingCoupon');
            } catch (e) {
              console.warn('Failed to record coupon usage:', e);
            }
          }

          // Clean up localStorage
          kashierIntegration.clearPaymentData(orderId);

          setStatus('success');
          setMessage('Payment successful! Your subscription is now active.');
          toast.success('Subscription activated!');

          // Redirect after 2 seconds
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        } else if (paymentStatus === 'failure' || paymentStatus === 'FAILURE' || paymentStatus === 'failed') {
          // Payment failed
          await kashierIntegration.updatePaymentRecord(orderId, 'failed', {
            paymentStatus,
            callbackParams: Object.fromEntries(searchParams)
          });
          
          kashierIntegration.clearPaymentData(orderId);
          localStorage.removeItem('pendingCoupon');
          
          throw new Error('Payment was not successful. Please try again.');
        } else {
          // Unknown or pending status
          throw new Error(`Payment status: ${paymentStatus || 'unknown'}. Please contact support.`);
        }
      } catch (error) {
        console.error('Payment callback error:', error);
        setStatus('error');
        setMessage((error as Error).message || 'Payment verification failed');
        toast.error('Payment verification failed');

        // Redirect after 3 seconds
        setTimeout(() => {
          navigate('/checkout');
        }, 3000);
      }
    };

    processCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-12 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="h-16 w-16 mx-auto mb-6 text-indigo-600 animate-spin" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Processing Payment</h2>
            <p className="text-gray-600 dark:text-gray-300">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="h-16 w-16 mx-auto mb-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <Check className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-4">Payment Successful!</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Redirecting to dashboard...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="h-16 w-16 mx-auto mb-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <X className="h-10 w-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Payment Error</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Redirecting to checkout...</p>
          </>
        )}
      </div>
    </div>
  );
}

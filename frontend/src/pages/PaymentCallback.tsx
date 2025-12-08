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
        const orderId = searchParams.get('order_id');
        const paymentStatus = searchParams.get('status');

        if (!orderId) {
          throw new Error('No order ID provided');
        }

        // Retrieve stored payment metadata with proper error handling
        const metadata = kashierIntegration.getPaymentMetadata(orderId);
        if (!metadata) {
          throw new Error('Payment metadata not found or expired. Please try the payment again.');
        }

        const { userId, planId, billingCycle } = metadata;

        // Verify the order with Kashier API
        const response = await fetch(`https://api.kashier.io/api/v1/orders/${orderId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer af01074c-fe16-4daf-a235-c36fea074d52`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to verify payment status');
        }

        const orderData = await response.json();

        if (orderData.status === 'completed' || orderData.status === 'success' || paymentStatus === 'success') {
          // Update payment record
          await kashierIntegration.updatePaymentRecord(orderId, 'completed', orderData);

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
          toast.success('Subscription activated instantly!');

          // Redirect after 2 seconds
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        } else {
          throw new Error(`Payment status: ${orderData.status || paymentStatus}`);
        }
      } catch (error) {
        console.error('Payment callback error:', error);
        setStatus('error');
        setMessage((error as Error).message || 'Payment verification failed');
        toast.error('Payment could not be verified');

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

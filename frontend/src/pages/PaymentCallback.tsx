import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, Check, X, AlertCircle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { kashierIntegration } from '../lib/kashier';

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'cancelled'>('loading');
  const [message, setMessage] = useState('Processing payment...');

  useEffect(() => {
    const processPayment = async () => {
      try {
        // Get order ID from URL
        const orderId = searchParams.get('orderId') || searchParams.get('merchantOrderId');
        const paymentStatus = searchParams.get('paymentStatus');

        console.log('📍 Payment callback:', { orderId, paymentStatus });

        if (!orderId) {
          throw new Error('No order ID in callback');
        }

        // Get payment metadata from localStorage
        const metadata = kashierIntegration.getPaymentMetadata(orderId);
        if (!metadata) {
          throw new Error('Payment session expired');
        }

        const { userId, planId, billingCycle } = metadata;

        // ===== INSTANT DECISION BASED ON URL STATUS =====
        // Don't query database or call edge functions - just use the callback status
        
        if (paymentStatus === 'success' || paymentStatus === 'SUCCESS') {
          // Success - immediately activate
          console.log('✅ Payment successful');

          // Update database in background (no await)
          supabase
            .from('payments')
            .update({
              status: 'completed',
              updated_at: new Date().toISOString(),
            })
            .eq('merchant_reference', orderId)
            .then(() => console.log('DB updated'));

          // Activate subscription instantly
          await kashierIntegration.updateUserProfile(userId, planId, billingCycle);

          // Send email in background (no await)
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', userId)
            .single();

          if (profile?.email) {
            supabase.functions
              .invoke('send-payment-email', {
                body: {
                  type: 'payment_success',
                  email: profile.email,
                  data: {
                    userName: profile.full_name || profile.email,
                    plan: planId === 'pro' ? 'Professional' : 'Starter',
                    amount: metadata.amount,
                    currency: 'EGP',
                    orderId,
                  },
                }
              });
          }

          // Record coupon usage in background
          const pendingCoupon = localStorage.getItem('pendingCoupon');
          if (pendingCoupon) {
            try {
              const couponData = JSON.parse(pendingCoupon);
              supabase
                .from('coupon_usage')
                .insert({ coupon_id: couponData.id, user_id: userId })
                .then(() => {
                  supabase
                    .from('coupons')
                    .update({ used_count: couponData.used_count + 1 })
                    .eq('id', couponData.id);
                });
              localStorage.removeItem('pendingCoupon');
            } catch (e) {
              console.warn('Coupon error (non-blocking):', e);
            }
          }

          // Clear localStorage
          kashierIntegration.clearPaymentData(orderId);

          // Show success
          setStatus('success');
          setMessage('Payment successful! Your subscription is now active.');
          toast.success('✅ Subscription activated!');

          // Redirect after 2 seconds
          setTimeout(() => navigate('/dashboard'), 2000);
        } else if (paymentStatus?.toUpperCase() === 'CANCELLED') {
          // Cancelled
          console.log('⚠️ Payment cancelled');

          supabase
            .from('payments')
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('merchant_reference', orderId);

          kashierIntegration.clearPaymentData(orderId);
          localStorage.removeItem('pendingCoupon');

          setStatus('cancelled');
          setMessage('You cancelled the payment. No charges were made.');
        } else {
          // Failed or unknown
          console.log('❌ Payment failed');

          supabase
            .from('payments')
            .update({ status: 'failed', updated_at: new Date().toISOString() })
            .eq('merchant_reference', orderId);

          kashierIntegration.clearPaymentData(orderId);
          localStorage.removeItem('pendingCoupon');

          throw new Error('Payment failed. Please try again.');
        }
      } catch (error) {
        console.error('❌ Callback error:', error);
        setStatus('error');
        setMessage((error as Error).message || 'Payment processing failed');
        toast.error('Payment verification failed');
        setTimeout(() => navigate('/checkout'), 5000);
      }
    };

    processPayment();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 sm:p-12 max-w-md w-full">
        {status === 'loading' && (
          <div className="text-center">
            <Loader2 className="h-16 w-16 mx-auto mb-6 text-indigo-600 animate-spin" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Processing Payment</h2>
            <p className="text-gray-600 dark:text-gray-300">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="relative h-20 w-20 mx-auto mb-6">
              <div className="absolute inset-0 bg-green-100 dark:bg-green-900/30 rounded-full animate-ping opacity-75"></div>
              <div className="relative h-20 w-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center shadow-lg">
                <Check className="h-12 w-12 text-green-600 dark:text-green-400" strokeWidth={3} />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">Payment Successful!</h2>
            <p className="text-lg text-gray-700 dark:text-gray-200 mb-2">{message}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Thank you for subscribing to Durrah for Tutors</p>
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-center gap-2 text-indigo-600 dark:text-indigo-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="font-medium">Redirecting to your dashboard...</span>
              </div>
            </div>
          </div>
        )}

        {status === 'cancelled' && (
          <div className="text-center">
            <div className="h-16 w-16 mx-auto mb-6 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
              <AlertCircle className="h-10 w-10 text-orange-600 dark:text-orange-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Payment Cancelled</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8">{message}</p>
            <button
              onClick={() => navigate('/checkout')}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              <ArrowLeft className="h-5 w-5" />
              Return to Checkout
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="h-16 w-16 mx-auto mb-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <X className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Payment Failed</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8">{message}</p>
            <button
              onClick={() => navigate('/checkout')}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl mb-3"
            >
              <ArrowLeft className="h-5 w-5" />
              Try Again
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400">Auto-redirecting in 5 seconds...</p>
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, Check, X, AlertCircle, ArrowLeft, Calendar, CreditCard, Mail, ExternalLink, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { kashierIntegration } from '../lib/kashier';
import { Logo } from '../components/Logo';

export default function PaymentCallback() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'cancelled'>('loading');
  const [message, setMessage] = useState('Processing your payment...');
  const [orderDetails, setOrderDetails] = useState<any>(null);

  useEffect(() => {
    const processPayment = async () => {
      try {
        const orderId = searchParams.get('orderId') || searchParams.get('merchantOrderId');
        const paymentStatus = searchParams.get('paymentStatus');
        const provider = searchParams.get('provider') || 'kashier';

        console.log('📍 Payment callback:', { orderId, paymentStatus, provider });

        if (!orderId) {
          throw new Error('No order identifier found in callback.');
        }

        // Retrieve metadata based on provider
        let metadata = null;
        if (provider === 'paysky') {
          const data = localStorage.getItem(`paysky_payment_${orderId}`);
          if (data) metadata = JSON.parse(data);
        } else if (provider === 'dodo') {
          // Dodo usually sends session_id or id. We might need to fetch details or rely on webhook.
          // For now, assume success if we are here and existing params look good.
          console.log('Using Dodo provider logic');
          // We can try to look up the payment by the orderId (which might be the session ID passed back)
          // But since we rely on webhooks, let's just display success for now or poll.
        } else {
          metadata = kashierIntegration.getPaymentMetadata(orderId);
        }

        if (metadata) {
          setOrderDetails(metadata);
        }

        // Logic for Successful Payment
        if (paymentStatus?.toUpperCase() === 'SUCCESS') {
          console.log('✅ Payment successful');
          setStatus('success');
          setMessage(t('checkout.callback.success_message', 'Your subscription is now active!'));

          if (metadata) {
            const { userId, planId, billingCycle } = metadata;

            // Activate subscription
            await kashierIntegration.updateUserProfile(userId, planId, billingCycle);

            // Background updates
            supabase
              .from('payments')
              .update({ status: 'completed', updated_at: new Date().toISOString() })
              .eq('merchant_reference', orderId)
              .then(() => console.log('DB updated'));

            // Record coupon usage
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
              } catch (e) { console.warn('Coupon error:', e); }
            }
          }

          // Cleanup
          if (provider === 'kashier') kashierIntegration.clearPaymentData(orderId);
          else localStorage.removeItem(`paysky_payment_${orderId}`);

          toast.success(t('checkout.callback.toast_success', 'Subscription activated!'));
          // Immediate redirect to dashboard
          navigate('/dashboard', { replace: true });
        }
        // Logic for Cancelled Payment
        else if (paymentStatus?.toUpperCase() === 'CANCELLED') {
          // Redirect back to checkout
          console.log('âڑ  Payment cancelled');
          navigate('/checkout', {
            state: {
              error: t('checkout.callback.cancelled_message', 'Payment cancelled.'),
              paymentFailed: true
            },
            replace: true
          });

          localStorage.removeItem('pendingCoupon');
          if (provider === 'kashier') kashierIntegration.clearPaymentData(orderId);
          else if (provider === 'paysky') localStorage.removeItem(`paysky_payment_${orderId}`);
        }
        // Logic for Failure
        else {
          console.log('â‌Œ Payment failed');
          // Redirect back to checkout with error reason
          navigate('/checkout', {
            state: {
              error: t('checkout.callback.error_message', 'Payment failed. Please try again.'),
              paymentFailed: true,
              provider: provider // Pass provider back for context
            },
            replace: true
          });

          localStorage.removeItem('pendingCoupon');
          if (provider === 'kashier') kashierIntegration.clearPaymentData(orderId);
          else if (provider === 'paysky') localStorage.removeItem(`paysky_payment_${orderId}`);
        }
      } catch (error) {
        console.error('❌ Callback error:', error);
        setStatus('error');
        setMessage((error as Error).message || 'An unexpected error occurred during subscription verification.');
      }
    };

    processPayment();
  }, [searchParams, navigate, t]);

  const contactSupportEmail = "abdelrahmansandoby@gmail.com";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative overflow-hidden font-sans flex items-center justify-center p-4">
      {/* Animated background blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-1/2 w-96 h-96 bg-purple-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>

      <style>{`
        @keyframes blob { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>

      <div className="max-w-xl w-full relative z-10">
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl shadow-indigo-500/10 border border-white/50 dark:border-slate-800/50 overflow-hidden">
          <div className="p-8 md:p-12">

            {/* Logo */}
            <div className="flex justify-center mb-10">
              <div className="flex items-center gap-3">
                <Logo className="h-10 w-10" showText={false} />
                <div className="flex flex-col">
                  <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Durrah</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold tracking-[0.2em] uppercase">for Tutors</span>
                </div>
              </div>
            </div>

            {status === 'loading' && (
              <div className="text-center animate-pulse">
                <div className="relative h-24 w-24 mx-auto mb-8">
                  <Loader2 className="h-24 w-24 text-indigo-600 animate-spin opacity-20" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <CreditCard className="h-10 w-10 text-indigo-600" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Verifying Subscription</h2>
                <p className="text-gray-500 dark:text-gray-400">{message}</p>
              </div>
            )}

            {status === 'success' && (
              <div className="text-center">
                <div className="relative h-28 w-28 mx-auto mb-8">
                  <div className="absolute inset-0 bg-green-400/20 rounded-full animate-ping"></div>
                  <div className="relative h-28 w-28 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/40">
                    <Check className="h-14 w-14 text-white" strokeWidth={3} />
                  </div>
                </div>
                <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Welcome to Premium!</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8">{message}</p>

                {orderDetails && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-6 mb-8 border border-slate-100 dark:border-slate-700 text-left">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Order Summary</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                          <ShieldCheck className="h-4 w-4" /> Plan
                        </span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase">{orderDetails.planId} ({orderDetails.billingCycle})</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                          <Calendar className="h-4 w-4" /> Date
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">{new Date().toLocaleDateString()}</span>
                      </div>
                      <div className="border-t border-slate-200 dark:border-slate-700 pt-4 flex justify-between items-center">
                        <span className="text-gray-900 dark:text-white font-bold">Total Paid</span>
                        <span className="text-xl font-black text-gray-900 dark:text-white">EGP {orderDetails.amount}</span>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-bold hover:shadow-xl hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 group mb-4"
                >
                  Go to Dashboard
                  <ExternalLink className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <p className="text-xs text-gray-400">Auto-redirecting in 5 seconds...</p>
              </div>
            )}

            {(status === 'error' || status === 'cancelled') && (
              <div className="text-center">
                <div className={`h-24 w-24 mx-auto mb-8 rounded-full flex items-center justify-center shadow-lg ${status === 'error' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                  {status === 'error' ? <X className="h-12 w-12" strokeWidth={3} /> : <AlertCircle className="h-12 w-12" strokeWidth={3} />}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  {status === 'error' ? 'Subscription Activation Failed' : 'Subscription Cancelled'}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-10 leading-relaxed">{message}</p>

                <div className="space-y-3">
                  <button
                    onClick={() => navigate('/checkout')}
                    className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="h-5 w-5" />
                    Back to Selection
                  </button>

                  <a
                    href={`mailto:${contactSupportEmail}`}
                    className="flex items-center justify-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 pt-4"
                  >
                    <Mail className="h-4 w-4" />
                    Contact Support
                  </a>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

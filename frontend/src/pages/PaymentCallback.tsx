import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, Check, X, AlertCircle, ArrowLeft, Calendar, CreditCard, Mail, ExternalLink, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
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
        const orderId = searchParams.get('orderId') ||
          searchParams.get('merchantOrderId') ||
          searchParams.get('subscription_id') ||
          searchParams.get('payment_id');
        const provider = searchParams.get('provider') || 'dodo';

        console.log('Payment callback:', { orderId, provider });

        if (!orderId) {
          throw new Error('No order identifier found in callback.');
        }

        setMessage('Checking your subscription status...');

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) throw new Error('Authentication required');

        const convexUrl = import.meta.env.VITE_CONVEX_URL;
        const siteUrl = convexUrl?.replace('.cloud', '.site');

        // 1. Direct Verification via Convex endpoint
        if (siteUrl) {
          try {
            const verifyRes = await fetch(`${siteUrl}/verifyDodoPayment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify({ orderId, userId: session.user.id })
            });

            if (verifyRes.ok) {
              const result = await verifyRes.json();
              if (result.success) {
                console.log('Subscription activated via direct verification');
                setStatus('success');
                setMessage(t('checkout.callback.success_message', 'Your subscription is now active!'));
                setOrderDetails({ planId: 'Professional', provider: 'dodo' });
                toast.success(t('checkout.callback.toast_success', 'Subscription activated!'));
                setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
                return;
              }
            }
          } catch (directErr) {
            console.warn('Direct verification failed, falling back to polling:', directErr);
          }
        }

        // 2. Fallback: Poll Supabase profile for webhook-driven activation
        for (let attempt = 0; attempt < 10; attempt++) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('subscription_status, subscription_plan')
            .eq('id', session.user.id)
            .single();

          if (profile?.subscription_status === 'active') {
            console.log('Subscription activated via webhook');
            setStatus('success');
            setMessage(t('checkout.callback.success_message', 'Your subscription is now active!'));
            setOrderDetails({ planId: profile.subscription_plan || 'Professional', provider: 'dodo' });
            toast.success(t('checkout.callback.toast_success', 'Subscription activated!'));
            setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
            return;
          }

          if (profile?.subscription_status === 'payment_failed') {
            setStatus('error');
            setMessage('Your payment could not be completed. Please update your payment method.');
            toast.error('Payment failed. Please update payment method.');
            setTimeout(() => navigate('/checkout', { state: { error: 'Payment failed.', paymentFailed: true, provider: 'dodo' }, replace: true }), 1800);
            return;
          }

          if (profile?.subscription_status === 'cancelled') {
            setStatus('cancelled');
            setMessage('Your subscription is cancelled. You can reactivate from checkout.');
            setTimeout(() => navigate('/checkout', { replace: true }), 1800);
            return;
          }

          if (profile?.subscription_status === 'expired') {
            setStatus('error');
            setMessage('Your subscription has expired. Please subscribe again to regain access.');
            toast.error('Subscription expired. Please resubscribe.');
            setTimeout(() => navigate('/checkout', { state: { error: 'Subscription expired.', expired: true, provider: 'dodo' }, replace: true }), 1800);
            return;
          }

          await new Promise(r => setTimeout(r, 2000));
        }

        // 3. Webhook still hasn't arrived after 20s
        console.log('Webhook taking longer than expected');
        setStatus('loading');
        setMessage('Your payment was received but activation is taking longer than expected. Please check your dashboard or contact support if the issue persists.');
      } catch (error) {
        console.error('Callback error:', error);
        setStatus('error');
        setMessage((error as Error).message || 'An unexpected error occurred during subscription verification.');
      }
    };

    processPayment();
  }, [searchParams, navigate, t]);

  const contactSupportEmail = "support@durrahtutors.com";

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
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase">{orderDetails.planId}</span>
                      </div>
                      {orderDetails.billingCycle && (
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                            <Calendar className="h-4 w-4" /> Billing Cycle
                          </span>
                          <span className="font-semibold text-gray-900 dark:text-white capitalize">{orderDetails.billingCycle}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                          <Calendar className="h-4 w-4" /> Date
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">{new Date().toLocaleDateString()}</span>
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

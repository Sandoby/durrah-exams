/**
 * CheckoutInline Page
 *
 * Main inline checkout page with Apple-like professional design
 * Integrates Dodo Payments inline checkout for seamless payment flow
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import DodoInlineCheckout from '../components/checkout/DodoInlineCheckout';
import OrderSummary from '../components/checkout/OrderSummary';
import PlanSelector from '../components/checkout/PlanSelector';
import BillingCycleToggle from '../components/checkout/BillingCycleToggle';
import { usePaymentVerification } from '../hooks/usePaymentVerification';
import { Logo } from '../components/Logo';
import type { Plan, BillingCycle, CheckoutError } from '../types/dodo';
import type { CheckoutBreakdownData } from 'dodopayments-checkout';
import toast from 'react-hot-toast';

// Product IDs from Convex backend
const DODO_PRODUCT_IDS = {
  monthly: 'pdt_0NVdvPLWrAr1Rym66kXLP',
  yearly: 'pdt_0NVdw6iZw42sQIdxctP55',
};

export default function CheckoutInline() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State
  const [plan, setPlan] = useState<Plan>('basic');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [checkoutUrl, setCheckoutUrl] = useState<string>('');
  const [breakdown, setBreakdown] = useState<CheckoutBreakdownData | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [shouldVerify, setShouldVerify] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const mode = (import.meta.env.VITE_DODO_MODE as 'test' | 'live') || 'test';

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=/checkout-inline');
    }
  }, [user, navigate]);

  // Create checkout session on mount or when plan/cycle changes
  useEffect(() => {
    if (!user) return;
    if (checkoutUrl) return; // Don't create if we already have a URL
    createCheckoutSession();
  }, [user, billingCycle]); // eslint-disable-line react-hooks/exhaustive-deps

  // Create checkout session
  const createCheckoutSession = async () => {
    if (!user) return;

    setIsCreatingSession(true);
    setSessionError(null);

    try {
      const productId = DODO_PRODUCT_IDS[billingCycle];
      const convexUrl = import.meta.env.VITE_CONVEX_URL;

      if (!convexUrl) {
        throw new Error('VITE_CONVEX_URL not configured');
      }

      console.log('[Checkout] Creating session for:', { billingCycle, productId });
      console.log('[Checkout] Convex URL:', convexUrl);

      const response = await fetch(`${convexUrl}/createDodoPayment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          plan: plan,
          billingCycle: billingCycle,
          productId: productId,
        }),
      });

      console.log('[Checkout] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Checkout] Response error:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[Checkout] Session created:', data);

      if (!data.checkout_url) {
        console.error('[Checkout] No checkout_url in response:', data);
        throw new Error('No checkout URL returned from server');
      }

      console.log('[Checkout] Setting checkout URL:', data.checkout_url);
      setCheckoutUrl(data.checkout_url);
    } catch (error) {
      console.error('[Checkout] Failed to create session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create checkout session';
      setSessionError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsCreatingSession(false);
    }
  };

  // Handle breakdown updates from Dodo SDK
  const handleBreakdownUpdate = (newBreakdown: CheckoutBreakdownData) => {
    console.log('[Checkout] Breakdown updated:', newBreakdown);
    setBreakdown(newBreakdown);
  };

  // Handle status updates from Dodo SDK
  const handleStatusUpdate = (status: string) => {
    console.log('[Checkout] Payment status:', status);

    if (status === 'succeeded') {
      console.log('✅ Payment succeeded, starting verification');
      setShouldVerify(true);
    } else if (status === 'failed') {
      toast.error('Payment failed. Please try again.');
    } else if (status === 'processing') {
      toast.loading('Processing payment...', { duration: 2000 });
    }
  };

  // Handle checkout errors
  const handleCheckoutError = (error: CheckoutError) => {
    console.error('[Checkout] Error:', error);
    toast.error(error.message);
  };

  // Payment verification hook
  const { isVerifying } = usePaymentVerification({
    userId: user?.id || '',
    shouldVerify,
    onSuccess: () => {
      console.log('✅ Payment verified successfully');
      setShouldVerify(false);
      setShowSuccessModal(true);

      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    },
    onFailed: () => {
      console.error('❌ Payment verification failed');
      setShouldVerify(false);
      toast.error('Payment failed. Please contact support.');
    },
    onTimeout: () => {
      console.warn('⏰ Payment verification timeout');
      setShouldVerify(false);
      toast(
        'Payment verification is taking longer than expected. Please check your email for confirmation.',
        { duration: 8000, icon: '⏰' }
      );
      // Still redirect to dashboard, they can check status there
      setTimeout(() => navigate('/dashboard'), 2000);
    },
  });

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 dark:from-blue-600/10 dark:to-indigo-600/10 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-0 -right-4 w-96 h-96 bg-gradient-to-br from-indigo-400/20 to-violet-400/20 dark:from-indigo-600/10 dark:to-violet-600/10 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-gradient-to-br from-violet-400/20 to-purple-400/20 dark:from-violet-600/10 dark:to-purple-600/10 rounded-full blur-3xl animate-blob animation-delay-4000" />
      </div>

      {/* Header */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back</span>
            </button>

            <Logo />

            <div className="w-20" /> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Complete Your Subscription
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Choose your plan and complete payment to unlock all features
          </p>
        </div>

        {/* Checkout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left Column - Plan Selection & Order Summary */}
          <div className="space-y-6">
            {/* Plan Selection */}
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-lg">
              <PlanSelector selectedPlan={plan} onPlanChange={setPlan} disabled={isCreatingSession} />
            </div>

            {/* Billing Cycle Toggle */}
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-lg">
              <BillingCycleToggle
                cycle={billingCycle}
                onCycleChange={setBillingCycle}
                disabled={isCreatingSession}
                showDiscount={true}
                discountPercentage={16.67}
              />
            </div>

            {/* Order Summary */}
            <OrderSummary
              plan={plan}
              billingCycle={billingCycle}
              breakdown={breakdown}
              loading={isCreatingSession}
            />
          </div>

          {/* Right Column - Inline Checkout */}
          <div className="lg:sticky lg:top-6">
            {isCreatingSession ? (
              // Loading state while creating session
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-12 border border-gray-200 dark:border-gray-800 shadow-lg flex items-center justify-center min-h-[600px]">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-4" />
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Creating checkout session...</p>
                </div>
              </div>
            ) : sessionError ? (
              // Error state
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 text-center">
                <p className="text-red-900 dark:text-red-100 mb-4">{sessionError}</p>
                <button
                  onClick={createCheckoutSession}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : (
              // Inline checkout
              <DodoInlineCheckout
                checkoutUrl={checkoutUrl}
                mode={mode}
                onBreakdownUpdate={handleBreakdownUpdate}
                onStatusUpdate={handleStatusUpdate}
                onError={handleCheckoutError}
              />
            )}
          </div>
        </div>
      </div>

      {/* Verification Modal */}
      {isVerifying && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
            <Loader2 className="w-16 h-16 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Verifying Payment</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Please wait while we confirm your payment...
            </p>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl animate-scale-pop">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Payment Successful!</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Your subscription has been activated. Redirecting to dashboard...
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Redirecting...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

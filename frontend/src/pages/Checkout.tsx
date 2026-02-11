import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Loader2, Check, Sparkles, ArrowRight, Ticket, BadgeCheck } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

import { Logo } from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useCurrency } from '../hooks/useCurrency';
import { openDodoPortalSession } from '../lib/dodoPortal';
import { daysRemaining } from '../lib/subscriptionUtils';

type BillingCycle = 'monthly' | 'yearly';
type PlanId = 'basic' | 'pro';

export default function Checkout() {
  const isNative = Capacitor.isNativePlatform();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, subscriptionStatus, trialEndsAt } = useAuth();

  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('pro');
  const [isProcessing, setIsProcessing] = useState(false);

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const [isFirstTimeSubscriber, setIsFirstTimeSubscriber] = useState(true);
  const [isRecoveringViaPortal, setIsRecoveringViaPortal] = useState(false);

  // Handle errors from payment callback
  useEffect(() => {
    if ((location.state as any)?.error) {
      toast.error((location.state as any).error, { duration: 6000 });
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  // If the user has a failed recurring payment, send them to the billing portal instead of checkout.
  useEffect(() => {
    const checkSubscriptionHistory = async () => {
      if (!user) return;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('subscription_plan, subscription_status, dodo_customer_id')
          .eq('id', user.id)
          .single();

        if (!data) return;

        // If they have a plan or a customer id, they are not first-time.
        if (data.subscription_plan || data.dodo_customer_id) {
          setIsFirstTimeSubscriber(false);
        }

        if (data.subscription_status === 'payment_failed') {
          setIsRecoveringViaPortal(true);
          toast(t('checkout.recovering', 'Redirecting to your billing portal...'));
          const result = await openDodoPortalSession();
          if (!result.success) {
            toast.error(result.error || t('checkout.portalError', 'Unable to open billing portal'));
            navigate('/settings', { replace: true });
          }
        }
      } catch (err) {
        console.error('Error checking subscription history:', err);
      }
    };

    checkSubscriptionHistory();
  }, [user, navigate, t]);

  // Pricing display (display can be local currency, payment is handled on secure checkout).
  const { price: dynamicMonthlyPrice, currency: dynamicCurrencyCode, isLoading: isCurrencyLoading } = useCurrency(5);
  const { price: dynamicYearlyPrice } = useCurrency(50);

  const plans = useMemo(() => {
    return [
      {
        id: 'basic' as const,
        name: t('checkout.plans.starter.name', 'Starter'),
        description: t('checkout.plans.starter.desc', 'Try the core experience with essential limits.'),
        price: 0,
        displayPrice: '0',
        badge: null as string | null,
        features: [
          t('pricing.starter.features.0', 'Create exams'),
          t('pricing.starter.features.1', 'Up to 100 students'),
          t('pricing.starter.features.2', 'Basic anti-cheating'),
          t('pricing.starter.features.3', 'Email support'),
        ],
      },
      {
        id: 'pro' as const,
        name: t('checkout.plans.pro.name', 'Pro'),
        description: t('checkout.plans.pro.desc', 'Advanced anti-cheating, analytics, and priority features.'),
        price: billingCycle === 'monthly' ? 5 : 50,
        displayPrice: billingCycle === 'monthly'
          ? `${dynamicCurrencyCode} ${dynamicMonthlyPrice}`
          : `${dynamicCurrencyCode} ${dynamicYearlyPrice}`,
        badge: isFirstTimeSubscriber ? t('checkout.trialBadge', 'Free 14-day trial') : null,
        features: [
          t('pricing.professional.features.0', 'Unlimited students'),
          t('pricing.professional.features.1', 'Advanced anti-cheating'),
          t('pricing.professional.features.2', 'Instant reporting'),
          t('pricing.professional.features.3', 'Priority support'),
        ],
      },
    ];
  }, [billingCycle, dynamicCurrencyCode, dynamicMonthlyPrice, dynamicYearlyPrice, isFirstTimeSubscriber, t]);

  const validateCoupon = async () => {
    if (!couponCode) return;
    setIsValidatingCoupon(true);
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .single();

      if (error || !data) throw new Error(t('checkout.couponNotFound', 'Coupon not found'));
      if (new Date(data.valid_until) < new Date()) throw new Error(t('checkout.couponExpired', 'Coupon expired'));
      if (data.used_count >= data.max_uses) throw new Error(t('checkout.couponMax', 'Coupon max uses reached'));
      if (!data.is_active) throw new Error(t('checkout.couponInactive', 'Coupon inactive'));

      if (data.duration && data.duration !== billingCycle) {
        throw new Error(t('checkout.couponDuration', `This coupon is only valid for ${data.duration} plans`));
      }

      const { data: usageData, error: usageError } = await supabase
        .from('coupon_usage')
        .select('*')
        .eq('coupon_id', data.id)
        .eq('user_id', user?.id)
        .single();

      if (usageData && !usageError) {
        throw new Error(t('checkout.couponUsed', 'You have already used this coupon'));
      }

      setAppliedCoupon(data);
      toast.success(t('checkout.couponApplied', 'Coupon applied'));
    } catch (e) {
      console.error(e);
      toast.error((e as Error).message || t('checkout.couponInvalid', 'Invalid coupon'));
      setAppliedCoupon(null);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    toast.success(t('checkout.couponRemoved', 'Coupon removed'));
  };

  const calculateFinalPrice = (basePrice: number) => {
    if (!appliedCoupon) return basePrice;
    if (appliedCoupon.discount_type === 'free') return 0;

    if (appliedCoupon.discount_type === 'percentage') {
      return Math.max(0, basePrice - (basePrice * appliedCoupon.discount_value) / 100);
    }

    if (appliedCoupon.discount_type === 'fixed') {
      return Math.max(0, basePrice - appliedCoupon.discount_value);
    }

    return basePrice;
  };

  const selectedPlanObj = plans.find((p) => p.id === selectedPlan);
  const finalPrice = selectedPlanObj ? calculateFinalPrice(selectedPlanObj.price) : 0;

  const handlePayment = async () => {
    if (!user) {
      toast.error(t('checkout.loginRequired', 'Please log in to continue'));
      navigate('/login');
      return;
    }

    const plan = plans.find((p) => p.id === selectedPlan);
    if (!plan) return;

    // Free subscription – activate instantly
    if (finalPrice === 0) {
      setIsProcessing(true);
      try {
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + (billingCycle === 'monthly' ? 1 : 12));

        const { error } = await supabase
          .from('profiles')
          .update({
            subscription_status: 'active',
            subscription_plan: plan.name,
            subscription_end_date: endDate.toISOString(),
          })
          .eq('id', user.id);

        if (error) throw error;

        if (appliedCoupon) {
          await supabase.from('coupon_usage').insert({ coupon_id: appliedCoupon.id, user_id: user.id });
          await supabase
            .from('coupons')
            .update({ used_count: appliedCoupon.used_count + 1 })
            .eq('id', appliedCoupon.id);
        }

        toast.success(t('checkout.activated', 'Subscription activated!'));
        navigate('/dashboard');
      } catch (e) {
        console.error(e);
        toast.error(t('checkout.activateFailed', 'Failed to activate subscription'));
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // Paid flow (single provider): redirect to secure checkout session.
    setIsProcessing(true);
    if (appliedCoupon) {
      localStorage.setItem('pendingCoupon', JSON.stringify(appliedCoupon));
    }

    try {
      const convexUrl = import.meta.env.VITE_CONVEX_URL;
      if (!convexUrl) {
        toast.error(t('checkout.configMissing', 'Payment system configuration missing'));
        return;
      }

      const siteUrl = convexUrl.replace('.cloud', '.site');

      const { data: authData } = await supabase.auth.getSession();
      const accessToken = authData?.session?.access_token;
      if (!accessToken) {
        toast.error(t('checkout.relogin', 'Please login again to continue'));
        return;
      }

      const response = await fetch(`${siteUrl}/createDodoPayment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          userName: user?.user_metadata?.full_name || user?.email?.split('@')[0],
          billingCycle,
          returnUrl: `${window.location.origin}/payment-callback?provider=dodo`,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data || !data.checkout_url) {
        console.error('Secure checkout error:', data);
        toast.error(data?.error || t('checkout.payment.error', 'Error initiating payment'));
        return;
      }

      const redirectUrl = data.checkout_url as string;

      if (isNative) {
        await Browser.open({ url: redirectUrl });
        return;
      }

      window.location.assign(redirectUrl);
    } catch (e) {
      console.error(e);
      toast.error(t('checkout.paymentFailed', 'Payment error'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Native apps: keep checkout in system browser.
  if (isNative) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800 rounded-3xl shadow-2xl p-8 text-center">
          <div className="mx-auto mb-6 w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-600/15 flex items-center justify-center">
            <Shield className="w-7 h-7 text-blue-700 dark:text-blue-300" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            {t('checkout.nativeTitle', 'Secure checkout')}
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {t('checkout.nativeDesc', 'To complete your subscription, we will open a secure checkout page in your browser.')}
          </p>
          <button
            onClick={handlePayment}
            disabled={isProcessing || isRecoveringViaPortal}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 transition disabled:opacity-60"
          >
            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
            {isProcessing ? t('checkout.processing', 'Processing...') : t('checkout.continue', 'Continue')}
          </button>
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            {t('checkout.nativeNote', 'You can manage billing later from Settings.')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950">
      {/* Subtle grid overlay (matches landing) */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.18] dark:opacity-[0.12]">
        <div className="absolute inset-0 [background-image:linear-gradient(to_right,rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.08)_1px,transparent_1px)] dark:[background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:40px_40px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.10),transparent_55%)]" />
      </div>

      <header className="relative z-10">
        <div className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-3 group">
            <Logo className="h-10 w-10" />
            <div className="leading-tight text-left">
              <div className="text-slate-900 dark:text-white font-semibold tracking-tight group-hover:opacity-90">Durrah</div>
              <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 tracking-[0.14em] uppercase">
                {t('brand.subtitle', 'for Tutors')}
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/settings')}
            className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
          >
            {t('checkout.settings', 'Settings')}
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-16 pt-6">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 px-3 py-1 text-xs text-slate-600 dark:text-slate-300 backdrop-blur">
            <BadgeCheck className="w-4 h-4 text-blue-700 dark:text-blue-300" />
            <span>{t('checkout.badge', 'Secure checkout, instant activation')}</span>
          </div>

          <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {t('checkout.headline', 'Upgrade your workspace')}
          </h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300 text-base md:text-lg leading-relaxed">
            {t('checkout.subhead', 'Choose a plan that fits your tutoring practice. You will complete payment on our secure checkout page.')}
          </p>

          {(subscriptionStatus === 'trialing' || subscriptionStatus === 'active') && (
            <div className="mt-6 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/50 bg-emerald-50/70 dark:bg-emerald-950/30 backdrop-blur px-5 py-4 text-sm text-emerald-900 dark:text-emerald-100">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 w-9 h-9 rounded-xl bg-emerald-600/10 border border-emerald-600/15 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
                </div>
                <div>
                  <div className="font-semibold">
                    {t('checkout.alreadyActive', 'Your subscription is currently active.')}
                  </div>
                  {trialEndsAt && (
                    <div className="mt-1 text-emerald-800/90 dark:text-emerald-200/90">
                      {t('checkout.trialLeft', 'Trial')}: {daysRemaining(trialEndsAt)} {t('checkout.daysLeft', 'days left')}
                    </div>
                  )}
                  <button
                    onClick={() => navigate('/settings')}
                    className="mt-2 inline-flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-semibold hover:opacity-90"
                  >
                    {t('checkout.manage', 'Manage subscription')}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: plans */}
          <section className="lg:col-span-7">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {plans.map((plan) => {
                const isSelected = selectedPlan === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`text-left group rounded-3xl border backdrop-blur transition-all duration-300 p-6 ${
                      isSelected
                        ? 'border-blue-500/50 bg-white/80 dark:bg-slate-900/60 shadow-[0_18px_55px_-35px_rgba(37,99,235,0.55)]'
                        : 'border-slate-200/70 dark:border-slate-800 bg-white/55 dark:bg-slate-900/40 hover:bg-white/75 dark:hover:bg-slate-900/55'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
                          {plan.name}
                        </div>
                        <div className="mt-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          {plan.description}
                        </div>
                      </div>
                      {plan.badge && (
                        <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-blue-200/70 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/30 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
                          <Sparkles className="w-3.5 h-3.5" />
                          {plan.badge}
                        </span>
                      )}
                    </div>

                    <div className="mt-5 flex items-baseline justify-between">
                      <div className="text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">
                        {plan.id === 'basic' ? (
                          <span>{t('checkout.free', 'Free')}</span>
                        ) : (
                          <span className="tabular-nums">{isCurrencyLoading ? '...' : plan.displayPrice}</span>
                        )}
                      </div>
                      {plan.id === 'pro' && (
                        <div className="inline-flex rounded-2xl bg-slate-900/5 dark:bg-white/10 p-1">
                          {(['monthly', 'yearly'] as const).map((cycle) => (
                            <button
                              key={cycle}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setBillingCycle(cycle);
                                if (appliedCoupon && appliedCoupon.duration && appliedCoupon.duration !== cycle) {
                                  setAppliedCoupon(null);
                                  setCouponCode('');
                                  toast.error(t('checkout.couponRemovedMismatch', 'Coupon removed: only valid for the previous billing cycle'));
                                }
                              }}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
                                billingCycle === cycle
                                  ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm'
                                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                              }`}
                            >
                              {cycle === 'monthly' ? t('checkout.monthly', 'Monthly') : t('checkout.yearly', 'Yearly')}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <ul className="mt-6 space-y-3">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                          <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-600/10 border border-emerald-600/15 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" />
                          </span>
                          <span className="leading-snug">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Right: summary + CTA */}
          <aside className="lg:col-span-5">
            <div className="rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white/70 dark:bg-slate-900/45 backdrop-blur p-6 shadow-[0_30px_80px_-70px_rgba(2,6,23,0.55)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {t('checkout.summary', 'Order summary')}
                  </div>
                  <div className="mt-1 text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
                    {selectedPlanObj?.name}
                    {selectedPlanObj?.id === 'pro' && (
                      <span className="ml-2 text-sm font-semibold text-slate-500 dark:text-slate-300">
                        ({billingCycle === 'monthly' ? t('checkout.monthly', 'Monthly') : t('checkout.yearly', 'Yearly')})
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-blue-600/10 border border-blue-600/15 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-blue-700 dark:text-blue-300" />
                </div>
              </div>

              <div className="mt-6 space-y-3 text-sm">
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-200">
                  <span>{t('checkout.price', 'Price')}</span>
                  <span className="font-semibold tabular-nums">
                    {selectedPlanObj?.id === 'basic' ? t('checkout.free', 'Free') : (isCurrencyLoading ? '...' : selectedPlanObj?.displayPrice)}
                  </span>
                </div>

                {appliedCoupon && (
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-200">
                    <span className="inline-flex items-center gap-2">
                      <Ticket className="w-4 h-4" />
                      {t('checkout.discount', 'Discount')}
                    </span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300 tabular-nums">
                      {selectedPlanObj?.id === 'basic'
                        ? '-'
                        : selectedPlanObj
                          ? `- ${Math.max(0, selectedPlanObj.price - finalPrice)}`
                          : '-'}
                    </span>
                  </div>
                )}

                <div className="pt-3 mt-3 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300 font-semibold">
                    {t('checkout.total', 'Total')}
                  </span>
                  <span className="text-slate-900 dark:text-white font-semibold text-lg tabular-nums">
                    {finalPrice === 0 ? t('checkout.free', 'Free') : (isCurrencyLoading ? '...' : (selectedPlanObj?.displayPrice || ''))}
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={handlePayment}
                  disabled={isProcessing || isRecoveringViaPortal}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 transition disabled:opacity-60"
                >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                  {isProcessing
                    ? t('checkout.processing', 'Processing...')
                    : finalPrice === 0
                      ? t('checkout.activateNow', 'Activate now')
                      : t('checkout.continueSecure', 'Continue to secure checkout')}
                </button>

                <div className="mt-4 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
                  <Shield className="w-3.5 h-3.5" />
                  <span>{t('checkout.securityNote', 'Encrypted connection. PCI compliant processing.')}</span>
                </div>

                <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 text-center">
                  {t('checkout.billingNote', 'You can manage your subscription anytime from Settings.')}
                </div>
              </div>

              {/* Coupon */}
              <div className="mt-7 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/50 dark:bg-slate-950/20 p-4">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t('checkout.promoTitle', 'Promo code')}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder={t('checkout.promoPlaceholder', 'Enter code')}
                    className="flex-1 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                  {appliedCoupon ? (
                    <button
                      onClick={removeCoupon}
                      type="button"
                      className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-900/5 dark:hover:bg-white/10"
                    >
                      {t('checkout.remove', 'Remove')}
                    </button>
                  ) : (
                    <button
                      onClick={validateCoupon}
                      type="button"
                      disabled={isValidatingCoupon}
                      className="rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                    >
                      {isValidatingCoupon ? t('checkout.checking', 'Checking...') : t('checkout.apply', 'Apply')}
                    </button>
                  )}
                </div>
                <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  {t('checkout.promoNote', 'Some offers may be applied after checkout and activation.')}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

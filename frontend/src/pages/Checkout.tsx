import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Loader2, Check, Sparkles, ArrowRight, BadgeCheck, Lock, RefreshCw, LifeBuoy, BarChart3, Users, FileText } from 'lucide-react';
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

export default function Checkout() {
  const isNative = Capacitor.isNativePlatform();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, subscriptionStatus, trialEndsAt } = useAuth();

  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);

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

        if (data.subscription_status === 'payment_failed' || data.subscription_status === 'on_hold') {
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
  const selectedPlanObj = plans[0];

  const handlePayment = async () => {
    if (!user) {
      toast.error(t('checkout.loginRequired', 'Please log in to continue'));
      navigate('/login');
      return;
    }

    // Paid flow (single provider): redirect to secure checkout session.
    setIsProcessing(true);

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
            <Logo size="sm" />
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
            <div className="grid grid-cols-1 gap-5">
              {plans.map((plan) => {
                const isSelected = true;
                return (
                  <div
                    key={plan.id}
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
                        <span className="tabular-nums">{isCurrencyLoading ? '...' : plan.displayPrice}</span>
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
                  </div>
                );
              })}
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 backdrop-blur p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                      {t('checkoutPage.includedTitle', 'Included with Pro')}
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-white tracking-tight">
                      {t('checkoutPage.includedSubtitle', 'Everything you need to run exams at scale')}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-blue-600/10 border border-blue-600/15 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-blue-700 dark:text-blue-300" />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3">
                  {[
                    { icon: Users, label: t('checkoutPage.inc1', 'Unlimited students and classes') },
                    { icon: FileText, label: t('checkoutPage.inc2', 'Professional PDFs and exports') },
                    { icon: Shield, label: t('checkoutPage.inc3', 'Advanced anti-cheating and monitoring') },
                    { icon: BarChart3, label: t('checkoutPage.inc4', 'Instant reporting and analytics') },
                  ].map((row, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
                      <span className="mt-0.5 w-9 h-9 rounded-2xl bg-slate-900/5 dark:bg-white/10 border border-slate-200/60 dark:border-slate-800 flex items-center justify-center">
                        <row.icon className="w-4.5 h-4.5 text-slate-700 dark:text-slate-200" />
                      </span>
                      <div className="leading-snug pt-1">{row.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 backdrop-blur p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                      {t('checkoutPage.billingTitle', 'Billing and security')}
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-white tracking-tight">
                      {t('checkoutPage.billingSubtitle', 'Clear terms, easy management')}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 border border-emerald-600/15 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
                  </div>
                </div>

                <div className="mt-5 space-y-3 text-sm text-slate-700 dark:text-slate-200">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 w-9 h-9 rounded-2xl bg-slate-900/5 dark:bg-white/10 border border-slate-200/60 dark:border-slate-800 flex items-center justify-center">
                      <RefreshCw className="w-4.5 h-4.5" />
                    </span>
                    <div className="pt-1 leading-snug">{t('checkoutPage.bill1', 'Cancel anytime from Settings. Your data stays safe.')}</div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 w-9 h-9 rounded-2xl bg-slate-900/5 dark:bg-white/10 border border-slate-200/60 dark:border-slate-800 flex items-center justify-center">
                      <Shield className="w-4.5 h-4.5" />
                    </span>
                    <div className="pt-1 leading-snug">{t('checkoutPage.bill2', 'Encrypted connection and secure processing.')}</div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 w-9 h-9 rounded-2xl bg-slate-900/5 dark:bg-white/10 border border-slate-200/60 dark:border-slate-800 flex items-center justify-center">
                      <LifeBuoy className="w-4.5 h-4.5" />
                    </span>
                    <div className="pt-1 leading-snug">{t('checkoutPage.bill3', 'Need help? Support is one click away in the dashboard.')}</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Right: summary + CTA */}
          <aside className="lg:col-span-5">
            <div className="rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white/70 dark:bg-slate-900/45 backdrop-blur p-6 shadow-[0_30px_80px_-70px_rgba(2,6,23,0.55)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {t('checkoutPage.summaryTitle', 'Order summary')}
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
                        {isCurrencyLoading ? '...' : selectedPlanObj?.displayPrice}
                      </span>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-300 font-semibold">
                        {t('checkout.total', 'Total')}
                      </span>
                      <span className="text-slate-900 dark:text-white font-semibold text-lg tabular-nums">
                        {isCurrencyLoading ? '...' : (selectedPlanObj?.displayPrice || '')}
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
                  {isProcessing ? t('checkout.processing', 'Processing...') : t('checkout.continueSecure', 'Continue to secure checkout')}
                </button>

                <div className="mt-4 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
                  <Shield className="w-3.5 h-3.5" />
                  <span>{t('checkout.securityNote', 'Encrypted connection. PCI compliant processing.')}</span>
                </div>

                <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 text-center">
                  {t('checkout.billingNote', 'You can manage your subscription anytime from Settings.')}
                </div>
              </div>

            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

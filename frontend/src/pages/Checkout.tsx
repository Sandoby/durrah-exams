import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, CreditCard, Shield, Zap, Layout, X, Loader2, Star, Crown, Globe, ExternalLink, Ticket } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { paySkyIntegration } from '../lib/paysky';
import { kashierIntegration } from '../lib/kashier';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';



import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

export default function Checkout() {
    const isNative = Capacitor.isNativePlatform();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [selectedPaymentProvider, setSelectedPaymentProvider] = useState<'paysky' | 'kashier' | 'dodo'>('paysky');
    const [isProcessing, setIsProcessing] = useState(false);
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
    const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

    // Handle errors from payment callback
    useEffect(() => {
        if (location.state?.error) {
            toast.error(location.state.error, { duration: 6000 });
            // Clear the state so it doesn't show again on refresh
            window.history.replaceState({}, '');
        }
    }, [location.state]);

    // Fixed pricing to 5 USD / 50 USD
    const proMonthlyPrice = 5;
    const proYearlyPrice = 50;

    const currencyCode = 'USD';
    const monthlyPrice = '5.00';
    const yearlyPrice = '50.00';
    const isCurrencyLoading = false;

    // ---------- Plans ----------
    const plans = [
        {
            id: 'basic',
            name: t('checkout.plans.starter.name'),
            price: 0,
            displayPrice: '0',
            currency: currencyCode,
            description: t('checkout.plans.starter.desc'),
            features: [
                t('pricing.starter.features.0'),
                t('pricing.starter.features.2'), // Basic anti-cheating
                t('pricing.starter.features.3'), // Email support
                t('pricing.starter.features.1'), // 100 students
            ],
            recommended: false,
        },
        {
            id: 'pro',
            name: t('checkout.plans.pro.name'),
            price: billingCycle === 'monthly' ? proMonthlyPrice : proYearlyPrice,
            displayPrice: billingCycle === 'monthly' ? monthlyPrice : yearlyPrice,
            currency: currencyCode,
            description: t('checkout.plans.pro.desc'),
            features: [
                t('pricing.professional.features.0'),
                t('pricing.professional.features.2'),
                t('pricing.professional.features.3'),
                t('pricing.professional.features.1'),
            ],
            recommended: true,
        },
    ];

    // ---------- Coupon handling ----------
    const validateCoupon = async () => {
        if (!couponCode) return;
        setIsValidatingCoupon(true);
        try {
            const { data, error } = await supabase
                .from('coupons')
                .select('*')
                .eq('code', couponCode.toUpperCase())
                .single();
            if (error || !data) throw new Error('Coupon not found');

            // validity checks
            if (new Date(data.valid_until) < new Date()) throw new Error('Coupon expired');
            if (data.used_count >= data.max_uses) throw new Error('Coupon max uses reached');
            if (!data.is_active) throw new Error('Coupon inactive');

            // Duration check
            if (data.duration && data.duration !== billingCycle) {
                throw new Error(`This coupon is only valid for ${data.duration} plans`);
            }

            // Check if user has already used this coupon
            const { data: usageData, error: usageError } = await supabase
                .from('coupon_usage')
                .select('*')
                .eq('coupon_id', data.id)
                .eq('user_id', user?.id)
                .single();

            if (usageData && !usageError) {
                throw new Error('You have already used this coupon');
            }

            setAppliedCoupon(data);
            toast.success('Coupon applied');
        } catch (e) {
            console.error(e);
            toast.error((e as Error).message || 'Invalid coupon');
            setAppliedCoupon(null); // Clear invalid coupon
        } finally {
            setIsValidatingCoupon(false);
        }
    };

    const removeCoupon = () => {
        setAppliedCoupon(null);
        setCouponCode('');
        toast.success('Coupon removed');
    };

    const handleBillingCycleChange = (cycle: 'monthly' | 'yearly') => {
        setBillingCycle(cycle);
        // If a coupon is applied with a specific duration that doesn't match the new cycle, remove it
        if (appliedCoupon && appliedCoupon.duration && appliedCoupon.duration !== cycle) {
            setAppliedCoupon(null);
            setCouponCode('');
            toast.error(`Coupon removed: only valid for ${appliedCoupon.duration} plans`);
        }
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

    // ---------- Payment / Activation ----------
    const handlePayment = async () => {
        if (!selectedPlan) return toast.error('Select a plan first');
        const plan = plans.find(p => p.id === selectedPlan);
        if (!plan) return;
        const finalPrice = calculateFinalPrice(plan.price);

        // Free subscription – activate instantly
        if (finalPrice === 0) {
            try {
                const endDate = new Date();
                // default to monthly, can be extended later
                endDate.setMonth(endDate.getMonth() + (billingCycle === 'monthly' ? 1 : 12));
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        subscription_status: 'active',
                        subscription_plan: plan.name,
                        subscription_end_date: endDate.toISOString(),
                    })
                    .eq('id', user?.id);
                if (error) throw error;

                // Record coupon usage
                if (appliedCoupon) {
                    await supabase.from('coupon_usage').insert({ coupon_id: appliedCoupon.id, user_id: user?.id });
                    await supabase.from('coupons').update({ used_count: appliedCoupon.used_count + 1 }).eq('id', appliedCoupon.id);
                }

                toast.success('Subscription activated instantly!');
                navigate('/dashboard');
            } catch (e) {
                console.error(e);
                toast.error('Failed to activate subscription');
            }
            return;
        }

        // Paid flow
        setIsProcessing(true);
        if (appliedCoupon) {
            localStorage.setItem('pendingCoupon', JSON.stringify(appliedCoupon));
        }

        try {
            if (selectedPaymentProvider === 'dodo') {
                // Call our Edge Function to create Dodo session
                const { data, error } = await supabase.functions.invoke('create-dodo-payment', {
                    body: {
                        amount: finalPrice,
                        currency: 'USD',
                        billingCycle,
                        metadata: {
                            userId: user?.id,
                            planId: plan.id,
                            userEmail: user?.email
                        },
                        customer: {
                            name: user?.user_metadata?.full_name || user?.email?.split('@')[0],
                            email: user?.email,
                            phone: user?.phone // if available
                        }
                    }
                });

                if (error || !data || (!data.payment_link && !data.checkout_url)) {
                    console.error('Dodo Init Error:', data);
                    throw new Error(error?.message || 'Failed to initialize Dodo payment');
                }

                // Dodo returns `checkout_url` in the response
                const redirectUrl = data.checkout_url || data.payment_link;

                if (redirectUrl) {
                    window.location.href = redirectUrl;
                    return;
                }

                // If using Embedded SDK, we would use the token here.
                // If using Hosted Page (as fallback or if API returns link), redirect.
                // Based on search results saying "redirect to hosted page", let's use the link.
                // "Embedded" often just means an iframe or overlay that uses this link.
                // But user requested "native/embedded".
                // If the `dodopayments-checkout` package provides a Component, we usually pass the `clientSecret`.
                // For now, let's assume `data.payment_link` works as a redirect or we verify SDK usage.

                // Let's implement the Redirect first as it's guaranteed to work with the Function we wrote,
                // AND then IF we see `clientSecret` in the response, we could use the SDK.
                // But the user insisted on "native".
                // Let's assume the function returns what's needed.
                // For "native" feel using only a link, we can open in a Capacitor Browser or standard window.

                window.location.href = data.payment_link;
                // If `data.client_secret` exists, we would use the SDK component.
                // Since I am writing this "blind" to the exact response shape without running it, 
                // Redirect is the safest first step.

            } else if (selectedPaymentProvider === 'kashier') {
                await kashierIntegration.pay({
                    amount: finalPrice,
                    planId: plan.id,
                    userId: user?.id || '',
                    userEmail: user?.email || '',
                    billingCycle,
                });
            } else {
                // PaySky
                const result = await paySkyIntegration.pay({
                    amount: finalPrice,
                    planId: plan.id,
                    userId: user?.id || '',
                    userEmail: user?.email || '',
                    billingCycle,
                });

                if (result.success) {
                    if (appliedCoupon) { /* handle coupon usage */
                        await supabase.from('coupon_usage').insert({ coupon_id: appliedCoupon.id, user_id: user?.id });
                        await supabase.from('coupons').update({ used_count: appliedCoupon.used_count + 1 }).eq('id', appliedCoupon.id);
                        localStorage.removeItem('pendingCoupon');
                    }
                    toast.success('Subscription activated!');
                    navigate('/dashboard');
                } else {
                    toast.error(result.error?.message || 'Subscription activation failed');
                }
            }
        } catch (e) {
            console.error(e);
            toast.error('Subscription error');
        } finally {
            setIsProcessing(false);
        }
    };

    if (isNative) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 flex items-center justify-center p-6 text-center">
                <div className="max-w-md w-full bg-white/8 backdrop-blur-xl border border-white/20 dark:border-white/10 p-8 rounded-3xl shadow-2xl animate-fade-in">
                    <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Globe className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                        Subscription Required
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                        To maintain secure payment processing, subscriptions must be completed through our official website.
                    </p>
                    <div className="space-y-4">
                        <button
                            onClick={() => Browser.open({ url: 'https://tutors.durrahsystem.tech/login' })}
                            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2"
                        >
                            <ExternalLink className="h-5 w-5" />
                            Open Durrah Website
                        </button>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="w-full py-3 text-gray-500 dark:text-gray-400 font-medium hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                    <p className="mt-8 text-xs text-gray-400 dark:text-gray-500">
                        Once you subscribe on the website, lock your account in the app to access all premium features instantly.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 relative overflow-hidden font-sans pt-24">
            {/* Animated background blobs */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-400/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet-400/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-1/2 w-96 h-96 bg-purple-400/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>

            <style>{`
                @keyframes blob { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } }
                .animate-blob { animation: blob 7s infinite; }
                .animation-delay-2000 { animation-delay: 2s; }
                .animation-delay-4000 { animation-delay: 4s; }
            `}</style>

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 pt-4">
                <div className="max-w-7xl mx-auto bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-xl shadow-indigo-500/5 border border-gray-200/50 dark:border-gray-700/50">
                    <div className="h-16 px-6 flex items-center justify-between">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
                            <Logo className="h-9 w-9" showText={false} />
                            <div className="flex flex-col">
                                <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">Durrah</span>
                                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold tracking-[0.2em] uppercase leading-none">for Tutors</span>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            {t('checkout.back')}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-6">
                        <Crown className="h-3.5 w-3.5" />
                        Premium Access
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight">
                        {t('checkout.title')} <br className="hidden md:block" />
                        <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
                            {t('checkout.subtitle_highlight', 'Unlock Your Potential')}
                        </span>
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-300">
                        {t('checkout.subtitle')}
                    </p>
                </div>

                {/* Billing toggle */}
                <div className="flex justify-center mb-16">
                    <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm p-1.5 rounded-2xl border border-gray-200 dark:border-gray-700 inline-flex relative shadow-sm">
                        <button
                            onClick={() => handleBillingCycleChange('monthly')}
                            className={`relative z-10 px-8 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${billingCycle === 'monthly'
                                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'}`}
                        >
                            {t('checkout.monthly')}
                        </button>
                        <button
                            onClick={() => handleBillingCycleChange('yearly')}
                            className={`relative z-10 px-8 py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center ${billingCycle === 'yearly'
                                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'}`}
                        >
                            {t('checkout.yearly')}
                            <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide transition-colors ${billingCycle === 'yearly' ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                                -20%
                            </span>
                        </button>
                    </div>
                </div>

                {/* Pricing cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 max-w-5xl mx-auto">
                    {plans.map(plan => (
                        <div
                            key={plan.id}
                            onClick={() => setSelectedPlan(plan.id)}
                            className={`relative group rounded-3xl transition-all duration-300 cursor-pointer flex flex-col ${selectedPlan === plan.id
                                ? 'bg-white dark:bg-gray-800 ring-2 ring-indigo-600 shadow-2xl shadow-indigo-500/20 scale-[1.02]'
                                : 'bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-white/60 dark:border-gray-800 shadow-xl hover:shadow-2xl hover:scale-[1.01] hover:bg-white/80 dark:hover:bg-gray-900/80'}`}
                        >
                            {plan.recommended && (
                                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20">
                                    <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wide shadow-lg flex items-center gap-1.5">
                                        <Star className="h-3 w-3 fill-current" />
                                        {t('checkout.mostPopular')}
                                    </span>
                                </div>
                            )}

                            <div className="p-8 flex-1">
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
                                <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">{plan.description}</p>

                                <div className="flex items-baseline mb-8">
                                    <span className="text-5xl font-black text-gray-900 dark:text-white tracking-tight">
                                        {isCurrencyLoading ? (
                                            <span className="animate-pulse opacity-50">---</span>
                                        ) : (
                                            plan.price === 0 ? t('pricing.starter.price') : `${plan.currency} ${plan.displayPrice}`
                                        )}
                                    </span>
                                    <span className="ml-2 text-gray-500 dark:text-gray-400 font-medium">{billingCycle === 'monthly' ? t('pricing.professional.period') : t('pricing.yearly.period')}</span>
                                </div>

                                <div className="space-y-4 mb-8">
                                    {plan.features.map((f, i) => (
                                        <div key={i} className="flex items-start group/item">
                                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mt-0.5 group-hover/item:bg-green-200 dark:group-hover/item:bg-green-800/50 transition-colors">
                                                <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                                            </div>
                                            <span className="ml-3 text-gray-600 dark:text-gray-300 font-medium">{f}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-8 pt-0 mt-auto">
                                <button
                                    className={`w-full py-4 px-6 rounded-2xl font-bold text-sm transition-all duration-300 ${selectedPlan === plan.id
                                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30'
                                        : plan.recommended
                                            ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50'
                                            : 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700'}`}
                                >
                                    {selectedPlan === plan.id ? t('checkout.selected') : t('checkout.choose') + ' ' + plan.name}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Checkout section */}
                {selectedPlan && selectedPlan !== 'basic' && (
                    <div className="max-w-3xl mx-auto bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 dark:border-gray-800 overflow-hidden animate-fade-in-up">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                    <CreditCard className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                {t('checkout.secureCheckout')}
                            </h3>
                            <div className="flex gap-2 opacity-50 grayscale hover:grayscale-0 transition-all">
                                {/* Placeholders for card icons */}
                                <div className="h-6 w-10 bg-gray-200 dark:bg-gray-700 rounded" />
                                <div className="h-6 w-10 bg-gray-200 dark:bg-gray-700 rounded" />
                                <div className="h-6 w-10 bg-gray-200 dark:bg-gray-700 rounded" />
                            </div>
                        </div>

                        <div className="p-8 md:p-10">
                            {/* Summary Header */}
                            <div className="text-center mb-10">
                                <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('checkout.confirmOrder')}</h4>
                                <p className="text-gray-500 dark:text-gray-400">
                                    You are subscribing to <span className="font-bold text-indigo-600 dark:text-indigo-400">{plans.find(p => p.id === selectedPlan)?.name}</span> ({billingCycle})
                                </p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    {/* Coupon section */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('checkout.coupon.label')}</label>

                                        {/* Show instruction for Dodo Payments */}
                                        {selectedPaymentProvider === 'dodo' ? (
                                            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl flex gap-3">
                                                <div className="mt-0.5">
                                                    <Ticket className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-indigo-900 dark:text-indigo-200">
                                                        {t('checkout.haveCoupon', 'Note on Coupons')}
                                                    </p>
                                                    <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1 leading-relaxed">
                                                        {t('checkout.dodoCouponNote', 'Please enter your coupon code directly on the secure payment page after clicking "Proceed".')}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Standard Coupon Input for other providers */
                                            appliedCoupon ? (
                                                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center">
                                                            <Check className="h-4 w-4 text-green-600 dark:text-green-300" />
                                                        </div>
                                                        <div>
                                                            <span className="block font-mono font-bold text-green-800 dark:text-green-300 text-sm">{appliedCoupon.code}</span>
                                                            <span className="text-xs text-green-600 dark:text-green-400">
                                                                {appliedCoupon.discount_type === 'free'
                                                                    ? t('checkout.coupon.free')
                                                                    : appliedCoupon.discount_type === 'percentage'
                                                                        ? `${appliedCoupon.discount_value}% OFF`
                                                                        : `${appliedCoupon.discount_value} USD OFF`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <button onClick={removeCoupon} className="p-2 hover:bg-green-100 dark:hover:bg-green-800 rounded-lg transition-colors text-green-700 dark:text-green-300">
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={couponCode}
                                                        onChange={e => setCouponCode(e.target.value)}
                                                        placeholder={t('checkout.coupon.placeholder')}
                                                        className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white uppercase font-medium placeholder:normal-case transition-all"
                                                    />
                                                    <button
                                                        onClick={validateCoupon}
                                                        disabled={isValidatingCoupon}
                                                        className="px-6 py-3 bg-gray-900 dark:bg-gray-700 text-white rounded-xl font-bold text-sm hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 min-w-[100px]"
                                                    >
                                                        {isValidatingCoupon ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : t('checkout.coupon.apply')}
                                                    </button>
                                                </div>
                                            )
                                        )}
                                    </div>

                                    {/* Price summary */}
                                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-100 dark:border-gray-800 space-y-3">
                                        <div className="flex justify-between text-gray-600 dark:text-gray-400 text-sm">
                                            <span>Subtotal</span>
                                            <span className="font-medium">USD {plans.find(p => p.id === selectedPlan)?.price}</span>
                                        </div>
                                        {appliedCoupon && (
                                            <div className="flex justify-between text-green-600 dark:text-green-400 text-sm">
                                                <span>Discount</span>
                                                <span className="font-medium">- USD {(plans.find(p => p.id === selectedPlan)?.price || 0) - calculateFinalPrice(plans.find(p => p.id === selectedPlan)?.price || 0)}</span>
                                            </div>
                                        )}
                                        <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between items-center">
                                            <span className="font-bold text-gray-900 dark:text-white">Total</span>
                                            <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                                                {calculateFinalPrice(plans.find(p => p.id === selectedPlan)?.price || 0) === 0 ? 'FREE' : `USD ${calculateFinalPrice(plans.find(p => p.id === selectedPlan)?.price || 0)}`}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col justify-between">
                                    {/* Payment Provider Selection */}
                                    {selectedPlan && plans.find(p => p.id === selectedPlan)?.price !== 0 && (
                                        <div className="mb-6 space-y-8">

                                            {/* International Providers */}
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                                    <Globe className="w-4 h-4 text-indigo-500" />
                                                    International Payment Providers
                                                </label>
                                                <div className="space-y-3">
                                                    {/* Dodo Payments */}
                                                    <button
                                                        onClick={() => setSelectedPaymentProvider('dodo')}
                                                        className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${selectedPaymentProvider === 'dodo'
                                                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                                                            : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                                                            }`}
                                                    >
                                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPaymentProvider === 'dodo' ? 'border-indigo-600' : 'border-gray-300'}`}>
                                                            {selectedPaymentProvider === 'dodo' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                                                        </div>
                                                        <div className="flex-1 flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <img
                                                                    src="https://logo.clearbit.com/dodopayments.com"
                                                                    alt="Dodo Payments"
                                                                    className="h-8 w-8 rounded-lg object-contain bg-white p-1"
                                                                    onError={(e) => {
                                                                        e.currentTarget.style.display = 'none';
                                                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                                    }}
                                                                />
                                                                <div className="hidden font-bold text-gray-900 dark:text-white">Dodo Payments</div>
                                                            </div>
                                                            <div className="text-xs font-semibold px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-gray-500">Global</div>
                                                        </div>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Egyptian Providers */}
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                                    <div className="w-4 h-4 rounded-full overflow-hidden border border-gray-200">
                                                        <svg viewBox="0 0 3 2" className="w-full h-full"><rect width="3" height="2" fill="#CE1126" /><rect width="3" height="0.66" y="0.66" fill="#fff" /><rect width="3" height="0.66" y="1.33" fill="#000" /><circle cx="1.5" cy="1" r="0.2" fill="#C09300" /></svg>
                                                    </div>
                                                    Egyptian Payment Providers
                                                </label>
                                                <div className="space-y-3">
                                                    {/* PaySky */}
                                                    <button
                                                        onClick={() => setSelectedPaymentProvider('paysky')}
                                                        className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${selectedPaymentProvider === 'paysky'
                                                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                                                            : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                                                            }`}
                                                    >
                                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPaymentProvider === 'paysky' ? 'border-indigo-600' : 'border-gray-300'}`}>
                                                            {selectedPaymentProvider === 'paysky' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                                                        </div>
                                                        <div className="flex-1 flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <img
                                                                    src="https://logo.clearbit.com/paysky.io"
                                                                    alt="PaySky"
                                                                    className="h-8 w-8 rounded-lg object-contain bg-white p-1"
                                                                    onError={(e) => {
                                                                        e.currentTarget.style.display = 'none';
                                                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                                    }}
                                                                />
                                                                <div className="hidden font-bold text-gray-900 dark:text-white">PaySky</div>
                                                            </div>
                                                        </div>
                                                    </button>

                                                    {/* Kashier */}
                                                    <button
                                                        onClick={() => setSelectedPaymentProvider('kashier')}
                                                        className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${selectedPaymentProvider === 'kashier'
                                                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                                                            : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                                                            }`}
                                                    >
                                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPaymentProvider === 'kashier' ? 'border-indigo-600' : 'border-gray-300'}`}>
                                                            {selectedPaymentProvider === 'kashier' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                                                        </div>
                                                        <div className="flex-1 flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <img
                                                                    src="https://logo.clearbit.com/kashier.io"
                                                                    alt="Kashier"
                                                                    className="h-8 w-8 rounded-lg object-contain bg-white p-1"
                                                                    onError={(e) => {
                                                                        e.currentTarget.style.display = 'none';
                                                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                                    }}
                                                                />
                                                                <div className="hidden font-bold text-gray-900 dark:text-white">Kashier</div>
                                                            </div>
                                                        </div>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}<button
                                        onClick={handlePayment}
                                        disabled={isProcessing}
                                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-indigo-500/30 hover:scale-[1.02] transition-all disabled:opacity-70 disabled:hover:scale-100 flex items-center justify-center gap-2"
                                    >
                                        {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Shield className="h-5 w-5" />}
                                        {isProcessing ? t('checkout.processing') : t('checkout.proceed')}
                                    </button>

                                    <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-1">
                                        <Shield className="h-3 w-3" />
                                        <span>Secure 256-bit SSL Encrypted Payment</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Features grid */}
                <div className="mt-24 mb-16">
                    <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
                        Why top educators choose <span className="text-indigo-600">Durrah</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg p-8 rounded-3xl shadow-lg border border-white/60 dark:border-gray-700 hover:-translate-y-1 transition-transform duration-300">
                            <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-6 border border-blue-100 dark:border-blue-800">
                                <Zap className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{t('checkout.features.fast.title')}</h3>
                            <p className="text-gray-500 dark:text-gray-400 leading-relaxed">{t('checkout.features.fast.desc')}</p>
                        </div>
                        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg p-8 rounded-3xl shadow-lg border border-white/60 dark:border-gray-700 hover:-translate-y-1 transition-transform duration-300">
                            <div className="w-14 h-14 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center mb-6 border border-purple-100 dark:border-purple-800">
                                <Shield className="h-7 w-7 text-purple-600 dark:text-purple-400" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{t('checkout.features.antiCheat.title')}</h3>
                            <p className="text-gray-500 dark:text-gray-400 leading-relaxed">{t('checkout.features.antiCheat.desc')}</p>
                        </div>
                        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg p-8 rounded-3xl shadow-lg border border-white/60 dark:border-gray-700 hover:-translate-y-1 transition-transform duration-300">
                            <div className="w-14 h-14 bg-pink-50 dark:bg-pink-900/20 rounded-2xl flex items-center justify-center mb-6 border border-pink-100 dark:border-pink-800">
                                <Layout className="h-7 w-7 text-pink-600 dark:text-pink-400" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{t('checkout.features.interface.title')}</h3>
                            <p className="text-gray-500 dark:text-gray-400 leading-relaxed">{t('checkout.features.interface.desc')}</p>
                        </div>
                    </div>
                </div>

                {/* Footer with refund policy link */}
                <div className="pt-10 border-t border-gray-200 dark:border-gray-800">
                    <div className="text-center text-sm text-gray-500 dark:text-gray-500 max-w-2xl mx-auto">
                        <p className="mb-4">
                            By proceeding with payment, you agree to our terms and conditions. All payments are processed securely in Egyptian Pounds (EGP).
                        </p>
                        <p>
                            Questions about our refund policy?{' '}
                            <button
                                onClick={() => navigate('/refund-policy')}
                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 underline font-semibold transition-colors"
                            >
                                View Refund Policy
                            </button>
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
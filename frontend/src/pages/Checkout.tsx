import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, CreditCard, Shield, Zap, Layout, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { paySkyIntegration } from '../lib/paysky';
import { kashierIntegration } from '../lib/kashier';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

import { useCurrency } from '../hooks/useCurrency';

export default function Checkout() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [selectedPaymentProvider, setSelectedPaymentProvider] = useState<'paysky' | 'kashier'>('paysky');
    const [isProcessing, setIsProcessing] = useState(false);
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
    const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

    // Dynamic currency conversion
    const proMonthlyPrice = 200;
    const proYearlyPrice = 2000;

    const { price: monthlyPrice, currency: currencyCode, isLoading: isCurrencyLoading } = useCurrency(proMonthlyPrice);
    const { price: yearlyPrice } = useCurrency(proYearlyPrice);

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

                // Record coupon usage if a coupon was applied
                if (appliedCoupon) {
                    // Insert into coupon_usage table
                    const { error: usageError } = await supabase
                        .from('coupon_usage')
                        .insert({
                            coupon_id: appliedCoupon.id,
                            user_id: user?.id
                        });

                    if (usageError) {
                        console.error('Failed to record coupon usage:', usageError);
                    }

                    // Increment the coupon's used_count
                    const { error: updateError } = await supabase
                        .from('coupons')
                        .update({ used_count: appliedCoupon.used_count + 1 })
                        .eq('id', appliedCoupon.id);

                    if (updateError) {
                        console.error('Failed to increment coupon usage:', updateError);
                    }
                }

                toast.success('Subscription activated instantly!');
                navigate('/dashboard');
            } catch (e) {
                console.error(e);
                toast.error('Failed to activate subscription');
            }
            return;
        }

        // Paid flow – use selected payment provider with discounted amount
        setIsProcessing(true);
        
        // Store coupon for later redemption after successful payment
        if (appliedCoupon) {
            localStorage.setItem('pendingCoupon', JSON.stringify(appliedCoupon));
        }
        
        try {
            if (selectedPaymentProvider === 'kashier') {
                // Kashier will redirect to hosted checkout, then callback handles success
                await kashierIntegration.pay({
                    amount: finalPrice,
                    planId: plan.id,
                    userId: user?.id || '',
                    userEmail: user?.email || '',
                    billingCycle,
                });
                // User will be redirected - no code after this runs
            } else {
                // PaySky opens iframe/lightbox - handle callback
                const result = await paySkyIntegration.pay({
                    amount: finalPrice,
                    planId: plan.id,
                    userId: user?.id || '',
                    userEmail: user?.email || '',
                    billingCycle,
                });

                if (result.success) {
                    // PaySky payment completed - record coupon and activate
                    if (appliedCoupon) {
                        const { error: usageError } = await supabase
                            .from('coupon_usage')
                            .insert({
                                coupon_id: appliedCoupon.id,
                                user_id: user?.id
                            });

                        if (!usageError) {
                            await supabase
                                .from('coupons')
                                .update({ used_count: appliedCoupon.used_count + 1 })
                                .eq('id', appliedCoupon.id);
                        }
                        
                        localStorage.removeItem('pendingCoupon');
                    }

                    toast.success('Payment successful!');
                    navigate('/dashboard');
                } else {
                    localStorage.removeItem('pendingCoupon');
                    toast.error(result.error?.message || 'Payment failed');
                }
            }
        } catch (e) {
            console.error(e);
            toast.error('Payment error');
        } finally {
            setIsProcessing(false);
        }
    };

    // ---------- UI ----------
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 font-sans">
            {/* Header */}
            <header className="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-7xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl z-50 border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-xl shadow-indigo-500/5">
                <div className="px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center cursor-pointer gap-3" onClick={() => navigate('/dashboard')}>
                        <Logo className="h-9 w-9" showText={false} />
                        <div className="flex flex-col">
                            <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">Durrah</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">for Tutors</span>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm font-medium transition-colors"
                    >
                        {t('checkout.back')}
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12">
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent sm:text-5xl mb-4">
                        {t('checkout.title')}
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-300">
                        {t('checkout.subtitle')}
                    </p>
                </div>

                {/* Billing toggle */}
                <div className="flex justify-center mb-12">
                    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-1.5 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg shadow-indigo-500/5 inline-flex relative">
                        <button
                            onClick={() => handleBillingCycleChange('monthly')}
                            className={`relative z-10 px-8 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${billingCycle === 'monthly'
                                ? 'bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                                : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                        >
                            {t('checkout.monthly')}
                        </button>
                        <button
                            onClick={() => handleBillingCycleChange('yearly')}
                            className={`relative z-10 px-8 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${billingCycle === 'yearly'
                                ? 'bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                                : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                        >
                            {t('checkout.yearly')}
                            <span className="bg-gradient-to-r from-green-400 to-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide shadow-sm">
                                {t('checkout.save20')}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Pricing cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 max-w-4xl mx-auto">
                    {plans.map(plan => (
                        <div
                            key={plan.id}
                            className={`relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-3xl shadow-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl border-2 ${selectedPlan === plan.id
                                ? 'border-indigo-500 ring-4 ring-indigo-500/20 scale-105'
                                : plan.recommended
                                    ? 'border-indigo-200 dark:border-indigo-800 hover:border-indigo-300 dark:hover:border-indigo-700'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'} flex flex-col overflow-hidden`}
                            onClick={() => setSelectedPlan(plan.id)}
                        >
                            {plan.recommended && (
                                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                                    <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wide shadow-lg shadow-indigo-500/30">
                                        {t('checkout.mostPopular')}
                                    </span>
                                </div>
                            )}
                            {plan.recommended && (
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600"></div>
                            )}
                            <div className="p-8 flex-1">
                                <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2">{plan.name}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{plan.description}</p>
                                <div className="flex items-baseline mb-6">
                                    <span className="text-5xl font-extrabold bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
                                        {isCurrencyLoading ? (
                                            <span className="animate-pulse">...</span>
                                        ) : (
                                            plan.price === 0 ? t('pricing.starter.price') : `${plan.currency} ${plan.displayPrice}`
                                        )}
                                    </span>
                                    <span className="ml-2 text-gray-500 dark:text-gray-400 text-sm">{billingCycle === 'monthly' ? t('pricing.professional.period') : t('pricing.yearly.period')}</span>
                                </div>
                                <ul className="space-y-4 mb-8">
                                    {plan.features.map((f, i) => (
                                        <li key={i} className="flex items-start">
                                            <div className="mt-0.5 mr-3 flex-shrink-0">
                                                <Check className="h-5 w-5 text-green-500 bg-green-50 dark:bg-green-900/20 rounded-full p-0.5" />
                                            </div>
                                            <span className="text-sm text-gray-700 dark:text-gray-300">{f}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="p-8 pt-0 mt-auto">
                                <button
                                    className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm transition-all duration-300 ${selectedPlan === plan.id
                                        ? 'bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white hover:shadow-lg hover:shadow-indigo-500/30 hover:scale-105'
                                        : plan.recommended
                                            ? 'bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 text-indigo-700 dark:text-indigo-300 hover:from-indigo-100 hover:to-purple-100 dark:hover:from-indigo-900/50 dark:hover:to-purple-900/50'
                                            : 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'}`}
                                >
                                    {selectedPlan === plan.id ? t('checkout.selected') : t('checkout.choose') + ' ' + plan.name}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Checkout section */}
                {selectedPlan && selectedPlan !== 'basic' && (
                    <div className="max-w-2xl mx-auto bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-3xl shadow-2xl border-2 border-indigo-200/50 dark:border-indigo-800/50 overflow-hidden animate-fade-in-up">
                        <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-indigo-50/50 via-violet-50/50 to-purple-50/50 dark:from-indigo-900/20 dark:via-violet-900/20 dark:to-purple-900/20 flex justify-between items-center">
                            <h3 className="text-lg font-bold bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent flex items-center">
                                <CreditCard className="h-5 w-5 mr-2 text-indigo-600" />
                                {t('checkout.secureCheckout')}
                            </h3>
                            <div className="flex space-x-2">
                                <div className="h-6 w-10 bg-gradient-to-r from-indigo-400 to-purple-400 rounded shadow-sm" />
                                <div className="h-6 w-10 bg-gradient-to-r from-violet-400 to-pink-400 rounded shadow-sm" />
                                <div className="h-6 w-10 bg-gradient-to-r from-purple-400 to-indigo-400 rounded shadow-sm" />
                            </div>
                        </div>
                        <div className="p-8">
                            <div className="text-center py-8">
                                <div className="relative mx-auto mb-4 w-20 h-20">
                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 rounded-full opacity-20 blur-xl"></div>
                                    <div className="relative bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 w-20 h-20 rounded-full flex items-center justify-center">
                                        <Shield className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                </div>
                                <h4 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent mb-2">{t('checkout.securePayment')}</h4>
                                <p className="text-gray-600 dark:text-gray-300 mb-2">
                                    Proceed to pay securely with {selectedPaymentProvider === 'paysky' ? 'PaySky' : 'Kashier'}.<br />
                                    Selected Plan: <span className="font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{plans.find(p => p.id === selectedPlan)?.name}</span> ({billingCycle})
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                                    * Payment will be processed in Egyptian Pounds (EGP). Displayed prices are converted for reference only.
                                </p>
                            </div>

                            {/* Coupon section */}
                            <div className="mb-6 max-w-md mx-auto">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('checkout.coupon.label')}</label>
                                {appliedCoupon ? (
                                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-green-500 rounded-full p-1">
                                                <Check className="h-4 w-4 text-white" />
                                            </div>
                                            <div>
                                                <span className="font-mono font-bold text-green-700 dark:text-green-400 block">{appliedCoupon.code}</span>
                                                <span className="text-sm text-green-600 dark:text-green-400">
                                                    {appliedCoupon.discount_type === 'free'
                                                        ? t('checkout.coupon.free')
                                                        : appliedCoupon.discount_type === 'percentage'
                                                            ? `${appliedCoupon.discount_value}% ${t('checkout.coupon.off')}`
                                                            : `${appliedCoupon.discount_value} EGP ${t('checkout.coupon.off')}`}
                                                </span>
                                            </div>
                                        </div>
                                        <button onClick={removeCoupon} className="text-red-600 hover:text-red-800 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg p-1 transition-colors">
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={couponCode}
                                            onChange={e => setCouponCode(e.target.value)}
                                            placeholder={t('checkout.coupon.placeholder')}
                                            className="flex-1 px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-white uppercase font-mono text-sm transition-all"
                                        />
                                        <button
                                            onClick={validateCoupon}
                                            disabled={isValidatingCoupon}
                                            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 font-semibold"
                                        >
                                            {isValidatingCoupon ? <Loader2 className="h-5 w-5 animate-spin" /> : t('checkout.coupon.apply')}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Price summary */}
                            {appliedCoupon && (
                                <div className="mb-6 max-w-md mx-auto bg-gradient-to-r from-gray-50 to-indigo-50/30 dark:from-slate-800/50 dark:to-indigo-900/20 p-5 rounded-xl border border-gray-200/50 dark:border-gray-700/50 space-y-3">
                                    <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                                        <span className="font-medium">{t('checkout.summary.original')}</span>
                                        <span className="font-semibold">EGP {plans.find(p => p.id === selectedPlan)?.price}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                                        <span className="font-medium">{t('checkout.summary.discount')}</span>
                                        <span className="font-bold">- EGP {(plans.find(p => p.id === selectedPlan)?.price || 0) - calculateFinalPrice(plans.find(p => p.id === selectedPlan)?.price || 0)}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-lg pt-3 border-t-2 border-gray-200 dark:border-gray-700">
                                        <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{t('checkout.summary.final')}</span>
                                        <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                            {calculateFinalPrice(plans.find(p => p.id === selectedPlan)?.price || 0) === 0 ? t('checkout.summary.free') : `EGP ${calculateFinalPrice(plans.find(p => p.id === selectedPlan)?.price || 0)}`}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Payment Provider Selection */}
                            {selectedPlan && plans.find(p => p.id === selectedPlan)?.price !== 0 && (
                                <div className="mb-8 max-w-md mx-auto">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                                        <CreditCard className="inline h-4 w-4 mr-2 text-indigo-600" />
                                        Payment Method
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setSelectedPaymentProvider('paysky')}
                                            className={`p-4 rounded-xl border-2 transition-all ${
                                                selectedPaymentProvider === 'paysky'
                                                    ? 'border-indigo-600 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 shadow-md shadow-indigo-500/20'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                            }`}
                                        >
                                            <div className="font-bold text-gray-900 dark:text-white">PaySky</div>
                                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Instant Payment</div>
                                        </button>
                                        <button
                                            onClick={() => setSelectedPaymentProvider('kashier')}
                                            className={`p-4 rounded-xl border-2 transition-all ${
                                                selectedPaymentProvider === 'kashier'
                                                    ? 'border-indigo-600 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 shadow-md shadow-indigo-500/20'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                            }`}
                                        >
                                            <div className="font-bold text-gray-900 dark:text-white">Kashier</div>
                                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Secure Checkout</div>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Action button */}
                            <button
                                onClick={handlePayment}
                                disabled={isProcessing}
                                className="group relative w-full py-4 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-indigo-500/30 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-lg flex items-center justify-center overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <span className="relative z-10 flex items-center">
                                    {isProcessing ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />{t('checkout.processing')}</> : t('checkout.proceed')}
                                </span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Features grid */}
                <div className="mt-24">
                    <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent mb-12">Why top educators choose Durrah</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                            <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl flex items-center justify-center mb-4 shadow-sm">
                                <Zap className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('checkout.features.fast.title')}</h3>
                            <p className="text-gray-600 dark:text-gray-400">{t('checkout.features.fast.desc')}</p>
                        </div>
                        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                            <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30 rounded-xl flex items-center justify-center mb-4 shadow-sm">
                                <Shield className="h-7 w-7 text-purple-600 dark:text-purple-400" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('checkout.features.antiCheat.title')}</h3>
                            <p className="text-gray-600 dark:text-gray-400">{t('checkout.features.antiCheat.desc')}</p>
                        </div>
                        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                            <div className="w-14 h-14 bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900/30 dark:to-rose-900/30 rounded-xl flex items-center justify-center mb-4 shadow-sm">
                                <Layout className="h-7 w-7 text-pink-600 dark:text-pink-400" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('checkout.features.interface.title')}</h3>
                            <p className="text-gray-600 dark:text-gray-400">{t('checkout.features.interface.desc')}</p>
                        </div>
                    </div>
                </div>

                {/* Footer with refund policy link */}
                <div className="mt-16 pt-8 border-t border-gray-200/50 dark:border-gray-700/50">
                    <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                        <p className="mb-3">
                            By proceeding with payment, you agree to our terms and conditions. All payments are processed in Egyptian Pounds (EGP).
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

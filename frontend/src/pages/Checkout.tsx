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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center cursor-pointer gap-3" onClick={() => navigate('/dashboard')}>
                            <Logo className="h-8 w-8" showText={false} />
                            <div className="flex flex-col">
                                <span className="text-lg font-semibold text-gray-900 dark:text-white">Durrah</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">for Tutors</span>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            {t('checkout.back')}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white sm:text-5xl mb-4">
                        {t('checkout.title')}
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400">
                        {t('checkout.subtitle')}
                    </p>
                </div>

                {/* Billing toggle */}
                <div className="flex justify-center mb-16">
                    <div className="inline-flex bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1 shadow-sm">
                        <button
                            onClick={() => handleBillingCycleChange('monthly')}
                            className={`px-6 py-2.5 text-sm font-medium rounded-md transition-all ${billingCycle === 'monthly'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}
                        >
                            {t('checkout.monthly')}
                        </button>
                        <button
                            onClick={() => handleBillingCycleChange('yearly')}
                            className={`px-6 py-2.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${billingCycle === 'yearly'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}
                        >
                            {t('checkout.yearly')}
                            <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                {t('checkout.save20')}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Pricing cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16 max-w-5xl mx-auto">
                    {plans.map(plan => (
                        <div
                            key={plan.id}
                            className={`relative bg-white dark:bg-gray-800 rounded-xl shadow-sm transition-all duration-200 hover:shadow-md border ${selectedPlan === plan.id
                                ? 'border-indigo-600 ring-2 ring-indigo-600 ring-offset-2'
                                : plan.recommended
                                    ? 'border-indigo-200 dark:border-indigo-800'
                                    : 'border-gray-200 dark:border-gray-700'} flex flex-col cursor-pointer`}
                            onClick={() => setSelectedPlan(plan.id)}
                        >
                            {plan.recommended && (
                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                    <span className="bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                                        {t('checkout.mostPopular')}
                                    </span>
                                </div>
                            )}
                            <div className="p-8 flex-1">
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{plan.description}</p>
                                <div className="flex items-baseline mb-6">
                                    <span className="text-4xl font-bold text-gray-900 dark:text-white">
                                        {isCurrencyLoading ? (
                                            <span className="animate-pulse">...</span>
                                        ) : (
                                            plan.price === 0 ? t('pricing.starter.price') : `${plan.currency} ${plan.displayPrice}`
                                        )}
                                    </span>
                                    <span className="ml-2 text-gray-500 dark:text-gray-400 text-sm font-normal">{billingCycle === 'monthly' ? t('pricing.professional.period') : t('pricing.yearly.period')}</span>
                                </div>
                                <ul className="space-y-3 mb-8">
                                    {plan.features.map((f, i) => (
                                        <li key={i} className="flex items-start">
                                            <Check className="h-5 w-5 text-green-600 dark:text-green-400 mr-3 flex-shrink-0 mt-0.5" />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">{f}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="px-8 pb-8 pt-0">
                                <button
                                    className={`w-full py-3 px-4 rounded-lg font-semibold text-sm transition-colors ${selectedPlan === plan.id
                                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                        : plan.recommended
                                            ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-300 dark:hover:bg-indigo-900/30'
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
                    <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in-up">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                                    <CreditCard className="h-5 w-5 mr-2 text-indigo-600" />
                                    {t('checkout.secureCheckout')}
                                </h3>
                                <div className="flex items-center gap-1">
                                    <Shield className="h-5 w-5 text-gray-400" />
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Secure</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-8">
                            <div className="text-center mb-8">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full mb-4">
                                    <Shield className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{t('checkout.securePayment')}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Selected Plan: <span className="font-medium text-gray-900 dark:text-white">{plans.find(p => p.id === selectedPlan)?.name}</span> ({billingCycle})
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                    Payment will be processed in Egyptian Pounds (EGP). Displayed prices are converted for reference only.
                                </p>
                            </div>

                            {/* Coupon section */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('checkout.coupon.label')}</label>
                                {appliedCoupon ? (
                                    <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                                            <div>
                                                <span className="font-mono font-semibold text-green-700 dark:text-green-400 block">{appliedCoupon.code}</span>
                                                <span className="text-sm text-green-600 dark:text-green-400">
                                                    {appliedCoupon.discount_type === 'free'
                                                        ? t('checkout.coupon.free')
                                                        : appliedCoupon.discount_type === 'percentage'
                                                            ? `${appliedCoupon.discount_value}% ${t('checkout.coupon.off')}`
                                                            : `${appliedCoupon.discount_value} EGP ${t('checkout.coupon.off')}`}
                                                </span>
                                            </div>
                                        </div>
                                        <button onClick={removeCoupon} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
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
                                            className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white uppercase font-mono text-sm"
                                        />
                                        <button
                                            onClick={validateCoupon}
                                            disabled={isValidatingCoupon}
                                            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 font-medium"
                                        >
                                            {isValidatingCoupon ? <Loader2 className="h-5 w-5 animate-spin" /> : t('checkout.coupon.apply')}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Price summary */}
                            {appliedCoupon && (
                                <div className="mb-6 bg-gray-50 dark:bg-gray-800/50 p-5 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
                                    <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                                        <span>{t('checkout.summary.original')}</span>
                                        <span className="font-medium">EGP {plans.find(p => p.id === selectedPlan)?.price}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                                        <span>{t('checkout.summary.discount')}</span>
                                        <span className="font-medium">- EGP {(plans.find(p => p.id === selectedPlan)?.price || 0) - calculateFinalPrice(plans.find(p => p.id === selectedPlan)?.price || 0)}</span>
                                    </div>
                                    <div className="flex justify-between font-semibold text-base pt-3 border-t border-gray-200 dark:border-gray-700">
                                        <span className="text-gray-900 dark:text-white">{t('checkout.summary.final')}</span>
                                        <span className="text-gray-900 dark:text-white">
                                            {calculateFinalPrice(plans.find(p => p.id === selectedPlan)?.price || 0) === 0 ? t('checkout.summary.free') : `EGP ${calculateFinalPrice(plans.find(p => p.id === selectedPlan)?.price || 0)}`}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Payment Provider Selection */}
                            {selectedPlan && plans.find(p => p.id === selectedPlan)?.price !== 0 && (
                                <div className="mb-8">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                        Payment Method
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setSelectedPaymentProvider('paysky')}
                                            className={`p-4 rounded-lg border-2 transition-all text-left ${
                                                selectedPaymentProvider === 'paysky'
                                                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                            }`}
                                        >
                                            <div className="font-semibold text-gray-900 dark:text-white">PaySky</div>
                                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Instant Payment</div>
                                        </button>
                                        <button
                                            onClick={() => setSelectedPaymentProvider('kashier')}
                                            className={`p-4 rounded-lg border-2 transition-all text-left ${
                                                selectedPaymentProvider === 'kashier'
                                                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                            }`}
                                        >
                                            <div className="font-semibold text-gray-900 dark:text-white">Kashier</div>
                                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Secure Checkout</div>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Action button */}
                            <button
                                onClick={handlePayment}
                                disabled={isProcessing}
                                className="w-full py-3.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                        {t('checkout.processing')}
                                    </>
                                ) : (
                                    t('checkout.proceed')
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Features grid */}
                <div className="mt-20">
                    <h2 className="text-2xl font-semibold text-center text-gray-900 dark:text-white mb-10">Why top educators choose Durrah</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
                                <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('checkout.features.fast.title')}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{t('checkout.features.fast.desc')}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4">
                                <Shield className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('checkout.features.antiCheat.title')}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{t('checkout.features.antiCheat.desc')}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center mb-4">
                                <Layout className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('checkout.features.interface.title')}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{t('checkout.features.interface.desc')}</p>
                        </div>
                    </div>
                </div>

                {/* Footer with refund policy link */}
                <div className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                        <p className="mb-2">
                            By proceeding with payment, you agree to our terms and conditions. All payments are processed in Egyptian Pounds (EGP).
                        </p>
                        <p>
                            Questions about our refund policy?{' '}
                            <button
                                onClick={() => navigate('/refund-policy')}
                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 underline font-medium transition-colors"
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

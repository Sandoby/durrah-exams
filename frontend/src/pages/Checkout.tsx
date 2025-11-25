import { useState } from 'react';
import { Check, CreditCard, Shield, Zap, Layout, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { paySkyIntegration } from '../lib/paysky';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export default function Checkout() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
    const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

    // ---------- Plans ----------
    const plans = [
        {
            id: 'basic',
            name: 'Starter',
            price: billingCycle === 'monthly' ? 0 : 0,
            description: 'Perfect for trying out Durrah for Tutors',
            features: [
                'Up to 3 exams',
                'Basic analytics',
                'Email support',
                '100 students per exam',
            ],
            recommended: false,
        },
        {
            id: 'pro',
            name: 'Professional',
            price: billingCycle === 'monthly' ? 200 : 2000,
            description: 'For serious tutors and small institutions',
            features: [
                'Unlimited exams',
                'Advanced analytics & Insights',
                'Priority support',
                'Unlimited students',
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
            setAppliedCoupon(data);
            toast.success('Coupon applied');
        } catch (e) {
            console.error(e);
            toast.error((e as Error).message || 'Invalid coupon');
        } finally {
            setIsValidatingCoupon(false);
        }
    };

    const removeCoupon = () => {
        setAppliedCoupon(null);
        setCouponCode('');
        toast.success('Coupon removed');
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
                toast.success('Subscription activated instantly!');
                navigate('/dashboard');
            } catch (e) {
                console.error(e);
                toast.error('Failed to activate subscription');
            }
            return;
        }

        // Paid flow – use PaySky integration with discounted amount
        setIsProcessing(true);
        try {
            const result = await paySkyIntegration.pay({
                amount: finalPrice,
                planId: plan.id,
                userId: user?.id || '',
                userEmail: user?.email || '',
                billingCycle,
            });

            if (result.success) {
                toast.success('Payment successful!');
                navigate('/dashboard');
            } else {
                toast.error(result.error?.message || 'Payment failed');
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
            <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center cursor-pointer" onClick={() => navigate('/dashboard')}>
                        <Logo className="h-8 w-8 text-indigo-600" showText={false} />
                        <div className="ml-2 flex items-baseline">
                            <span className="text-2xl font-bold text-indigo-600">Durrah</span>
                            <span className="ml-1.5 text-2xl font-light text-gray-500 dark:text-gray-300">for Tutors</span>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white text-sm font-medium"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl mb-4">
                        Upgrade your teaching powers
                    </h1>
                    <p className="text-xl text-gray-500 dark:text-gray-400">
                        Choose the plan that fits your needs. Cancel anytime.
                    </p>
                </div>

                {/* Billing toggle */}
                <div className="flex justify-center mb-12">
                    <div className="bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 inline-flex relative">
                        <button
                            onClick={() => setBillingCycle('monthly')}
                            className={`relative z-10 px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${billingCycle === 'monthly'
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setBillingCycle('yearly')}
                            className={`relative z-10 px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center ${billingCycle === 'yearly'
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                        >
                            Yearly
                            <span className="ml-2 bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                                Save 20%
                            </span>
                        </button>
                    </div>
                </div>

                {/* Pricing cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 max-w-4xl mx-auto">
                    {plans.map(plan => (
                        <div
                            key={plan.id}
                            className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl border ${selectedPlan === plan.id
                                ? 'border-indigo-600 ring-2 ring-indigo-600 ring-opacity-50'
                                : plan.recommended
                                    ? 'border-indigo-200 dark:border-indigo-900'
                                    : 'border-gray-200 dark:border-gray-700'} flex flex-col`}
                            onClick={() => setSelectedPlan(plan.id)}
                        >
                            {plan.recommended && (
                                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                                    <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide shadow-sm">
                                        Most Popular
                                    </span>
                                </div>
                            )}
                            <div className="p-8 flex-1">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{plan.description}</p>
                                <div className="flex items-baseline mb-6">
                                    <span className="text-4xl font-extrabold text-gray-900 dark:text-white">
                                        {plan.price === 0 ? 'Free' : `EGP ${plan.price}`}
                                    </span>
                                    <span className="ml-2 text-gray-500 dark:text-gray-400">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                                </div>
                                <ul className="space-y-4 mb-8">
                                    {plan.features.map((f, i) => (
                                        <li key={i} className="flex items-start">
                                            <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                                            <span className="text-sm text-gray-600 dark:text-gray-300">{f}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="p-8 pt-0 mt-auto">
                                <button
                                    className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-colors duration-200 ${selectedPlan === plan.id
                                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none'
                                        : plan.recommended
                                            ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50'
                                            : 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'}`}
                                >
                                    {selectedPlan === plan.id ? 'Selected' : 'Choose ' + plan.name}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Checkout section */}
                {selectedPlan && selectedPlan !== 'basic' && (
                    <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in-up">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                                <CreditCard className="h-5 w-5 mr-2 text-indigo-600" />
                                Secure Checkout
                            </h3>
                            <div className="flex space-x-2">
                                <div className="h-6 w-10 bg-gray-200 dark:bg-gray-700 rounded" />
                                <div className="h-6 w-10 bg-gray-200 dark:bg-gray-700 rounded" />
                                <div className="h-6 w-10 bg-gray-200 dark:bg-gray-700 rounded" />
                            </div>
                        </div>
                        <div className="p-8">
                            <div className="text-center py-8">
                                <div className="bg-indigo-50 dark:bg-indigo-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Shield className="h-8 w-8 text-indigo-600" />
                                </div>
                                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Secure Payment</h4>
                                <p className="text-gray-500 dark:text-gray-400 mb-6">
                                    Proceed to pay securely with PaySky.<br />
                                    Selected Plan: <span className="font-semibold text-indigo-600">{plans.find(p => p.id === selectedPlan)?.name}</span> ({billingCycle})
                                </p>
                            </div>

                            {/* Coupon section */}
                            <div className="mb-6 max-w-md mx-auto">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Have a coupon code?</label>
                                {appliedCoupon ? (
                                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                        <div className="flex items-center">
                                            <Check className="h-5 w-5 text-green-600 mr-2" />
                                            <span className="font-mono font-semibold text-green-700 dark:text-green-400">{appliedCoupon.code}</span>
                                            <span className="ml-2 text-sm text-green-600 dark:text-green-400">
                                                {appliedCoupon.discount_type === 'free'
                                                    ? 'Free Subscription!'
                                                    : appliedCoupon.discount_type === 'percentage'
                                                        ? `${appliedCoupon.discount_value}% off`
                                                        : `${appliedCoupon.discount_value} EGP off`}
                                            </span>
                                        </div>
                                        <button onClick={removeCoupon} className="text-red-600 hover:text-red-800 dark:text-red-400">
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex space-x-2">
                                        <input
                                            type="text"
                                            value={couponCode}
                                            onChange={e => setCouponCode(e.target.value)}
                                            placeholder="Enter code"
                                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white uppercase"
                                        />
                                        <button
                                            onClick={validateCoupon}
                                            disabled={isValidatingCoupon}
                                            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                                        >
                                            {isValidatingCoupon ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Apply'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Price summary */}
                            {appliedCoupon && (
                                <div className="mb-6 max-w-md mx-auto space-y-2 text-sm">
                                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                        <span>Original Price:</span>
                                        <span>EGP {plans.find(p => p.id === selectedPlan)?.price}</span>
                                    </div>
                                    <div className="flex justify-between text-green-600 dark:text-green-400">
                                        <span>Discount:</span>
                                        <span>- EGP {(plans.find(p => p.id === selectedPlan)?.price || 0) - calculateFinalPrice(plans.find(p => p.id === selectedPlan)?.price || 0)}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-lg text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-2">
                                        <span>Final Price:</span>
                                        <span>{calculateFinalPrice(plans.find(p => p.id === selectedPlan)?.price || 0) === 0 ? 'FREE' : `EGP ${calculateFinalPrice(plans.find(p => p.id === selectedPlan)?.price || 0)}`}</span>
                                    </div>
                                </div>
                            )}

                            {/* Action button */}
                            <button
                                onClick={handlePayment}
                                disabled={isProcessing}
                                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50 flex items-center justify-center"
                            >
                                {isProcessing ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Processing...</> : 'Proceed to Payment'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Features grid */}
                <div className="mt-24">
                    <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">Why top educators choose Durrah</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
                                <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Lightning Fast</h3>
                            <p className="text-gray-500 dark:text-gray-400">Create exams in minutes with our AI-powered tools and intuitive editor.</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4">
                                <Shield className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Anti-Cheating</h3>
                            <p className="text-gray-500 dark:text-gray-400">Advanced proctoring features including tab-switch detection and fullscreen enforcement.</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center mb-4">
                                <Layout className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Beautiful Interface</h3>
                            <p className="text-gray-500 dark:text-gray-400">A clean, distraction-free experience for both you and your students.</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

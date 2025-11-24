import { useState } from 'react';
import { Check, CreditCard, Shield, Zap, Layout } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';

export default function Checkout() {
    const navigate = useNavigate();
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

    const plans = [
        {
            id: 'basic',
            name: 'Starter',
            price: billingCycle === 'monthly' ? 0 : 0,
            description: 'Perfect for trying out Durrah Exams',
            features: [
                'Up to 3 exams',
                'Basic analytics',
                'Email support',
                '100 students per exam'
            ],
            recommended: false
        },
        {
            id: 'pro',
            name: 'Professional',
            price: billingCycle === 'monthly' ? 29 : 290,
            description: 'For serious tutors and small institutions',
            features: [
                'Unlimited exams',
                'Advanced analytics & Insights',
                'Priority support',
                'Unlimited students',
                'AI Question Generation',
                'Email Access Control'
            ],
            recommended: true
        },
        {
            id: 'enterprise',
            name: 'Institution',
            price: billingCycle === 'monthly' ? 99 : 990,
            description: 'Full control for large organizations',
            features: [
                'Everything in Professional',
                'Custom branding',
                'SSO Integration',
                'Dedicated account manager',
                'API Access',
                '99.9% SLA'
            ],
            recommended: false
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center cursor-pointer" onClick={() => navigate('/dashboard')}>
                        <Logo className="h-8 w-8 text-indigo-600" />
                        <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">Durrah Exams</span>
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

                {/* Billing Toggle */}
                <div className="flex justify-center mb-12">
                    <div className="bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 inline-flex relative">
                        <div className="w-full h-full absolute inset-0 flex items-center justify-center pointer-events-none">
                            {/* Animated background could go here */}
                        </div>
                        <button
                            onClick={() => setBillingCycle('monthly')}
                            className={`relative z-10 px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${billingCycle === 'monthly'
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setBillingCycle('yearly')}
                            className={`relative z-10 px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center ${billingCycle === 'yearly'
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            Yearly
                            <span className="ml-2 bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                                Save 20%
                            </span>
                        </button>
                    </div>
                </div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl border ${selectedPlan === plan.id
                                ? 'border-indigo-600 ring-2 ring-indigo-600 ring-opacity-50'
                                : plan.recommended
                                    ? 'border-indigo-200 dark:border-indigo-900'
                                    : 'border-gray-200 dark:border-gray-700'
                                } flex flex-col`}
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
                                        ${plan.price}
                                    </span>
                                    <span className="ml-2 text-gray-500 dark:text-gray-400">
                                        /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                                    </span>
                                </div>

                                <ul className="space-y-4 mb-8">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start">
                                            <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                                            <span className="text-sm text-gray-600 dark:text-gray-300">{feature}</span>
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
                                            : 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'
                                        }`}
                                >
                                    {selectedPlan === plan.id ? 'Selected' : 'Choose ' + plan.name}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Checkout Section (Placeholder for now) */}
                {selectedPlan && selectedPlan !== 'basic' && (
                    <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in-up">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                                <CreditCard className="h-5 w-5 mr-2 text-indigo-600" />
                                Secure Checkout
                            </h3>
                            <div className="flex space-x-2">
                                {/* Payment Icons Placeholder */}
                                <div className="h-6 w-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                <div className="h-6 w-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                <div className="h-6 w-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            </div>
                        </div>
                        <div className="p-8">
                            <div className="text-center py-8">
                                <div className="bg-indigo-50 dark:bg-indigo-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Shield className="h-8 w-8 text-indigo-600" />
                                </div>
                                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                    Payment Portal Integration
                                </h4>
                                <p className="text-gray-500 dark:text-gray-400 mb-6">
                                    This is where the payment form (Stripe/PayPal) will be integrated.
                                    <br />
                                    Selected Plan: <span className="font-semibold text-indigo-600">{plans.find(p => p.id === selectedPlan)?.name}</span> ({billingCycle})
                                </p>
                                <button className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none">
                                    Proceed to Payment
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Features Grid */}
                <div className="mt-24">
                    <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
                        Why top educators choose Durrah
                    </h2>
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

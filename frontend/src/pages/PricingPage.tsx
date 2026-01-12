import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Award, Loader2 } from 'lucide-react';
import { Logo } from '../components/Logo';
import { useCurrency } from '../hooks/useCurrency';
import { useAuth } from '../context/AuthContext';

export default function PricingPage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    // Currency hooks
    const { price: monthlyPrice, currency: currencyCode, isLoading: isCurrencyLoading } = useCurrency(250);
    const { price: yearlyPrice } = useCurrency(2500);

    const handleGetStarted = () => {
        if (user) {
            navigate('/dashboard');
        } else {
            navigate('/register');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
                        <Logo className="h-8 w-8 text-indigo-600" showText={false} />
                        <div className="ml-2 flex items-baseline">
                            <span className="text-2xl font-bold text-indigo-600">Durrah</span>
                            <span className="ml-1.5 text-2xl font-light text-gray-500 dark:text-gray-300">for Tutors</span>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white text-sm font-medium"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-full px-4 py-2 mb-4">
                        <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Simple Pricing</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">Choose the Right Plan for You</h1>
                    <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        Start for free, upgrade when you need to. No hidden fees.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {/* Starter Plan */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg border border-gray-200 dark:border-slate-700 p-8 flex flex-col">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Starter</h3>
                        <div className="mb-6"><span className="text-5xl font-bold text-gray-900 dark:text-white">Free</span></div>
                        <ul className="space-y-4 mb-8 flex-1">
                            <li className="flex items-start"><Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" /><span className="text-gray-600 dark:text-gray-300">Up to 3 active exams</span></li>
                            <li className="flex items-start"><Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" /><span className="text-gray-600 dark:text-gray-300">50 students per month</span></li>
                            <li className="flex items-start"><Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" /><span className="text-gray-600 dark:text-gray-300">Basic analytics</span></li>
                        </ul>
                        <button onClick={handleGetStarted} className="block w-full text-center bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white py-3 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition">Get Started</button>
                    </div>

                    {/* Pro Plan */}
                    <div className="relative bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 rounded-3xl shadow-2xl p-8 transform md:scale-105 transition-transform duration-300 flex flex-col">
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-gray-900 px-4 py-1 rounded-full font-bold text-sm shadow-lg">Most Popular</div>
                        <h3 className="text-2xl font-bold text-white mb-2">Professional</h3>
                        <div className="mb-6">
                            {isCurrencyLoading ? (
                                <Loader2 className="w-8 h-8 text-white animate-spin" />
                            ) : (
                                <span className="text-5xl font-bold text-white">{currencyCode} {monthlyPrice}</span>
                            )}
                            <span className="text-indigo-100">/month</span>
                        </div>
                        <ul className="space-y-4 mb-8 flex-1">
                            <li className="flex items-start"><Check className="h-6 w-6 text-white mr-3 flex-shrink-0" /><span className="text-white/90">Unlimited active exams</span></li>
                            <li className="flex items-start"><Check className="h-6 w-6 text-white mr-3 flex-shrink-0" /><span className="text-white/90">Unlimited students & attempts</span></li>
                            <li className="flex items-start"><Check className="h-6 w-6 text-white mr-3 flex-shrink-0" /><span className="text-white/90">Advanced anti-cheating AI</span></li>
                            <li className="flex items-start"><Check className="h-6 w-6 text-white mr-3 flex-shrink-0" /><span className="text-white/90">Priority support</span></li>
                        </ul>
                        <button onClick={handleGetStarted} className="block w-full text-center bg-white text-indigo-600 py-3 rounded-xl font-semibold hover:bg-indigo-50 transition shadow-lg">Get Professional</button>
                    </div>

                    {/* Yearly Plan */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg border-2 border-indigo-200 dark:border-indigo-800 p-8 flex flex-col">
                        <div className="inline-block bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full font-semibold text-sm mb-4 self-start">Save 20%</div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Yearly</h3>
                        <div className="mb-6">
                            {isCurrencyLoading ? (
                                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                            ) : (
                                <span className="text-5xl font-bold text-gray-900 dark:text-white">{currencyCode} {yearlyPrice}</span>
                            )}
                            <span className="text-gray-600 dark:text-gray-400">/year</span>
                        </div>
                        <ul className="space-y-4 mb-8 flex-1">
                            <li className="flex items-start"><Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" /><span className="text-gray-600 dark:text-gray-300">All Professional features</span></li>
                            <li className="flex items-start"><Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" /><span className="text-gray-600 dark:text-gray-300">2 months free</span></li>
                            <li className="flex items-start"><Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" /><span className="text-gray-600 dark:text-gray-300">Detailed performance reports</span></li>
                        </ul>
                        <button onClick={handleGetStarted} className="block w-full text-center bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition">Get Yearly</button>
                    </div>
                </div>

                <div className="mt-16 text-center">
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Have questions about our plans?
                    </p>
                    <a href="mailto:abdelrahmansandoby@gmail.com" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
                        Contact Sales
                    </a>
                </div>
            </main>
        </div>
    );
}

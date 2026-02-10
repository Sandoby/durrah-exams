import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function TrialWelcomeModal() {
    const { user, isTrialing } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        // Show only once for trialing users
        if (isTrialing && user) {
            const key = `trial_welcome_shown_${user.id}`;
            const hasShown = localStorage.getItem(key);
            if (!hasShown) {
                setIsOpen(true);
                setTimeout(() => setIsAnimating(true), 100);
            }
        }
    }, [isTrialing, user]);

    const handleClose = () => {
        if (user) {
            localStorage.setItem(`trial_welcome_shown_${user.id}`, 'true');
        }
        setIsAnimating(false);
        setTimeout(() => setIsOpen(false), 300);
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className={`fixed inset-0 bg-black/40 z-50 transition-opacity duration-500 ${
                    isAnimating ? 'opacity-100' : 'opacity-0'
                }`}
                onClick={handleClose}
            ></div>

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
                <div
                    className={`relative w-full max-w-2xl pointer-events-auto transition-all duration-500 ease-out ${
                        isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div
                        className="relative bg-white dark:bg-gray-950 rounded-[32px] overflow-hidden"
                        style={{
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                        }}
                    >
                        {/* Close button */}
                        <button
                            onClick={handleClose}
                            className="absolute top-5 right-5 z-10 w-9 h-9 rounded-full bg-gray-100/90 dark:bg-gray-800/90 hover:bg-gray-200/90 dark:hover:bg-gray-700/90 flex items-center justify-center transition-all duration-200 backdrop-blur-sm"
                        >
                            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </button>

                        {/* Content */}
                        <div className="px-12 py-16 text-center">
                            {/* Badge */}
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-full mb-6">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                                    14-Day Free Trial Activated
                                </span>
                            </div>

                            {/* Heading */}
                            <h2
                                className="text-[40px] font-semibold text-gray-900 dark:text-white mb-4 tracking-tight leading-tight"
                                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
                            >
                                Welcome to Premium
                            </h2>
                            <p className="text-[17px] text-gray-600 dark:text-gray-400 mb-10 max-w-md mx-auto leading-relaxed">
                                You now have full access to all premium features. No payment required.
                            </p>

                            {/* Features Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10 max-w-lg mx-auto">
                                {[
                                    'Unlimited exam creation',
                                    'Advanced analytics & insights',
                                    'Live proctoring & monitoring',
                                    'Anti-cheat protection',
                                    'Email whitelisting',
                                    'Priority support'
                                ].map((feature, idx) => (
                                    <div key={idx} className="flex items-center gap-3 text-left">
                                        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                                            <Check className="w-3 h-3 text-white" strokeWidth={3} />
                                        </div>
                                        <span className="text-[15px] text-gray-700 dark:text-gray-300">
                                            {feature}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* CTA Button */}
                            <button
                                onClick={handleClose}
                                className="w-full max-w-xs mx-auto h-12 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-medium text-[15px] transition-all duration-200 flex items-center justify-center"
                                style={{
                                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                                }}
                            >
                                Start Exploring
                            </button>

                            {/* Footer note */}
                            <p className="mt-6 text-[13px] text-gray-500 dark:text-gray-500">
                                Your trial will automatically end in 14 days
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

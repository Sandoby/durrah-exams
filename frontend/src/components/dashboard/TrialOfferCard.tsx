import { useState, useEffect } from 'react';
import { X, Loader2, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

interface TrialOfferCardProps {
    isVisible: boolean;
}

export function TrialOfferCard({ isVisible }: TrialOfferCardProps) {
    const { user } = useAuth();
    const [isActivating, setIsActivating] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isEligible, setIsEligible] = useState(true);

    useEffect(() => {
        if (!user) return;

        // Double-check trial eligibility from database
        const checkEligibility = async () => {
            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('trial_activated, subscription_status')
                    .eq('id', user.id)
                    .single();

                // Not eligible if trial was already activated
                if (profile?.trial_activated === true) {
                    setIsEligible(false);
                    return;
                }

                // Not eligible if user already has or had a subscription
                // (active, trialing, cancelled, payment_failed, expired all indicate user already engaged with paid features)
                if (profile?.subscription_status && profile.subscription_status !== null) {
                    setIsEligible(false);
                    return;
                }

                // Check if user has any payment history (meaning they subscribed before)
                const { data: payments, error: paymentsError } = await supabase
                    .from('payments')
                    .select('id')
                    .eq('user_id', user.id)
                    .limit(1);

                if (!paymentsError && payments && payments.length > 0) {
                    setIsEligible(false);
                    return;
                }
            } catch (error) {
                console.error('Failed to check trial eligibility:', error);
                setIsEligible(false); // Fail closed - don't show offer if check fails
            }
        };

        checkEligibility();

        // Check if user has dismissed this overlay
        const dismissKey = `trial_offer_dismissed_${user.id}`;
        const dismissed = localStorage.getItem(dismissKey);

        if (dismissed) {
            setIsDismissed(true);
        } else if (isVisible) {
            // Delay animation slightly for smooth entrance
            setTimeout(() => setIsAnimating(true), 100);
        }
    }, [user, isVisible]);

    const handleDismiss = () => {
        if (!user) return;

        setIsAnimating(false);
        setTimeout(() => {
            setIsDismissed(true);
            localStorage.setItem(`trial_offer_dismissed_${user.id}`, 'true');
        }, 300);
    };

    const handleActivateTrial = async () => {
        if (!user) return;

        setIsActivating(true);
        try {
            const { data: result, error } = await supabase.rpc('activate_trial', {
                p_user_id: user.id
            });

            if (error) throw error;

            if (result?.success) {
                toast.success('Your 14-day free trial has started!');
                window.location.reload();
            } else {
                toast.error(result?.error || 'You are not eligible for a trial');
            }
        } catch (error: any) {
            console.error('Trial activation error:', error);
            toast.error('Failed to activate trial. Please try again.');
        } finally {
            setIsActivating(false);
        }
    };

    // Don't render if dismissed, not visible, or not eligible
    if (isDismissed || !isVisible || !isEligible) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/10 z-30 transition-opacity duration-500 ${
                    isAnimating ? 'opacity-100' : 'opacity-0'
                }`}
                onClick={handleDismiss}
            />

            {/* Overlay Card */}
            <div
                className={`fixed bottom-8 right-8 w-full max-w-md z-40 transition-all duration-500 ease-out ${
                    isAnimating ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'
                }`}
                style={{ maxWidth: '400px' }}
            >
                <div
                    className="relative bg-white dark:bg-gray-950 rounded-[28px] overflow-hidden"
                    style={{
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                    }}
                >
                    {/* Close Button */}
                    <button
                        onClick={handleDismiss}
                        className="absolute top-5 right-5 z-10 w-8 h-8 rounded-full bg-gray-100/90 dark:bg-gray-800/90 hover:bg-gray-200/90 dark:hover:bg-gray-700/90 flex items-center justify-center transition-all duration-200 backdrop-blur-sm"
                        aria-label="Dismiss"
                    >
                        <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>

                    {/* Content */}
                    <div className="px-9 pt-10 pb-8">
                        {/* Heading */}
                        <h3
                            className="text-[28px] font-semibold text-gray-900 dark:text-white mb-2 tracking-tight"
                            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
                        >
                            Try Premium Free
                        </h3>
                        <p className="text-[15px] text-gray-600 dark:text-gray-400 mb-7 leading-relaxed font-normal">
                            Experience all features for 14 days.<br />
                            No payment required.
                        </p>

                        {/* Features */}
                        <div className="space-y-3.5 mb-8">
                            {[
                                'Unlimited exams and live proctoring',
                                'Advanced analytics and insights'
                            ].map((feature, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                                    </div>
                                    <span className="text-[15px] text-gray-700 dark:text-gray-300 font-normal">
                                        {feature}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* CTA Button */}
                        <button
                            onClick={handleActivateTrial}
                            disabled={isActivating}
                            className="w-full h-12 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-xl font-medium text-[15px] transition-all duration-200 flex items-center justify-center gap-2"
                            style={{
                                boxShadow: isActivating ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.1)',
                            }}
                        >
                            {isActivating ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Starting trial...</span>
                                </>
                            ) : (
                                <span>Start Free Trial</span>
                            )}
                        </button>

                        {/* Footer note */}
                        <p className="mt-4 text-center text-[13px] text-gray-500 dark:text-gray-500 font-normal">
                            Cancel anytime during the trial period
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}

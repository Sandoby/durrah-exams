import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { openDodoPortalSession } from '../../lib/dodoPortal';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';

interface PremiumFeatureModalProps {
    isOpen: boolean;
    onClose: () => void;
    feature: 'analytics' | 'proctoring';
}

export function PremiumFeatureModal({ isOpen, onClose, feature }: PremiumFeatureModalProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { subscriptionStatus, user } = useAuth();
    const [isTrialEligible, setIsTrialEligible] = useState(false);
    const [isActivating, setIsActivating] = useState(false);

    useEffect(() => {
        const checkEligibility = async () => {
            if (!user || subscriptionStatus === 'active' || subscriptionStatus === 'trialing') {
                setIsTrialEligible(false);
                return;
            }

            try {
                const { data: eligible } = await supabase.rpc('check_trial_eligibility', {
                    p_user_id: user.id
                });
                setIsTrialEligible(!!eligible);
            } catch (error) {
                console.error('Trial eligibility check failed:', error);
                setIsTrialEligible(false);
            }
        };

        if (isOpen) {
            checkEligibility();
        }
    }, [isOpen, user, subscriptionStatus]);

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
                // Close the modal — AuthContext realtime listener will update
                // subscriptionStatus automatically via the Supabase channel.
                onClose();
            } else {
                toast.error(result?.error || 'Failed to activate trial');
            }
        } catch (error: any) {
            console.error('Trial activation error:', error);
            toast.error('Failed to activate trial. Please try again.');
        } finally {
            setIsActivating(false);
        }
    };

    if (!isOpen) return null;

    const content = {
        analytics: {
            title: t('premiumModal.analytics.title', 'Advanced Exam Analytics'),
            desc: t('premiumModal.analytics.desc', 'Get deep insights into student performance, question difficulty, and time distribution.'),
            benefits: [
                t('premiumModal.analytics.benefit1', 'Detailed performance reports'),
                t('premiumModal.analytics.benefit2', 'Question-by-question analysis'),
                t('premiumModal.analytics.benefit3', 'Exportable data for records')
            ]
        },
        proctoring: {
            title: t('premiumModal.proctoring.title', 'Live AI Proctoring'),
            desc: t('premiumModal.proctoring.desc', 'Monitor your exams in real-time with AI-powered tab detection and anti-cheat measures.'),
            benefits: [
                t('premiumModal.proctoring.benefit1', 'Real-time student monitoring'),
                t('premiumModal.proctoring.benefit2', 'Instant violation alerts'),
                t('premiumModal.proctoring.benefit3', 'Secure browser enforcement')
            ]
        }
    };

    const activeContent = content[feature];

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 z-50 transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
                <div
                    className="relative w-full max-w-md pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div
                        className="relative bg-white dark:bg-gray-950 rounded-[28px] overflow-hidden"
                        style={{
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                        }}
                    >
                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute top-5 right-5 z-10 w-8 h-8 rounded-full bg-gray-100/90 dark:bg-gray-800/90 hover:bg-gray-200/90 dark:hover:bg-gray-700/90 flex items-center justify-center transition-all duration-200 backdrop-blur-sm"
                            aria-label="Close"
                        >
                            <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>

                        {/* Content */}
                        <div className="px-9 py-12 text-center">
                            {/* Premium badge */}
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-full mb-6">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                                    Premium Feature
                                </span>
                            </div>

                            {/* Title */}
                            <h2
                                className="text-[28px] font-semibold text-gray-900 dark:text-white mb-3 tracking-tight"
                                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
                            >
                                {activeContent.title}
                            </h2>

                            {/* Description */}
                            <p className="text-[15px] text-gray-600 dark:text-gray-400 mb-8 leading-relaxed font-normal">
                                {activeContent.desc}
                            </p>

                            {/* Benefits list */}
                            <div className="space-y-3 mb-8 text-left">
                                {activeContent.benefits.map((benefit, idx) => (
                                    <div key={idx} className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                                            <Check className="w-3 h-3 text-white" strokeWidth={3} />
                                        </div>
                                        <span className="text-[15px] text-gray-700 dark:text-gray-300 font-normal">
                                            {benefit}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* CTA Buttons */}
                            <div className="space-y-3">
                                {isTrialEligible ? (
                                    <>
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
                                                <span>Start 14-Day Free Trial</span>
                                            )}
                                        </button>
                                        <p className="text-[13px] text-gray-500 dark:text-gray-400 font-normal">
                                            No credit card required • Full premium access
                                        </p>
                                    </>
                                ) : (
                                    <button
                                        onClick={async () => {
                                            if (subscriptionStatus === 'payment_failed' || subscriptionStatus === 'on_hold') {
                                                const result = await openDodoPortalSession();
                                                if (!result.success) {
                                                    toast.error(result.error || 'Failed to open payment portal');
                                                    navigate('/settings');
                                                }
                                            } else {
                                                navigate('/checkout');
                                            }
                                            onClose();
                                        }}
                                        className="w-full h-12 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-medium text-[15px] transition-all duration-200 flex items-center justify-center gap-2"
                                        style={{
                                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                                        }}
                                    >
                                        <span>
                                            {subscriptionStatus === 'expired'
                                                ? 'Resubscribe to Regain Access'
                                                : 'Upgrade Now'}
                                        </span>
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                )}

                                <button
                                    onClick={onClose}
                                    className="w-full h-10 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium text-[14px] transition-colors"
                                >
                                    {t('premiumModal.cancelBtn', 'Maybe Later')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

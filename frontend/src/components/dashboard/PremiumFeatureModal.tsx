import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { X, Crown, ArrowRight, CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
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
                window.location.reload();
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
            image: '/illustrations/analytics-premium.png',
            color: 'from-purple-600 to-pink-600',
            accent: 'text-purple-600',
            bgAccent: 'bg-purple-50 dark:bg-purple-900/20',
            benefits: [
                t('premiumModal.analytics.benefit1', 'Detailed performance reports'),
                t('premiumModal.analytics.benefit2', 'Question-by-question analysis'),
                t('premiumModal.analytics.benefit3', 'Exportable data for records')
            ]
        },
        proctoring: {
            title: t('premiumModal.proctoring.title', 'Live AI Proctoring'),
            desc: t('premiumModal.proctoring.desc', 'Monitor your exams in real-time with AI-powered tab detection and anti-cheat measures.'),
            image: '/illustrations/proctoring-premium.png',
            color: 'from-teal-600 to-cyan-600',
            accent: 'text-teal-600',
            bgAccent: 'bg-teal-50 dark:bg-teal-900/20',
            benefits: [
                t('premiumModal.proctoring.benefit1', 'Real-time student monitoring'),
                t('premiumModal.proctoring.benefit2', 'Instant violation alerts'),
                t('premiumModal.proctoring.benefit3', 'Secure browser enforcement')
            ]
        }
    };

    const activeContent = content[feature];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-white/20 dark:border-slate-800 animate-in zoom-in-95 duration-300 flex flex-col md:flex-row">
                {/* Illustration Section */}
                <div className={`md:w-1/2 bg-gradient-to-br ${activeContent.color} p-8 flex flex-col items-center justify-center relative overflow-hidden`}>
                    <div className="relative z-10 w-full aspect-square rounded-3xl overflow-hidden shadow-2xl border border-white/20 group">
                        <img
                            src={activeContent.image}
                            alt={activeContent.title}
                            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                    </div>

                    {/* Floating Badge */}
                    <div className="absolute top-6 left-6 z-20">
                        <div className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-2xl px-4 py-2 flex items-center gap-2 shadow-lg">
                            <Crown className="w-4 h-4 text-white" />
                            <span className="text-white text-[10px] font-black uppercase tracking-widest">Premium</span>
                        </div>
                    </div>

                    {/* Decorative Blobs */}
                    <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute -top-20 -left-20 w-64 h-64 bg-black/10 rounded-full blur-3xl animate-pulse delay-700"></div>
                </div>

                {/* Content Section */}
                <div className="md:w-1/2 p-10 flex flex-col justify-between bg-white dark:bg-slate-900">
                    <div>
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white leading-tight tracking-tight">
                                {activeContent.title}
                            </h3>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <p className="text-slate-600 dark:text-slate-400 text-base font-medium mb-8 leading-relaxed">
                            {activeContent.desc}
                        </p>

                        <div className="space-y-4 mb-10">
                            {activeContent.benefits.map((benefit, idx) => (
                                <div key={idx} className="flex items-center gap-3 group">
                                    <div className={`flex-shrink-0 w-6 h-6 rounded-full ${activeContent.bgAccent} flex items-center justify-center transition-transform group-hover:scale-110`}>
                                        <CheckCircle2 className={`w-4 h-4 ${activeContent.accent}`} />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{benefit}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        {isTrialEligible ? (
                            <>
                                <button
                                    onClick={handleActivateTrial}
                                    disabled={isActivating}
                                    className={`w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-500/20 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 group`}
                                >
                                    {isActivating ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Activating Trial...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-5 h-5" />
                                            Start 14-Day Free Trial
                                        </>
                                    )}
                                </button>
                                <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                                    No credit card required • Full premium access
                                </p>
                            </>
                        ) : (
                            <button
                                onClick={async () => {
                                    if (subscriptionStatus === 'payment_failed') {
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
                                className={`w-full py-4 px-6 bg-gradient-to-r ${activeContent.color} text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-500/20 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 group`}
                            >
                                {t('premiumModal.upgradeBtn', 'Upgrade Now')}
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="w-full py-3 px-6 text-slate-500 dark:text-slate-400 font-bold hover:text-slate-900 dark:hover:text-slate-100 transition-colors text-sm"
                        >
                            {t('premiumModal.cancelBtn', 'Maybe Later')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

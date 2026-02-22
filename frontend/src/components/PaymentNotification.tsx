import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { X, AlertCircle, CreditCard, ChevronRight, Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import { openDodoPortalSession } from '../lib/dodoPortal';

export const PaymentNotification = () => {
    const { user, subscriptionStatus } = useAuth();
    const navigate = useNavigate();
    const [isVisible, setIsVisible] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [isOpeningPortal, setIsOpeningPortal] = useState(false);

    const handleRecoverSubscription = async () => {
        try {
            setIsOpeningPortal(true);
            const result = await openDodoPortalSession();
            if (!result.success) {
                throw new Error(result.error || 'Failed to open payment portal');
            }
        } catch (error: any) {
            toast.error(error?.message || 'Failed to open payment portal');
            navigate('/settings');
        } finally {
            setIsOpeningPortal(false);
        }
    };

    useEffect(() => {
        if (user && (subscriptionStatus === 'payment_failed' || subscriptionStatus === 'on_hold') && !dismissed) {
            // Show after a small delay for "wow" effect
            const timer = setTimeout(() => setIsVisible(true), 2000);
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
        }
    }, [user, subscriptionStatus, dismissed]);

    if (!isVisible) return null;

    return (
        <div className="fixed top-6 right-6 z-[9999] w-full max-w-[400px] animate-in slide-in-from-right-full fade-in duration-500">
            <div className="relative group">
                {/* Glow effect */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-rose-500 to-orange-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>

                <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="p-4 sm:p-5">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                                <div className="w-12 h-12 bg-rose-50 dark:bg-rose-500/10 rounded-xl flex items-center justify-center border border-rose-100 dark:border-rose-500/20">
                                    <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                                </div>
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <Bell className="w-3.5 h-3.5 text-rose-500" />
                                            System Alert
                                        </p>
                                        <h4 className="text-base font-black text-slate-900 dark:text-white mt-0.5 tracking-tight">
                                            Payment Action Required
                                        </h4>
                                    </div>
                                    <button
                                        onClick={() => setDismissed(true)}
                                        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                                    Your recurring payment failed and your subscription is on hold. Update your payment method to restore Pro access.
                                </p>

                                <div className="mt-4 flex flex-col gap-2">
                                    <button
                                        onClick={handleRecoverSubscription}
                                        disabled={isOpeningPortal}
                                        className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-60"
                                    >
                                        <CreditCard className="w-4 h-4" />
                                        {isOpeningPortal ? 'Opening Portal...' : 'Update Payment'}
                                        <ChevronRight className="w-4 h-4 ml-auto" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Progress/Status line */}
                    <div className="h-1 w-full bg-slate-100 dark:bg-slate-800">
                        <div className="h-full bg-rose-500 animate-progress"></div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes progress {
                    0% { width: 0%; }
                    100% { width: 100%; }
                }
                .animate-progress {
                    animation: progress 2s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

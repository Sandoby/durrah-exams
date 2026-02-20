import { AlertTriangle, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { openDodoPortalSession } from '../../lib/dodoPortal';
import toast from 'react-hot-toast';

interface PaymentFailedBannerProps {
    subscriptionEndDate?: string | null;
}

export function PaymentFailedBanner({ subscriptionEndDate }: PaymentFailedBannerProps) {
    const navigate = useNavigate();

    const handleUpdatePayment = async () => {
        const result = await openDodoPortalSession();
        if (!result.success) {
            toast.error(result.error || 'Failed to open payment portal');
            navigate('/settings');
        }
    };

    const endDate = subscriptionEndDate ? new Date(subscriptionEndDate) : null;
    const daysRemaining = endDate ? Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;

    return (
        <div
            className="relative bg-white dark:bg-gray-950 rounded-[28px] overflow-hidden border-2 border-red-200 dark:border-red-800"
            style={{
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)',
            }}
        >
            <div className="px-8 py-6">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-500" />
                    </div>
                    <div className="flex-1">
                        <h3
                            className="text-[17px] font-semibold text-gray-900 dark:text-white mb-2"
                            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
                        >
                            Payment Failed — Action Required
                        </h3>
                        <p className="text-[14px] text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                            We couldn't process your subscription payment. Please update your payment method to avoid service interruption.
                            {daysRemaining > 0 && (
                                <span className="block mt-1 font-medium text-red-600 dark:text-red-400">
                                    Premium access expires in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
                                </span>
                            )}
                        </p>
                        <button
                            onClick={handleUpdatePayment}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl font-medium text-[14px] transition-all duration-200 shadow-sm"
                        >
                            <CreditCard className="w-4 h-4" />
                            Update Payment Method
                        </button>
                    </div>
                </div>
            </div>

            {/* Progress bar showing urgency */}
            {daysRemaining > 0 && (
                <div className="px-8 pb-6">
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-red-500 rounded-full transition-all duration-1000"
                            style={{ width: `${Math.min((daysRemaining / 30) * 100, 100)}%` }}
                        ></div>
                    </div>
                </div>
            )}
        </div>
    );
}

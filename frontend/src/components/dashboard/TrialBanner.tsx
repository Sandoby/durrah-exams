import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { daysRemaining } from '../../lib/subscriptionUtils';

interface TrialBannerProps {
    trialEndsAt: string | null;
    subscriptionStatus: string | null | undefined;
}

export function TrialBanner({ trialEndsAt, subscriptionStatus }: TrialBannerProps) {
    const days = daysRemaining(trialEndsAt);

    // Only show the trial banner for users genuinely on a trial
    if (subscriptionStatus !== 'trialing') return null;
    if (!trialEndsAt || days <= 0) return null;

    const isUrgent = days <= 3;

    return (
        <div
            className="relative bg-white dark:bg-gray-950 rounded-[28px] overflow-hidden border border-gray-200 dark:border-gray-800"
            style={{
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            }}
        >
            <div className="px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Left: Trial status */}
                <div className="flex items-center gap-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                    <div>
                        <h3
                            className="text-[17px] font-semibold text-gray-900 dark:text-white"
                            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
                        >
                            Your free trial is active
                        </h3>
                        <p className="text-[13px] text-gray-600 dark:text-gray-400 font-normal">
                            Full premium access, no payment required
                        </p>
                    </div>
                </div>

                {/* Right: Countdown and CTA */}
                <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-center px-4">
                        <div
                            className={`text-[40px] font-semibold ${isUrgent ? 'text-red-600 dark:text-red-500' : 'text-gray-900 dark:text-white'}`}
                            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', lineHeight: '1' }}
                        >
                            {days}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide mt-1">
                            {days === 1 ? 'Day Left' : 'Days Left'}
                        </div>
                    </div>
                    <Link
                        to="/checkout"
                        className="h-10 px-5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-medium text-[14px] transition-all duration-200 flex items-center justify-center gap-2"
                        style={{
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                        }}
                    >
                        Subscribe Now
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </div>
    );
}

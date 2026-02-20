import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { daysRemaining } from '../../lib/subscriptionUtils';

interface GracePeriodBannerProps {
    subscriptionStatus: string | null | undefined;
    trialGraceEndsAt?: string | null;
    /** Total grace period days; used for the progress bar. Defaults to 3. */
    gracePeriodDays?: number;
}

export function GracePeriodBanner({ subscriptionStatus, trialGraceEndsAt, gracePeriodDays = 3 }: GracePeriodBannerProps) {
    // Only show if status is expired and grace period hasn't ended yet
    if (subscriptionStatus !== 'expired' || !trialGraceEndsAt) return null;

    const daysLeft = daysRemaining(trialGraceEndsAt);

    if (daysLeft <= 0) return null;

    return (
        <div
            className="relative bg-white dark:bg-gray-950 rounded-[28px] overflow-hidden border-2 border-orange-200 dark:border-orange-800"
            style={{
                boxShadow: '0 4px 12px rgba(251, 146, 60, 0.15)',
            }}
        >
            <div className="px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Left: Warning status */}
                <div className="flex items-center gap-4">
                    <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0 animate-pulse"></div>
                    <div>
                        <h3
                            className="text-[17px] font-semibold text-gray-900 dark:text-white"
                            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
                        >
                            Trial ended — {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left to subscribe
                        </h3>
                        <p className="text-[13px] text-gray-600 dark:text-gray-400 font-normal">
                            Your premium features will be removed after the grace period ends
                        </p>
                    </div>
                </div>

                {/* Right: Countdown and urgent CTA */}
                <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-center px-4">
                        <div
                            className="text-[40px] font-semibold text-orange-600 dark:text-orange-500"
                            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', lineHeight: '1' }}
                        >
                            {daysLeft}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide mt-1">
                            {daysLeft === 1 ? 'Day Left' : 'Days Left'}
                        </div>
                    </div>
                    <Link
                        to="/checkout"
                        className="h-10 px-5 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white rounded-xl font-medium text-[14px] transition-all duration-200 flex items-center justify-center gap-2"
                        style={{
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                        }}
                    >
                        Subscribe Now
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>

            {/* Progress bar showing time left */}
            <div className="px-8 pb-6">
                <div className="h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-orange-500 rounded-full transition-all duration-1000"
                        style={{ width: `${Math.min((daysLeft / gracePeriodDays) * 100, 100)}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
}

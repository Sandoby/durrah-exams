import { Link } from 'react-router-dom';
import { Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { daysRemaining } from '../../lib/subscriptionUtils';

interface GracePeriodBannerProps {
    subscriptionStatus: string | null | undefined;
    trialGraceEndsAt?: string | null;
}

export function GracePeriodBanner({ subscriptionStatus, trialGraceEndsAt }: GracePeriodBannerProps) {
    // Only show if status is expired and grace period hasn't ended yet
    if (subscriptionStatus !== 'expired' || !trialGraceEndsAt) return null;

    const daysLeft = daysRemaining(trialGraceEndsAt);

    if (daysLeft <= 0) return null;

    return (
        <div className="relative overflow-hidden rounded-3xl border-2 border-amber-300 dark:border-amber-700 bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-amber-950/30 dark:via-orange-950/30 dark:to-red-950/30 backdrop-blur-xl shadow-xl p-6">
            {/* Warning stripes pattern */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                    backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 10px, currentColor 10px, currentColor 20px)',
                    color: '#f59e0b'
                }}></div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
                {/* Left: Warning status */}
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-amber-500 rounded-2xl blur-lg opacity-50 animate-pulse"></div>
                        <div className="relative p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg">
                            <AlertTriangle className="w-6 h-6 text-white" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100 flex items-center gap-2">
                            <Clock className="w-5 h-5" />
                            Trial ended — {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left to subscribe
                        </h3>
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                            Your premium features will be removed after the grace period ends
                        </p>
                    </div>
                </div>

                {/* Right: Countdown and urgent CTA */}
                <div className="flex items-center gap-4">
                    <div className="text-center px-4 py-2 bg-white/50 dark:bg-black/20 rounded-xl border border-amber-200 dark:border-amber-800">
                        <div className="text-4xl font-black text-amber-600 dark:text-amber-400 animate-pulse">
                            {daysLeft}
                        </div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                            {daysLeft === 1 ? 'Day Left' : 'Days Left'}
                        </div>
                    </div>
                    <Link
                        to="/checkout"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all group animate-pulse"
                    >
                        Subscribe Now
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </div>

            {/* Progress bar showing time left */}
            <div className="mt-4 h-2 bg-amber-200 dark:bg-amber-900/50 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-1000"
                    style={{ width: `${(daysLeft / 3) * 100}%` }}
                ></div>
            </div>
        </div>
    );
}

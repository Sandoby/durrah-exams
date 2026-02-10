import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import { daysRemaining } from '../../lib/subscriptionUtils';

interface TrialBannerProps {
    trialEndsAt: string | null;
}

export function TrialBanner({ trialEndsAt }: TrialBannerProps) {
    const days = daysRemaining(trialEndsAt);

    if (!trialEndsAt || days <= 0) return null;

    const isUrgent = days <= 3;

    return (
        <div className={`relative overflow-hidden rounded-3xl border-2 ${isUrgent
            ? 'bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-amber-950/30 dark:via-orange-950/30 dark:to-red-950/30 border-amber-300 dark:border-amber-700'
            : 'bg-gradient-to-br from-indigo-50 via-violet-50 to-purple-50 dark:from-indigo-950/30 dark:via-violet-950/30 dark:to-purple-950/30 border-indigo-200 dark:border-indigo-800'
            } backdrop-blur-xl shadow-xl p-6`}>

            {/* Background decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 rounded-full blur-3xl -z-10"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-white/40 to-transparent dark:from-white/5 rounded-full blur-3xl -z-10"></div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
                {/* Left: Trial status */}
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${isUrgent
                        ? 'bg-amber-500 dark:bg-amber-600'
                        : 'bg-gradient-to-br from-indigo-500 to-violet-500'
                        } shadow-lg`}>
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className={`text-lg font-bold ${isUrgent
                            ? 'text-amber-900 dark:text-amber-100'
                            : 'text-indigo-900 dark:text-indigo-100'
                            }`}>
                            You're on your 14-day free trial
                        </h3>
                        <p className={`text-sm ${isUrgent
                            ? 'text-amber-700 dark:text-amber-300'
                            : 'text-indigo-700 dark:text-indigo-300'
                            }`}>
                            Full premium access, no credit card required
                        </p>
                    </div>
                </div>

                {/* Right: Countdown and CTA */}
                <div className="flex items-center gap-4">
                    <div className="text-center">
                        <div className={`text-5xl font-black ${isUrgent
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-indigo-600 dark:text-indigo-400'
                            } ${isUrgent ? 'animate-pulse' : ''}`}>
                            {days}
                        </div>
                        <div className={`text-xs font-semibold uppercase tracking-wider ${isUrgent
                            ? 'text-amber-700 dark:text-amber-300'
                            : 'text-indigo-700 dark:text-indigo-300'
                            }`}>
                            {days === 1 ? 'Day Left' : 'Days Left'}
                        </div>
                    </div>
                    <Link
                        to="/checkout"
                        className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm ${isUrgent
                            ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white'
                            : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white'
                            } shadow-lg hover:shadow-xl transition-all group`}
                    >
                        Subscribe Now
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </div>
        </div>
    );
}

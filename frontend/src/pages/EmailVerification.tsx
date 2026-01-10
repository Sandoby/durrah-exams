import { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export default function EmailVerification() {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const email = location.state?.email || '';

    useEffect(() => {
        if (countdown > 0) {
            timerRef.current = setTimeout(() => {
                setCountdown(countdown - 1);
            }, 1000);
        } else if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [countdown]);

    const handleCheckStatus = async () => {
        setIsChecking(true);
        try {
            // Try to refresh the session to catch any updates (like email verification)
            const { data: { user }, error } = await supabase.auth.refreshSession();

            // If refresh fails or no user (e.g. no session exists), treat as "needs login"
            if (error || !user) {
                navigate('/login', { state: { email } });
                return;
            }

            if (user.email_confirmed_at) {
                // Verified -> Proceed to dashboard
                toast.success(t('auth.messages.loginSuccess'));
                navigate('/dashboard');
            } else {
                // Session valid but not verified -> Stay and show error
                toast.error(t('auth.messages.emailNotVerified'));
            }
        } catch (error) {
            console.error('Verification check failed:', error);
            navigate('/login', { state: { email } });
        } finally {
            setIsChecking(false);
        }
    };

    const handleResendEmail = async () => {
        if (!email) {
            toast.error(t('auth.messages.verificationResendError'));
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: email,
            });

            if (error) throw error;
            toast.success(t('auth.messages.verificationResent'));
            setCountdown(60);
        } catch (error: any) {
            console.error('Error resending verification email:', error);
            toast.error(t('auth.messages.verificationResendError'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center mb-6">
                    <Logo size="lg" />
                </div>
                <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white">
                    {t('auth.verifyEmail.title')}
                </h2>
                <div className="mt-2 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t('auth.verifyEmail.desc')}
                    </p>
                    <p className="mt-1 font-semibold text-indigo-600 dark:text-indigo-400">
                        {email}
                    </p>
                </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-center mb-6">
                        <div className="h-12 w-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                            <Mail className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <button
                            onClick={handleCheckStatus}
                            disabled={isChecking}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all transform active:scale-95"
                        >
                            {isChecking ? (
                                <>
                                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                                    {t('common.loading')}
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="mr-2 h-5 w-5" />
                                    {t('auth.verifyEmail.checkStatus')}
                                </>
                            )}
                        </button>

                        <button
                            onClick={handleResendEmail}
                            disabled={isLoading || !email || countdown > 0}
                            className="w-full flex justify-center py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                                    {t('auth.verifyEmail.resending')}
                                </>
                            ) : countdown > 0 ? (
                                t('auth.verifyEmail.resendIn', { seconds: countdown })
                            ) : (
                                t('auth.verifyEmail.resend')
                            )}
                        </button>

                        <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 p-4 border border-blue-100 dark:border-blue-800">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <AlertCircle className="h-5 w-5 text-blue-400 dark:text-blue-500" />
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-blue-700 dark:text-blue-300">
                                        {t('auth.verifyEmail.checkSpam').split('**').map((text, i) =>
                                            i % 2 === 1 ? <span key={i} className="font-bold">{text}</span> : text
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-center">
                            <Link
                                to="/login"
                                className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                {t('auth.verifyEmail.backToLogin')}
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        &copy; {new Date().getFullYear()} Durrah Exams. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}

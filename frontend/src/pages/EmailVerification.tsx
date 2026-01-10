import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export default function EmailVerification() {
    const { t } = useTranslation();
    const location = useLocation();
    const [isLoading, setIsLoading] = useState(false);
    const email = location.state?.email || '';

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
                            onClick={handleResendEmail}
                            disabled={isLoading || !email}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                                    {t('auth.verifyEmail.resending')}
                                </>
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

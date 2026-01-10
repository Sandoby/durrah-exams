import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-[100px] -z-10 animate-pulse"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-[100px] -z-10 animate-pulse delay-700"></div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <div className="flex justify-center mb-8">
                    <Logo size="lg" />
                </div>
            </div>

            <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50 py-10 px-6 shadow-2xl shadow-indigo-500/10 sm:rounded-3xl sm:px-12 text-center transform transition-all">
                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse"></div>
                            <div className="relative h-20 w-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-500/20 transform -rotate-6 hover:rotate-0 transition-transform duration-500">
                                <Mail className="h-10 w-10 text-white" />
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-white dark:bg-gray-800 p-1.5 rounded-full shadow-lg border border-gray-100 dark:border-gray-700">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                            </div>
                        </div>
                    </div>

                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
                        {t('auth.verifyEmail.title')}
                    </h2>

                    <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-sm mx-auto leading-relaxed">
                        {t('auth.verifyEmail.desc')}{' '}
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 block mt-1">{email}</span>
                    </p>

                    <div className="space-y-4">
                        <button
                            onClick={handleResendEmail}
                            disabled={isLoading || !email}
                            className="group relative w-full flex justify-center py-4 px-4 border border-transparent rounded-2xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <span className="flex items-center gap-2">
                                {isLoading ? (
                                    <>
                                        <Loader2 className="animate-spin h-5 w-5" />
                                        {t('auth.verifyEmail.resending')}
                                    </>
                                ) : (
                                    <>
                                        <Mail className="h-5 w-5 group-hover:animate-bounce" />
                                        {t('auth.verifyEmail.resend')}
                                    </>
                                )}
                            </span>
                        </button>

                        <div className="py-4 px-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl flex items-start gap-3 text-left">
                            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-800 dark:text-amber-200 font-medium leading-relaxed">
                                {t('auth.verifyEmail.checkSpam').split('**').map((text, i) =>
                                    i % 2 === 1 ? <span key={i} className="font-extrabold underline">{text}</span> : text
                                )}
                            </p>
                        </div>

                        <Link
                            to="/login"
                            className="flex items-center justify-center gap-2 text-sm font-semibold text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors group py-2"
                        >
                            <ArrowLeft className="h-4 w-4 transform group-hover:-translate-x-1 transition-transform" />
                            {t('auth.verifyEmail.backToLogin')}
                        </Link>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                        &copy; 2025 Durrah for Tutors. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}

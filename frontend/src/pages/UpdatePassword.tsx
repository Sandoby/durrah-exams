import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Loader2, AlertCircle, RefreshCcw, Home } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { Logo } from '../components/Logo';
import { useTranslation } from 'react-i18next';

const updatePasswordSchema = z.object({
    password: z.string().min(6, 'auth.validation.passwordMin'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "auth.validation.passwordMatch",
    path: ["confirmPassword"],
});

type UpdatePasswordForm = z.infer<typeof updatePasswordSchema>;

export default function UpdatePassword() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<'validating' | 'ready' | 'error' | 'expired'>('validating');
    const { t } = useTranslation();
    const hasAttemptedExchange = useRef(false);



    useEffect(() => {
        let isMounted = true;
        let authSubscription: { unsubscribe: () => void } | null = null;

        const validateSession = async () => {


            try {
                // 1. Check if we already have a session (might be from a previous attempt)
                const { data: { session: existingSession } } = await supabase.auth.getSession();
                if (existingSession && isMounted) {

                    setStatus('ready');
                    return;
                }

                // 2. Inspect URL for tokens
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const searchParams = new URLSearchParams(window.location.search);

                const accessToken = hashParams.get('access_token');
                const code = searchParams.get('code');
                const errorCode = searchParams.get('error_code') || hashParams.get('error_code');

                if (errorCode) {

                    setStatus('error');
                    return;
                }



                // 3. Handle PKCE explicitly (High priority for native apps)
                if (code && !hasAttemptedExchange.current) {
                    hasAttemptedExchange.current = true;

                    const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

                    if (exchangeError) {

                    } else if (exchangeData.session) {

                        if (isMounted) setStatus('ready');
                        return;
                    }
                }

                // 4. Setup listener for background processing
                const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {

                    if (session && isMounted) {
                        setStatus('ready');
                        subscription.unsubscribe();
                    }
                });
                authSubscription = subscription;

                // 5. Polling fallback (Wait for tokens to hit the client)
                let pollCount = 0;
                const pollInterval = setInterval(async () => {
                    if (!isMounted) {
                        clearInterval(pollInterval);
                        return;
                    }

                    const { data: { session } } = await supabase.auth.getSession();
                    if (session) {

                        setStatus('ready');
                        clearInterval(pollInterval);
                        if (authSubscription) authSubscription.unsubscribe();
                        return;
                    }

                    pollCount++;
                    if (pollCount > 20) { // 10 seconds total

                        clearInterval(pollInterval);
                        if (isMounted) {
                            if (code || accessToken) {
                                setStatus('error');
                            } else {
                                setStatus('expired');
                            }
                        }
                    }
                }, 500);

            } catch (err: any) {

                if (isMounted) setStatus('error');
            }
        };

        validateSession();
        return () => {
            isMounted = false;
            if (authSubscription) authSubscription.unsubscribe();
        };
    }, []);

    const { register, handleSubmit, formState: { errors } } = useForm<UpdatePasswordForm>({
        resolver: zodResolver(updatePasswordSchema),
    });

    const onSubmit = async (data: UpdatePasswordForm) => {
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: data.password,
            });

            if (error) throw error;

            toast.success(t('auth.messages.passwordUpdated'));
            navigate('/dashboard');
        } catch (error: any) {

            toast.error(t('auth.messages.passwordUpdateError'));
        } finally {
            setIsLoading(false);
        }
    };

    if (status === 'validating') {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center items-center p-4">
                <div className="text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Checking reset link...</h2>
                    <p className="text-gray-500 max-w-xs mx-auto">Please wait while we secure your session. This can take a few seconds on mobile.</p>
                </div>
            </div>
        );
    }

    if (status === 'error' || status === 'expired') {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center items-center p-4">
                <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg text-center space-y-6">
                    <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-2">
                        <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {status === 'expired' ? 'Link Missing' : 'Invalid Link'}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        {status === 'expired'
                            ? 'We couldn\'t find a reset token in the URL. If you came from an email, please try opening the link again or copying it directly into your browser.'
                            : 'This reset link has either expired or has already been used. Password reset links are valid for 1 hour and can only be used once.'}
                    </p>
                    <div className="flex flex-col gap-3 pt-4">
                        <button
                            onClick={() => window.location.reload()}
                            className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                        >
                            <RefreshCcw className="h-4 w-4 mr-2" />
                            Try Again
                        </button>
                        <Link
                            to="/forgot-password"
                            className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            Request New Link
                        </Link>
                        <Link to="/" className="text-sm text-indigo-600 hover:text-indigo-500 font-medium inline-flex items-center justify-center mt-2">
                            <Home className="h-4 w-4 mr-2" />
                            Back to Home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <Logo size="lg" />
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
                    {t('auth.updatePassword.title')}
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                    {t('auth.updatePassword.subtitle')}
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('auth.updatePassword.newPasswordLabel')}
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    {...register('password')}
                                    type="password"
                                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md p-2 border"
                                    placeholder="••••••••"
                                />
                            </div>
                            {errors.password && (
                                <p className="mt-2 text-sm text-red-600">{t(errors.password.message as string)}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('auth.updatePassword.confirmPasswordLabel')}
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    {...register('confirmPassword')}
                                    type="password"
                                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md p-2 border"
                                    placeholder="••••••••"
                                />
                            </div>
                            {errors.confirmPassword && (
                                <p className="mt-2 text-sm text-red-600">{t(errors.confirmPassword.message as string)}</p>
                            )}
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                                        {t('auth.updatePassword.updating')}
                                    </>
                                ) : (
                                    t('auth.updatePassword.submit')
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

        </div>
    );
}

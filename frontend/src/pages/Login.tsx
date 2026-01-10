import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, ArrowLeft } from 'lucide-react';
import { Logo } from '../components/Logo';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';

const loginSchema = z.object({
    email: z.string().email('auth.validation.email'),
    password: z.string().min(6, 'auth.validation.passwordMin'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const { t } = useTranslation();

    const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
    });

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                navigate('/dashboard');
            }
        };
        checkSession();
    }, [navigate]);

    const [unverified, setUnverified] = useState(false);
    const [emailForResend, setEmailForResend] = useState('');

    const resendVerification = async () => {
        try {
            await supabase.auth.resend({ type: 'signup', email: emailForResend });
            toast.success(t('auth.messages.verificationResent'));
        } catch (e) {
            console.error('Resend error:', e);
            toast.error(t('auth.messages.verificationResendError'));
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/dashboard`,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                },
            });
            if (error) throw error;
        } catch (error: any) {
            console.error('Google login error:', error);
            toast.error(t('auth.messages.loginError'));
        } finally {
            setIsLoading(false);
        }
    };

    const onSubmit = async (data: LoginForm) => {
        setIsLoading(true);
        try {
            // Mobile pre-check
            if (Capacitor.isNativePlatform()) {
                const { connectionManager } = await import('../lib/ConnectionManager');
                const status = await connectionManager.checkConnection();
                if (!status.connected) {
                    throw new Error(status.error || 'No internet connection');
                }
                if (!status.supabaseReachable) {
                    throw new Error(status.error || 'Cannot reach server. Please check your connection.');
                }
            }

            const { data: authData, error } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            });

            if (error) throw error;

            // Check if email is verified
            if (authData.user && !authData.user.email_confirmed_at) {
                toast.error(t('auth.messages.emailNotVerified'));
                setUnverified(true);
                setEmailForResend(data.email);
                return;
            }

            toast.success(t('auth.messages.loginSuccess'));
            navigate('/dashboard');
        } catch (error: any) {
            console.error('Login error:', error);
            toast.error(t('auth.messages.loginError'), {
                duration: 5000 // Show longer for connection errors
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
            {/* Mobile Back Button */}
            {Capacitor.isNativePlatform() && (
                <button
                    onClick={() => {
                        localStorage.removeItem('durrah_mobile_path');
                        navigate('/mobile-welcome');
                    }}
                    className="absolute top-6 left-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-all hover:scale-105"
                    aria-label={t('auth.login.back')}
                >
                    <ArrowLeft className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('auth.login.back')}</span>
                </button>
            )}

            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <Logo size="lg" />
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
                    {t('auth.login.title')}
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                    {t('auth.login.noAccount')}{' '}
                    <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                        {t('auth.login.register')}
                    </Link>
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('auth.login.emailLabel')}
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    {...register('email')}
                                    type="email"
                                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md p-2 border"
                                    placeholder="you@example.com"
                                />
                            </div>
                            {errors.email && (
                                <p className="mt-2 text-sm text-red-600">{t(errors.email.message as string)}</p>
                            )}
                        </div>

                        <div>
                            <div className="flex items-center justify-between">
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('auth.login.passwordLabel')}
                                </label>
                                <div className="text-sm">
                                    <Link to="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                                        {t('auth.login.forgotPassword')}
                                    </Link>
                                </div>
                            </div>
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
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                                        {t('auth.login.submit')}...
                                    </>
                                ) : (
                                    t('auth.login.submit')
                                )}
                            </button>
                        </div>
                        {unverified && (
                            <div className="mt-4 text-center">
                                <p className="text-sm text-gray-600 dark:text-gray-400">{t('auth.messages.emailNotVerified')}</p>
                                <button
                                    type="button"
                                    onClick={resendVerification}
                                    className="mt-2 text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                                >
                                    {t('auth.messages.resendVerification')}
                                </button>
                            </div>
                        )}
                    </form>

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">
                                    {t('auth.login.or')}
                                </span>
                            </div>
                        </div>

                        <div className="mt-6">
                            <button
                                onClick={handleGoogleLogin}
                                disabled={isLoading}
                                className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all duration-200"
                            >
                                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                                    <path
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        fill="#4285F4"
                                    />
                                    <path
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        fill="#34A853"
                                    />
                                    <path
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                                        fill="#FBBC05"
                                    />
                                    <path
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
                                        fill="#EA4335"
                                    />
                                </svg>
                                {t('auth.login.googleSignin')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

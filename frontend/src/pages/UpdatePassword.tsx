import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Lock, Loader2 } from 'lucide-react';
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
    const [isValidating, setIsValidating] = useState(true);
    const { t } = useTranslation();

    // Check if user is authenticated and handle hash-based/PKCE password reset
    useEffect(() => {
        let isMounted = true;
        let retryCount = 0;
        const maxRetries = 10; // Try for 5 seconds total (10 * 500ms)

        const validateSession = async () => {
            try {
                // 1. Initial check for existing session
                const { data: { session: initialSession } } = await supabase.auth.getSession();
                if (initialSession && isMounted) {
                    setIsValidating(false);
                    return;
                }

                // 2. Setup a listener for auth state changes (catches deep links/hash processing)
                const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                    if ((event === 'SIGNED_IN' || session) && isMounted) {
                        setIsValidating(false);
                        subscription.unsubscribe();
                    }
                });

                // 3. Polling mechanism to wait for Supabase to process URL tokens
                const pollSession = async () => {
                    if (!isMounted) return;

                    const { data: { session } } = await supabase.auth.getSession();
                    if (session) {
                        setIsValidating(false);
                        subscription.unsubscribe();
                        return;
                    }

                    if (retryCount < maxRetries) {
                        retryCount++;
                        setTimeout(pollSession, 500);
                    } else {
                        // Final check before failing
                        const hasHash = window.location.hash.includes('access_token');
                        const hasCode = window.location.search.includes('code=');

                        if (!hasHash && !hasCode) {
                            toast.error(t('auth.messages.invalidLink'));
                            navigate('/login');
                        } else {
                            // If we have tokens but no session yet, wait one last time
                            await new Promise(r => setTimeout(r, 2000));
                            const { data: { session: finalSession } } = await supabase.auth.getSession();
                            if (finalSession) {
                                setIsValidating(false);
                            } else {
                                toast.error(t('auth.messages.invalidLink'));
                                navigate('/login');
                            }
                        }
                        subscription.unsubscribe();
                    }
                };

                pollSession();
            } catch (error) {
                console.error('Session validation error:', error);
                if (isMounted) {
                    toast.error(t('auth.messages.invalidLink'));
                    navigate('/login');
                }
            }
        };

        validateSession();
        return () => { isMounted = false; };
    }, [navigate, t]);

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

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            {isValidating ? (
                <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto" />
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Validating reset link...</p>
                </div>
            ) : (
                <>
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
                </>
            )}
        </div>
    );
}

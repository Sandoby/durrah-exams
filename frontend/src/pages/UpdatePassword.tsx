import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Loader2, AlertCircle, Home, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
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
    const [hasToken, setHasToken] = useState(false);
    const { t } = useTranslation();

    useEffect(() => {
        // Check if reset token exists in sessionStorage
        const resetToken = sessionStorage.getItem('password_reset_token');

        if (!resetToken) {
            // No token found
            setHasToken(false);
        } else {
            setHasToken(true);
        }
    }, []);

    const { register, handleSubmit, formState: { errors } } = useForm<UpdatePasswordForm>({
        resolver: zodResolver(updatePasswordSchema),
    });

    const onSubmit = async (data: UpdatePasswordForm) => {
        setIsLoading(true);
        try {
            const resetToken = sessionStorage.getItem('password_reset_token');

            if (!resetToken) {
                throw new Error('No reset token found. Please start over.');
            }

            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-password-with-token`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    },
                    body: JSON.stringify({
                        resetToken,
                        newPassword: data.password,
                    }),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to reset password');
            }

            // Clear token from sessionStorage
            sessionStorage.removeItem('password_reset_token');

            toast.success(t('auth.messages.passwordUpdated'));
            navigate('/login');
        } catch (error: any) {
            console.error('Password reset error:', error);
            toast.error(error.message || t('auth.messages.passwordUpdateError'));
        } finally {
            setIsLoading(false);
        }
    };

    if (!hasToken) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-violet-100 dark:from-gray-900 dark:to-indigo-950 flex flex-col justify-center items-center p-4">
                <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg text-center space-y-6">
                    <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-2">
                        <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        No Reset Token Found
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        You need to complete the OTP verification first before resetting your password. Please request a new password reset code.
                    </p>
                    <div className="flex flex-col gap-3 pt-4">
                        <Link
                            to="/forgot-password"
                            className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                        >
                            Request Password Reset
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
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-violet-100 dark:from-gray-900 dark:to-indigo-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <Logo size="lg" />
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
                    {t('auth.updatePassword.title')}
                </h2>
                <div className="mt-2 flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span>{t('auth.updatePassword.verified')}</span>
                </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('auth.updatePassword.newPassword')}
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    {...register('password')}
                                    type="password"
                                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md p-2 border"
                                    placeholder="••••••••"
                                />
                            </div>
                            {errors.password && (
                                <p className="mt-2 text-sm text-red-600">{t(errors.password.message as string)}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('auth.updatePassword.confirmPassword')}
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    {...register('confirmPassword')}
                                    type="password"
                                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md p-2 border"
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
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

                    <div className="mt-6 text-center">
                        <Link to="/login" className="text-sm text-indigo-600 hover:text-indigo-500 font-medium">
                            {t('auth.updatePassword.backToLogin')}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

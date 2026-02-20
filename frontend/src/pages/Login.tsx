import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Logo } from '../components/Logo';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { StudentAccountModal } from '../components/StudentAccountModal';

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

    const [showStudentModal, setShowStudentModal] = useState(false);
    const [studentUserInfo, setStudentUserInfo] = useState<{ email: string; id: string } | null>(null);
    const isProcessingOAuth = useRef(false);

    // Shared logic to handle a session (check profile, upsert, navigate)
    const processSession = async (session: any) => {
        // Prevent duplicate processing (onAuthStateChange can fire multiple times)
        if (isProcessingOAuth.current) return;
        isProcessingOAuth.current = true;

        try {
            const params = new URLSearchParams(window.location.search);
            const isTutorRequested = params.get('type') === 'tutor' || window.location.pathname.includes('/login');

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .maybeSingle();

            if (!profile || (profile.role === 'student' && isTutorRequested)) {
                await supabase.from('profiles').upsert({
                    id: session.user.id,
                    role: 'tutor',
                    full_name: session.user.user_metadata?.full_name || '',
                    email: session.user.email,
                    phone: session.user.user_metadata?.phone || null,
                    institution: session.user.user_metadata?.institution || null
                });

                // Activate trial for new OAuth users
                if (!profile) {
                    try {
                        const { data: trialResult } = await supabase.rpc('activate_trial', {
                            p_user_id: session.user.id
                        });
                        if (trialResult?.success) {
                            console.log('✅ Trial activated for new OAuth user');
                        }
                    } catch (trialError) {
                        console.warn('Trial activation failed:', trialError);
                    }
                }

                navigate('/dashboard');
            } else if (profile.role === 'student') {
                setStudentUserInfo({
                    email: session.user.email || '',
                    id: session.user.id
                });
                setShowStudentModal(true);
            } else {
                navigate('/dashboard');
            }
        } finally {
            isProcessingOAuth.current = false;
        }
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const hasOAuthCode = params.has('code');

        // 1) If there's an OAuth code in the URL, wait for onAuthStateChange to fire
        //    once the PKCE exchange completes — this is the fast path.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
                    processSession(session);
                }
            }
        );

        // 2) Also check if user already has an active session (e.g. navigated to /login
        //    while already logged in, or session was cached).
        if (!hasOAuthCode) {
            const checkExistingSession = async () => {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    processSession(session);
                }
            };
            checkExistingSession();
        }

        return () => {
            subscription.unsubscribe();
        };
    }, [navigate]);

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            const isNative = Capacitor.isNativePlatform();
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: isNative
                        ? 'com.durrah.tutors://login-callback'
                        : `${window.location.origin}/login?type=tutor`,
                    skipBrowserRedirect: isNative,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                },
            });
            if (error) throw error;
            if (isNative && data?.url) await Browser.open({ url: data.url });
        } catch (error: any) {
            console.error('Google login error:', error);
            toast.error(t('auth.messages.loginError'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleMicrosoftLogin = async () => {
        setIsLoading(true);
        try {
            const isNative = Capacitor.isNativePlatform();
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'azure',
                options: {
                    redirectTo: isNative
                        ? 'com.durrah.tutors://login-callback'
                        : `${window.location.origin}/login?type=tutor`,
                    skipBrowserRedirect: isNative,
                    scopes: 'openid profile email',
                },
            });
            if (error) throw error;
            if (isNative && data?.url) await Browser.open({ url: data.url });
        } catch (error: any) {
            console.error('Microsoft login error:', error);
            toast.error(t('auth.messages.microsoftError'));
        } finally {
            setIsLoading(false);
        }
    };

    const onSubmit = async (data: LoginForm) => {
        setIsLoading(true);
        try {
            if (Capacitor.isNativePlatform()) {
                const { connectionManager } = await import('../lib/ConnectionManager');
                const status = await connectionManager.checkConnection();
                if (!status.connected) throw new Error(status.error || 'No internet connection');
                if (!status.supabaseReachable) throw new Error(status.error || 'Cannot reach server.');
            }

            const { data: authData, error } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            });

            if (error) throw error;

            if (authData.user && !authData.user.email_confirmed_at) {
                navigate('/verify-email', { state: { email: data.email } });
                return;
            }

            toast.success(t('auth.messages.loginSuccess'));

            if (authData.user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', authData.user.id)
                    .single();

                if (profile?.role === 'student') {
                    setStudentUserInfo({ email: authData.user.email || '', id: authData.user.id });
                    setShowStudentModal(true);
                    setIsLoading(false);
                    return;
                }
            }

            navigate('/dashboard');
        } catch (error: any) {
            const isUnverified = error?.message?.toLowerCase().includes('email not confirmed') ||
                error?.message?.toLowerCase().includes('email not verified');

            if (isUnverified) {
                navigate('/verify-email', { state: { email: data.email } });
                return;
            }
            console.error('Login error:', error);
            toast.error(t('auth.messages.loginError'), { duration: 5000 });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-white dark:bg-gray-950 font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900">
            <Helmet>
                <title>{t('auth.login.seo.title', 'Tutor Login - Durrah')}</title>
            </Helmet>

            {/* Left Side - Visual (Hidden on Mobile) */}
            <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-indigo-50 flex-col justify-between rounded-r-[3rem] mr-4 my-4">
                {/* Subtle Background Pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 opacity-90" />

                {/* Decorative Blobs */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-200/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-200/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10 w-full p-12 flex justify-between items-start">
                    <Logo size="lg" variant="default" />
                </div>

                {/* Illustration Container */}
                <div className="relative z-10 flex-1 flex items-center justify-center px-12">
                    <div className="relative">
                        <div className="absolute inset-0 bg-indigo-400/10 blur-2xl rounded-full transform scale-90 translate-y-4"></div>
                        <img
                            src="/illustrations/login-illustration.png"
                            alt="Teacher managing exams"
                            className="relative w-full max-w-lg object-contain mix-blend-multiply hover:scale-105 transition-transform duration-500 drop-shadow-sm rounded-[2rem]"
                        />
                    </div>
                </div>

                <div className="relative z-10 w-full p-12 pt-0">
                    <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight leading-tight">
                        Empowering Education, <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Simplified.</span>
                    </h1>
                    <p className="text-slate-600 text-lg max-w-md leading-relaxed">
                        Create secure, engaging, and cheating-free exams in minutes with Durrah's advanced proctoring tools.
                    </p>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 relative">
                {/* Mobile Back Button */}
                {Capacitor.isNativePlatform() && (
                    <button
                        onClick={() => {
                            localStorage.removeItem('durrah_mobile_path');
                            navigate('/mobile-welcome');
                        }}
                        className="absolute top-6 left-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-500" />
                    </button>
                )}

                <div className="w-full max-w-md space-y-8">
                    {/* Header */}
                    <div className="text-center lg:text-left space-y-2">
                        <div className="lg:hidden flex justify-center mb-6">
                            <Logo size="lg" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                            {t('auth.login.title')}
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400">
                            {t('auth.login.noAccount')}{' '}
                            <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 hover:underline transition-all">
                                {t('auth.login.register')}
                            </Link>
                        </p>
                    </div>

                    {/* Social Login */}
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            className="flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335" />
                            </svg>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Google</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleMicrosoftLogin}
                            disabled={isLoading}
                            className="flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 21 21">
                                <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                                <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                                <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                                <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                            </svg>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Microsoft</span>
                        </button>
                    </div>

                    <div className="relative flex items-center justify-center">
                        <div className="border-t border-gray-200 dark:border-gray-800 w-full absolute"></div>
                        <span className="bg-white dark:bg-gray-950 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider relative z-10">
                            {t('auth.login.or')}
                        </span>
                    </div>

                    {/* Form */}
                    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                {t('auth.login.emailLabel')}
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                                <input
                                    {...register('email')}
                                    type="email"
                                    className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                                    placeholder="name@email.com"
                                />
                            </div>
                            {errors.email && (
                                <p className="mt-1.5 text-sm text-red-500 font-medium">{t(errors.email.message as string)}</p>
                            )}
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('auth.login.passwordLabel')}
                                </label>
                                <Link
                                    to="/forgot-password"
                                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 transition-colors"
                                >
                                    {t('auth.login.forgotPassword')}
                                </Link>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                                <input
                                    {...register('password')}
                                    type="password"
                                    className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                                    placeholder="••••••••"
                                />
                            </div>
                            {errors.password && (
                                <p className="mt-1.5 text-sm text-red-500 font-medium">{t(errors.password.message as string)}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full relative flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group"
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin h-5 w-5" />
                            ) : (
                                <>
                                    {t('auth.login.submit')}
                                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>

            <StudentAccountModal
                isOpen={showStudentModal}
                userEmail={studentUserInfo?.email || ''}
                userId={studentUserInfo?.id || ''}
                onClose={() => {
                    setShowStudentModal(false);
                    supabase.auth.signOut();
                }}
                onConverted={() => {
                    setShowStudentModal(false);
                    navigate('/dashboard');
                }}
            />
        </div>
    );
}

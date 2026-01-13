import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, User, Mail, Lock, Save, Loader2, Crown, Menu, X, LogOut, Settings as SettingsIcon, Globe, ExternalLink } from 'lucide-react';
import { Logo } from '../components/Logo';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface TutorProfile {
    full_name: string;
    email: string;
    phone?: string;
    institution?: string;
    subscription_status?: string;
    subscription_plan?: string;
    subscription_end_date?: string;
    dodo_customer_id?: string;
}

export default function Settings() {
    const { t } = useTranslation();
    const { user, subscriptionStatus } = useAuth();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [profile, setProfile] = useState<TutorProfile>({
        full_name: '',
        email: '',
        phone: '',
        institution: '',
    });
    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: '',
    });
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [userRole, setUserRole] = useState<string>('tutor');

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            navigate('/login');
        } catch (error) {
            console.error('Logout error:', error);
            toast.error('Error logging out');
        }
    };

    useEffect(() => {
        fetchProfile();
    }, [user]);

    const fetchProfile = async () => {
        if (!user) return;
        try {
            // Fetch from profiles table
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileError && profileError.code !== 'PGRST116') {
                console.error('Error fetching profile:', profileError);
            }

            // Set profile data from database or fallback to user metadata
            setProfile({
                full_name: profileData?.full_name || user.user_metadata?.full_name || '',
                email: profileData?.email || user.email || '',
                phone: profileData?.phone || user.user_metadata?.phone || '',
                institution: profileData?.institution || user.user_metadata?.institution || '',
                subscription_status: profileData?.subscription_status,
                subscription_plan: profileData?.subscription_plan,
                subscription_end_date: profileData?.subscription_end_date,
                dodo_customer_id: profileData?.dodo_customer_id,
            });
            if (profileData?.role) {
                setUserRole(profileData.role);
            }
        } catch (error: any) {
            console.error('Error fetching profile:', error);
            toast.error(t('settings.profile.error'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            // Upsert to profiles table (insert or update)
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: user?.id,
                    email: profile.email,
                    full_name: profile.full_name,
                    phone: profile.phone,
                    institution: profile.institution,
                    role: userRole
                }, {
                    onConflict: 'id'
                });

            if (error) throw error;

            // Also update user metadata
            await supabase.auth.updateUser({
                data: {
                    full_name: profile.full_name,
                    phone: profile.phone,
                    institution: profile.institution,
                }
            });

            toast.success(t('settings.profile.success'));
        } catch (error: any) {
            console.error('Error updating profile:', error);
            toast.error(t('settings.profile.updateError'));
        } finally {
            setIsSaving(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error(t('settings.password.mismatch'));
            return;
        }

        if (passwordData.newPassword.length < 6) {
            toast.error(t('settings.password.length'));
            return;
        }

        setIsChangingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: passwordData.newPassword,
            });

            if (error) throw error;

            toast.success(t('settings.password.success'));
            setPasswordData({
                newPassword: '',
                confirmPassword: '',
            });
        } catch (error: any) {
            console.error('Error changing password:', error);
            toast.error(error.message || t('settings.password.error'));
        } finally {
            setIsChangingPassword(false);
        }
    };


    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 font-sans pb-20 relative overflow-hidden pt-24">
            {/* Animated background blobs */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-400/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet-400/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-1/2 w-96 h-96 bg-purple-400/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>

            <style>{`
                @keyframes blob { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } }
                .animate-blob { animation: blob 7s infinite; }
                .animation-delay-2000 { animation-delay: 2s; }
                .animation-delay-4000 { animation-delay: 4s; }
            `}</style>

            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 pt-4">
                <div className="max-w-7xl mx-auto bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-xl shadow-indigo-500/5 border border-gray-200/50 dark:border-gray-700/50">
                    <div className="flex justify-between h-16 px-6">
                        <div className="flex items-center gap-3">
                            <Logo className="h-9 w-9" showText={false} />
                            <div className="flex flex-col">
                                <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">Durrah</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">for Tutors</span>
                            </div>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center space-x-3">
                            <span className="hidden lg:inline text-sm text-gray-700 dark:text-gray-300 truncate max-w-[150px]">
                                {user?.user_metadata?.full_name || user?.email}
                            </span>

                            <div className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 cursor-default transition-colors">
                                <SettingsIcon className="h-4 w-4 lg:mr-2" />
                                <span className="hidden lg:inline">{t('settings.title', 'Settings')}</span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                <LogOut className="h-4 w-4 lg:mr-2" />
                                <span className="hidden lg:inline">{t('nav.logout', 'Logout')}</span>
                            </button>
                        </div>

                        {/* Mobile menu button */}
                        <div className="flex items-center md:hidden">
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
                            >
                                {isMobileMenuOpen ? (
                                    <X className="h-6 w-6" />
                                ) : (
                                    <Menu className="h-6 w-6" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 mx-auto max-w-7xl">
                        <div className="px-4 py-3 space-y-2">
                            <div className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700 font-medium">
                                {user?.user_metadata?.full_name || user?.email}
                            </div>
                            <div className="flex items-center w-full px-3 py-2 rounded-md text-base font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20">
                                <SettingsIcon className="h-5 w-5 mr-3" />
                                {t('settings.title', 'Settings')}
                            </div>
                            <button
                                onClick={handleLogout}
                                className="flex items-center w-full px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                <LogOut className="h-5 w-5 mr-3" />
                                {t('nav.logout', 'Logout')}
                            </button>
                        </div>
                    </div>
                )}
            </nav>

            {/* Page Header */}
            <div className="max-w-4xl mx-auto px-6 lg:px-8 py-2 relative z-10">
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-all shadow-sm"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </button>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                        {t('settings.title', 'Settings')}
                    </h1>
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-6 lg:px-8 pb-12 relative z-10">
                <div className="space-y-8">
                    {/* Profile Settings */}
                    <section className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                            <User className="h-5 w-5 text-indigo-600" />
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('settings.profile.title', 'Profile Settings')}</h2>
                        </div>

                        <form onSubmit={handleProfileUpdate} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">
                                        {t('settings.profile.fullName', 'Full Name')}
                                    </label>
                                    <input
                                        type="text"
                                        value={profile.full_name}
                                        onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">
                                        {t('settings.profile.email', 'Email Address')}
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            type="email"
                                            value={profile.email}
                                            disabled
                                            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-400 cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">
                                        {t('settings.profile.phone', 'Phone Number')}
                                    </label>
                                    <input
                                        type="tel"
                                        value={profile.phone}
                                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                                        placeholder="+1 000 000 000"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">
                                        {t('settings.profile.institution', 'Institution')}
                                    </label>
                                    <input
                                        type="text"
                                        value={profile.institution}
                                        onChange={(e) => setProfile({ ...profile, institution: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                                        placeholder="Organization Name"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-6 border-t border-gray-50 dark:border-gray-800">
                                {subscriptionStatus !== 'active' && (
                                    <Link
                                        to="/checkout"
                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg font-bold text-sm shadow-sm mr-4"
                                    >
                                        <Crown className="w-4 h-4" />
                                        {t('settings.subscription.upgrade', 'Upgrade to Pro')}
                                    </Link>
                                )}
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSaving ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="h-4 w-4" />
                                    )}
                                    {isSaving ? t('common.saving', 'Saving...') : t('settings.profile.save', 'Save Changes')}
                                </button>
                            </div>
                        </form>
                    </section>

                    {/* Language Settings */}
                    <section className="relative z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                            <Globe className="h-5 w-5 text-indigo-600" />
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('settings.language.title', 'Language')}</h2>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                {t('settings.language.desc', 'Choose your preferred language for the interface')}
                            </p>
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('settings.language.current', 'Current Language')}:
                                </span>
                                <LanguageSwitcher />
                            </div>
                        </div>
                    </section>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Security */}
                        <section className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
                            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                                <Lock className="h-5 w-5 text-red-600" />
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('settings.security.title', 'Security')}</h2>
                            </div>
                            <form onSubmit={handlePasswordChange} className="p-6 flex-1 space-y-4">
                                <div className="space-y-2">
                                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">
                                        {t('settings.password.new', 'New Password')}
                                    </label>
                                    <input
                                        type="password"
                                        value={passwordData.newPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                                        placeholder="••••••••"
                                        minLength={6}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">
                                        {t('settings.password.confirm', 'Confirm Password')}
                                    </label>
                                    <input
                                        type="password"
                                        value={passwordData.confirmPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                                        placeholder="••••••••"
                                        minLength={6}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isChangingPassword || !passwordData.newPassword}
                                    className="w-full py-2.5 bg-gray-900 dark:bg-gray-800 text-white rounded-lg font-bold text-sm hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                                >
                                    {isChangingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                                    {t('settings.password.update', 'Update Password')}
                                </button>
                            </form>
                        </section>

                        {/* Subscription */}
                        <section className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
                            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                                <Crown className="h-5 w-5 text-amber-600" />
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('settings.subscription.title', 'Subscription')}</h2>
                            </div>
                            <div className="p-6 flex-1 flex flex-col justify-center items-center text-center">
                                {profile.subscription_status === 'active' ? (
                                    <div className="w-full space-y-4">
                                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                                            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">{t('settings.subscription.plan', 'Current Plan')}</p>
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{profile.subscription_plan || 'PRO'}</h3>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">{t('settings.subscription.expires', 'Expires on')}</p>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                                                {profile.subscription_end_date ? new Date(profile.subscription_end_date).toLocaleDateString() : 'Lifetime'}
                                            </p>
                                        </div>

                                        {profile.dodo_customer_id && (
                                            <a
                                                href="https://customer.dodopayments.com/login/bus_0NVDOv8mOGPj5tQXpDBCg"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 rounded-xl font-bold text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all group"
                                            >
                                                <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                                Manage Subscription
                                            </a>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <p className="text-sm text-gray-500">{t('settings.subscription.upgradeDesc', 'Unlock all features with a Pro plan.')}</p>
                                        <Link
                                            to="/checkout"
                                            className="w-full block py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors text-center"
                                        >
                                            {t('settings.subscription.upgrade', 'Upgrade Now')}
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Metadata Footer */}
                    <div className="flex flex-col sm:flex-row justify-between items-center px-6 py-4 border border-gray-200 dark:border-gray-800 rounded-lg gap-4 text-xs font-semibold text-gray-400">
                        <div className="flex gap-2">
                            <span>{t('settings.footer.id', 'User ID')}:</span>
                            <code className="text-indigo-600">{user?.id}</code>
                        </div>
                        <div>
                            <span>{t('settings.footer.created', 'Joined')}:</span>
                            <span className="ml-2">{new Date(user?.created_at || '').toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

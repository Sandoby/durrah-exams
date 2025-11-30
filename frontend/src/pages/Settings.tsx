import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, User, Mail, Lock, Save, Loader2, Crown } from 'lucide-react';
import { Logo } from '../components/Logo';
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
}

export default function Settings() {
    const { t } = useTranslation();
    const { user } = useAuth();
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
            });
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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                            </button>
                            <Logo size="md" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings.title')}</h1>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="space-y-6">
                    {/* Profile Settings */}
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center space-x-2">
                                <User className="h-5 w-5 text-indigo-600" />
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.profile.title')}</h2>
                            </div>
                        </div>
                        <form onSubmit={handleProfileUpdate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('settings.profile.fullName')}
                                </label>
                                <input
                                    type="text"
                                    value={profile.full_name}
                                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('settings.profile.email')}
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type="email"
                                        value={profile.email}
                                        disabled
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                    />
                                </div>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('settings.profile.emailNote')}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('settings.profile.phone')}
                                </label>
                                <input
                                    type="tel"
                                    value={profile.phone}
                                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    placeholder="+1234567890"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('settings.profile.institution')}
                                </label>
                                <input
                                    type="text"
                                    value={profile.institution}
                                    onChange={(e) => setProfile({ ...profile, institution: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    placeholder="University or School Name"
                                />
                            </div>

                            <div className="flex justify-end pt-4">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex items-center space-x-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span>{t('settings.profile.saving')}</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4" />
                                            <span>{t('settings.profile.save')}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Password Change */}
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center space-x-2">
                                <Lock className="h-5 w-5 text-indigo-600" />
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.password.title')}</h2>
                            </div>
                        </div>
                        <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('settings.password.new')}
                                </label>
                                <input
                                    type="password"
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    placeholder="Enter new password"
                                    minLength={6}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('settings.password.confirm')}
                                </label>
                                <input
                                    type="password"
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    placeholder="Confirm new password"
                                    minLength={6}
                                />
                            </div>

                            <div className="flex justify-end pt-4">
                                <button
                                    type="submit"
                                    disabled={isChangingPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                                    className="flex items-center space-x-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isChangingPassword ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span>{t('settings.password.updating')}</span>
                                        </>
                                    ) : (
                                        <>
                                            <Lock className="h-4 w-4" />
                                            <span>{t('settings.password.update')}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Subscription Status */}
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center space-x-2">
                                <Crown className="h-5 w-5 text-indigo-600" />
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.subscription.title')}</h2>
                            </div>
                        </div>
                        <div className="p-6">
                            {profile.subscription_status === 'active' ? (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.subscription.status')}</span>
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                            {t('settings.subscription.active')}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.subscription.plan')}</span>
                                        <span className="text-sm text-gray-900 dark:text-white font-semibold">
                                            {profile.subscription_plan || 'Professional'}
                                        </span>
                                    </div>
                                    {profile.subscription_end_date && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.subscription.validUntil')}</span>
                                            <span className="text-sm text-gray-900 dark:text-white">
                                                {new Date(profile.subscription_end_date).toLocaleDateString()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                        {t('settings.subscription.freeMessage')}
                                    </p>
                                    <Link
                                        to="/checkout"
                                        className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                    >
                                        <Crown className="h-4 w-4 mr-2" />
                                        {t('settings.subscription.upgrade')}
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Account Info */}
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.account.title')}</h3>
                        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                            <p>{t('settings.account.userId')} <span className="font-mono text-xs">{user?.id}</span></p>
                            <p>{t('settings.account.created')} {new Date(user?.created_at || '').toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

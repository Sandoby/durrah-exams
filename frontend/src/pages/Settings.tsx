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
        <div className="min-h-screen bg-[#f8fafc] dark:bg-gray-950 font-sans relative overflow-x-hidden">
            {/* Background Decorative Elements */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-500/5 blur-[120px] rounded-full"></div>
            </div>

            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
                <div className="max-w-7xl mx-auto px-6 lg:px-8 h-24 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="group p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-all"
                        >
                            <ArrowLeft className="h-6 w-6 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                        </button>
                        <Logo />
                    </div>
                    <div className="hidden sm:block">
                        <div className="flex items-center gap-3">
                            <div className="h-1.5 w-8 bg-indigo-600 rounded-full"></div>
                            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight uppercase">
                                System <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Preferences</span>
                            </h1>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-6 lg:px-8 py-16 relative">
                <div className="space-y-12">
                    {/* Profile Settings */}
                    <section className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-[3rem] border border-white dark:border-gray-800 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="px-10 py-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-gray-50/50 to-transparent dark:from-gray-800/50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none">
                                    <User className="h-6 w-6 text-white" />
                                </div>
                                <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Identity Profile</h2>
                            </div>
                        </div>

                        <form onSubmit={handleProfileUpdate} className="p-10 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">
                                        Account Holder Name
                                    </label>
                                    <input
                                        type="text"
                                        value={profile.full_name}
                                        onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                        className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-indigo-500/50 rounded-[1.5rem] outline-none transition-all font-bold text-gray-900 dark:text-white"
                                        required
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">
                                        Primary Email Identifier
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-6 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                        <input
                                            type="email"
                                            value={profile.email}
                                            disabled
                                            className="w-full pl-16 pr-6 py-4 bg-gray-100 dark:bg-gray-900 border-2 border-transparent rounded-[1.5rem] text-gray-400 font-bold cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">
                                        Contact Number
                                    </label>
                                    <input
                                        type="tel"
                                        value={profile.phone}
                                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                        className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-indigo-500/50 rounded-[1.5rem] outline-none transition-all font-bold text-gray-900 dark:text-white"
                                        placeholder="+1 000 000 000"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">
                                        Educational Institution
                                    </label>
                                    <input
                                        type="text"
                                        value={profile.institution}
                                        onChange={(e) => setProfile({ ...profile, institution: e.target.value })}
                                        className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-indigo-500/50 rounded-[1.5rem] outline-none transition-all font-bold text-gray-900 dark:text-white"
                                        placeholder="Organization Name"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end border-t border-gray-100 dark:border-gray-800 pt-8">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="group relative px-10 py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest overflow-hidden transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <span className="relative flex items-center justify-center gap-3">
                                        {isSaving ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Save className="h-4 w-4" />
                                        )}
                                        {isSaving ? 'Synching...' : 'Commit Changes'}
                                    </span>
                                </button>
                            </div>
                        </form>
                    </section>

                    {/* Security & Subscription Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* Security */}
                        <section className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-[3rem] border border-white dark:border-gray-800 shadow-xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-12 duration-1000">
                            <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex items-center gap-4 bg-gradient-to-r from-red-50/50 to-transparent dark:from-red-900/10">
                                <div className="p-2.5 bg-red-500 rounded-xl text-white">
                                    <Lock className="h-5 w-5" />
                                </div>
                                <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Security</h2>
                            </div>
                            <form onSubmit={handlePasswordChange} className="p-8 flex-1 space-y-6">
                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">
                                        New Security Key
                                    </label>
                                    <input
                                        type="password"
                                        value={passwordData.newPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                        className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-red-500/30 rounded-[1.5rem] outline-none transition-all font-bold text-gray-900 dark:text-white"
                                        placeholder="••••••••"
                                        minLength={6}
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">
                                        Confirm Key
                                    </label>
                                    <input
                                        type="password"
                                        value={passwordData.confirmPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                        className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-red-500/30 rounded-[1.5rem] outline-none transition-all font-bold text-gray-900 dark:text-white"
                                        placeholder="••••••••"
                                        minLength={6}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isChangingPassword || !passwordData.newPassword}
                                    className="w-full py-4 bg-gray-950 dark:bg-gray-800 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest hover:bg-gray-900 transition-colors flex items-center justify-center gap-3"
                                >
                                    {isChangingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                                    Update Security
                                </button>
                            </form>
                        </section>

                        {/* Subscription */}
                        <section className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-[3rem] border border-white dark:border-gray-800 shadow-xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-100">
                            <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex items-center gap-4 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10">
                                <div className="p-2.5 bg-amber-500 rounded-xl text-white">
                                    <Crown className="h-5 w-5" />
                                </div>
                                <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Active Plan</h2>
                            </div>
                            <div className="p-8 flex-1 flex flex-col justify-center items-center text-center">
                                {profile.subscription_status === 'active' ? (
                                    <div className="w-full space-y-6">
                                        <div className="p-6 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-[2rem] text-white">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Current Tier</p>
                                            <h3 className="text-2xl font-black">{profile.subscription_plan || 'PRO'}</h3>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Expiration Protocol</p>
                                            <p className="text-sm font-black text-gray-900 dark:text-white">
                                                {profile.subscription_end_date ? new Date(profile.subscription_end_date).toLocaleDateString(undefined, { dateStyle: 'long' }) : 'Never'}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-[2rem] border-2 border-dashed border-gray-200 dark:border-gray-700">
                                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Unlock complete platform potential with our Professional Tier.</p>
                                        </div>
                                        <Link
                                            to="/checkout"
                                            className="w-full block py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-lg shadow-indigo-100 dark:shadow-none hover:scale-105 transition-all text-center"
                                        >
                                            Elevate Account
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Metadata Footer */}
                    <div className="flex flex-col sm:flex-row justify-between items-center px-10 py-6 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[2rem] gap-4">
                        <div className="text-center sm:text-left">
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Digital Fingerprint</p>
                            <code className="text-[10px] font-bold text-gray-400 truncate max-w-[200px] block">{user?.id}</code>
                        </div>
                        <div className="text-center sm:text-right">
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Creation Timestamp</p>
                            <p className="text-xs font-black text-gray-400">{new Date(user?.created_at || '').toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

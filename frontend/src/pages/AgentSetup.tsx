import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Logo } from '../components/Logo';
import { Shield, Lock, UserPlus } from 'lucide-react';

const ADMIN_CODE = '2352206';

export default function AgentSetup() {
    const navigate = useNavigate();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [adminCode, setAdminCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Verify admin code
            if (adminCode !== ADMIN_CODE) {
                throw new Error('Invalid admin code');
            }

            // Create auth user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    },
                },
            });

            if (authError) throw authError;

            if (!authData.user) {
                throw new Error('Failed to create user');
            }

            // Create agent profile
            const { error: agentError } = await supabase
                .from('support_agents')
                .insert({
                    user_id: authData.user.id,
                    full_name: fullName,
                    email,
                    is_admin: true,
                    is_active: true,
                });

            if (agentError) throw agentError;

            // Update profile role
            await supabase
                .from('profiles')
                .update({ role: 'admin' })
                .eq('id', authData.user.id);

            // Sign in the user
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (signInError) throw signInError;

            // Navigate to admin dashboard
            navigate('/admin');
        } catch (err: any) {
            setError(err.message || 'Failed to create admin account');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-950 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <Logo className="h-16 w-16" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Create Admin Account
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        First-time setup for support system
                    </p>
                </div>

                {/* Setup Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 mb-6 border border-indigo-200 dark:border-indigo-800">
                        <div className="flex items-start gap-3">
                            <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-indigo-900 dark:text-indigo-300">
                                    Admin Setup
                                </p>
                                <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-1">
                                    You need the admin code to create the first admin account
                                </p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSetup} className="space-y-6">
                        {/* Full Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                                placeholder="John Doe"
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                                placeholder="admin@durrah.com"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                                placeholder="••••••••"
                            />
                        </div>

                        {/* Admin Code */}
                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                            <label className="block text-sm font-medium text-purple-900 dark:text-purple-300 mb-2 flex items-center gap-2">
                                <Lock className="w-4 h-4" />
                                Admin Access Code
                            </label>
                            <input
                                type="password"
                                value={adminCode}
                                onChange={(e) => setAdminCode(e.target.value)}
                                required
                                className="w-full px-4 py-3 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                                placeholder="Enter admin code (2352206)"
                            />
                            <p className="mt-2 text-xs text-purple-700 dark:text-purple-400">
                                Required to create the first admin account
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    Creating Admin Account...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-5 h-5" />
                                    Create Admin Account
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-6 text-center space-y-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Already have an account?{' '}
                            <button
                                onClick={() => navigate('/agent-login')}
                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                            >
                                Agent Login
                            </button>
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Not an agent?{' '}
                            <button
                                onClick={() => navigate('/login')}
                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                            >
                                Tutor Login
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

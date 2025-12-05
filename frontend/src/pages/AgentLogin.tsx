import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Logo } from '../components/Logo';
import { Shield, Lock, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

const ADMIN_CODE = '2352206';

export default function AgentLogin() {
    const navigate = useNavigate();
    const [loginMethod, setLoginMethod] = useState<'code' | 'email'>('code');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [accessCode, setAccessCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (loginMethod === 'code') {
                // Simple code check - just like the old admin panel
                if (accessCode === ADMIN_CODE) {
                    // Store authentication in sessionStorage
                    sessionStorage.setItem('agent_authenticated', 'true');
                    sessionStorage.setItem('agent_role', 'admin');
                    toast.success('Welcome, Admin!');
                    navigate('/admin');
                } else {
                    toast.error('Invalid access code');
                }
            } else {
                // Email/Password login for agents
                const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (authError) throw authError;

                // Check if user is an agent
                const { data: agentData, error: agentError } = await supabase
                    .from('support_agents')
                    .select('*')
                    .eq('user_id', authData.user.id)
                    .single();

                if (agentError || !agentData) {
                    await supabase.auth.signOut();
                    throw new Error('You are not authorized as a support agent');
                }

                // Update profile role just in case
                await supabase
                    .from('profiles')
                    .update({ role: 'agent' })
                    .eq('id', authData.user.id);

                navigate('/support');
            }
        } catch (error: any) {
            console.error('Login error:', error);
            toast.error(error.message || 'Login failed');
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
                        Agent Portal
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Support Team Access
                    </p>
                </div>

                {/* Login Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
                    {/* Method Toggle */}
                    <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1 mb-6">
                        <button
                            type="button"
                            onClick={() => setLoginMethod('code')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${loginMethod === 'code'
                                    ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            <Lock className="w-4 h-4" />
                            Admin Code
                        </button>
                        <button
                            type="button"
                            onClick={() => setLoginMethod('email')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${loginMethod === 'email'
                                    ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            <Mail className="w-4 h-4" />
                            Agent Login
                        </button>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        {loginMethod === 'code' ? (
                            /* Access Code */
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
                                <label className="block text-sm font-medium text-indigo-900 dark:text-indigo-300 mb-2 flex items-center gap-2">
                                    <Lock className="w-4 h-4" />
                                    Admin Access Code
                                </label>
                                <input
                                    type="password"
                                    value={accessCode}
                                    onChange={(e) => setAccessCode(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                                    placeholder="Enter access code"
                                    autoFocus
                                />
                                <p className="mt-2 text-xs text-indigo-700 dark:text-indigo-400">
                                    Enter the admin code to access the portal
                                </p>
                            </div>
                        ) : (
                            /* Email/Password */
                            <>
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
                                        placeholder="agent@durrah.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Password
                                    </label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </>
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
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    <Shield className="w-5 h-5" />
                                    {loginMethod === 'code' ? 'Access Portal' : 'Sign In'}
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-6 text-center">
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

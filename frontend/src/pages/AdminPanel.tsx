import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users, MessageCircle, Tag, Lock, LogOut,
    Loader2, Plus, Send
} from 'lucide-react';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const ADMIN_PASSWORD = '2352206';

interface User {
    id: string;
    email: string;
    created_at: string;
    full_name?: string;
    subscription_status?: string;
    subscription_plan?: string;
    subscription_end_date?: string;
}

interface Coupon {
    id: string;
    code: string;
    discount_type: 'percentage' | 'fixed' | 'free';
    discount_value: number;
    max_uses: number;
    used_count: number;
    valid_until: string;
    is_active: boolean;
    created_at: string;
    duration?: 'monthly' | 'annual';
}

interface ChatMessage {
    id: string;
    user_id: string;
    user_email: string;
    message: string;
    is_admin: boolean;
    created_at: string;
}

interface UserInfo {
    id: string;
    email: string;
    full_name?: string;
    phone?: string;
    institution?: string;
    subscription_status?: string;
    subscription_plan?: string;
    subscription_end_date?: string;
    created_at?: string;
}

export default function AdminPanel() {
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [activeTab, setActiveTab] = useState<'users' | 'coupons' | 'chat'>('users');

    // Users
    const [users, setUsers] = useState<User[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Coupons
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [isLoadingCoupons, setIsLoadingCoupons] = useState(false);
    const [showCouponForm, setShowCouponForm] = useState(false);
    const [newCoupon, setNewCoupon] = useState({
        code: '',
        discount_type: 'percentage' as 'percentage' | 'fixed' | 'free',
        discount_value: 0,
        max_uses: 1,
        valid_until: '',
        duration: 'monthly' as 'monthly' | 'annual'
    });

    // Chat
    const [chatUsers, setChatUsers] = useState<string[]>([]);
    const [selectedChatUser, setSelectedChatUser] = useState<string | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [newChatMessage, setNewChatMessage] = useState('');
    const [selectedUserInfo, setSelectedUserInfo] = useState<UserInfo | null>(null);
    const chatMessagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isAuthenticated) {
            fetchUsers();
            fetchCoupons();
            fetchChatUsers();
        }
    }, [isAuthenticated]);

    // Subscribe to new chat messages globally to update user list
    useEffect(() => {
        if (isAuthenticated) {
            const channel = supabase
                .channel('admin_chat_users_global')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'chat_messages'
                    },
                    () => {
                        fetchChatUsers();
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (selectedChatUser) {
            fetchChatMessages(selectedChatUser);
            fetchUserInfo(selectedChatUser);

            // Subscribe to new messages with unique channel
            const channel = supabase
                .channel(`admin_chat:${selectedChatUser}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'chat_messages',
                        filter: `user_id=eq.${selectedChatUser}`
                    },
                    (payload) => {
                        console.log('Admin received message:', payload);
                        const newMsg = payload.new as ChatMessage;
                        setChatMessages(prev => {
                            // Avoid duplicates
                            if (prev.some(m => m.id === newMsg.id)) {
                                return prev;
                            }
                            return [...prev, newMsg];
                        });
                        scrollToBottom();
                    }
                )
                .subscribe((status) => {
                    console.log('Admin subscription status:', status);
                });

            return () => {
                console.log('Admin unsubscribing from chat');
                supabase.removeChannel(channel);
            };
        }
    }, [selectedChatUser]);

    const scrollToBottom = () => {
        setTimeout(() => {
            chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === ADMIN_PASSWORD) {
            setIsAuthenticated(true);
            toast.success('Welcome, Admin!');
        } else {
            toast.error('Incorrect password');
        }
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        setPassword('');
        navigate('/dashboard');
    };

    const fetchUsers = async () => {
        setIsLoadingUsers(true);
        try {
            const { data: profiles, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(profiles || []);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Failed to fetch users');
        } finally {
            setIsLoadingUsers(false);
        }
    };

    const activateSubscription = async (userId: string, plan: string, duration: 'monthly' | 'yearly') => {
        try {
            const endDate = new Date();
            if (duration === 'monthly') {
                endDate.setMonth(endDate.getMonth() + 1);
            } else {
                endDate.setFullYear(endDate.getFullYear() + 1);
            }

            const { error } = await supabase
                .from('profiles')
                .update({
                    subscription_status: 'active',
                    subscription_plan: plan,
                    subscription_end_date: endDate.toISOString()
                })
                .eq('id', userId);

            if (error) throw error;
            toast.success('Subscription activated successfully');
            fetchUsers();
        } catch (error) {
            console.error('Error activating subscription:', error);
            toast.error('Failed to activate subscription');
        }
    };

    const deactivateSubscription = async (userId: string) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    subscription_status: null,
                    subscription_plan: null,
                    subscription_end_date: null
                })
                .eq('id', userId);

            if (error) throw error;
            toast.success('Subscription deactivated');
            fetchUsers();
        } catch (error) {
            console.error('Error deactivating subscription:', error);
            toast.error('Failed to deactivate subscription');
        }
    };

    const fetchCoupons = async () => {
        setIsLoadingCoupons(true);
        try {
            const { data, error } = await supabase
                .from('coupons')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCoupons(data || []);
        } catch (error) {
            console.error('Error fetching coupons:', error);
            toast.error('Failed to fetch coupons');
        } finally {
            setIsLoadingCoupons(false);
        }
    };

    const createCoupon = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { error } = await supabase
                .from('coupons')
                .insert({
                    code: newCoupon.code.toUpperCase(),
                    discount_type: newCoupon.discount_type,
                    discount_value: newCoupon.discount_value,
                    max_uses: newCoupon.max_uses,
                    used_count: 0,
                    valid_until: newCoupon.valid_until,
                    is_active: true,
                    duration: newCoupon.discount_type === 'free' ? newCoupon.duration : null
                });

            if (error) throw error;
            toast.success('Coupon created successfully');
            setShowCouponForm(false);
            setNewCoupon({
                code: '',
                discount_type: 'percentage',
                discount_value: 0,
                max_uses: 1,
                valid_until: '',
                duration: 'monthly'
            });
            fetchCoupons();
        } catch (error: any) {
            console.error('Error creating coupon:', error);
            toast.error(error.message || 'Failed to create coupon');
        }
    };

    const deleteCoupon = async (id: string) => {
        if (!confirm('Are you sure you want to delete this coupon?')) return;

        try {
            const { error } = await supabase
                .from('coupons')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Coupon deleted');
            fetchCoupons();
        } catch (error) {
            console.error('Error deleting coupon:', error);
            toast.error('Failed to delete coupon');
        }
    };

    const toggleCouponStatus = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('coupons')
                .update({ is_active: !currentStatus })
                .eq('id', id);

            if (error) throw error;
            toast.success(`Coupon ${!currentStatus ? 'activated' : 'deactivated'}`);
            fetchCoupons();
        } catch (error) {
            console.error('Error toggling coupon:', error);
            toast.error('Failed to update coupon');
        }
    };

    const fetchChatUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('chat_messages')
                .select('user_id, user_email')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Get unique users
            const uniqueUsers = Array.from(new Set(data?.map(m => m.user_id) || []));
            setChatUsers(uniqueUsers);
        } catch (error) {
            console.error('Error fetching chat users:', error);
        }
    };

    const fetchUserInfo = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;
            setSelectedUserInfo(data);
        } catch (error) {
            console.error('Error fetching user info:', error);
            setSelectedUserInfo(null);
        }
    };

    const fetchChatMessages = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setChatMessages(data || []);
            scrollToBottom();
        } catch (error) {
            console.error('Error fetching chat messages:', error);
        }
    };

    const sendChatMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newChatMessage.trim() || !selectedChatUser) return;

        try {
            const userEmail = chatMessages[0]?.user_email || '';

            const { error } = await supabase
                .from('chat_messages')
                .insert({
                    user_id: selectedChatUser,
                    user_email: userEmail,
                    message: newChatMessage.trim(),
                    is_admin: true
                });

            if (error) throw error;
            setNewChatMessage('');
            scrollToBottom();
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Failed to send message');
        }
    };

    const closeChat = async () => {
        if (!selectedChatUser) return;
        if (!confirm('Are you sure you want to close this chat? This will prompt the user for a rating.')) return;

        try {
            // Send a system message indicating chat closure
            const { error } = await supabase
                .from('chat_messages')
                .insert({
                    user_id: selectedChatUser,
                    user_email: 'system',
                    message: 'CHAT_CLOSED_BY_ADMIN',
                    is_admin: true
                });

            if (error) throw error;
            toast.success('Chat closed and rating requested');

            // Optionally clear selected user or show a "Closed" status
            // setSelectedChatUser(null);
        } catch (error) {
            console.error('Error closing chat:', error);
            toast.error('Failed to close chat');
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
                    <div className="flex justify-center mb-6">
                        <Logo />
                    </div>
                    <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-6">
                        Admin Panel
                    </h2>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    placeholder="Enter admin password"
                                    required
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                        >
                            Login
                        </button>
                    </form>
                </div>
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
                            <Logo />
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="inline-flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                        >
                            <LogOut className="h-4 w-4 mr-2" />
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`${activeTab === 'users'
                                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                        >
                            <Users className="h-5 w-5 mr-2" />
                            Users & Subscriptions
                        </button>
                        <button
                            onClick={() => setActiveTab('coupons')}
                            className={`${activeTab === 'coupons'
                                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                        >
                            <Tag className="h-5 w-5 mr-2" />
                            Coupon Codes
                        </button>
                        <button
                            onClick={() => setActiveTab('chat')}
                            className={`${activeTab === 'chat'
                                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                        >
                            <MessageCircle className="h-5 w-5 mr-2" />
                            Customer Chat
                        </button>
                    </nav>
                </div>

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                User Management
                            </h2>
                            <div className="mt-4">
                                <input
                                    type="text"
                                    placeholder="Search by name or email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            {isLoadingUsers ? (
                                <div className="flex items-center justify-center p-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                                </div>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                User
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Plan
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Valid Until
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {users.filter(user =>
                                            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
                                        ).map((user) => (
                                            <tr key={user.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {user.full_name || user.email}
                                                    </div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                                        {user.email}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {user.subscription_status === 'active' ? (
                                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                            Active
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400">
                                                            Free
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                    {user.subscription_plan || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                    {user.subscription_end_date
                                                        ? new Date(user.subscription_end_date).toLocaleDateString()
                                                        : '-'
                                                    }
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                                                    {user.subscription_status === 'active' ? (
                                                        <button
                                                            onClick={() => deactivateSubscription(user.id)}
                                                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                                        >
                                                            Deactivate
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => activateSubscription(user.id, 'Professional', 'monthly')}
                                                                className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                                            >
                                                                1 Month
                                                            </button>
                                                            <button
                                                                onClick={() => activateSubscription(user.id, 'Professional', 'yearly')}
                                                                className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                                            >
                                                                1 Year
                                                            </button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}

                {/* Coupons Tab */}
                {activeTab === 'coupons' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Coupon Codes
                            </h2>
                            <button
                                onClick={() => setShowCouponForm(!showCouponForm)}
                                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Create Coupon
                            </button>
                        </div>

                        {showCouponForm && (
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                    New Coupon
                                </h3>
                                <form onSubmit={createCoupon} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Coupon Code
                                            </label>
                                            <input
                                                type="text"
                                                value={newCoupon.code}
                                                onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white uppercase"
                                                placeholder="SUMMER2024"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Discount Type
                                            </label>
                                            <select
                                                value={newCoupon.discount_type}
                                                onChange={(e) => setNewCoupon({ ...newCoupon, discount_type: e.target.value as any })}
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                                            >
                                                <option value="percentage">Percentage</option>
                                                <option value="fixed">Fixed Amount</option>
                                                <option value="free">Free Subscription</option>
                                            </select>
                                        </div>
                                        {newCoupon.discount_type === 'free' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Duration
                                                </label>
                                                <select
                                                    value={newCoupon.duration}
                                                    onChange={(e) => setNewCoupon({ ...newCoupon, duration: e.target.value as 'monthly' | 'annual' })}
                                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                                                >
                                                    <option value="monthly">Monthly</option>
                                                    <option value="annual">Annual</option>
                                                </select>
                                            </div>
                                        )}
                                        {newCoupon.discount_type !== 'free' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Discount Value {newCoupon.discount_type === 'percentage' ? '(%)' : '(EGP)'}
                                                </label>
                                                <input
                                                    type="number"
                                                    value={newCoupon.discount_value}
                                                    onChange={(e) => setNewCoupon({ ...newCoupon, discount_value: Number(e.target.value) })}
                                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                                                    min="0"
                                                    max={newCoupon.discount_type === 'percentage' ? 100 : undefined}
                                                    required
                                                />
                                            </div>
                                        )}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Max Uses
                                            </label>
                                            <input
                                                type="number"
                                                value={newCoupon.max_uses}
                                                onChange={(e) => setNewCoupon({ ...newCoupon, max_uses: Number(e.target.value) })}
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                                                min="1"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Valid Until
                                            </label>
                                            <input
                                                type="date"
                                                value={newCoupon.valid_until}
                                                onChange={(e) => setNewCoupon({ ...newCoupon, valid_until: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end space-x-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowCouponForm(false)}
                                            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                        >
                                            Create Coupon
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                            {isLoadingCoupons ? (
                                <div className="flex items-center justify-center p-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                                </div>
                            ) : coupons.length === 0 ? (
                                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                    No coupons created yet
                                </div>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                                Code
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                                Discount
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                                Uses
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                                Valid Until
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {coupons.map((coupon) => (
                                            <tr key={coupon.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="font-mono font-semibold text-gray-900 dark:text-white">
                                                        {coupon.code}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                    {coupon.discount_type === 'free'
                                                        ? 'Free Subscription'
                                                        : coupon.discount_type === 'percentage'
                                                            ? `${coupon.discount_value}%`
                                                            : `${coupon.discount_value} EGP`
                                                    }
                                                    {coupon.discount_type === 'free' && coupon.duration && (
                                                        <span className="ml-2 text-xs text-gray-500">
                                                            ({coupon.duration})
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                    {coupon.used_count} / {coupon.max_uses}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                    {new Date(coupon.valid_until).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {coupon.is_active ? (
                                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                            Active
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                                            Inactive
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                                                    <button
                                                        onClick={() => toggleCouponStatus(coupon.id, coupon.is_active)}
                                                        className="text-indigo-600 hover:text-indigo-900"
                                                    >
                                                        {coupon.is_active ? 'Deactivate' : 'Activate'}
                                                    </button>
                                                    <button
                                                        onClick={() => deleteCoupon(coupon.id)}
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}

                {/* Chat Tab */}
                {activeTab === 'chat' && (
                    <div className="grid grid-cols-3 gap-6 h-[600px]">
                        {/* Users List */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="font-semibold text-gray-900 dark:text-white">Conversations</h3>
                            </div>
                            <div className="overflow-y-auto h-full">
                                {chatUsers.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                                        No conversations yet
                                    </div>
                                ) : (
                                    chatUsers.map((userId) => (
                                        <button
                                            key={userId}
                                            onClick={() => setSelectedChatUser(userId)}
                                            className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 ${selectedChatUser === userId ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                                                }`}
                                        >
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {userId.substring(0, 8)}...
                                            </p>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Chat Messages */}
                        <div className="col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow flex flex-col">
                            {selectedChatUser ? (
                                <>
                                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                                                    {selectedUserInfo?.full_name || chatMessages[0]?.user_email || 'User Chat'}
                                                </h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                    {selectedUserInfo?.email || chatMessages[0]?.user_email}
                                                </p>

                                                {/* User Details Grid */}
                                                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                                    {selectedUserInfo?.phone && (
                                                        <div>
                                                            <span className="text-gray-500 dark:text-gray-400">Phone:</span>
                                                            <span className="ml-1 text-gray-900 dark:text-white">{selectedUserInfo.phone}</span>
                                                        </div>
                                                    )}
                                                    {selectedUserInfo?.institution && (
                                                        <div>
                                                            <span className="text-gray-500 dark:text-gray-400">Institution:</span>
                                                            <span className="ml-1 text-gray-900 dark:text-white">{selectedUserInfo.institution}</span>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <span className="text-gray-500 dark:text-gray-400">Status:</span>
                                                        <span className={`ml-1 font-medium ${selectedUserInfo?.subscription_status === 'active'
                                                            ? 'text-green-600 dark:text-green-400'
                                                            : 'text-gray-600 dark:text-gray-400'
                                                            }`}>
                                                            {selectedUserInfo?.subscription_status === 'active' ? 'Subscribed' : 'Free'}
                                                        </span>
                                                    </div>
                                                    {selectedUserInfo?.subscription_plan && (
                                                        <div>
                                                            <span className="text-gray-500 dark:text-gray-400">Plan:</span>
                                                            <span className="ml-1 text-gray-900 dark:text-white">{selectedUserInfo.subscription_plan}</span>
                                                        </div>
                                                    )}
                                                    {selectedUserInfo?.created_at && (
                                                        <div className="col-span-2">
                                                            <span className="text-gray-500 dark:text-gray-400">Member since:</span>
                                                            <span className="ml-1 text-gray-900 dark:text-white">
                                                                {new Date(selectedUserInfo.created_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 flex justify-end">
                                        <button
                                            onClick={closeChat}
                                            className="text-xs bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 px-3 py-1 rounded-full transition-colors"
                                        >
                                            Close Chat & Request Rating
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                        {chatMessages.map((msg) => (
                                            <div
                                                key={msg.id}
                                                className={`flex ${msg.is_admin ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div
                                                    className={`max-w-[70%] rounded-lg p-3 ${msg.is_admin
                                                        ? 'bg-indigo-600 text-white'
                                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                                        }`}
                                                >
                                                    <p className="text-sm">{msg.message}</p>
                                                    <p className={`text-xs mt-1 ${msg.is_admin ? 'text-indigo-200' : 'text-gray-500'}`}>
                                                        {new Date(msg.created_at).toLocaleTimeString()}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        <div ref={chatMessagesEndRef} />
                                    </div>
                                    <form onSubmit={sendChatMessage} className="p-4 border-t border-gray-200 dark:border-gray-700">
                                        <div className="flex space-x-2">
                                            <input
                                                type="text"
                                                value={newChatMessage}
                                                onChange={(e) => setNewChatMessage(e.target.value)}
                                                placeholder="Type your response..."
                                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                                            />
                                            <button
                                                type="submit"
                                                className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700"
                                            >
                                                <Send className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </form>
                                </>
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                                    Select a conversation to start chatting
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

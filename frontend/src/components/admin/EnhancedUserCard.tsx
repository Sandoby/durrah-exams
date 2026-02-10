import { useState, useEffect } from 'react';
import {
    User, Mail, Clock,
    CreditCard, ChevronDown, ChevronUp,
    FileText, MessageSquare, Plus, Calendar, X, Check
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface User {
    id: string;
    email: string;
    full_name?: string;
    phone?: string;
    institution?: string;
    subscription_status?: string;
    subscription_plan?: string;
    subscription_end_date?: string;
    role?: 'tutor' | 'student' | null;
    created_at: string;
}

interface UserStats {
    total_exams: number;
    total_submissions: number;
    active_exams: number;
    last_login?: string;
}

interface SupportNote {
    id: string;
    note: string;
    created_by: string;
    created_at: string;
}

interface EnhancedUserCardProps {
    user: User;
    onUpdate: () => void;
    agentId?: string | null;
}

export function EnhancedUserCard({ user, onUpdate, agentId }: EnhancedUserCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [stats, setStats] = useState<UserStats | null>(null);
    const [notes, setNotes] = useState<SupportNote[]>([]);
    const [newNote, setNewNote] = useState('');
    const [isLoadingStats, setIsLoadingStats] = useState(false);
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
    const [subscriptionAction, setSubscriptionAction] = useState<'activate' | 'extend' | 'deactivate'>('activate');
    const [subscriptionPlan, setSubscriptionPlan] = useState<'pro' | 'basic'>('pro');
    const [subscriptionDuration, setSubscriptionDuration] = useState<'monthly' | 'yearly' | 'custom'>('monthly');
    const [customDays, setCustomDays] = useState(30);

    useEffect(() => {
        if (isExpanded && !stats) {
            fetchUserStats();
            fetchNotes();
        }
    }, [isExpanded]);

    const fetchUserStats = async () => {
        setIsLoadingStats(true);
        try {
            const { data, error } = await supabase
                .rpc('get_user_stats', { p_user_id: user.id });

            if (error) throw error;
            setStats(data[0] || { total_exams: 0, total_submissions: 0, active_exams: 0 });
        } catch (error) {
            console.error('Error fetching user stats:', error);
        } finally {
            setIsLoadingStats(false);
        }
    };

    const fetchNotes = async () => {
        try {
            const { data, error } = await supabase
                .from('support_notes')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setNotes(data || []);
        } catch (error) {
            console.error('Error fetching notes:', error);
        }
    };

    const addNote = async () => {
        if (!newNote.trim()) return;

        setIsAddingNote(true);
        try {
            const { error } = await supabase
                .from('support_notes')
                .insert({
                    user_id: user.id,
                    note: newNote.trim()
                });

            if (error) throw error;
            toast.success('Note added');
            setNewNote('');
            fetchNotes();
        } catch (error) {
            console.error('Error adding note:', error);
            toast.error('Failed to add note');
        } finally {
            setIsAddingNote(false);
        }
    };

    const activateSubscription = async () => {
        try {
            let days = 0;
            if (subscriptionDuration === 'monthly') {
                days = 30;
            } else if (subscriptionDuration === 'yearly') {
                days = 365;
            } else {
                days = customDays;
            }

            const endDate = new Date();
            endDate.setDate(endDate.getDate() + days);

            const { data, error } = await supabase.rpc('extend_subscription', {
                p_user_id: user.id,
                p_agent_id: agentId,
                p_days: days,
                p_plan: subscriptionPlan,
                p_reason: `Activated ${subscriptionPlan} plan from admin panel`
            });

            if (error) throw error;

            if (data?.success) {
                toast.success(`Subscription activated: ${subscriptionPlan} (${days} days)`);
                setShowSubscriptionModal(false);
                onUpdate();
            } else {
                throw new Error(data?.error || 'Failed to activate subscription');
            }
        } catch (error) {
            console.error('Error activating subscription:', error);
            toast.error('Failed to activate subscription');
        }
    };

    const extendSubscription = async () => {
        try {
            let days = 0;
            if (subscriptionDuration === 'monthly') {
                days = 30;
            } else if (subscriptionDuration === 'yearly') {
                days = 365;
            } else {
                days = customDays;
            }

            const currentEnd = user.subscription_end_date
                ? new Date(user.subscription_end_date)
                : new Date();

            const newEnd = new Date(currentEnd);
            newEnd.setDate(newEnd.getDate() + days);

            const { data, error } = await supabase.rpc('extend_subscription', {
                p_user_id: user.id,
                p_agent_id: agentId,
                p_days: days,
                p_plan: user.subscription_plan || 'pro',
                p_reason: 'Extended from admin panel'
            });

            if (error) throw error;

            if (data?.success) {
                toast.success(`Subscription extended by ${days} days`);
                setShowSubscriptionModal(false);
                onUpdate();
            } else {
                throw new Error(data?.error || 'Failed to extend subscription');
            }
        } catch (error) {
            console.error('Error extending subscription:', error);
            toast.error('Failed to extend subscription');
        }
    };

    const deactivateSubscription = async () => {
        try {
            const { data, error } = await supabase.rpc('cancel_subscription', {
                p_user_id: user.id,
                p_agent_id: agentId,
                p_reason: 'Deactivated from admin panel'
            });

            if (error) throw error;

            if (data?.success) {
                toast.success('Subscription deactivated');
                setShowSubscriptionModal(false);
                onUpdate();
            } else {
                throw new Error(data?.error || 'Failed to deactivate subscription');
            }
        } catch (error) {
            console.error('Error deactivating subscription:', error);
            toast.error('Failed to deactivate subscription');
        }
    };

    const handleSubscriptionAction = () => {
        if (subscriptionAction === 'activate') {
            activateSubscription();
        } else if (subscriptionAction === 'extend') {
            extendSubscription();
        } else {
            deactivateSubscription();
        }
    };

    const sendEmail = () => {
        window.location.href = `mailto:${user.email}`;
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getStatusBadge = () => {
        if (user.subscription_status === 'trialing') {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">Trial</span>;
        }

        if (!user.subscription_status || user.subscription_status !== 'active') {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">Free</span>;
        }

        const endDate = user.subscription_end_date ? new Date(user.subscription_end_date) : null;
        const isExpired = endDate && endDate < new Date();

        if (isExpired) {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Expired</span>;
        }

        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Active</span>;
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow">
            {/* Collapsed View */}
            <div
                className="p-4 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-gray-900 dark:text-white">
                                        {user.full_name || 'No Name'}
                                    </h3>
                                    {user.role === 'student' && (
                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                                            Student
                                        </span>
                                    )}
                                    {getStatusBadge()}
                                    {user.subscription_plan && user.role !== 'student' && (
                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                                            {user.subscription_plan}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                                    <Mail className="h-3 w-3" />
                                    {user.email}
                                </p>
                                <p className="text-[10px] font-mono text-gray-400 mt-0.5">
                                    ID: {user.id}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                            Joined {formatDate(user.created_at)}
                        </span>
                        {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                    </div>
                </div>
            </div>

            {/* Expanded View */}
            {isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* User Details */}
                        <div className="space-y-3">
                            <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <User className="h-4 w-4" />
                                User Details
                            </h4>
                            <div className="space-y-2 text-sm">
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400">User ID:</span>
                                    <p className="text-gray-900 dark:text-white font-mono text-xs">{user.id}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400">Email:</span>
                                    <p className="text-gray-900 dark:text-white">{user.email}</p>
                                </div>
                                {user.phone && (
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">Phone:</span>
                                        <p className="text-gray-900 dark:text-white">{user.phone}</p>
                                    </div>
                                )}
                                {user.institution && (
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">Institution:</span>
                                        <p className="text-gray-900 dark:text-white">{user.institution}</p>
                                    </div>
                                )}
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400">Joined:</span>
                                    <p className="text-gray-900 dark:text-white flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatDate(user.created_at)}
                                    </p>
                                </div>
                            </div>

                            {user.role !== 'student' && (
                                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                                    <h5 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                                        <CreditCard className="h-4 w-4" />
                                        Subscription
                                    </h5>
                                    <div className="space-y-2 text-sm">
                                        <div>
                                            <span className="text-gray-500 dark:text-gray-400">Status:</span>
                                            <div className="mt-1">{getStatusBadge()}</div>
                                        </div>
                                        {user.subscription_plan && (
                                            <div>
                                                <span className="text-gray-500 dark:text-gray-400">Plan:</span>
                                                <p className="text-gray-900 dark:text-white capitalize">{user.subscription_plan}</p>
                                            </div>
                                        )}
                                        {user.subscription_end_date && (
                                            <div>
                                                <span className="text-gray-500 dark:text-gray-400">Expires:</span>
                                                <p className="text-gray-900 dark:text-white">{formatDate(user.subscription_end_date)}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* User Statistics / Management (Tutor Only) */}
                        {user.role !== 'student' && (
                            <div className="space-y-3">
                                <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Statistics
                                </h4>
                                {isLoadingStats ? (
                                    <div className="space-y-2">
                                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                                    </div>
                                ) : stats ? (
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 dark:text-gray-400">Total Exams:</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">{stats.total_exams}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 dark:text-gray-400">Submissions:</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">{stats.total_submissions}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 dark:text-gray-400">Active Exams:</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">{stats.active_exams}</span>
                                        </div>
                                    </div>
                                ) : null}

                                {/* Subscription Management */}
                                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                                    <h5 className="font-semibold text-gray-900 dark:text-white mb-2">Subscription Management</h5>
                                    <div className="space-y-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSubscriptionAction('activate');
                                                setShowSubscriptionModal(true);
                                            }}
                                            className="w-full px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Check className="h-4 w-4" />
                                            Activate Subscription
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSubscriptionAction('extend');
                                                setShowSubscriptionModal(true);
                                            }}
                                            className="w-full px-3 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Calendar className="h-4 w-4" />
                                            Extend Subscription
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSubscriptionAction('deactivate');
                                                setShowSubscriptionModal(true);
                                            }}
                                            className="w-full px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <X className="h-4 w-4" />
                                            Deactivate Subscription
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                sendEmail();
                                            }}
                                            className="w-full px-3 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                                        >
                                            Send Email
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Support Notes */}
                        <div className="space-y-3">
                            <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <MessageSquare className="h-4 w-4" />
                                Support Notes
                            </h4>
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newNote}
                                        onChange={(e) => setNewNote(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        placeholder="Add a note..."
                                        className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            addNote();
                                        }}
                                        disabled={isAddingNote || !newNote.trim()}
                                        className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {notes.length === 0 ? (
                                        <p className="text-sm text-gray-500 dark:text-gray-400">No notes yet</p>
                                    ) : (
                                        notes.map((note) => (
                                            <div key={note.id} className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                                                <p className="text-gray-900 dark:text-white">{note.note}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    {formatDate(note.created_at)}
                                                </p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Subscription Management Modal */}
            {showSubscriptionModal && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                    onClick={() => setShowSubscriptionModal(false)}
                >
                    <div
                        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {subscriptionAction === 'activate' && 'Activate Subscription'}
                                {subscriptionAction === 'extend' && 'Extend Subscription'}
                                {subscriptionAction === 'deactivate' && 'Deactivate Subscription'}
                            </h3>
                            <button
                                onClick={() => setShowSubscriptionModal(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {subscriptionAction === 'deactivate' ? (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                    <p className="text-sm text-red-800 dark:text-red-200">
                                        Are you sure you want to deactivate this user's subscription? This will remove their access to premium features.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Plan Selection (only for activation) */}
                                    {subscriptionAction === 'activate' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Subscription Plan
                                            </label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    onClick={() => setSubscriptionPlan('pro')}
                                                    className={`px-4 py-2 rounded border-2 transition-colors ${subscriptionPlan === 'pro'
                                                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                                                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                                                        }`}
                                                >
                                                    Pro
                                                </button>
                                                <button
                                                    onClick={() => setSubscriptionPlan('basic')}
                                                    className={`px-4 py-2 rounded border-2 transition-colors ${subscriptionPlan === 'basic'
                                                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                                                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                                                        }`}
                                                >
                                                    Basic
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Duration Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Duration
                                        </label>
                                        <div className="grid grid-cols-3 gap-2 mb-2">
                                            <button
                                                onClick={() => setSubscriptionDuration('monthly')}
                                                className={`px-4 py-2 rounded border-2 transition-colors ${subscriptionDuration === 'monthly'
                                                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                                                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                                                    }`}
                                            >
                                                Monthly
                                            </button>
                                            <button
                                                onClick={() => setSubscriptionDuration('yearly')}
                                                className={`px-4 py-2 rounded border-2 transition-colors ${subscriptionDuration === 'yearly'
                                                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                                                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                                                    }`}
                                            >
                                                Yearly
                                            </button>
                                            <button
                                                onClick={() => setSubscriptionDuration('custom')}
                                                className={`px-4 py-2 rounded border-2 transition-colors ${subscriptionDuration === 'custom'
                                                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                                                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                                                    }`}
                                            >
                                                Custom
                                            </button>
                                        </div>

                                        {subscriptionDuration === 'custom' && (
                                            <div className="mt-2">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Number of Days
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={customDays}
                                                    onChange={(e) => setCustomDays(parseInt(e.target.value) || 1)}
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Summary */}
                                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                        <p className="text-sm text-gray-700 dark:text-gray-300">
                                            <strong>Summary:</strong>
                                            {subscriptionAction === 'activate' && ` Activate ${subscriptionPlan} plan for `}
                                            {subscriptionAction === 'extend' && ` Extend subscription by `}
                                            {subscriptionDuration === 'monthly' && '30 days'}
                                            {subscriptionDuration === 'yearly' && '365 days'}
                                            {subscriptionDuration === 'custom' && `${customDays} days`}
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowSubscriptionModal(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubscriptionAction}
                                className={`flex-1 px-4 py-2 text-white rounded transition-colors ${subscriptionAction === 'deactivate'
                                    ? 'bg-red-600 hover:bg-red-700'
                                    : 'bg-indigo-600 hover:bg-indigo-700'
                                    }`}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

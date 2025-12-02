import { useState, useEffect } from 'react';
import {
    ChevronDown, ChevronUp, Mail, Calendar, Crown, Activity,
    FileText, Users, TrendingUp, Clock, Edit, Trash2, Send
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
}

export function EnhancedUserCard({ user, onUpdate }: EnhancedUserCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [stats, setStats] = useState<UserStats | null>(null);
    const [notes, setNotes] = useState<SupportNote[]>([]);
    const [newNote, setNewNote] = useState('');
    const [isLoadingStats, setIsLoadingStats] = useState(false);
    const [isAddingNote, setIsAddingNote] = useState(false);

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

    const extendSubscription = async (days: number) => {
        try {
            const currentEnd = user.subscription_end_date
                ? new Date(user.subscription_end_date)
                : new Date();

            const newEnd = new Date(currentEnd);
            newEnd.setDate(newEnd.getDate() + days);

            const { error } = await supabase
                .from('profiles')
                .update({
                    subscription_status: 'active',
                    subscription_end_date: newEnd.toISOString()
                })
                .eq('id', user.id);

            if (error) throw error;
            toast.success(`Subscription extended by ${days} days`);
            onUpdate();
        } catch (error) {
            console.error('Error extending subscription:', error);
            toast.error('Failed to extend subscription');
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
                                    {getStatusBadge()}
                                    {user.subscription_plan && (
                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                                            {user.subscription_plan}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                                    <Mail className="h-3 w-3" />
                                    {user.email}
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
                        {/* Left: User Info */}
                        <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">User Information</h4>
                            <div className="space-y-2 text-sm">
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400">Email:</span>
                                    <p className="font-medium text-gray-900 dark:text-white">{user.email}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400">Name:</span>
                                    <p className="font-medium text-gray-900 dark:text-white">{user.full_name || 'N/A'}</p>
                                </div>
                                {user.phone && (
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">Phone:</span>
                                        <p className="font-medium text-gray-900 dark:text-white">{user.phone}</p>
                                    </div>
                                )}
                                {user.institution && (
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">Institution:</span>
                                        <p className="font-medium text-gray-900 dark:text-white">{user.institution}</p>
                                    </div>
                                )}
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400">Joined:</span>
                                    <p className="font-medium text-gray-900 dark:text-white">{formatDate(user.created_at)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Middle: Statistics */}
                        <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Statistics</h4>
                            {isLoadingStats ? (
                                <div className="text-sm text-gray-500">Loading...</div>
                            ) : stats ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-indigo-600" />
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Total Exams</p>
                                            <p className="font-semibold text-gray-900 dark:text-white">{stats.total_exams}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-green-600" />
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Total Submissions</p>
                                            <p className="font-semibold text-gray-900 dark:text-white">{stats.total_submissions}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4 text-blue-600" />
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Active Exams</p>
                                            <p className="font-semibold text-gray-900 dark:text-white">{stats.active_exams}</p>
                                        </div>
                                    </div>
                                    {stats.last_login && (
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-purple-600" />
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Last Login</p>
                                                <p className="font-semibold text-gray-900 dark:text-white">{formatDate(stats.last_login)}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : null}

                            {/* Subscription Info */}
                            {user.subscription_status === 'active' && user.subscription_end_date && (
                                <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Crown className="h-4 w-4 text-indigo-600" />
                                        <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-200">
                                            {user.subscription_plan} Plan
                                        </span>
                                    </div>
                                    <p className="text-xs text-indigo-700 dark:text-indigo-300">
                                        Expires: {formatDate(user.subscription_end_date)}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Right: Quick Actions */}
                        <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Quick Actions</h4>
                            <div className="space-y-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); extendSubscription(30); }}
                                    className="w-full text-left px-3 py-2 text-sm bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg transition-colors"
                                >
                                    Extend 30 Days
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); sendEmail(); }}
                                    className="w-full text-left px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <Send className="h-4 w-4" />
                                    Send Email
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Support Notes */}
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Support Notes</h4>

                        {/* Add Note */}
                        <div className="mb-4">
                            <textarea
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                placeholder="Add internal note about this user..."
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm resize-none"
                                rows={2}
                            />
                            <button
                                onClick={(e) => { e.stopPropagation(); addNote(); }}
                                disabled={isAddingNote || !newNote.trim()}
                                className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm"
                            >
                                {isAddingNote ? 'Adding...' : 'Add Note'}
                            </button>
                        </div>

                        {/* Notes List */}
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {notes.length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400 italic">No notes yet</p>
                            ) : (
                                notes.map(note => (
                                    <div key={note.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                        <p className="text-sm text-gray-900 dark:text-white">{note.note}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {formatDate(note.created_at)}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

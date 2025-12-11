import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    MessageCircle, Shield, Lock, LogOut, Plus, Trash2,
    Eye, EyeOff, X, BarChart3, Key,
    Activity, Search
} from 'lucide-react';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const SUPER_ADMIN_PASSWORD = '2352206';

interface Agent {
    id: string;
    name: string;
    email: string;
    access_code: string;
    is_active: boolean;
    created_at: string;
    last_login: string | null;
    total_chats_handled: number;
    permissions: {
        can_view_payments: boolean;
        can_extend_subscriptions: boolean;
        can_cancel_subscriptions: boolean;
    };
    notes: string | null;
}

interface ChatSession {
    id: string;
    user_id: string;
    agent_id: string | null;
    status: string;
    created_at: string;
    profiles?: {
        email: string;
        full_name: string;
    };
    support_agents?: {
        name: string;
    };
}

interface AgentActivity {
    id: string;
    agent_id: string;
    action_type: string;
    user_id: string | null;
    details: any;
    created_at: string;
    support_agents: {
        name: string;
    };
}

interface SystemStats {
    totalAgents: number;
    activeAgents: number;
    totalChats: number;
    activeChats: number;
    todayActivities: number;
}

export default function SuperAdminPanel() {
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'agents' | 'chats' | 'analytics' | 'activities'>('agents');

    // Agent Management
    const [agents, setAgents] = useState<Agent[]>([]);
    const [showAddAgent, setShowAddAgent] = useState(false);
    const [newAgent, setNewAgent] = useState({
        name: '',
        email: '',
        notes: '',
        permissions: {
            can_view_payments: true,
            can_extend_subscriptions: true,
            can_cancel_subscriptions: false
        }
    });

    // Chat Management
    const [chats, setChats] = useState<ChatSession[]>([]);
    const [chatSearch, setChatSearch] = useState('');
    const [chatFilter, setChatFilter] = useState<'all' | 'open' | 'closed'>('all');

    // Activity Logs
    const [activities, setActivities] = useState<AgentActivity[]>([]);

    // System Stats
    const [stats, setStats] = useState<SystemStats>({
        totalAgents: 0,
        activeAgents: 0,
        totalChats: 0,
        activeChats: 0,
        todayActivities: 0
    });

    useEffect(() => {
        if (isAuthenticated) {
            fetchAllData();
            const interval = setInterval(fetchAllData, 10000); // Refresh every 10 seconds
            return () => clearInterval(interval);
        }
    }, [isAuthenticated, activeTab]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === SUPER_ADMIN_PASSWORD) {
            setIsAuthenticated(true);
            toast.success('Welcome, Super Admin');
        } else {
            toast.error('Invalid password');
        }
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        setPassword('');
        navigate('/');
    };

    const fetchAllData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'agents') {
                await fetchAgents();
            } else if (activeTab === 'chats') {
                await fetchChats();
            } else if (activeTab === 'activities') {
                await fetchActivities();
            }
            await fetchStats();
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAgents = async () => {
        const { data, error } = await supabase
            .from('support_agents')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            toast.error('Failed to fetch agents');
            return;
        }

        setAgents(data || []);
    };

    const fetchChats = async () => {
        let query = supabase
            .from('live_chat_sessions')
            .select(`
                *,
                profiles:user_id(email, full_name),
                support_agents:agent_id(name)
            `)
            .order('created_at', { ascending: false });

        if (chatFilter === 'open') {
            query = query.eq('status', 'open');
        } else if (chatFilter === 'closed') {
            query = query.eq('status', 'closed');
        }

        const { data, error } = await query;

        if (error) {
            toast.error('Failed to fetch chats');
            return;
        }

        setChats(data || []);
    };

    const fetchActivities = async () => {
        const { data, error } = await supabase
            .from('agent_activity_logs')
            .select(`
                *,
                support_agents(name)
            `)
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            toast.error('Failed to fetch activities');
            return;
        }

        setActivities(data || []);
    };

    const fetchStats = async () => {
        const [agentsRes, chatsRes, activitiesRes] = await Promise.all([
            supabase.from('support_agents').select('*', { count: 'exact' }),
            supabase.from('live_chat_sessions').select('*', { count: 'exact' }),
            supabase.from('agent_activity_logs')
                .select('*', { count: 'exact' })
                .gte('created_at', new Date().toISOString().split('T')[0])
        ]);

        const activeAgents = agentsRes.data?.filter(a => a.is_active).length || 0;
        const activeChats = chatsRes.data?.filter((c: any) => c.status === 'open').length || 0;

        setStats({
            totalAgents: agentsRes.count || 0,
            activeAgents,
            totalChats: chatsRes.count || 0,
            activeChats,
            todayActivities: activitiesRes.count || 0
        });
    };

    const createAgent = async () => {
        if (!newAgent.name || !newAgent.email) {
            toast.error('Name and email are required');
            return;
        }

        setLoading(true);
        try {
            // Generate access code
            const { data: codeData, error: codeError } = await supabase
                .rpc('generate_access_code');

            if (codeError) throw codeError;

            const { error } = await supabase.from('support_agents').insert({
                name: newAgent.name,
                email: newAgent.email,
                access_code: codeData,
                notes: newAgent.notes,
                permissions: newAgent.permissions
            });

            if (error) throw error;

            toast.success(`Agent created! Access code: ${codeData}`);
            setShowAddAgent(false);
            setNewAgent({
                name: '',
                email: '',
                notes: '',
                permissions: {
                    can_view_payments: true,
                    can_extend_subscriptions: true,
                    can_cancel_subscriptions: false
                }
            });
            fetchAgents();
        } catch (error: any) {
            toast.error(error.message || 'Failed to create agent');
        } finally {
            setLoading(false);
        }
    };

    const toggleAgentStatus = async (agentId: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('support_agents')
            .update({ is_active: !currentStatus })
            .eq('id', agentId);

        if (error) {
            toast.error('Failed to update agent status');
            return;
        }

        toast.success(`Agent ${!currentStatus ? 'activated' : 'deactivated'}`);
        fetchAgents();
    };

    const deleteAgent = async (agentId: string, agentName: string) => {
        if (!confirm(`Are you sure you want to delete agent "${agentName}"?`)) return;

        const { error } = await supabase
            .from('support_agents')
            .delete()
            .eq('id', agentId);

        if (error) {
            toast.error('Failed to delete agent');
            return;
        }

        toast.success('Agent deleted');
        fetchAgents();
    };



    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <Logo className="h-12" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Super Admin</h1>
                        <p className="text-gray-600">Enter password to access admin panel</p>
                    </div>

                    <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-xl p-8">
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Lock className="h-4 w-4 inline mr-2" />
                                Admin Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="Enter password"
                                autoFocus
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                        >
                            Login
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    const filteredChats = chats.filter(chat => {
        if (!chatSearch) return true;
        const email = chat.profiles?.email?.toLowerCase() || '';
        const name = chat.profiles?.full_name?.toLowerCase() || '';
        return email.includes(chatSearch.toLowerCase()) || name.includes(chatSearch.toLowerCase());
    });

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div className="flex items-center space-x-4">
                            <Logo className="h-8" />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Super Admin Panel</h1>
                                <p className="text-sm text-gray-600">Full system control & management</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <LogOut className="h-5 w-5" />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-indigo-600">{stats.totalAgents}</div>
                            <div className="text-sm text-gray-600">Total Agents</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{stats.activeAgents}</div>
                            <div className="text-sm text-gray-600">Active Agents</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{stats.totalChats}</div>
                            <div className="text-sm text-gray-600">Total Chats</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">{stats.activeChats}</div>
                            <div className="text-sm text-gray-600">Active Chats</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">{stats.todayActivities}</div>
                            <div className="text-sm text-gray-600">Today's Activities</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex space-x-1">
                        {[
                            { id: 'agents', label: 'Agent Management', icon: Shield },
                            { id: 'chats', label: 'All Chats', icon: MessageCircle },
                            { id: 'activities', label: 'Activity Logs', icon: Activity },
                            { id: 'analytics', label: 'Analytics', icon: BarChart3 }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center space-x-2 px-6 py-4 border-b-2 transition-colors ${activeTab === tab.id
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                <tab.icon className="h-5 w-5" />
                                <span className="font-medium">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {activeTab === 'agents' && (
                    <div className="space-y-6">
                        {/* Add Agent Button */}
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">Agent Management</h2>
                            <button
                                onClick={() => setShowAddAgent(true)}
                                className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                <Plus className="h-5 w-5" />
                                <span>Add Agent</span>
                            </button>
                        </div>

                        {/* Add Agent Modal */}
                        {showAddAgent && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                                <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-xl font-bold">Add New Agent</h3>
                                        <button onClick={() => setShowAddAgent(false)} className="text-gray-400 hover:text-gray-600">
                                            <X className="h-6 w-6" />
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                            <input
                                                type="text"
                                                value={newAgent.name}
                                                onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                placeholder="Agent name"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                            <input
                                                type="email"
                                                value={newAgent.email}
                                                onChange={(e) => setNewAgent({ ...newAgent, email: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                placeholder="agent@example.com"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                            <textarea
                                                value={newAgent.notes}
                                                onChange={(e) => setNewAgent({ ...newAgent, notes: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                rows={3}
                                                placeholder="Optional notes..."
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">Permissions</label>
                                            <label className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    checked={newAgent.permissions.can_view_payments}
                                                    onChange={(e) => setNewAgent({
                                                        ...newAgent,
                                                        permissions: { ...newAgent.permissions, can_view_payments: e.target.checked }
                                                    })}
                                                    className="rounded"
                                                />
                                                <span className="text-sm">Can view payments</span>
                                            </label>
                                            <label className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    checked={newAgent.permissions.can_extend_subscriptions}
                                                    onChange={(e) => setNewAgent({
                                                        ...newAgent,
                                                        permissions: { ...newAgent.permissions, can_extend_subscriptions: e.target.checked }
                                                    })}
                                                    className="rounded"
                                                />
                                                <span className="text-sm">Can extend subscriptions</span>
                                            </label>
                                            <label className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    checked={newAgent.permissions.can_cancel_subscriptions}
                                                    disabled
                                                    className="rounded opacity-50"
                                                />
                                                <span className="text-sm text-gray-500">Can cancel subscriptions (Super admin only)</span>
                                            </label>
                                        </div>

                                        <div className="flex space-x-3 pt-4">
                                            <button
                                                onClick={createAgent}
                                                disabled={loading}
                                                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                            >
                                                {loading ? 'Creating...' : 'Create Agent'}
                                            </button>
                                            <button
                                                onClick={() => setShowAddAgent(false)}
                                                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Agents List */}
                        <div className="grid gap-4">
                            {agents.map((agent) => (
                                <div key={agent.id} className="bg-white rounded-lg shadow-sm border p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3 mb-2">
                                                <h3 className="text-lg font-bold text-gray-900">{agent.name}</h3>
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${agent.is_active
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {agent.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                            <div className="space-y-1 text-sm text-gray-600">
                                                <p>📧 {agent.email}</p>
                                                <p className="flex items-center space-x-2">
                                                    <Key className="h-4 w-4" />
                                                    <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{agent.access_code}</span>
                                                </p>
                                                <p>💬 {agent.total_chats_handled} chats handled</p>
                                                <p>🕒 Last login: {agent.last_login ? new Date(agent.last_login).toLocaleString() : 'Never'}</p>
                                                {agent.notes && <p className="text-gray-500 italic">Note: {agent.notes}</p>}
                                            </div>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {agent.permissions.can_view_payments && (
                                                    <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">View Payments</span>
                                                )}
                                                {agent.permissions.can_extend_subscriptions && (
                                                    <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded">Extend Subscriptions</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex space-x-2 ml-4">
                                            <button
                                                onClick={() => toggleAgentStatus(agent.id, agent.is_active)}
                                                className={`p-2 rounded-lg transition-colors ${agent.is_active
                                                    ? 'text-orange-600 hover:bg-orange-50'
                                                    : 'text-green-600 hover:bg-green-50'
                                                    }`}
                                                title={agent.is_active ? 'Deactivate' : 'Activate'}
                                            >
                                                {agent.is_active ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                            </button>
                                            <button
                                                onClick={() => deleteAgent(agent.id, agent.name)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete agent"
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {agents.length === 0 && (
                                <div className="text-center py-12 text-gray-500">
                                    <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                    <p>No agents yet. Create your first agent!</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'chats' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">All Chat Sessions</h2>
                            <div className="flex items-center space-x-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={chatSearch}
                                        onChange={(e) => setChatSearch(e.target.value)}
                                        placeholder="Search by email or name..."
                                        className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div className="flex space-x-2">
                                    {(['all', 'open', 'closed'] as const).map((filter) => (
                                        <button
                                            key={filter}
                                            onClick={() => setChatFilter(filter)}
                                            className={`px-4 py-2 rounded-lg transition-colors ${chatFilter === filter
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            {filter.charAt(0).toUpperCase() + filter.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-4">
                            {filteredChats.map((chat) => (
                                <div key={chat.id} className="bg-white rounded-lg shadow-sm border p-6">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3 mb-2">
                                                <h3 className="font-bold text-gray-900">
                                                    {chat.profiles?.full_name || 'Unknown User'}
                                                </h3>
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${chat.status === 'open'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {chat.status}
                                                </span>
                                            </div>
                                            <div className="space-y-1 text-sm text-gray-600">
                                                <p>📧 {chat.profiles?.email}</p>
                                                <p>👤 Assigned to: {chat.support_agents?.name || 'Unassigned'}</p>
                                                <p>🕒 Started: {new Date(chat.created_at).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => navigate(`/admin/chat/${chat.id}`)}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                        >
                                            View Chat
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {filteredChats.length === 0 && (
                                <div className="text-center py-12 text-gray-500">
                                    <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                    <p>No chats found</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'activities' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-gray-900">Recent Agent Activities</h2>

                        <div className="space-y-3">
                            {activities.map((activity) => (
                                <div key={activity.id} className="bg-white rounded-lg shadow-sm border p-4">
                                    <div className="flex items-start space-x-3">
                                        <Activity className="h-5 w-5 text-indigo-600 mt-0.5" />
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-2 mb-1">
                                                <span className="font-medium text-gray-900">{activity.support_agents.name}</span>
                                                <span className="text-gray-500">•</span>
                                                <span className="text-sm text-gray-600">{activity.action_type.replace(/_/g, ' ')}</span>
                                            </div>
                                            {activity.details && Object.keys(activity.details).length > 0 && (
                                                <pre className="text-xs text-gray-500 bg-gray-50 p-2 rounded mt-1 overflow-x-auto">
                                                    {JSON.stringify(activity.details, null, 2)}
                                                </pre>
                                            )}
                                            <p className="text-xs text-gray-500 mt-1">
                                                {new Date(activity.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {activities.length === 0 && (
                                <div className="text-center py-12 text-gray-500">
                                    <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                    <p>No activities yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'analytics' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-gray-900">System Analytics</h2>
                        <div className="bg-white rounded-lg shadow-sm border p-8 text-center text-gray-500">
                            <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                            <p>Advanced analytics coming soon...</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

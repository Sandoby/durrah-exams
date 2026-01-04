import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    MessageCircle, User, CreditCard, FileText, LogOut,
    AlertCircle, Package,
    Search, Key, Activity, Zap, Sparkles
} from 'lucide-react';
import { Logo } from '../../components/Logo';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { AgentChatPanel } from '../../components/ConvexChatWidget';
import { CONVEX_FEATURES } from '../../main';

interface Agent {
    id: string;
    name: string;
    email: string;
    access_code: string;
    permissions: {
        can_view_payments: boolean;
        can_extend_subscriptions: boolean;
    };
    total_chats_handled: number;
}

interface ChatSession {
    id: string;
    user_id: string;
    agent_id?: string | null;
    status: string;
    started_at?: string;
    user_email?: string | null;
    user_name?: string | null;
}

interface UserProfile {
    id: string;
    email: string;
    full_name: string;
    subscription_plan: string;
    subscription_status: string;
    subscription_end_date: string;
    created_at: string;
}

interface Payment {
    id: string;
    amount: number;
    status: string;
    created_at: string;
    provider: string;
}

interface Exam {
    id: string;
    exam_type: string;
    score: number;
    created_at: string;
}

interface AgentNote {
    id: string;
    note: string;
    is_important: boolean;
    created_at: string;
    updated_at: string;
}

interface CannedResponse {
    id: string;
    title: string;
    content: string;
    category: string;
    shortcut: string;
}

export default function AgentDashboard() {
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [accessCode, setAccessCode] = useState('');
    const [agent, setAgent] = useState<Agent | null>(null);
    const [loading, setLoading] = useState(false);

    // Chat & User Selection
    const [chats, setChats] = useState<ChatSession[]>([]);
    const [selectedChat, setSelectedChat] = useState<ChatSession | null>(null);
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [chatSearch, setChatSearch] = useState('');

    // User Profile Data
    const [userPayments, setUserPayments] = useState<Payment[]>([]);
    const [userExams, setUserExams] = useState<Exam[]>([]);
    const [userNotes, setUserNotes] = useState<AgentNote[]>([]);
    const [newNote, setNewNote] = useState('');
    const [noteImportant, setNoteImportant] = useState(false);

    // Subscription Extension
    const [extendDays, setExtendDays] = useState(30);
    const [extendReason, setExtendReason] = useState('');

    // Canned Responses
    const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);
    const [showCannedMenu, setShowCannedMenu] = useState(false);

    // Convex Chat Mode Toggle
    const [useConvexChat, setUseConvexChat] = useState(CONVEX_FEATURES.chat);

    // Chat Messages
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isAuthenticated && agent) {
            fetchChats();
            fetchCannedResponses();
            const interval = setInterval(fetchChats, 5000);
            return () => clearInterval(interval);
        }
    }, [isAuthenticated, agent]);

    useEffect(() => {
        if (selectedChat?.user_id) {
            fetchUserDetails(selectedChat.user_id);
        }
    }, [selectedChat?.user_id]);

    useEffect(() => {
        if (selectedChat) {
            fetchMessages(selectedChat.id);
            const interval = setInterval(() => fetchMessages(selectedChat.id), 3000);
            return () => clearInterval(interval);
        }
    }, [selectedChat]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data, error } = await supabase
                .from('support_agents')
                .select('*')
                .eq('access_code', accessCode.toUpperCase())
                .eq('is_active', true)
                .single();

            if (error || !data) {
                toast.error('Invalid access code');
                return;
            }

            setAgent(data);
            setIsAuthenticated(true);
            toast.success(`Welcome, ${data.name}!`);

            // Update last login
            await supabase
                .from('support_agents')
                .update({ last_login: new Date().toISOString() })
                .eq('id', data.id);

            // Log activity
            await supabase.rpc('log_agent_activity', {
                p_agent_id: data.id,
                p_action_type: 'login',
                p_details: { timestamp: new Date().toISOString() }
            });
        } catch (error) {
            console.error('Login error:', error);
            toast.error('Failed to login');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        setAgent(null);
        setAccessCode('');
        setSelectedChat(null);
        setSelectedUser(null);
        navigate('/');
    };

    const fetchChats = async () => {
        if (!agent) return;

        // Fetch both: chats assigned to this agent AND unassigned waiting chats
        const { data, error } = await supabase
            .from('live_chat_sessions')
            .select(`
                id,
                user_id,
                user_email,
                user_name,
                agent_id,
                status,
                started_at
            `)
            .or(`agent_id.eq.${agent.id},and(agent_id.is.null,status.eq.waiting)`)
            .order('started_at', { ascending: false });

        if (!error && data) {
            setChats(data);
        } else if (error) {
            console.error('Error fetching chats:', error);
        }
    };

    const fetchCannedResponses = async () => {
        const { data } = await supabase
            .from('canned_responses')
            .select('*')
            .eq('is_active', true)
            .order('category');

        if (data) {
            setCannedResponses(data);
        }
    };

    const fetchUserDetails = async (userId: string) => {
        setLoading(true);
        try {
            // Fetch user profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (profileData) {
                setSelectedUser(profileData);
            }

            // Fetch payments if permitted
            if (agent?.permissions.can_view_payments) {
                const { data: paymentsData } = await supabase
                    .from('payments')
                    .select('*')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(10);

                setUserPayments(paymentsData || []);
            }

            // Fetch exams
            const { data: examsData } = await supabase
                .from('exam_submissions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(10);

            setUserExams(examsData || []);

            // Fetch agent notes
            const { data: notesData } = await supabase
                .from('agent_user_notes')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            setUserNotes(notesData || []);

            // Log activity
            if (agent) {
                await supabase.rpc('log_agent_activity', {
                    p_agent_id: agent.id,
                    p_action_type: 'user_viewed',
                    p_user_id: userId,
                    p_details: { email: profileData?.email }
                });
            }
        } catch (error) {
            console.error('Error fetching user details:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (chatId: string) => {
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('session_id', chatId)
            .order('created_at', { ascending: true });

        if (data) {
            setMessages(data);
        } else if (error) {
            console.error('Error fetching messages:', error);
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !selectedChat || !agent) return;

        console.log('[AGENT] Sending message:', {
            chatId: selectedChat.id,
            agentId: agent.id,
            agentName: agent.name,
            message: newMessage.substring(0, 50),
        });

        // If chat is unassigned, assign it to this agent first
        if (!selectedChat.agent_id) {
            console.log('[AGENT] Chat is unassigned, assigning to agent...');
            const { error: assignError } = await supabase
                .from('live_chat_sessions')
                .update({ 
                    agent_id: agent.id,
                    status: 'active',
                    assigned_at: new Date().toISOString()
                })
                .eq('id', selectedChat.id);

            if (assignError) {
                console.error('[AGENT] Error assigning chat:', assignError);
            } else {
                console.log('[AGENT] Chat assigned successfully');
                // Update local state
                setSelectedChat(prev => prev ? { ...prev, agent_id: agent.id, status: 'active' } : null);
                toast.success('Chat assigned to you');
            }
        }

        console.log('[AGENT] Inserting message into database...');
        
        // Get the current authenticated user's ID (auth.users.id)
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            console.error('[AGENT] No authenticated user found');
            toast.error('Authentication error');
            return;
        }
        
        console.log('[AGENT] Using sender_id:', user.id);
        
        const { error } = await supabase.from('chat_messages').insert({
            session_id: selectedChat.id,
            sender_id: user.id,
            sender_role: 'agent',
            sender_name: agent.name,
            message: newMessage,
            is_agent: true
        });

        if (error) {
            console.error('[AGENT] Message send error:', error);
            toast.error('Failed to send message');
            return;
        }

        setNewMessage('');
        fetchMessages(selectedChat.id);
        fetchChats(); // Refresh chat list
    };

    const addNote = async () => {
        if (!newNote.trim() || !selectedUser || !agent) return;

        const { error } = await supabase.from('agent_user_notes').insert({
            user_id: selectedUser.id,
            agent_id: agent.id,
            note: newNote,
            is_important: noteImportant
        });

        if (error) {
            toast.error('Failed to add note');
            return;
        }

        toast.success('Note added');
        setNewNote('');
        setNoteImportant(false);
        fetchUserDetails(selectedUser.id);
    };

    const extendSubscription = async () => {
        if (!selectedUser || !agent || !extendDays) return;

        if (!agent.permissions.can_extend_subscriptions) {
            toast.error('You do not have permission to extend subscriptions');
            return;
        }

        if (!confirm(`Extend subscription for ${selectedUser.email} by ${extendDays} days?`)) return;

        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('extend_subscription', {
                p_user_id: selectedUser.id,
                p_agent_id: agent.id,
                p_days: extendDays,
                p_reason: extendReason || 'Extended by support agent'
            });

            if (error) throw error;

            if (data.success) {
                toast.success(data.message);
                setExtendReason('');
                fetchUserDetails(selectedUser.id);
            } else {
                toast.error(data.error);
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to extend subscription');
        } finally {
            setLoading(false);
        }
    };

    const useCannedResponse = (content: string) => {
        setNewMessage(content);
        setShowCannedMenu(false);
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <Logo className="h-12" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Agent Login</h1>
                        <p className="text-gray-600">Enter your access code</p>
                    </div>

                    <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-xl p-8">
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Key className="h-4 w-4 inline mr-2" />
                                Access Code
                            </label>
                            <input
                                type="text"
                                value={accessCode}
                                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-center text-lg"
                                placeholder="XXXXXXXX"
                                maxLength={8}
                                autoFocus
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                        >
                            {loading ? 'Logging in...' : 'Login'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    const filteredChats = chats.filter(chat => {
        if (!chatSearch) return true;
        const email = (chat.user_email || '').toLowerCase();
        const name = (chat.user_name || '').toLowerCase();
        return email.includes(chatSearch.toLowerCase()) || name.includes(chatSearch.toLowerCase());
    });

    return (
        <>
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div className="flex items-center space-x-4">
                            <Logo className="h-8" />
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">{agent?.name}</h1>
                                <p className="text-sm text-gray-600">Support Agent • {agent?.total_chats_handled} chats handled</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            {/* Convex Chat Toggle */}
                            {CONVEX_FEATURES.chat && (
                                <button
                                    onClick={() => setUseConvexChat(!useConvexChat)}
                                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                                        useConvexChat 
                                            ? 'bg-indigo-100 text-indigo-700 border border-indigo-300' 
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    <Sparkles className="h-4 w-4" />
                                    <span className="text-sm font-medium">{useConvexChat ? 'Realtime Mode' : 'Classic Mode'}</span>
                                </button>
                            )}
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
            </div>

            {/* Convex Chat Mode */}
            {useConvexChat && agent ? (
                <div className="flex-1 overflow-hidden">
                    <AgentChatPanel agentId={agent.id} agentName={agent.name} />
                </div>
            ) : (
            /* Classic Supabase Chat Mode */
            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar - Chats List */}
                <div className="w-80 bg-white border-r flex flex-col">
                    <div className="p-4 border-b">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                value={chatSearch}
                                onChange={(e) => setChatSearch(e.target.value)}
                                placeholder="Search chats..."
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {filteredChats.map((chat) => (
                            <button
                                key={chat.id}
                                onClick={() => {
                                    setSelectedChat(chat);
                                }}
                                className={`w-full p-4 text-left border-b hover:bg-gray-50 transition-colors ${selectedChat?.id === chat.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-1">
                                    <h3 className="font-semibold text-gray-900 truncate">
                                        {chat.user_name || 'Unknown'}
                                        {!chat.agent_id && <span className="ml-2 text-xs text-orange-600">(New)</span>}
                                    </h3>
                                    <span className={`px-2 py-0.5 rounded text-xs ${chat.status === 'active'
                                        ? 'bg-green-100 text-green-800'
                                        : chat.status === 'ended'
                                            ? 'bg-gray-100 text-gray-800'
                                            : 'bg-blue-100 text-blue-800'
                                        }`}>
                                        {chat.status}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 truncate">{chat.user_email || 'Unknown email'}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {chat.started_at ? new Date(chat.started_at).toLocaleString() : 'Unknown start'}
                                </p>
                            </button>
                        ))}

                        {filteredChats.length === 0 && (
                            <div className="p-8 text-center text-gray-500">
                                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p>No chats assigned</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Middle - Chat Interface */}
                <div className="flex-1 flex flex-col bg-gray-50">
                    {selectedChat ? (
                        <>
                            <div className="bg-white border-b p-4">
                                <h2 className="font-bold text-lg text-gray-900">
                                    Chat with {selectedUser?.full_name || selectedChat.user_name || 'Unknown user'}
                                </h2>
                                <p className="text-sm text-gray-600">{selectedUser?.email || selectedChat.user_email || 'Unknown email'}</p>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.is_agent ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${msg.is_agent
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-white border text-gray-900'
                                                }`}
                                        >
                                            <p>{msg.message}</p>
                                            <p className={`text-xs mt-1 ${msg.is_agent ? 'text-blue-100' : 'text-gray-500'
                                                }`}>
                                                {new Date(msg.created_at).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="bg-white border-t p-4">
                                <div className="flex items-start space-x-2">
                                    <div className="relative flex-1">
                                        <textarea
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    sendMessage();
                                                }
                                            }}
                                            placeholder="Type your message... (Enter to send)"
                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                                            rows={3}
                                        />
                                        <button
                                            onClick={() => setShowCannedMenu(!showCannedMenu)}
                                            className="absolute bottom-2 right-2 p-1 text-gray-400 hover:text-gray-600"
                                            title="Canned responses"
                                        >
                                            <Zap className="h-5 w-5" />
                                        </button>

                                        {showCannedMenu && (
                                            <div className="absolute bottom-full right-0 mb-2 w-64 bg-white rounded-lg shadow-xl border max-h-64 overflow-y-auto z-10">
                                                {cannedResponses.map((response) => (
                                                    <button
                                                        key={response.id}
                                                        onClick={() => useCannedResponse(response.content)}
                                                        className="w-full text-left p-3 hover:bg-gray-50 border-b last:border-b-0"
                                                    >
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="font-medium text-sm">{response.title}</span>
                                                            <span className="text-xs text-gray-500">{response.shortcut}</span>
                                                        </div>
                                                        <p className="text-xs text-gray-600 truncate">{response.content}</p>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={sendMessage}
                                        disabled={!newMessage.trim()}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed h-[76px]"
                                    >
                                        Send
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500">
                            <div className="text-center">
                                <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                <p>Select a chat to start</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Sidebar - User Profile */}
                {selectedUser && (
                    <div className="w-96 bg-white border-l overflow-y-auto">
                        <div className="p-6 space-y-6">
                            {/* User Info */}
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                                    <User className="h-5 w-5 mr-2" />
                                    User Profile
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <p><strong>Name:</strong> {selectedUser.full_name}</p>
                                    <p><strong>Email:</strong> {selectedUser.email}</p>
                                    <p><strong>Member since:</strong> {new Date(selectedUser.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>

                            {/* Subscription Info */}
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                                    <Package className="h-5 w-5 mr-2" />
                                    Subscription
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <p><strong>Plan:</strong> {selectedUser.subscription_plan || 'None'}</p>
                                    <p><strong>Status:</strong> <span className={`px-2 py-1 rounded text-xs ${selectedUser.subscription_status === 'active'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-100 text-gray-800'
                                        }`}>{selectedUser.subscription_status}</span></p>
                                    <p><strong>End Date:</strong> {selectedUser.subscription_end_date
                                        ? new Date(selectedUser.subscription_end_date).toLocaleDateString()
                                        : 'N/A'}</p>
                                </div>

                                {agent?.permissions.can_extend_subscriptions && (
                                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                                        <h4 className="font-semibold text-sm mb-3">Extend Subscription</h4>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-medium mb-1">Days to extend:</label>
                                                <input
                                                    type="number"
                                                    value={extendDays}
                                                    onChange={(e) => setExtendDays(parseInt(e.target.value))}
                                                    min="1"
                                                    className="w-full px-3 py-2 border rounded-lg text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">Reason:</label>
                                                <input
                                                    type="text"
                                                    value={extendReason}
                                                    onChange={(e) => setExtendReason(e.target.value)}
                                                    placeholder="Optional..."
                                                    className="w-full px-3 py-2 border rounded-lg text-sm"
                                                />
                                            </div>
                                            <button
                                                onClick={extendSubscription}
                                                disabled={loading}
                                                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                                            >
                                                Extend Subscription
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Payment History */}
                            {agent?.permissions.can_view_payments && userPayments.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                                        <CreditCard className="h-5 w-5 mr-2" />
                                        Recent Payments
                                    </h3>
                                    <div className="space-y-2">
                                        {userPayments.slice(0, 5).map((payment) => (
                                            <div key={payment.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                                                <div className="flex justify-between mb-1">
                                                    <span className="font-medium">{payment.amount} EGP</span>
                                                    <span className={`px-2 py-0.5 rounded text-xs ${payment.status === 'completed'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                        }`}>{payment.status}</span>
                                                </div>
                                                <p className="text-xs text-gray-600">
                                                    {new Date(payment.created_at).toLocaleDateString()} • {payment.provider}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Exam History */}
                            {userExams.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                                        <FileText className="h-5 w-5 mr-2" />
                                        Recent Exams
                                    </h3>
                                    <div className="space-y-2">
                                        {userExams.slice(0, 5).map((exam) => (
                                            <div key={exam.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                                                <div className="flex justify-between mb-1">
                                                    <span className="font-medium">{exam.exam_type}</span>
                                                    <span className="text-blue-600 font-bold">{exam.score}%</span>
                                                </div>
                                                <p className="text-xs text-gray-600">
                                                    {new Date(exam.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Agent Notes */}
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                                    <Activity className="h-5 w-5 mr-2" />
                                    Agent Notes
                                </h3>

                                <div className="mb-4">
                                    <textarea
                                        value={newNote}
                                        onChange={(e) => setNewNote(e.target.value)}
                                        placeholder="Add a note about this user..."
                                        className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                                        rows={3}
                                    />
                                    <div className="flex items-center justify-between mt-2">
                                        <label className="flex items-center space-x-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={noteImportant}
                                                onChange={(e) => setNoteImportant(e.target.checked)}
                                                className="rounded"
                                            />
                                            <span>Mark as important</span>
                                        </label>
                                        <button
                                            onClick={addNote}
                                            disabled={!newNote.trim()}
                                            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 text-sm"
                                        >
                                            Add Note
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {userNotes.map((note) => (
                                        <div
                                            key={note.id}
                                            className={`p-3 rounded-lg text-sm ${note.is_important
                                                ? 'bg-yellow-50 border border-yellow-200'
                                                : 'bg-gray-50'
                                                }`}
                                        >
                                            {note.is_important && (
                                                <div className="flex items-center text-yellow-600 text-xs mb-1">
                                                    <AlertCircle className="h-3 w-3 mr-1" />
                                                    Important
                                                </div>
                                            )}
                                            <p className="text-gray-900">{note.note}</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {new Date(note.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                    ))}

                                    {userNotes.length === 0 && (
                                        <p className="text-sm text-gray-500 text-center py-4">No notes yet</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            )}
        </div>
        </>
    );
}

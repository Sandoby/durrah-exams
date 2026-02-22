import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    MessageCircle, User, CreditCard, FileText, LogOut,
    AlertCircle, Package,
    Search, Key, Activity, Zap, Sparkles, X, ChevronLeft
} from 'lucide-react';
import { Logo } from '../../components/Logo';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { AgentChatPanel } from '../../components/ConvexChatWidget';
import { CONVEX_FEATURES } from '../../main';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';

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

    const extendMutationFn = useMutation(api.subscriptions.adminExtendSubscription);

    // Canned Responses
    const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);
    const [showCannedMenu, setShowCannedMenu] = useState(false);

    // Convex Chat Mode Toggle
    const [useConvexChat, setUseConvexChat] = useState(CONVEX_FEATURES.chat);

    // Mobile UI State
    const [showChatsList, setShowChatsList] = useState(true);
    const [showUserProfile, setShowUserProfile] = useState(false);

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
            const result = await extendMutationFn({
                userId: selectedUser.id,
                days: extendDays,
                plan: selectedUser.subscription_plan || 'Professional',
                reason: extendReason || 'Extended by support agent',
                adminId: agent.id,
            });

            if (result.success) {
                toast.success(result.message || 'Subscription extended');
                setExtendReason('');
                fetchUserDetails(selectedUser.id);
            } else {
                toast.error(result.error || 'Failed to extend');
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
            <div className="min-h-screen bg-gray-50 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-white shadow-sm border-b flex-shrink-0">
                    <div className="px-3 sm:px-4 lg:px-6">
                        <div className="flex justify-between items-center py-2.5 sm:py-3">
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                <Logo className="h-6 sm:h-8 flex-shrink-0" />
                                <div className="min-w-0">
                                    <h1 className="text-sm sm:text-lg font-bold text-gray-900 truncate">{agent?.name}</h1>
                                    <p className="text-xs text-gray-500 hidden sm:block">Support • {agent?.total_chats_handled} chats</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
                                {/* Convex Chat Toggle */}
                                {CONVEX_FEATURES.chat && (
                                    <button
                                        onClick={() => setUseConvexChat(!useConvexChat)}
                                        className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm ${useConvexChat
                                                ? 'bg-indigo-100 text-indigo-700'
                                                : 'bg-gray-100 text-gray-600'
                                            }`}
                                    >
                                        <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                        <span className="hidden xs:inline font-medium">{useConvexChat ? 'Live' : 'Classic'}</span>
                                    </button>
                                )}
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
                                    <span className="hidden sm:inline text-sm">Logout</span>
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
                    <div className="flex-1 flex overflow-hidden relative">
                        {/* Mobile Backdrop for Chats List */}
                        {showChatsList && (
                            <div
                                className="fixed inset-0 bg-black/40 z-10 md:hidden"
                                onClick={() => setShowChatsList(false)}
                            />
                        )}

                        {/* Chats List Panel */}
                        <div className={`
                    ${showChatsList ? 'translate-x-0' : '-translate-x-full'}
                    md:translate-x-0 md:relative md:flex
                    fixed inset-y-0 left-0 z-20
                    w-[85vw] max-w-[320px] md:w-72 lg:w-80
                    bg-white border-r flex flex-col
                    transition-transform duration-300 ease-in-out
                    shadow-xl md:shadow-none
                `}>
                            {/* Chats list header */}
                            <div className="p-2.5 sm:p-3 border-b flex items-center gap-2 flex-shrink-0">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={chatSearch}
                                        onChange={(e) => setChatSearch(e.target.value)}
                                        placeholder="Search..."
                                        className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <button
                                    onClick={() => setShowChatsList(false)}
                                    className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg flex-shrink-0"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto overscroll-contain">
                                {filteredChats.map((chat) => (
                                    <button
                                        key={chat.id}
                                        onClick={() => {
                                            setSelectedChat(chat);
                                            setShowChatsList(false);
                                        }}
                                        className={`w-full p-2.5 sm:p-3 text-left border-b hover:bg-gray-50 active:bg-gray-100 transition-colors ${selectedChat?.id === chat.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}`}
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-0.5">
                                            <h3 className="font-semibold text-gray-900 truncate text-sm flex-1">
                                                {chat.user_name || 'Unknown'}
                                                {!chat.agent_id && <span className="ml-1.5 text-xs text-orange-600 font-normal">(New)</span>}
                                            </h3>
                                            <span className={`px-1.5 py-0.5 rounded text-xs flex-shrink-0 ${chat.status === 'active'
                                                ? 'bg-green-100 text-green-700'
                                                : chat.status === 'ended'
                                                    ? 'bg-gray-100 text-gray-600'
                                                    : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {chat.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 truncate">{chat.user_email || 'Unknown email'}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {chat.started_at ? new Date(chat.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                        </p>
                                    </button>
                                ))}

                                {filteredChats.length === 0 && (
                                    <div className="p-6 text-center text-gray-500">
                                        <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No chats</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Middle - Chat Interface */}
                        <div className="flex-1 flex flex-col bg-gray-50 min-w-0">
                            {selectedChat ? (
                                <>
                                    <div className="bg-white border-b p-2.5 sm:p-3 flex-shrink-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                                                <button
                                                    onClick={() => setShowChatsList(true)}
                                                    className="md:hidden p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg flex-shrink-0"
                                                >
                                                    <ChevronLeft className="h-5 w-5" />
                                                </button>
                                                <div className="min-w-0">
                                                    <h2 className="font-bold text-sm sm:text-base text-gray-900 truncate">
                                                        {selectedUser?.full_name || selectedChat.user_name || 'Unknown'}
                                                    </h2>
                                                    <p className="text-xs text-gray-500 truncate">{selectedUser?.email || selectedChat.user_email || ''}</p>
                                                </div>
                                            </div>
                                            {selectedUser && (
                                                <button
                                                    onClick={() => setShowUserProfile(true)}
                                                    className="lg:hidden p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg flex-shrink-0"
                                                    title="View user profile"
                                                >
                                                    <User className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-3 space-y-2.5 overscroll-contain">
                                        {messages.map((msg) => (
                                            <div
                                                key={msg.id}
                                                className={`flex ${msg.is_agent ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div
                                                    className={`max-w-[80%] sm:max-w-[70%] px-3 py-2 rounded-2xl ${msg.is_agent
                                                        ? 'bg-blue-600 text-white rounded-br-md'
                                                        : 'bg-white border text-gray-900 rounded-bl-md shadow-sm'
                                                        }`}
                                                >
                                                    <p className="text-sm break-words">{msg.message}</p>
                                                    <p className={`text-xs mt-1 ${msg.is_agent ? 'text-blue-200' : 'text-gray-400'}`}>
                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    <div className="bg-white border-t p-2.5 sm:p-3 flex-shrink-0">
                                        <div className="flex items-end gap-2">
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
                                                    placeholder="Type a message..."
                                                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                                                    rows={2}
                                                />
                                                <button
                                                    onClick={() => setShowCannedMenu(!showCannedMenu)}
                                                    className="absolute bottom-2 right-2 p-1 text-gray-400 hover:text-blue-600"
                                                    title="Quick replies"
                                                >
                                                    <Zap className="h-4 w-4" />
                                                </button>

                                                {showCannedMenu && (
                                                    <div className="absolute bottom-full right-0 mb-2 w-56 sm:w-64 bg-white rounded-xl shadow-xl border max-h-52 overflow-y-auto z-10">
                                                        {cannedResponses.map((response) => (
                                                            <button
                                                                key={response.id}
                                                                onClick={() => useCannedResponse(response.content)}
                                                                className="w-full text-left p-2.5 hover:bg-gray-50 border-b last:border-b-0"
                                                            >
                                                                <div className="flex items-center justify-between mb-0.5">
                                                                    <span className="font-medium text-xs">{response.title}</span>
                                                                    <span className="text-xs text-gray-400">{response.shortcut}</span>
                                                                </div>
                                                                <p className="text-xs text-gray-500 truncate">{response.content}</p>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={sendMessage}
                                                disabled={!newMessage.trim()}
                                                className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex-shrink-0"
                                            >
                                                Send
                                            </button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-gray-500">
                                    <div className="text-center p-4">
                                        <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                        <p className="text-sm mb-3">Select a chat to start</p>
                                        <button
                                            onClick={() => setShowChatsList(true)}
                                            className="md:hidden px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                                        >
                                            View Chats
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Mobile Backdrop for User Profile */}
                        {showUserProfile && (
                            <div
                                className="fixed inset-0 bg-black/50 z-20 lg:hidden"
                                onClick={() => setShowUserProfile(false)}
                            />
                        )}

                        {/* Right Sidebar - User Profile */}
                        {selectedUser && (
                            <div className={`
                        ${showUserProfile ? 'translate-y-0' : 'translate-y-full'}
                        lg:translate-y-0 lg:translate-x-0 lg:relative
                        fixed inset-x-0 bottom-0 lg:inset-y-0 lg:right-0 lg:left-auto z-30
                        w-full lg:w-80 xl:w-96
                        max-h-[85vh] lg:max-h-none
                        bg-white border-t lg:border-t-0 lg:border-l
                        rounded-t-2xl lg:rounded-none
                        overflow-y-auto overscroll-contain
                        transition-transform duration-300 ease-in-out
                        shadow-xl lg:shadow-none
                    `}>
                                {/* Mobile drag handle */}
                                <div className="lg:hidden flex justify-center py-2 sticky top-0 bg-white">
                                    <div className="w-10 h-1 bg-gray-300 rounded-full" />
                                </div>

                                <div className="p-3 sm:p-4 space-y-4">
                                    {/* Mobile: Close button */}
                                    <div className="flex items-center justify-between lg:hidden">
                                        <h3 className="text-base font-bold text-gray-900">User Profile</h3>
                                        <button
                                            onClick={() => setShowUserProfile(false)}
                                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>

                                    {/* User Info */}
                                    <div className="bg-gray-50 rounded-xl p-3">
                                        <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center hidden lg:flex">
                                            <User className="h-4 w-4 mr-1.5" />
                                            User Profile
                                        </h3>
                                        <div className="space-y-1.5 text-sm">
                                            <p className="truncate"><span className="text-gray-500">Name:</span> <span className="font-medium">{selectedUser.full_name}</span></p>
                                            <p className="truncate"><span className="text-gray-500">Email:</span> <span className="font-medium">{selectedUser.email}</span></p>
                                            <p><span className="text-gray-500">Member since:</span> <span className="font-medium">{new Date(selectedUser.created_at).toLocaleDateString()}</span></p>
                                        </div>
                                    </div>

                                    {/* Subscription Info */}
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center">
                                            <Package className="h-4 w-4 mr-1.5" />
                                            Subscription
                                        </h3>
                                        <div className="space-y-1.5 text-sm">
                                            <p><span className="text-gray-500">Plan:</span> <span className="font-medium">{selectedUser.subscription_plan || 'None'}</span></p>
                                            <p><span className="text-gray-500">Status:</span> <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${selectedUser.subscription_status === 'active'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-gray-100 text-gray-600'
                                                }`}>{selectedUser.subscription_status}</span></p>
                                            <p><span className="text-gray-500">End Date:</span> <span className="font-medium">{selectedUser.subscription_end_date
                                                ? new Date(selectedUser.subscription_end_date).toLocaleDateString()
                                                : 'N/A'}</span></p>
                                        </div>

                                        {agent?.permissions.can_extend_subscriptions && (
                                            <div className="mt-3 p-3 bg-blue-50 rounded-xl">
                                                <h4 className="font-semibold text-xs mb-2">Extend Subscription</h4>
                                                <div className="space-y-2">
                                                    <div className="flex gap-2">
                                                        <div className="flex-1">
                                                            <label className="block text-xs text-gray-500 mb-1">Days</label>
                                                            <input
                                                                type="number"
                                                                value={extendDays}
                                                                onChange={(e) => setExtendDays(parseInt(e.target.value))}
                                                                min="1"
                                                                className="w-full px-2 py-1.5 border rounded-lg text-sm"
                                                            />
                                                        </div>
                                                        <div className="flex-[2]">
                                                            <label className="block text-xs text-gray-500 mb-1">Reason</label>
                                                            <input
                                                                type="text"
                                                                value={extendReason}
                                                                onChange={(e) => setExtendReason(e.target.value)}
                                                                placeholder="Optional..."
                                                                className="w-full px-2 py-1.5 border rounded-lg text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={extendSubscription}
                                                        disabled={loading}
                                                        className="w-full bg-blue-600 text-white py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                                                    >
                                                        Extend
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Payment History */}
                                    {agent?.permissions.can_view_payments && userPayments.length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center">
                                                <CreditCard className="h-4 w-4 mr-1.5" />
                                                Payments
                                            </h3>
                                            <div className="space-y-1.5">
                                                {userPayments.slice(0, 3).map((payment) => (
                                                    <div key={payment.id} className="p-2 bg-gray-50 rounded-lg text-xs flex items-center justify-between">
                                                        <div>
                                                            <span className="font-medium">{payment.amount} EGP</span>
                                                            <span className="text-gray-400 mx-1">•</span>
                                                            <span className="text-gray-500">{payment.provider}</span>
                                                        </div>
                                                        <span className={`px-1.5 py-0.5 rounded text-xs ${payment.status === 'completed'
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-gray-100 text-gray-600'
                                                            }`}>{payment.status}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Exam History */}
                                    {userExams.length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center">
                                                <FileText className="h-4 w-4 mr-1.5" />
                                                Exams
                                            </h3>
                                            <div className="space-y-1.5">
                                                {userExams.slice(0, 3).map((exam) => (
                                                    <div key={exam.id} className="p-2 bg-gray-50 rounded-lg text-xs flex items-center justify-between">
                                                        <span className="font-medium truncate flex-1">{exam.exam_type}</span>
                                                        <span className="text-blue-600 font-bold ml-2">{exam.score}%</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Agent Notes */}
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center">
                                            <Activity className="h-4 w-4 mr-1.5" />
                                            Notes
                                        </h3>

                                        <div className="mb-3">
                                            <textarea
                                                value={newNote}
                                                onChange={(e) => setNewNote(e.target.value)}
                                                placeholder="Add a note..."
                                                className="w-full px-2.5 py-2 border rounded-xl text-sm resize-none"
                                                rows={2}
                                            />
                                            <div className="flex items-center justify-between mt-1.5 gap-2">
                                                <label className="flex items-center gap-1.5 text-xs text-gray-600">
                                                    <input
                                                        type="checkbox"
                                                        checked={noteImportant}
                                                        onChange={(e) => setNoteImportant(e.target.checked)}
                                                        className="rounded w-3.5 h-3.5"
                                                    />
                                                    <span>Important</span>
                                                </label>
                                                <button
                                                    onClick={addNote}
                                                    disabled={!newNote.trim()}
                                                    className="px-3 py-1.5 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 text-xs"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                            {userNotes.map((note) => (
                                                <div
                                                    key={note.id}
                                                    className={`p-2 rounded-lg text-xs ${note.is_important
                                                        ? 'bg-yellow-50 border border-yellow-200'
                                                        : 'bg-gray-50'
                                                        }`}
                                                >
                                                    {note.is_important && (
                                                        <div className="flex items-center text-yellow-600 text-xs mb-0.5">
                                                            <AlertCircle className="h-3 w-3 mr-0.5" />
                                                            Important
                                                        </div>
                                                    )}
                                                    <p className="text-gray-900 text-xs">{note.note}</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        {new Date(note.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            ))}

                                            {userNotes.length === 0 && (
                                                <p className="text-xs text-gray-500 text-center py-3">No notes yet</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Safe area for mobile */}
                                <div className="h-6 lg:hidden" />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}

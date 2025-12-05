import { useState, useEffect, useRef } from 'react';
import { Send, User, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { playNotificationSound } from '../../lib/notificationSound';

interface ChatSession {
    id: string;
    user_id: string;
    agent_id: string | null;
    status: 'open' | 'closed';
    created_at: string;
    updated_at: string;
    user?: {
        full_name: string;
        email: string;
    };
    last_message?: string;
    unread_count?: number;
}

interface ChatMessage {
    id: string;
    session_id: string;
    sender_id: string;
    message: string;
    created_at: string;
    is_read: boolean;
    sender_role: 'user' | 'agent' | 'admin';
}

export function AgentChatInterface() {
    const { user } = useAuth();
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'mine' | 'unassigned'>('all');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const channelRef = useRef<any>(null);

    useEffect(() => {
        fetchSessions();
        subscribeToSessions();

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (selectedSession) {
            fetchMessages(selectedSession.id);
            subscribeToMessages(selectedSession.id);
            markAsRead(selectedSession.id);
        }
    }, [selectedSession]);

    const fetchSessions = async () => {
        try {
            const { data, error } = await supabase
                .from('live_chat_sessions')
                .select(`
                    *,
                    user:profiles!user_id(full_name, email)
                `)
                .eq('status', 'open')
                .order('updated_at', { ascending: false });

            if (error) throw error;

            // Fetch last message for each session
            const sessionsWithDetails = await Promise.all(data.map(async (session: any) => {
                const { data: lastMsg } = await supabase
                    .from('chat_messages')
                    .select('message, created_at')
                    .eq('session_id', session.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                const { count } = await supabase
                    .from('chat_messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('session_id', session.id)
                    .eq('sender_role', 'user')
                    .eq('is_read', false);

                return {
                    ...session,
                    last_message: lastMsg?.message,
                    unread_count: count || 0
                };
            }));

            setSessions(sessionsWithDetails);
            setIsLoading(false);
        } catch (error) {
            console.error('Error fetching sessions:', error);
            toast.error('Failed to load chat sessions');
        }
    };

    const subscribeToSessions = () => {
        const channel = supabase
            .channel('public:live_chat_sessions')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'live_chat_sessions'
                },
                () => {
                    fetchSessions();
                }
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    };

    const subscribeToMessages = (sessionId: string) => {
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
        }

        channelRef.current = supabase
            .channel(`session:${sessionId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `session_id=eq.${sessionId}`
                },
                (payload) => {
                    const newMsg = payload.new as ChatMessage;
                    setMessages(prev => [...prev, newMsg]);
                    scrollToBottom();

                    if (newMsg.sender_role === 'user') {
                        playNotificationSound();
                        markAsRead(sessionId);
                    }
                }
            )
            .subscribe();
    };

    const fetchMessages = async (sessionId: string) => {
        try {
            const { data, error } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('session_id', sessionId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setMessages(data || []);
            scrollToBottom();
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedSession || !user) return;

        const msgContent = newMessage.trim();
        setNewMessage('');

        try {
            // If session is unassigned, assign to current agent
            if (!selectedSession.agent_id) {
                await assignSession(selectedSession.id);
            }

            const { error } = await supabase
                .from('chat_messages')
                .insert({
                    session_id: selectedSession.id,
                    sender_id: user.id,
                    message: msgContent,
                    sender_role: 'agent'
                });

            if (error) throw error;

            // Update session updated_at
            await supabase
                .from('live_chat_sessions')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', selectedSession.id);

        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Failed to send message');
            setNewMessage(msgContent);
        }
    };

    const assignSession = async (sessionId: string) => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from('live_chat_sessions')
                .update({ agent_id: user.id })
                .eq('id', sessionId);

            if (error) throw error;

            // Update local state
            setSessions(prev => prev.map(s =>
                s.id === sessionId ? { ...s, agent_id: user.id } : s
            ));
            if (selectedSession?.id === sessionId) {
                setSelectedSession(prev => prev ? { ...prev, agent_id: user.id } : null);
            }

            toast.success('Chat assigned to you');
        } catch (error) {
            console.error('Error assigning session:', error);
            toast.error('Failed to assign chat');
        }
    };

    const closeSession = async () => {
        if (!selectedSession) return;
        if (!confirm('Are you sure you want to close this chat?')) return;

        try {
            // Send system message
            await supabase
                .from('chat_messages')
                .insert({
                    session_id: selectedSession.id,
                    sender_id: user!.id,
                    message: 'Chat closed by agent',
                    sender_role: 'admin' // System message
                });

            const { error } = await supabase
                .from('live_chat_sessions')
                .update({ status: 'closed' })
                .eq('id', selectedSession.id);

            if (error) throw error;

            toast.success('Chat closed');
            setSelectedSession(null);
            fetchSessions();
        } catch (error) {
            console.error('Error closing session:', error);
            toast.error('Failed to close chat');
        }
    };

    const markAsRead = async (sessionId: string) => {
        try {
            await supabase
                .from('chat_messages')
                .update({ is_read: true })
                .eq('session_id', sessionId)
                .eq('sender_role', 'user')
                .eq('is_read', false);

            // Update local unread count
            setSessions(prev => prev.map(s =>
                s.id === sessionId ? { ...s, unread_count: 0 } : s
            ));
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const filteredSessions = sessions.filter(session => {
        if (filter === 'mine') return session.agent_id === user?.id;
        if (filter === 'unassigned') return !session.agent_id;
        return true;
    });

    return (
        <div className="flex h-[calc(100vh-120px)] bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Sidebar */}
            <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Active Chats</h2>

                    {/* Filters */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilter('all')}
                            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${filter === 'all'
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter('mine')}
                            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${filter === 'mine'
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                }`}
                        >
                            Mine
                        </button>
                        <button
                            onClick={() => setFilter('unassigned')}
                            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${filter === 'unassigned'
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                }`}
                        >
                            New
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="p-4 text-center text-gray-500">Loading...</div>
                    ) : filteredSessions.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">No active chats</p>
                        </div>
                    ) : (
                        filteredSessions.map(session => (
                            <button
                                key={session.id}
                                onClick={() => setSelectedSession(session)}
                                className={`w-full p-4 text-left border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${selectedSession?.id === session.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-medium text-gray-900 dark:text-white truncate">
                                        {session.user?.full_name || 'Unknown User'}
                                    </span>
                                    {session.unread_count && session.unread_count > 0 ? (
                                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                            {session.unread_count}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-gray-500">
                                            {new Date(session.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                    {session.last_message || 'No messages'}
                                </p>
                                <div className="mt-2 flex items-center gap-2">
                                    {session.agent_id ? (
                                        <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3" />
                                            {session.agent_id === user?.id ? 'Assigned to you' : 'Assigned'}
                                        </span>
                                    ) : (
                                        <span className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 px-2 py-0.5 rounded-full">
                                            Unassigned
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Area */}
            {selectedSession ? (
                <div className="flex-1 flex flex-col">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                    {selectedSession.user?.full_name}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {selectedSession.user?.email}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {!selectedSession.agent_id && (
                                <button
                                    onClick={() => assignSession(selectedSession.id)}
                                    className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                    Claim Chat
                                </button>
                            )}
                            <button
                                onClick={closeSession}
                                className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm transition-colors flex items-center gap-1"
                            >
                                <XCircle className="w-4 h-4" />
                                Close Chat
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                        {messages.map((msg) => {
                            const isMe = msg.sender_role === 'agent' || msg.sender_role === 'admin';
                            return (
                                <div
                                    key={msg.id}
                                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[70%] rounded-2xl px-4 py-2 ${isMe
                                            ? 'bg-indigo-600 text-white rounded-br-none'
                                            : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none shadow-sm'
                                            }`}
                                    >
                                        <p className="text-sm">{msg.message}</p>
                                        <p className={`text-[10px] mt-1 ${isMe ? 'text-indigo-200' : 'text-gray-500 dark:text-gray-400'
                                            }`}>
                                            {new Date(msg.created_at).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                        <form onSubmit={sendMessage} className="flex gap-2">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type your reply..."
                                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                            <button
                                type="submit"
                                disabled={!newMessage.trim()}
                                className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </form>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900">
                    <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-lg font-medium">Select a chat to start messaging</p>
                    <p className="text-sm mt-2">Choose from the list on the left</p>
                </div>
            )}
        </div>
    );
}

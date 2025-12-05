import { useState, useEffect, useRef } from 'react';
import { Send, X, MessageCircle, Loader2, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { playNotificationSound } from '../lib/notificationSound';

interface ChatMessage {
    id: string;
    session_id: string;
    sender_id: string;
    message: string;
    created_at: string;
    is_read: boolean;
    sender_role?: 'user' | 'agent' | 'admin';
}

interface ChatSession {
    id: string;
    user_id: string;
    agent_id: string | null;
    status: 'open' | 'closed';
    created_at: string;
}

export function ChatWidget() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const channelRef = useRef<any>(null);

    useEffect(() => {
        if (user) {
            checkActiveSession();
        }
    }, [user]);

    useEffect(() => {
        if (isOpen && currentSession) {
            fetchMessages(currentSession.id);
            subscribeToSession(currentSession.id);
            markMessagesAsRead(currentSession.id);
        }

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [isOpen, currentSession]);

    const checkActiveSession = async () => {
        if (!user) return;

        try {
            const { data } = await supabase
                .from('live_chat_sessions')
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'open')
                .single();

            if (data) {
                setCurrentSession(data);
                // Fetch unread count
                const { count } = await supabase
                    .from('chat_messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('session_id', data.id)
                    .neq('sender_id', user.id)
                    .eq('is_read', false);

                setUnreadCount(count || 0);
            }
        } catch (error) {
            // No active session found, which is fine
        }
    };

    const startNewSession = async () => {
        if (!user) return null;

        try {
            const { data, error } = await supabase
                .from('live_chat_sessions')
                .insert({
                    user_id: user.id,
                    status: 'open'
                })
                .select()
                .single();

            if (error) throw error;
            setCurrentSession(data);
            return data;
        } catch (error) {
            console.error('Error starting session:', error);
            toast.error('Failed to start chat');
            return null;
        }
    };

    const fetchMessages = async (sessionId: string) => {
        setIsLoading(true);
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
        } finally {
            setIsLoading(false);
        }
    };

    const subscribeToSession = (sessionId: string) => {
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

                    if (newMsg.sender_id !== user?.id) {
                        playNotificationSound();
                        if (isOpen) {
                            markMessagesAsRead(sessionId);
                        } else {
                            setUnreadCount(prev => prev + 1);
                        }
                    }
                }
            )
            .subscribe();
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user) return;

        const msgContent = newMessage.trim();
        setNewMessage('');

        try {
            let sessionId = currentSession?.id;

            if (!sessionId) {
                const newSession = await startNewSession();
                if (!newSession) return;
                sessionId = newSession.id;
            }

            const { error } = await supabase
                .from('chat_messages')
                .insert({
                    session_id: sessionId,
                    sender_id: user.id,
                    message: msgContent,
                    sender_role: 'user'
                });

            if (error) throw error;
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Failed to send message');
            setNewMessage(msgContent); // Restore message
        }
    };

    const markMessagesAsRead = async (sessionId: string) => {
        if (!user) return;

        try {
            await supabase
                .from('chat_messages')
                .update({ is_read: true })
                .eq('session_id', sessionId)
                .neq('sender_id', user.id)
                .eq('is_read', false);

            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    return (
        <>
            {/* Chat Toggle Button */}
            <button
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-6 right-6 p-4 rounded-full shadow-lg transition-all duration-300 z-50 ${isOpen
                    ? 'scale-0 opacity-0'
                    : 'scale-100 opacity-100 bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
            >
                <MessageCircle className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white dark:border-gray-900">
                        {unreadCount}
                    </span>
                )}
            </button>

            {/* Chat Window */}
            <div
                className={`fixed bottom-6 right-6 w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 transition-all duration-300 z-50 flex flex-col overflow-hidden ${isOpen
                    ? 'translate-y-0 opacity-100 pointer-events-auto'
                    : 'translate-y-10 opacity-0 pointer-events-none'
                    }`}
                style={{ height: '600px', maxHeight: 'calc(100vh - 48px)' }}
            >
                {/* Header */}
                <div className="bg-indigo-600 p-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                            <User className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">Support Chat</h3>
                            <p className="text-xs text-indigo-100">
                                {currentSession?.agent_id ? 'Agent connected' : 'Waiting for agent...'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 space-y-2">
                            <MessageCircle className="w-12 h-12 opacity-20" />
                            <p>Start a conversation with our support team!</p>
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isMe = msg.sender_id === user?.id;
                            return (
                                <div
                                    key={msg.id}
                                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${isMe
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
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shrink-0">
                    <form onSubmit={sendMessage} className="flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type your message..."
                            className="flex-1 px-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim()}
                            className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}

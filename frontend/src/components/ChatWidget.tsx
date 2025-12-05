import { useState, useEffect, useRef } from 'react';
import { Send, X, MessageCircle, Loader2, User, Check, CheckCheck } from 'lucide-react';

// ... (imports remain same)

// ... (inside ChatWidget component)

const subscribeToSession = (sessionId: string) => {
    const channel = supabase
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

                if (isOpen) {
                    markMessagesAsRead(sessionId);
                    playNotificationSound();
                } else {
                    setUnreadCount(prev => prev + 1);
                }

                // Clear typing indicator when message received
                if (newMsg.sender_role !== 'user') {
                    setIsAgentTyping(false);
                }
            }
        )
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'chat_messages',
                filter: `session_id=eq.${sessionId}`
            },
            (payload) => {
                const updatedMsg = payload.new as ChatMessage;
                setMessages(prev => prev.map(msg =>
                    msg.id === updatedMsg.id ? updatedMsg : msg
                ));
            }
        )
        .on(
            'broadcast',
            { event: 'typing' },
            (payload) => {
                // Check if it's the agent typing
                if (payload.payload.sender_role === 'agent') {
                    setIsAgentTyping(true);

                    // Clear after 3 seconds of no typing
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = setTimeout(() => {
                        setIsAgentTyping(false);
                    }, 3000);
                }
            }
        )
        .subscribe();

    channelRef.current = channel;
    return channel;
};

// ... (rest of code)

// Inside render loop for messages:
{
    messages.map((msg) => {
        const isMe = msg.sender_role === 'user';
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
                    <div className={`flex items-center justify-end gap-1 mt-1`}>
                        <p className={`text-[10px] ${isMe ? 'text-indigo-200' : 'text-gray-500 dark:text-gray-400'
                            }`}>
                            {new Date(msg.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </p>
                        {isMe && (
                            <span className="text-indigo-200">
                                {msg.is_read ? (
                                    <CheckCheck className="w-3 h-3" />
                                ) : (
                                    <Check className="w-3 h-3" />
                                )}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        );
    })
}
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { playIncomingMessageSound, playSentMessageSound } from '../lib/notificationSound';

// ... (inside ChatWidget)

const subscribeToSession = (sessionId: string) => {
    const channel = supabase
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

                if (isOpen) {
                    markMessagesAsRead(sessionId);
                    if (newMsg.sender_role !== 'user') {
                        playIncomingMessageSound();
                    }
                } else {
                    setUnreadCount(prev => prev + 1);
                    playIncomingMessageSound();
                }

                // Clear typing indicator when message received
                if (newMsg.sender_role !== 'user') {
                    setIsAgentTyping(false);
                }
            }
        )
    // ... (rest of subscription)

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || !currentSession) return;

        const msgContent = message.trim();
        setMessage('');

        try {
            playSentMessageSound(); // Play sound immediately for better feedback

            const { error } = await supabase
                .from('chat_messages')
                .insert({
                    session_id: currentSession.id,
                    sender_id: user?.id, // Can be null for guest
                    message: msgContent,
                    sender_role: 'user'
                });

            if (error) throw error;

            // Update session updated_at
            await supabase
                .from('live_chat_sessions')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', currentSession.id);

        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Failed to send message');
            setMessage(msgContent);
        }
    };

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

        const [isAgentOnline, setIsAgentOnline] = useState(false);

        // ... (inside subscribeToSession)

        const subscribeToSession = (sessionId: string) => {
            const channel = supabase
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
                        // ... (existing logic)
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'chat_messages',
                        filter: `session_id=eq.${sessionId}`
                    },
                    (payload) => {
                        // ... (existing logic)
                    }
                )
                .on(
                    'broadcast',
                    { event: 'typing' },
                    (payload) => {
                        // ... (existing logic)
                    }
                )
                .on('presence', { event: 'sync' }, () => {
                    const state = channel.presenceState();
                    const agents = Object.values(state).flat().filter((p: any) => p.role === 'agent');
                    setIsAgentOnline(agents.length > 0);
                })
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        await channel.track({
                            online_at: new Date().toISOString(),
                            role: 'user'
                        });
                    }
                });

            channelRef.current = channel;
            return channel;
        };

        // ... (render)

        {/* Header */ }
        <div className="p-4 bg-indigo-600 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                <h3 className="font-semibold">Live Support</h3>
            </div>
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isAgentOnline ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="text-xs opacity-90">{isAgentOnline ? 'Agent Online' : 'Offline'}</span>
            </div>
            <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-indigo-700 rounded-full transition-colors"
            >
                <X className="w-5 h-5" />
            </button>
        </div>

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
            const channel = supabase
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

                        if (isOpen) {
                            markMessagesAsRead(sessionId);
                            playNotificationSound();
                        } else {
                            setUnreadCount(prev => prev + 1);
                        }

                        // Clear typing indicator when message received
                        if (newMsg.sender_role !== 'user') {
                            setIsAgentTyping(false);
                        }
                    }
                )
                .on(
                    'broadcast',
                    { event: 'typing' },
                    (payload) => {
                        // Check if it's the agent typing
                        if (payload.payload.sender_role === 'agent') {
                            setIsAgentTyping(true);

                            // Clear after 3 seconds of no typing
                            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                            typingTimeoutRef.current = setTimeout(() => {
                                setIsAgentTyping(false);
                            }, 3000);
                        }
                    }
                )
                .subscribe();

            channelRef.current = channel;
            return channel;
        };

        const handleTyping = async () => {
            if (!currentSession || !channelRef.current) return;

            await channelRef.current.send({
                type: 'broadcast',
                event: 'typing',
                payload: { sender_role: 'user' }
            });
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
                    // Re-subscribe to new session
                    subscribeToSession(sessionId);
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
                {isOpen && (
                    <div className="fixed inset-0 sm:inset-auto sm:bottom-20 sm:right-4 sm:w-96 sm:h-[600px] bg-white dark:bg-gray-800 shadow-2xl rounded-none sm:rounded-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 z-50 transition-all duration-200 ease-in-out">
                        {/* Header */}
                        <div className="p-4 bg-indigo-600 flex justify-between items-center text-white shrink-0">
                            <div className="flex items-center gap-2">
                                <MessageCircle className="w-5 h-5" />
                                <h3 className="font-semibold">Live Support</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${isAgentOnline ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                                <span className="text-xs opacity-90">{isAgentOnline ? 'Agent Online' : 'Offline'}</span>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-indigo-700 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        {!currentSession ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-gray-50 dark:bg-gray-900">
                                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mb-4">
                                    <MessageCircle className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                    How can we help?
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                    Start a conversation with our support team. We typically reply in a few minutes.
                                </p>
                                <button
                                    onClick={startNewSession}
                                    disabled={isLoading}
                                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            Start Chat
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                                    {messages.map((msg, index) => {
                                        const isMe = msg.sender_role === 'user';
                                        const showDateSeparator = index === 0 ||
                                            getDateLabel(new Date(msg.created_at)) !== getDateLabel(new Date(messages[index - 1].created_at));

                                        const isSequence = index > 0 &&
                                            messages[index - 1].sender_role === msg.sender_role &&
                                            !showDateSeparator;

                                        return (
                                            <div key={msg.id}>
                                                {showDateSeparator && (
                                                    <div className="flex justify-center my-4">
                                                        <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                                                            {getDateLabel(new Date(msg.created_at))}
                                                        </span>
                                                    </div>
                                                )}
                                                <div
                                                    className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isSequence ? 'mt-1' : 'mt-4'}`}
                                                >
                                                    {!isMe && !isSequence && (
                                                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center mr-2 flex-shrink-0">
                                                            <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                                        </div>
                                                    )}
                                                    {!isMe && isSequence && <div className="w-10" />} {/* Spacer for alignment */}

                                                    <div
                                                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${isMe
                                                            ? 'bg-indigo-600 text-white rounded-br-none'
                                                            : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none shadow-sm'
                                                            }`}
                                                    >
                                                        <p className="text-sm break-words">{msg.message}</p>
                                                        <div className={`flex items-center justify-end gap-1 mt-1`}>
                                                            <p className={`text-[10px] ${isMe ? 'text-indigo-200' : 'text-gray-500 dark:text-gray-400'
                                                                }`}>
                                                                {new Date(msg.created_at).toLocaleTimeString([], {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </p>
                                                            {isMe && (
                                                                <span className="text-indigo-200">
                                                                    {msg.is_read ? (
                                                                        <CheckCheck className="w-3 h-3" />
                                                                    ) : (
                                                                        <Check className="w-3 h-3" />
                                                                    )}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {isAgentTyping && (
                                        <div className="flex justify-start mt-4">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center mr-2">
                                                <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                            </div>
                                            <div className="bg-white dark:bg-gray-700 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-1">
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input Area */}
                                <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shrink-0">
                                    <form onSubmit={sendMessage} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => {
                                                setNewMessage(e.target.value);
                                                handleTyping();
                                            }}
                                            placeholder="Type a message..."
                                            className="flex-1 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!newMessage.trim()}
                                            className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Send className="w-5 h-5" />
                                        </button>
                                    </form>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </>
        );
    }
    ```

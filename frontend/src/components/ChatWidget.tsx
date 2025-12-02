import { useState, useEffect, useRef } from 'react';
import { Send, X, MessageCircle, Loader2, Star, Wifi, WifiOff, Check, CheckCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { playNotificationSound } from '../lib/notificationSound';

interface Message {
    id: string;
    user_id: string;
    user_email: string;
    message: string;
    is_admin: boolean;
    created_at: string;
    read_at?: string;
    read_by_admin?: boolean;
}

export function ChatWidget() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [showRating, setShowRating] = useState(false);
    const [rating, setRating] = useState(0);
    const [ratingComment, setRatingComment] = useState('');
    const [isSubmittingRating, setIsSubmittingRating] = useState(false);
    const [isConnected, setIsConnected] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<number | undefined>(undefined);
    const channelRef = useRef<any>(null);

    useEffect(() => {
        if (isOpen && user) {
            fetchMessages();
            fetchUnreadCount();
            subscribeToChat();

            return () => {
                if (channelRef.current) {
                    supabase.removeChannel(channelRef.current);
                }
            };
        }
    }, [isOpen, user]);

    // Fetch unread count when widget is closed
    useEffect(() => {
        if (!isOpen && user) {
            fetchUnreadCount();
            const interval = setInterval(fetchUnreadCount, 10000); // Check every 10s
            return () => clearInterval(interval);
        }
    }, [isOpen, user]);

    const subscribeToChat = () => {
        if (!user) return;

        const channel = supabase
            .channel(`chat:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    console.log('New message received:', payload);
                    const newMsg = payload.new as Message;

                    // Check for chat closure message
                    if (newMsg.message === 'CHAT_CLOSED_BY_ADMIN' && newMsg.is_admin) {
                        setShowRating(true);
                    } else {
                        setMessages(prev => {
                            // Avoid duplicates
                            if (prev.some(m => m.id === newMsg.id)) {
                                return prev;
                            }
                            return [...prev, newMsg];
                        });

                        // Play notification sound for admin messages
                        if (newMsg.is_admin) {
                            playNotificationSound();
                        }

                        // Mark admin messages as read immediately
                        if (newMsg.is_admin && isOpen) {
                            markAsRead(newMsg.id);
                        } else if (newMsg.is_admin) {
                            fetchUnreadCount();
                        }

                        scrollToBottom();
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    // Update message read status
                    const updatedMsg = payload.new as Message;
                    setMessages(prev => prev.map(m =>
                        m.id === updatedMsg.id ? updatedMsg : m
                    ));
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'chat_typing',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    // Admin typing indicator
                    if (payload.new && (payload.new as any).is_admin) {
                        setIsTyping((payload.new as any).is_typing);
                    }
                }
            )
            .subscribe((status) => {
                console.log('Chat subscription status:', status);
                setIsConnected(status === 'SUBSCRIBED');

                if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    // Attempt reconnection
                    setTimeout(() => {
                        if (isOpen && user) {
                            subscribeToChat();
                        }
                    }, 3000);
                }
            });

        channelRef.current = channel;
    };

    const fetchMessages = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true });

            if (error) throw error;

            // Filter out system messages from display
            const displayMessages = (data || []).filter(m => m.message !== 'CHAT_CLOSED_BY_ADMIN');
            setMessages(displayMessages);

            // Mark all admin messages as read
            const unreadAdminMessages = displayMessages.filter(m => m.is_admin && !m.read_at);
            if (unreadAdminMessages.length > 0) {
                await Promise.all(unreadAdminMessages.map(m => markAsRead(m.id)));
            }

            scrollToBottom();
        } catch (error) {
            console.error('Error fetching messages:', error);
            toast.error('Failed to load messages');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUnreadCount = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .rpc('get_unread_count', { p_user_id: user.id });

            if (error) throw error;
            setUnreadCount(data || 0);
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
    };

    const markAsRead = async (messageId: string) => {
        try {
            await supabase
                .from('chat_messages')
                .update({ read_at: new Date().toISOString() })
                .eq('id', messageId);
        } catch (error) {
            console.error('Error marking message as read:', error);
        }
    };

    const updateTypingStatus = async (isTyping: boolean) => {
        if (!user) return;
        try {
            await supabase
                .from('chat_typing')
                .upsert({
                    user_id: user.id,
                    is_typing: isTyping,
                    is_admin: false,
                    updated_at: new Date().toISOString()
                });
        } catch (error) {
            console.error('Error updating typing status:', error);
        }
    };

    const handleTyping = () => {
        updateTypingStatus(true);

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            window.clearTimeout(typingTimeoutRef.current);
        }

        // Set new timeout to stop typing indicator
        typingTimeoutRef.current = window.setTimeout(() => {
            updateTypingStatus(false);
        }, 2000);
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user) return;

        setIsSending(true);
        try {
            // Stop typing indicator
            updateTypingStatus(false);
            if (typingTimeoutRef.current) {
                window.clearTimeout(typingTimeoutRef.current);
            }

            const { error } = await supabase
                .from('chat_messages')
                .insert({
                    user_id: user.id,
                    user_email: user.email,
                    message: newMessage.trim(),
                    is_admin: false
                });

            if (error) throw error;
            setNewMessage('');
            scrollToBottom();
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Failed to send message');
        } finally {
            setIsSending(false);
        }
    };

    const submitRating = async () => {
        if (rating === 0 || !user) {
            toast.error('Please select a rating');
            return;
        }

        setIsSubmittingRating(true);
        try {
            const { error } = await supabase
                .from('chat_ratings')
                .insert({
                    user_id: user.id,
                    rating,
                    comment: ratingComment
                });

            if (error) throw error;
            toast.success('Thank you for your feedback!');
            setShowRating(false);
            setRating(0);
            setRatingComment('');
            setIsOpen(false); // Close chat after rating
        } catch (error) {
            console.error('Error submitting rating:', error);
            toast.error('Failed to submit rating');
        } finally {
            setIsSubmittingRating(false);
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const formatMessageTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

        if (diffInHours < 24) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
                date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
    };

    if (!user) return null;

    return (
        <>
            {/* Chat Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-4 right-4 md:bottom-6 md:right-6 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-all z-[9999] flex items-center justify-center hover:scale-110 active:scale-95"
                    aria-label="Open chat"
                    style={{ position: 'fixed', bottom: '24px', right: '24px' }}
                >
                    <MessageCircle className="h-6 w-6" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-white animate-pulse">
                            {unreadCount}
                        </span>
                    )}
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl flex flex-col z-50 border border-gray-200 dark:border-gray-700">
                    {/* Header */}
                    <div className="bg-indigo-600 text-white p-4 rounded-t-lg flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <MessageCircle className="h-5 w-5" />
                            <div>
                                <h3 className="font-semibold">Support Chat</h3>
                                <div className="flex items-center gap-1 text-xs">
                                    {isConnected ? (
                                        <>
                                            <Wifi className="h-3 w-3" />
                                            <span>Online</span>
                                        </>
                                    ) : (
                                        <>
                                            <WifiOff className="h-3 w-3" />
                                            <span>Reconnecting...</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="hover:bg-indigo-700 p-1 rounded transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {showRating ? (
                        <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                                How was your chat?
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                Please rate your experience with our support team.
                            </p>

                            <div className="flex space-x-2 mb-6">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => setRating(star)}
                                        className={`transition-colors ${rating >= star ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                                    >
                                        <Star className="h-8 w-8 fill-current" />
                                    </button>
                                ))}
                            </div>

                            <textarea
                                value={ratingComment}
                                onChange={(e) => setRatingComment(e.target.value)}
                                placeholder="Optional feedback..."
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mb-6 text-sm dark:bg-gray-700 dark:text-white"
                                rows={3}
                            />

                            <button
                                onClick={submitRating}
                                disabled={isSubmittingRating || rating === 0}
                                className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                            >
                                {isSubmittingRating ? (
                                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                                ) : (
                                    'Submit Feedback'
                                )}
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {isLoading ? (
                                    <div className="flex items-center justify-center h-full">
                                        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm text-center px-4">
                                        <div>
                                            <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                            <p>No messages yet.</p>
                                            <p className="text-xs mt-1">Start a conversation with our support team!</p>
                                        </div>
                                    </div>
                                ) : (
                                    messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={`flex ${msg.is_admin ? 'justify-start' : 'justify-end'}`}
                                        >
                                            <div
                                                className={`max-w-[80%] rounded-lg p-3 ${msg.is_admin
                                                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                                    : 'bg-indigo-600 text-white'
                                                    }`}
                                            >
                                                {msg.is_admin && (
                                                    <p className="text-xs font-semibold mb-1 text-indigo-600 dark:text-indigo-400">
                                                        Support Team
                                                    </p>
                                                )}
                                                <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                                                <div className="flex items-center justify-between mt-1">
                                                    <p className={`text-xs ${msg.is_admin ? 'text-gray-500 dark:text-gray-400' : 'text-indigo-200'}`}>
                                                        {formatMessageTime(msg.created_at)}
                                                    </p>
                                                    {!msg.is_admin && (
                                                        <div className="ml-2">
                                                            {msg.read_by_admin ? (
                                                                <CheckCheck className="h-3 w-3 text-indigo-200" />
                                                            ) : (
                                                                <Check className="h-3 w-3 text-indigo-200" />
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}

                                {/* Typing Indicator */}
                                {isTyping && (
                                    <div className="flex justify-start">
                                        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 max-w-[80%]">
                                            <p className="text-xs font-semibold mb-1 text-indigo-600 dark:text-indigo-400">
                                                Support Team
                                            </p>
                                            <div className="flex space-x-1">
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <form onSubmit={sendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex space-x-2">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => {
                                            setNewMessage(e.target.value);
                                            handleTyping();
                                        }}
                                        placeholder="Type your message..."
                                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                                        disabled={isSending || !isConnected}
                                    />
                                    <button
                                        type="submit"
                                        disabled={isSending || !newMessage.trim() || !isConnected}
                                        className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSending ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <Send className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                            </form>
                        </>
                    )}
                </div>
            )}
        </>
    );
}

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

    const [isUserOnline, setIsUserOnline] = useState(false);

    // ... (inside subscribeToMessages)

    const subscribeToMessages = (sessionId: string) => {
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
        }

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
                    const newMsg = payload.new as ChatMessage;
                    setMessages(prev => [...prev, newMsg]);
                    scrollToBottom();

                    if (newMsg.sender_role === 'user') {
                        playNotificationSound();
                        markAsRead(sessionId);
                        setIsUserTyping(false);
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
                    // ... (existing logic)
                    if (payload.payload.sender_role === 'user') {
                        setIsUserTyping(true);
                        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                        typingTimeoutRef.current = setTimeout(() => {
                            setIsUserTyping(false);
                        }, 3000);
                    }
                }
            )
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const users = Object.values(state).flat().filter((p: any) => p.role === 'user');
                setIsUserOnline(users.length > 0);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        online_at: new Date().toISOString(),
                        role: 'agent'
                    });
                }
            });

        channelRef.current = channel;
        return channel;
    };

    // ... (render)

    {/* Header */ }
    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-3">
            <div className="relative">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                {isUserOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white dark:border-gray-800 rounded-full"></div>
                )}
            </div>
            <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                    {selectedSession.user?.full_name}
                </h3>
                <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {selectedSession.user?.email}
                    </p>
                    {isUserOnline && (
                        <span className="text-[10px] text-green-600 dark:text-green-400 font-medium bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full">
                            Online
                        </span>
                    )}
                </div>
            </div>
        </div>

    useEffect(() => {
            fetchSessions();
        const channel = subscribeToSessions();

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, []);

    useEffect(() => {
        if (selectedSession) {
            fetchMessages(selectedSession.id);
        const channel = subscribeToMessages(selectedSession.id);
        markAsRead(selectedSession.id);

            return () => {
                if (channel) supabase.removeChannel(channel);
            };
        }
    }, [selectedSession]);

    // ... (fetchSessions remains same)

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

        return channel;
    };

    const subscribeToMessages = (sessionId: string) => {
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
        }

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
            'broadcast',
            { event: 'typing' },
            (payload) => {
                // Check if it's the user typing
                if (payload.payload.sender_role === 'user') {
                    setIsUserTyping(true);

                    // Clear after 3 seconds
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = setTimeout(() => {
                        setIsUserTyping(false);
                    }, 3000);
                }
            }
        )
        .subscribe();

        channelRef.current = channel;
        return channel;
    };

    // ... (fetchMessages remains same)

    const handleTyping = async () => {
        if (!selectedSession || !channelRef.current) return;

        await channelRef.current.send({
            type: 'broadcast',
        event: 'typing',
        payload: {sender_role: 'agent' }
        });
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

        const {error} = await supabase
        .from('chat_messages')
        .insert({
            session_id: selectedSession.id,
        sender_id: user.id,
        message: msgContent,
        sender_role: 'agent'
                });
        ```
        playNotificationSound();
        markAsRead(sessionId);
        setIsUserTyping(false);
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
        {event: 'typing' },
                (payload) => {
                    // ... (existing logic)
                    if (payload.payload.sender_role === 'user') {
            setIsUserTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                        typingTimeoutRef.current = setTimeout(() => {
            setIsUserTyping(false);
                        }, 3000);
                    }
                }
        )
        .on('presence', {event: 'sync' }, () => {
                const state = channel.presenceState();
                const users = Object.values(state).flat().filter((p: any) => p.role === 'user');
                setIsUserOnline(users.length > 0);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
            await channel.track({
                online_at: new Date().toISOString(),
                role: 'agent'
            });
                }
            });

        channelRef.current = channel;
        return channel;
    };

        // ... (render)

        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-3">
                <div className="relative">
                    <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    {isUserOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white dark:border-gray-800 rounded-full"></div>
                    )}
                </div>
                <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                        {selectedSession.user?.full_name}
                    </h3>
                    <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {selectedSession.user?.email}
                        </p>
                        {isUserOnline && (
                            <span className="text-[10px] text-green-600 dark:text-green-400 font-medium bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full">
                                Online
                            </span>
                        )}
                    </div>
                </div>
            </div>

    useEffect(() => {
                fetchSessions();
            const channel = subscribeToSessions();

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, []);

    useEffect(() => {
        if (selectedSession) {
                fetchMessages(selectedSession.id);
            const channel = subscribeToMessages(selectedSession.id);
            markAsRead(selectedSession.id);

            return () => {
                if (channel) supabase.removeChannel(channel);
            };
        }
    }, [selectedSession]);

    // ... (fetchSessions remains same)

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

            return channel;
    };

    const subscribeToMessages = (sessionId: string) => {
        if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
        }

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
                'broadcast',
                { event: 'typing' },
                (payload) => {
                    // Check if it's the user typing
                    if (payload.payload.sender_role === 'user') {
                        setIsUserTyping(true);

                        // Clear after 3 seconds
                        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                        typingTimeoutRef.current = setTimeout(() => {
                            setIsUserTyping(false);
                        }, 3000);
                    }
                }
        )
            .subscribe();

            channelRef.current = channel;
            return channel;
    };

    // ... (fetchMessages remains same)

    const handleTyping = async () => {
        if (!selectedSession || !channelRef.current) return;

            await channelRef.current.send({
                type: 'broadcast',
            event: 'typing',
            payload: {sender_role: 'agent' }
        });
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

            const {error} = await supabase
            .from('chat_messages')
            .insert({
                session_id: selectedSession.id,
            sender_id: user.id,
            message: msgContent,
            sender_role: 'agent'
                });

            if (error) throw error;

            // Update session updated_at

            return (
            <div className="flex h-[calc(100vh-120px)] bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Sidebar */}
                <div className={`w-full md:w-80 border-r border-gray-200 dark:border-gray-700 flex-col ${selectedSession ? 'hidden md:flex' : 'flex'}`}>
                    {/* ... Sidebar content ... */}
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
                <div className={`flex-1 flex-col ${selectedSession ? 'flex' : 'hidden md:flex'}`}>
                    {selectedSession ? (
                        <>
                            {/* Header */}
                            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                                <div className="flex items-center gap-3">
                                    {/* Back Button (Mobile Only) */}
                                    <button
                                        onClick={() => setSelectedSession(null)}
                                        className="md:hidden p-1 -ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>

                                    <div className="relative">
                                        <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center">
                                            <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        {isUserOnline && (
                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white dark:border-gray-800 rounded-full"></div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">
                                            {selectedSession.user?.full_name}
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {selectedSession.user?.email}
                                            </p>
                                            {isUserOnline && (
                                                <span className="text-[10px] text-green-600 dark:text-green-400 font-medium bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full">
                                                    Online
                                                </span>
                                            )}
                                        </div>
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
                                        <span className="hidden sm:inline">Close Chat</span>
                                    </button>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                                {messages.map((msg, index) => {
                                    const isMe = msg.sender_role === 'agent' || msg.sender_role === 'admin';
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
                                                    className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2 ${isMe
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
                                {isUserTyping && (
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

                            {/* Input */}
                            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                                <form onSubmit={sendMessage} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => {
                                            setNewMessage(e.target.value);
                                            handleTyping();
                                        }}
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
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900">
                            <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
                            <p className="text-lg font-medium">Select a chat to start messaging</p>
                            <p className="text-sm mt-2">Choose from the list on the left</p>
                        </div>
                    )}
                </div>
            </div>
            );
}
            ```

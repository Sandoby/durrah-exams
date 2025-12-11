import { useState, useEffect, useRef } from 'react';
import { Send, X, MessageCircle, Loader2, User, Check, CheckCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

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
  user_email: string;
  user_name: string;
  agent_id: string | null;
  status: 'waiting' | 'active' | 'ended';
  started_at: string;
  assigned_at: string | null;
  ended_at: string | null;
  rating: number | null;
  feedback: string | null;
  created_at: string;
  updated_at: string;
}

function ChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAgentOnline, setIsAgentOnline] = useState(false);
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (user) {
      checkActiveSession();
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && currentSession?.id) {
      fetchMessages(currentSession.id);
      subscribeToSession(currentSession.id);
    }
  }, [isOpen, currentSession?.id]);

  const checkActiveSession = async () => {
    if (!user) return;

    try {
      // First check for active or waiting session
      const { data: openSession } = await supabase
        .from('live_chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['waiting', 'active'])
        .single();

      if (openSession) {
        setCurrentSession(openSession);
        fetchMessages(openSession.id);
        subscribeToSession(openSession.id);

        const { count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', openSession.id)
          .neq('sender_id', user.id)
          .eq('is_read', false);

        setUnreadCount(count || 0);
      } else {
        // Check for most recent ended session to show rating message
        const { data: closedSession } = await supabase
          .from('live_chat_sessions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'ended')
          .order('ended_at', { ascending: false })
          .limit(1)
          .single();

        if (closedSession) {
          setCurrentSession(closedSession);
          fetchMessages(closedSession.id);
        }
      }
    } catch (error) {
      console.log('No active session');
    }
  };

  const startNewSession = async () => {
    if (!user) return null;

    try {
      // Get user profile for denormalized fields
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', user.id)
        .single();

      // Check if there's a recently ended session (within 24 hours) - reopen it
      const { data: recentSession } = await supabase
        .from('live_chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'ended')
        .gte('ended_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('ended_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentSession) {
        // Reopen the recent session
        const { data, error } = await supabase
          .from('live_chat_sessions')
          .update({ status: 'waiting', ended_at: null })
          .eq('id', recentSession.id)
          .select()
          .single();

        if (error) throw error;
        setCurrentSession(data);
        fetchMessages(data.id);
        subscribeToSession(data.id);
        return data;
      }

      // Create new session only if no recent session exists
      const { data, error } = await supabase
        .from('live_chat_sessions')
        .insert({
          user_id: user.id,
          user_email: profile?.email || user.email || '',
          user_name: profile?.full_name || 'User',
          status: 'waiting'
        })
        .select()
        .single();

      if (error) throw error;
      setCurrentSession(data);
      subscribeToSession(data.id);
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
          event: 'UPDATE',
          schema: 'public',
          table: 'live_chat_sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          const updated = payload.new as ChatSession;
          if (updated.status === 'ended') {
            // Show rating modal when session is closed
            setShowRatingModal(true);
            setCurrentSession(updated);
          }
        }
      )
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
          } else {
            setUnreadCount(prev => prev + 1);
          }

          if (newMsg.sender_role !== 'user') {
            setIsAgentTyping(false);
          }
        }
      )
      .on(
        'broadcast',
        { event: 'typing' },
        (payload) => {
          if (payload.payload.sender_role === 'agent') {
            setIsAgentTyping(true);

            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
              setIsAgentTyping(false);
            }, 3000);
          }
        }
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            online_at: new Date().toISOString(),
            role: 'user'
          });
        }
      });

    channelRef.current = channel;
    
    // Subscribe to agent presence on a separate channel
    subscribeToAgentPresence();
    
    return channel;
  };

  const subscribeToAgentPresence = () => {
    const presenceChannel = supabase
      .channel('agent-presence')
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const agents = Object.values(state).flat().filter((p: any) => p.role === 'agent');
        setIsAgentOnline(agents.length > 0);
      })
      .subscribe();
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

      // Check if current session is ended, if so create a new one
      if (currentSession?.status === 'ended') {
        // Clear old messages
        setMessages([]);
        // Create new session
        const newSession = await startNewSession();
        if (!newSession) return;
        sessionId = newSession.id;
      } else if (!sessionId) {
        // No session at all, create new one
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
      setNewMessage(msgContent);
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

  const getDateLabel = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 rounded-full shadow-lg transition-all duration-300 z-50 ${
          isOpen
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

      {isOpen && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-20 sm:right-4 sm:w-96 sm:h-[600px] bg-white dark:bg-gray-800 shadow-2xl rounded-none sm:rounded-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 z-50 transition-all duration-200 ease-in-out">
          <div className="p-4 bg-indigo-600 flex justify-between items-center text-white shrink-0">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <h3 className="font-semibold">Live Support</h3>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isAgentOnline ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
                }`}
              ></div>
              <span className="text-xs opacity-90">
                {isAgentOnline ? 'Agent Online' : 'Offline'}
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-indigo-700 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

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
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                {messages.map((msg, index) => {
                  const isMe = msg.sender_role === 'user';
                  const showDateSeparator =
                    index === 0 ||
                    getDateLabel(new Date(msg.created_at)) !==
                      getDateLabel(new Date(messages[index - 1].created_at));

                  const isSequence =
                    index > 0 &&
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
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${
                          isSequence ? 'mt-1' : 'mt-4'
                        }`}
                      >
                        {!isMe && !isSequence && (
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center mr-2 flex-shrink-0">
                            <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          </div>
                        )}
                        {!isMe && isSequence && <div className="w-10" />}

                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                            isMe
                              ? 'bg-indigo-600 text-white rounded-br-none'
                              : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none shadow-sm'
                          }`}
                        >
                          <p className="text-sm break-words">{msg.message}</p>
                          <div className={`flex items-center justify-end gap-1 mt-1`}>
                            <p
                              className={`text-[10px] ${
                                isMe
                                  ? 'text-indigo-200'
                                  : 'text-gray-500 dark:text-gray-400'
                              }`}
                            >
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
                {/* Rating Button - Show when session is ended */}
                {currentSession?.status === 'ended' && (
                  <div className="flex justify-center my-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setShowRatingModal(true)}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white rounded-full font-semibold shadow-lg transition-all hover:shadow-xl"
                    >
                      <span>⭐</span>
                      <span>Rate Your Experience</span>
                    </button>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shrink-0">
                {currentSession?.status === 'ended' ? (
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      This chat session has been closed.
                    </p>
                    <button
                      onClick={async () => {
                        setMessages([]);
                        const newSession = await startNewSession();
                        if (newSession) {
                          subscribeToSession(newSession.id);
                        }
                      }}
                      className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Start New Chat
                    </button>
                  </div>
                ) : (
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
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[999] p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all animate-scale-up">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">⭐</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                How was your experience?
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
                Your feedback helps us improve our service
              </p>
            </div>
            
            {/* Star Rating - Interactive */}
            <div className="flex justify-center gap-3 mb-8">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setSelectedRating(star)}
                  className="group transition-all duration-200"
                  onMouseEnter={() => {/* Visual feedback on hover */}}
                >
                  <svg
                    className={`w-14 h-14 transition-all duration-200 cursor-pointer ${
                      star <= selectedRating
                        ? 'text-yellow-400 fill-yellow-400 scale-110'
                        : 'text-gray-300 dark:text-gray-600 hover:text-yellow-300 hover:scale-105'
                    }`}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </button>
              ))}
            </div>

            {/* Rating Label */}
            {selectedRating > 0 && (
              <div className="text-center mb-6 text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                {selectedRating === 5 && "Excellent! 🎉"}
                {selectedRating === 4 && "Great! 😊"}
                {selectedRating === 3 && "Good 👍"}
                {selectedRating === 2 && "Fair 🤔"}
                {selectedRating === 1 && "Poor 😞"}
              </div>
            )}

            {/* Feedback Text */}
            <textarea
              value={ratingFeedback}
              onChange={(e) => setRatingFeedback(e.target.value)}
              placeholder="Tell us more... (optional)"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none mb-6 text-sm"
              rows={3}
            />

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRatingModal(false);
                  setSelectedRating(0);
                  setRatingFeedback('');
                }}
                className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Skip
              </button>
              <button
                onClick={async () => {
                  if (selectedRating > 0) {
                    try {
                      await supabase.from('chat_ratings').insert({
                        session_id: currentSession?.id,
                        rating: selectedRating,
                        feedback: ratingFeedback || null,
                        user_id: user?.id
                      });
                      toast.success('Thank you for rating! 🙏');
                    } catch (error) {
                      console.error('Error saving rating:', error);
                      toast.error('Failed to save rating');
                    }
                  }
                  setShowRatingModal(false);
                  setSelectedRating(0);
                  setRatingFeedback('');
                }}
                disabled={selectedRating === 0}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export { ChatWidget };

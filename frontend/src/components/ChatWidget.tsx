import { useState, useEffect, useRef } from 'react';
import { Send, X, MessageCircle, Loader2, User, Check, CheckCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { chatService } from '../services/RealtimeChatService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface ChatMessage {
  id: string;
  session_id: string;
  sender_id: string | null;
  is_agent: boolean;
  sender_role: 'user' | 'agent' | 'admin';
  sender_name: string;
  message: string;
  created_at: string;
  is_read: boolean;
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
  created_at?: string;
  updated_at?: string;
}

function ChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [agentAssigned, setAgentAssigned] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unsubscribeFromMessages = useRef<(() => void) | null>(null);
  const unsubscribeFromSession = useRef<(() => void) | null>(null);
  const unsubscribeFromStatus = useRef<(() => void) | null>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check for active session when user logs in
  useEffect(() => {
    if (user) {
      checkActiveSession();
    }

    return () => {
      unsubscribeFromMessages.current?.();
      unsubscribeFromSession.current?.();
      unsubscribeFromStatus.current?.();
    };
  }, [user]);

  // Subscribe to online/offline status
  useEffect(() => {
    unsubscribeFromStatus.current = chatService.onStatusChange((isOnline) => {
      setIsOnline(isOnline);
      if (!isOnline) {
        toast.error('Connection lost. Messages will be sent when online.');
      } else {
        toast.success('Back online!');
      }
    });

    return () => unsubscribeFromStatus.current?.();
  }, []);

  // Open/close handlers
  useEffect(() => {
    if (isOpen && currentSession?.id) {
      // Subscribe to real-time messages
      unsubscribeFromMessages.current = chatService.subscribeToSessionMessages(
        currentSession.id,
        (message) => {
          console.log('[CHAT] Received real-time message:', message);
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.find((m) => m.id === message.id)) {
              console.log('[CHAT] Duplicate message ignored:', message.id);
              return prev;
            }
            console.log('[CHAT] Adding new message to UI:', message.id);
            return [...prev, message];
          });

          // Update unread count
          if (message.sender_role === 'agent' && message.sender_id !== user?.id) {
            setUnreadCount((c) => c + 1);
          }
        }
      );

      // Subscribe to session updates (assignment, status changes)
      unsubscribeFromSession.current = chatService.subscribeToSession(
        currentSession.id,
        (updated) => {
          setCurrentSession({
            ...updated,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          if (updated.agent_id && !agentAssigned) {
            setAgentAssigned(true);
            toast.success('An agent has joined the chat!');
          }
        }
      );

      // Load existing messages
      loadMessages(currentSession.id);
    }

    return () => {
      unsubscribeFromMessages.current?.();
      unsubscribeFromSession.current?.();
    };
  }, [isOpen, currentSession?.id]);

  const checkActiveSession = async () => {
    if (!user) return;

    try {
      // Look for waiting or active session
      const { data: openSession, error } = await supabase
        .from('live_chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['waiting', 'active'])
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      if (openSession && !error) {
        setCurrentSession(openSession);
        if (openSession.agent_id) {
          setAgentAssigned(true);
        }
      } else {
        // Check for most recent ended session
        const { data: closedSession } = await supabase
          .from('live_chat_sessions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'ended')
          .order('ended_at', { ascending: false })
          .limit(1)
          .single();

        if (closedSession && !closedSession.rating) {
          setCurrentSession(closedSession);
          setShowRatingModal(true);
        }
      }
    } catch (err) {
      console.error('[CHAT] Error checking session:', err);
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);

      // Mark agent messages as read
      const unreadMessages = (data || []).filter(
        (m) => m.is_agent && !m.is_read
      );

      if (unreadMessages.length > 0) {
        for (const msg of unreadMessages) {
          await chatService.markMessageAsRead(msg.id);
        }
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('[CHAT] Error loading messages:', err);
      toast.error('Failed to load messages');
    }
  };

  const startNewSession = async () => {
    try {
      setIsLoading(true);

      // If user is not authenticated, sign them in anonymously
      let authUser = user;
      if (!authUser) {
        console.log('[CHAT] No user found, signing in anonymously...');
        const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();

        if (anonError || !anonData.user) {
          console.error('[CHAT] Anonymous sign-in error:', anonError);
          toast.error('Failed to start chat session');
          return;
        }

        authUser = anonData.user;
        console.log('[CHAT] Anonymous user created:', authUser.id);
      }

      const { data, error } = await supabase
        .from('live_chat_sessions')
        .insert({
          user_id: authUser.id,
          user_email: authUser.email || 'guest@chat.com',
          user_name: authUser.user_metadata?.full_name || 'Guest',
          status: 'waiting',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentSession(data);
      setMessages([]);
      setUnreadCount(0);
      setAgentAssigned(false);
      toast.success('Chat started! Waiting for an agent...');
    } catch (err) {
      console.error('[CHAT] Error starting session:', err);
      toast.error('Failed to start chat session');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !currentSession || isSending) return;

    const messageText = newMessage;
    setNewMessage('');

    try {
      setIsSending(true);

      // Get current authenticated user (could be anonymous)
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        console.error('[CHAT] No authenticated user found');
        toast.error('Please refresh and try again');
        setNewMessage(messageText);
        return;
      }

      const result = await chatService.sendMessage(
        currentSession.id,
        authUser.id,
        false, // is_agent
        'user',
        authUser.user_metadata?.full_name || user?.user_metadata?.full_name || 'You',
        messageText
      );

      if (!result.success) {
        toast.error(result.error || 'Failed to send message');
        setNewMessage(messageText); // Restore message
      }
    } catch (err) {
      console.error('[CHAT] Error sending message:', err);
      toast.error('Error sending message');
      setNewMessage(messageText);
    } finally {
      setIsSending(false);
    }
  };

  const handleRateSession = async () => {
    if (!currentSession || !selectedRating) return;

    try {
      await chatService.rateSession(currentSession.id, selectedRating, ratingFeedback);
      toast.success('Thank you for your feedback!');
      setShowRatingModal(false);
      setSelectedRating(0);
      setRatingFeedback('');
      setCurrentSession(null);
    } catch (err) {
      console.error('[CHAT] Error rating session:', err);
      toast.error('Failed to submit rating');
    }
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
        className={`fixed bottom-4 right-4 sm:bottom-8 sm:right-8 p-4 sm:p-4.5 rounded-[1.5rem] shadow-[0_20px_40px_rgba(79,70,229,0.3)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all duration-500 z-40 group ${isOpen
          ? 'scale-0 opacity-0 rotate-90'
          : 'scale-100 opacity-100 bg-gradient-to-tr from-indigo-600 to-violet-600 text-white hover:scale-110 active:scale-95'
          }`}
      >
        <div className="relative">
          <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7 group-hover:rotate-12 transition-transform duration-300" />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 bg-rose-500 text-white text-[9px] sm:text-[10px] font-black w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 shadow-lg animate-bounce">
              {unreadCount}
            </span>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-24 sm:right-8 sm:w-[400px] sm:h-[650px] bg-white/70 dark:bg-slate-900/70 backdrop-blur-[40px] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.2)] dark:shadow-[0_32px_80px_-16px_rgba(0,0,0,0.5)] rounded-none sm:rounded-[2.5rem] flex flex-col overflow-hidden border border-white/40 dark:border-slate-800/60 z-50 animate-in slide-in-from-bottom-12 fade-in duration-500 ease-out">
          {/* Subtle glass texture overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>

          <div className="relative p-6 bg-gradient-to-tr from-indigo-600 via-indigo-600 to-violet-700 flex justify-between items-center text-white shrink-0 overflow-hidden">
            {/* Animated header background blob */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-pulse"></div>

            <div className="relative flex items-center gap-4">
              <div className="h-12 w-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
                <MessageCircle className="w-6 h-6 text-white drop-shadow-md" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight leading-none uppercase">Durrah Support</h3>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-white/40'}`}></div>
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-80">
                    {isOnline ? 'Direct Access' : 'Disconnected'}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="relative p-2.5 bg-white/10 hover:bg-white/20 rounded-2xl transition-all hover:rotate-90 duration-300"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {!currentSession ? (
            <div className="relative flex-1 flex flex-col items-center justify-center p-8 text-center bg-transparent">
              <div className="relative w-24 h-24 mb-6">
                <div className="absolute inset-0 bg-indigo-500/20 dark:bg-indigo-500/10 rounded-[2rem] blur-xl animate-pulse"></div>
                <div className="relative w-full h-full bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-[2rem] flex items-center justify-center border border-indigo-100 dark:border-slate-700 shadow-inner">
                  <MessageCircle className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">
                How can we help?
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed font-medium px-4">
                Our team is ready to assist you. Start a conversation and we'll be with you shortly.
              </p>
              <button
                onClick={startNewSession}
                disabled={isLoading}
                className="w-full py-5 px-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[1.5rem] font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-slate-900/10 dark:shadow-white/5 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4 translate-x-0.5 -translate-y-0.5" />
                    Connect Now
                  </>
                )}
              </button>
            </div>
          ) : (
            <>
              <div className="relative flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
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
                    <div key={msg.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                      {showDateSeparator && (
                        <div className="flex justify-center my-8">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 dark:bg-slate-800/50 px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                            {getDateLabel(new Date(msg.created_at))}
                          </span>
                        </div>
                      )}
                      <div
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isSequence ? 'mt-1.5' : 'mt-6'
                          }`}
                      >
                        {!isMe && !isSequence && (
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mr-3 flex-shrink-0 shadow-lg border border-white/20">
                            <User className="w-5 h-5 text-white" />
                          </div>
                        )}
                        {!isMe && isSequence && <div className="w-[52px]" />}

                        <div className="flex flex-col gap-1.5 max-w-[85%]">
                          <div
                            className={`px-5 py-3.5 shadow-sm transition-all hover:shadow-md ${isMe
                              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-[1.5rem] rounded-tr-[0.5rem] font-medium'
                              : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-[1.5rem] rounded-tl-[0.5rem] border border-slate-100 dark:border-slate-700/50 font-medium'
                              }`}
                          >
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                          </div>

                          <div className={`flex items-center gap-2 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
                              {new Date(msg.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {isMe && (
                              <span className={msg.is_read ? 'text-indigo-500' : 'text-slate-400'}>
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
                <div ref={messagesEndRef} className="h-4" />
              </div>

              <div className="relative p-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border-t border-white/40 dark:border-slate-800/60 shrink-0">
                {currentSession?.status === 'ended' ? (
                  <button
                    onClick={async () => {
                      setMessages([]);
                      await startNewSession();
                    }}
                    className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2"
                  >
                    Start New Conversation
                  </button>
                ) : (
                  <form onSubmit={sendMessage} className="relative group">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Share your thoughts..."
                      disabled={isSending || !isOnline}
                      className="w-full pl-6 pr-14 py-4 rounded-[1.5rem] border border-white/40 dark:border-slate-800/60 bg-white/40 dark:bg-slate-800/40 text-slate-900 dark:text-white text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all disabled:opacity-50 placeholder:text-slate-400"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || isSending || !isOnline}
                      className="absolute right-2 top-2 p-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl transition-all shadow-lg shadow-slate-900/10 dark:shadow-white/5 active:scale-90 disabled:opacity-50 group-hover:scale-105"
                    >
                      {isSending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5 translate-x-0.5 -translate-y-0.5" />
                      )}
                    </button>
                  </form>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Ultra-Premium Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[20px] flex items-center justify-center z-[999] p-4 animate-in fade-in duration-500">
          <div className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-[40px] rounded-[3rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] max-w-md w-full p-10 transform animate-in zoom-in-95 duration-500 overflow-hidden border border-white/40 dark:border-slate-800/60">
            {/* Ambient background glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]"></div>

            <div className="relative text-center mb-10">
              <div className="inline-flex h-20 w-20 bg-gradient-to-tr from-indigo-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-3xl items-center justify-center mb-6 shadow-inner border border-indigo-100 dark:border-slate-700">
                <span className="text-4xl animate-bounce">⭐</span>
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                Help Us <br />Get Better
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mt-3 text-sm font-medium max-w-[240px] mx-auto leading-relaxed">
                Your feedback directly impacts the future of Durrah.
              </p>
            </div>

            <div className="flex justify-center gap-3 mb-10">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setSelectedRating(star)}
                  className="group relative transition-all duration-300"
                >
                  {star <= selectedRating && (
                    <div className="absolute inset-0 bg-amber-400/20 rounded-full blur-xl animate-pulse"></div>
                  )}
                  <svg
                    className={`w-12 h-12 transition-all duration-300 cursor-pointer ${star <= selectedRating
                      ? 'text-amber-400 fill-amber-400 scale-125'
                      : 'text-slate-200 dark:text-slate-700 hover:text-amber-300 hover:scale-110'
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

            <textarea
              value={ratingFeedback}
              onChange={(e) => setRatingFeedback(e.target.value)}
              placeholder="Tell us what you liked or what to improve..."
              className="w-full px-6 py-4 rounded-[1.5rem] border border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all resize-none mb-10 text-sm font-medium placeholder:text-slate-400"
              rows={3}
            />

            <div className="flex flex-col gap-2.5 sm:gap-3">
              <button
                onClick={async () => {
                  if (selectedRating > 0 && currentSession) {
                    await handleRateSession();
                  }
                }}
                disabled={selectedRating === 0}
                className="w-full py-4 sm:py-5 rounded-[1.2rem] sm:rounded-[1.5rem] bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center"
              >
                Submit Experience
              </button>
              <button
                onClick={() => {
                  setShowRatingModal(false);
                  setSelectedRating(0);
                  setRatingFeedback('');
                }}
                className="w-full py-1 sm:py-2 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export { ChatWidget };

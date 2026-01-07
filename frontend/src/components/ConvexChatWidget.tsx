import { useState, useRef, useEffect, useCallback } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import {
  MessageCircle,
  Send,
  X,
  Minimize2,
  User,
  CheckCheck,
  Loader2,
  Clock,
  FileText,
  Crown,
  Check,
  CreditCard,
  AlertCircle,
  GraduationCap,
  Star
} from 'lucide-react';
import { CONVEX_FEATURES } from '../main';
import { supabase } from '../lib/supabase';

interface ConvexChatWidgetProps {
  userId: string;
  userName: string;
  userEmail?: string;
  userRole: 'student' | 'tutor';
  examId?: string;
  questionId?: string;
  questionText?: string;
  existingSessionId?: string; // Connect to existing session
  onClose?: () => void;
  onSessionEnded?: (endedByAgent: boolean) => void; // Callback when chat ends
}

// Message type
interface ChatMessage {
  _id: string;
  body: string;
  sender_id: string;
  sender_name: string;
  sender_role: 'user' | 'agent' | 'admin';
  _creationTime: number;
  read_at?: number;
}

// Session type
interface ChatSession {
  _id: Id<"chatSessions">;
  status: 'waiting' | 'active' | 'ended';
  student_name?: string;
  user_name?: string;
  user_email?: string;
  subject?: string;
  ended_by?: string; // Track who ended the session
  rating?: number;
  user_id?: string;
}

/**
 * ConvexChatWidget
 * 
 * Real-time chat widget powered by Convex.
 * Features:
 * - Instant message delivery
 * - Typing indicators
 * - Read receipts
 * - Session ratings
 */
export function ConvexChatWidget({
  userId,
  userName,
  userEmail,
  userRole,
  examId,
  questionText,
  existingSessionId,
  onClose,
  onSessionEnded
}: ConvexChatWidgetProps) {
  const enabled = CONVEX_FEATURES.chat;
  const [isOpen, setIsOpen] = useState(false); // Changed isMinimized to isOpen to match ChatWidget logic
  const [newMessage, setNewMessage] = useState('');
  const [selectedRating, setSelectedRating] = useState(0);
  const [hasRated, setHasRated] = useState(false);
  const [sessionId, setSessionId] = useState<Id<"chatSessions"> | null>(
    existingSessionId ? existingSessionId as Id<"chatSessions"> : null
  );
  const [isStarting, setIsStarting] = useState(false);
  const [previousStatus, setPreviousStatus] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mutations
  const startChatMutation = useMutation(api.chat.startChat);
  const sendMessageMutation = useMutation(api.chat.sendMessage);
  const rateSessionMutation = useMutation(api.chat.rateSession);

  // Queries
  const session = useQuery(
    api.chatQueries.getSession,
    sessionId ? { session_id: sessionId } : 'skip'
  ) as ChatSession | null | undefined;

  const messages = useQuery(
    api.chatQueries.getMessages,
    sessionId ? { session_id: sessionId, limit: 100 } : 'skip'
  ) as ChatMessage[] | undefined;

  const typingUsers = useQuery(
    api.presence.getTypingUsers,
    sessionId ? { session_id: sessionId as unknown as string, exclude_user_id: userId } : 'skip'
  );

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Sync existingSessionId prop with state
  useEffect(() => {
    if (existingSessionId) {
      setSessionId(existingSessionId as Id<"chatSessions">);
    }
  }, [existingSessionId]);

  // Detect when session ends (agent closes chat) - show rating modal for tutor
  useEffect(() => {
    if (!session) return;

    // If status changed from active/waiting to ended
    if (previousStatus && previousStatus !== 'ended' && session.status === 'ended') {
      onSessionEnded?.(true);
    }

    setPreviousStatus(session.status);
  }, [session?.status, previousStatus, onSessionEnded]);

  // Start a new chat session
  const startSession = useCallback(async () => {
    if (!enabled || isStarting) return;
    setIsStarting(true);

    try {
      const newSessionId = await startChatMutation({
        scope: examId ? 'exam' : 'support',
        exam_id: examId,
        user_id: userId,
        user_name: userName,
        user_email: userEmail,
        user_role: userRole,
        subject: questionText,
      });
      setSessionId(newSessionId);
    } catch (error) {
      console.error('Failed to start chat:', error);
    } finally {
      setIsStarting(false);
    }
  }, [enabled, isStarting, examId, userId, userName, userEmail, userRole, questionText, startChatMutation]);

  // Send a message
  const handleSendMessage = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !sessionId) return;

    const text = newMessage;
    setNewMessage('');

    try {
      await sendMessageMutation({
        session_id: sessionId,
        sender_id: userId,
        sender_name: userName,
        sender_role: userRole === 'student' ? 'user' : 'agent',
        body: text,
        message_type: 'text',
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      setNewMessage(text); // Restore on error
    }
  }, [newMessage, sessionId, userId, userName, userRole, sendMessageMutation]);


  // Rate session
  const rateSession = useCallback(async (stars: number, feedback?: string) => {
    if (!sessionId) return;

    try {
      await rateSessionMutation({
        session_id: sessionId,
        rating: stars,
        feedback: feedback
      });
    } catch (error) {
      console.error('Failed to rate session:', error);
    }
  }, [sessionId, rateSessionMutation]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleRate = async (stars: number) => {
    setSelectedRating(stars);
    await rateSession(stars);
    setHasRated(true);
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

  if (!enabled) {
    return null;
  }

  const isTyping = typingUsers && typingUsers.length > 0;
  const isLoadingSession = session === undefined && sessionId !== null;
  const unreadCount = (messages ?? []).filter((m: ChatMessage) => !m.read_at && m.sender_id !== userId).length;

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-4 right-4 sm:bottom-8 sm:right-8 p-4 sm:p-4.5 rounded-[1.5rem] shadow-[0_20px_40px_rgba(79,70,229,0.3)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all duration-500 z-40 group bg-gradient-to-tr from-indigo-600 to-violet-700 text-white hover:scale-110 active:scale-95`}
        >
          <div className="relative">
            <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7 group-hover:rotate-12 transition-transform duration-300" />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 bg-rose-500 text-white text-[9px] sm:text-[10px] font-black w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 shadow-lg animate-bounce">
                {unreadCount}
              </span>
            )}
          </div>
        </button>
      )}

      {/* Main Chat Window */}
      {isOpen && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-24 sm:right-8 sm:w-[400px] sm:max-h-[min(700px,calc(100vh-120px))] bg-white/70 dark:bg-slate-900/70 backdrop-blur-[40px] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.2)] dark:shadow-[0_32px_80px_-16px_rgba(0,0,0,0.5)] rounded-none sm:rounded-[2.5rem] flex flex-col overflow-hidden border border-white/40 dark:border-slate-800/60 z-50 animate-in slide-in-from-bottom-12 fade-in duration-500 ease-out">
          {/* Subtle glass texture overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>

          {/* Premium Header */}
          <div className="relative p-5 sm:p-6 bg-gradient-to-tr from-indigo-600 via-indigo-600 to-violet-700 flex justify-between items-center text-white shrink-0 overflow-hidden min-h-[80px] sm:min-h-[96px]">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-pulse"></div>

            <div className="relative flex items-center gap-3 sm:gap-4">
              <div className="h-10 w-10 sm:h-12 sm:w-12 bg-white/20 backdrop-blur-md rounded-xl sm:rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
                <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-md" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black tracking-tight leading-none uppercase">
                  Durrah <span className="opacity-60 font-light">Support</span>
                </h3>
                <div className="flex items-center gap-1.5 mt-1 sm:mt-1.5">
                  <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${session?.status === 'active' ? 'bg-green-400 animate-pulse' : 'bg-white/40'}`}></div>
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest opacity-80">
                    {session?.status === 'active' ? 'Agent Connected' : session?.status === 'waiting' ? 'Finding Agent...' : 'Direct Access'}
                  </span>
                </div>
              </div>
            </div>

            <div className="relative flex gap-1">
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-xl sm:rounded-2xl transition-all hover:rotate-90 duration-300"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl sm:rounded-2xl transition-all hover:rotate-90 duration-300"
              >
                <Minimize2 className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Content Area */}
          {!sessionId ? (
            <div className="relative flex-1 flex flex-col items-center justify-center p-8 text-center bg-transparent">
              <div className="relative w-24 h-24 mb-6">
                <div className="absolute inset-0 bg-indigo-500/20 dark:bg-indigo-500/10 rounded-[2rem] blur-xl animate-pulse"></div>
                <div className="relative w-full h-full bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-[2rem] flex items-center justify-center border border-indigo-100 dark:border-slate-700 shadow-inner">
                  <MessageCircle className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">Need help?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed font-medium px-4">
                {questionText
                  ? `Regarding: "${questionText.substring(0, 40)}${questionText.length > 40 ? '...' : ''}"`
                  : 'Start a conversation with our support team and we\'ll be with you shortly.'
                }
              </p>
              <button
                onClick={startSession}
                disabled={isStarting}
                className="w-full py-5 px-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[1.5rem] font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-slate-900/10 dark:shadow-white/5 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isStarting ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <MessageCircle className="w-4 h-4" />
                    Connect Now
                  </>
                )}
              </button>
            </div>
          ) : (
            <>
              {/* Message List */}
              <div className="relative flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                {isLoadingSession && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                  </div>
                )}

                {(messages ?? []).map((msg, index) => {
                  const isMe = msg.sender_id === userId;
                  const msgDate = new Date(msg._creationTime);
                  const showDateSeparator =
                    index === 0 ||
                    getDateLabel(msgDate) !== getDateLabel(new Date(messages![index - 1]._creationTime));

                  const isSequence =
                    index > 0 &&
                    (messages![index - 1].sender_id === msg.sender_id) &&
                    !showDateSeparator;

                  return (
                    <div key={msg._id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                      {showDateSeparator && (
                        <div className="flex justify-center my-8">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 dark:bg-slate-800/50 px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                            {getDateLabel(msgDate)}
                          </span>
                        </div>
                      )}
                      <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isSequence ? 'mt-1.5' : 'mt-6'}`}>
                        {!isMe && !isSequence && (
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mr-3 flex-shrink-0 shadow-lg border border-white/20">
                            <User className="w-5 h-5 text-white" />
                          </div>
                        )}
                        {!isMe && isSequence && <div className="w-[52px]" />}

                        <div className="flex flex-col gap-1.5 max-w-[85%]">
                          <div
                            className={`px-4 sm:px-5 py-3 sm:py-3.5 shadow-sm transition-all hover:shadow-md break-words overflow-hidden ${isMe
                              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-[1.25rem] sm:rounded-[1.5rem] rounded-tr-[0.4rem] sm:rounded-tr-[0.5rem] font-medium'
                              : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-[1.25rem] sm:rounded-[1.5rem] rounded-tl-[0.4rem] sm:rounded-tl-[0.5rem] border border-slate-100 dark:border-slate-700/50 font-medium'
                              }`}
                          >
                            <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.body}</p>
                          </div>

                          <div className={`flex items-center gap-2 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
                              {msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isMe && (
                              <span className={msg.read_at ? 'text-indigo-500' : 'text-slate-400'}>
                                {msg.read_at ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {isTyping && (
                  <div className="flex items-center gap-3 text-slate-400 ml-1 mt-4">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Agent is typing</span>
                  </div>
                )}

                <div ref={messagesEndRef} className="h-4" />
              </div>

              {/* Input Area */}
              <div className="relative p-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border-t border-white/40 dark:border-slate-800/60 shrink-0">
                {session?.status === 'ended' ? (
                  <div className="flex flex-col items-center gap-6 py-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {!hasRated ? (
                      <>
                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Rate your experience</p>
                        <div className="flex gap-4">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => handleRate(star)}
                              className="transition-all hover:scale-125 active:scale-95 group"
                            >
                              <Star
                                className={`w-8 h-8 transition-colors ${star <= selectedRating
                                  ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]'
                                  : 'text-slate-200 dark:text-slate-700 group-hover:text-amber-300'
                                  }`}
                              />
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => setHasRated(true)}
                          className="text-[10px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-[0.2em] transition-colors"
                        >
                          Skip rating
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 text-green-500 bg-green-50 dark:bg-green-500/10 px-6 py-3 rounded-2xl border border-green-100 dark:border-green-500/20">
                          <Check className="w-4 h-4" />
                          <span className="text-xs font-black uppercase tracking-widest">Thank you!</span>
                        </div>
                        <button
                          onClick={() => {
                            setSessionId(null);
                            setHasRated(false);
                            setSelectedRating(0);
                            startSession();
                          }}
                          className="w-full py-4 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2"
                        >
                          Start New Conversation
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="relative group">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Share your thoughts..."
                      onKeyPress={handleKeyPress}
                      className="w-full pl-6 pr-14 py-4 rounded-[1.5rem] border border-white/40 dark:border-slate-800/60 bg-white/40 dark:bg-slate-800/40 text-slate-900 dark:text-white text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="absolute right-2 top-2 p-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl transition-all shadow-lg shadow-slate-900/10 dark:shadow-white/5 active:scale-90 disabled:opacity-50 group-hover:scale-105"
                    >
                      <Send className="w-5 h-5 translate-x-0.5 -translate-y-0.5" />
                    </button>
                  </form>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

/**
 * Agent Chat Panel
 * 
 * For tutors/agents to manage multiple chat sessions
 * Now includes user details, payments, notes, and subscription management
 */

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

interface AgentNote {
  id: string;
  note: string;
  is_important: boolean;
  created_at: string;
}

export function AgentChatPanel({ agentId, agentName }: { agentId: string; agentName: string }) {
  const enabled = CONVEX_FEATURES.chat;
  const assignAgentMutation = useMutation(api.chat.assignAgent);
  const endChatMutation = useMutation(api.chat.endChat);
  const sendMessageMutation = useMutation(api.chat.sendMessage);

  // Query all sessions (including waiting ones that agent can pick up)
  const allSessions = useQuery(
    api.chatQueries.listSessions,
    enabled ? { scope: 'support' as const } : 'skip'
  );

  const waitingCount = useQuery(
    api.chatQueries.getWaitingCount,
    enabled ? { scope: 'support' as const } : 'skip'
  );

  const [activeSessionId, setActiveSessionId] = useState<Id<"chatSessions"> | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // User details state (fetched from Supabase)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userPayments, setUserPayments] = useState<Payment[]>([]);
  const [userNotes, setUserNotes] = useState<AgentNote[]>([]);
  const [loadingUser, setLoadingUser] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [noteImportant, setNoteImportant] = useState(false);
  const [extendDays, setExtendDays] = useState(30);
  const [extendReason, setExtendReason] = useState('');

  // Get messages for active session
  const activeSession = useQuery(
    api.chatQueries.getSession,
    activeSessionId ? { session_id: activeSessionId } : 'skip'
  ) as ChatSession | null | undefined;

  const messages = useQuery(
    api.chatQueries.getMessages,
    activeSessionId ? { session_id: activeSessionId, limit: 100 } : 'skip'
  );

  // Auto-scroll when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch user details when active session changes
  useEffect(() => {
    if (activeSession?.user_id) {
      fetchUserDetails(activeSession.user_id);
    } else {
      setUserProfile(null);
      setUserPayments([]);
      setUserNotes([]);
    }
  }, [activeSession?.user_id]);

  const fetchUserDetails = async (userId: string) => {
    setLoadingUser(true);
    try {
      // Fetch user profile from Supabase
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileData) {
        setUserProfile(profileData);
      }

      // Fetch payments
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      setUserPayments(paymentsData || []);

      // Fetch agent notes
      const { data: notesData } = await supabase
        .from('agent_user_notes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      setUserNotes(notesData || []);
    } catch (error) {
      console.error('Error fetching user details:', error);
    } finally {
      setLoadingUser(false);
    }
  };

  const handleAssign = async (sessionId: Id<"chatSessions">) => {
    try {
      await assignAgentMutation({
        session_id: sessionId,
        agent_id: agentId,
        agent_name: agentName,
      });
      setActiveSessionId(sessionId);
    } catch (error) {
      console.error('Failed to assign session:', error);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !activeSessionId) return;

    const text = newMessage;
    setNewMessage('');

    try {
      await sendMessageMutation({
        session_id: activeSessionId,
        sender_id: agentId,
        sender_name: agentName,
        sender_role: 'agent',
        body: text,
        message_type: 'text',
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      setNewMessage(text);
    }
  };

  const handleEndChat = async () => {
    if (!activeSessionId) return;

    try {
      await endChatMutation({
        session_id: activeSessionId,
        ended_by: agentId,
        ended_by_role: 'agent',
      });
    } catch (error) {
      console.error('Failed to end chat:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const addNote = async () => {
    if (!newNote.trim() || !userProfile) return;

    try {
      const { error } = await supabase.from('agent_user_notes').insert({
        user_id: userProfile.id,
        agent_id: agentId,
        note: newNote,
        is_important: noteImportant
      });

      if (error) throw error;

      setNewNote('');
      setNoteImportant(false);
      fetchUserDetails(userProfile.id);
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  const extendSubscription = async () => {
    if (!userProfile || !extendDays) return;

    if (!confirm(`Extend subscription for ${userProfile.email} by ${extendDays} days?`)) return;

    try {
      const { data, error } = await supabase.rpc('extend_subscription', {
        p_user_id: userProfile.id,
        p_agent_id: agentId,
        p_days: extendDays,
        p_reason: extendReason || 'Extended by support agent'
      });

      if (error) throw error;

      if (data?.success) {
        setExtendReason('');
        fetchUserDetails(userProfile.id);
      }
    } catch (error) {
      console.error('Failed to extend subscription:', error);
    }
  };
  const [mobileView, setMobileView] = useState<'sessions' | 'chat' | 'info'>('sessions');

  const handleSelectSession = (sessionId: Id<"chatSessions">) => {
    setActiveSessionId(sessionId);
    setMobileView('chat');
  };

  const panelClass = "transition-all duration-500 ease-in-out h-full overflow-y-auto flex flex-col";

  if (!enabled || allSessions === undefined) {
    return (
      <div className="flex items-center justify-center p-8 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl h-full">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
          <p className="text-sm font-black uppercase tracking-widest text-slate-400">Loading Support Hub...</p>
        </div>
      </div>
    );
  }

  const sessions = (allSessions ?? []).filter((s: any) =>
    s.status === 'waiting' || s.assigned_to === agentId
  );

  return (
    <div className="flex h-full bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Sessions List - Hidden on mobile if not in 'sessions' view */}
      <div className={`${panelClass} w-full md:w-80 md:flex bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-r border-slate-200 dark:border-slate-800/60 z-30 shrink-0 ${mobileView === 'sessions' ? 'flex' : 'hidden'
        }`}>
        <div className="p-6 border-b border-slate-200 dark:border-slate-800/60 bg-gradient-to-tr from-indigo-600 to-violet-700 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-lg uppercase tracking-tight flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                <MessageCircle className="h-5 w-5" />
              </div>
              Sessions
            </h3>
            {waitingCount !== undefined && waitingCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-1 rounded-full animate-bounce shadow-lg">
                {waitingCount} NEW
              </span>
            )}
          </div>
          <div className="text-xs font-bold text-white/70 uppercase tracking-widest flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            Support Active
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-4 border border-slate-200 dark:border-slate-700">
                <MessageCircle className="h-8 w-8 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Quiet for now</p>
            </div>
          ) : (
            sessions.map((session: any) => (
              <button
                key={session._id}
                onClick={() => {
                  if (session.status === 'waiting') {
                    handleAssign(session._id);
                    setMobileView('chat');
                  } else {
                    handleSelectSession(session._id);
                  }
                }}
                className={`w-full p-4 rounded-3xl text-left transition-all duration-300 group relative border shadow-sm ${activeSessionId === session._id
                  ? 'bg-gradient-to-br from-indigo-600 to-violet-700 text-white border-transparent scale-[1.02] shadow-xl shadow-indigo-600/20'
                  : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 hover:scale-[1.01]'
                  }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border border-white/20 ${activeSessionId === session._id ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700'
                      }`}>
                      <User className={`h-5 w-5 ${activeSessionId === session._id ? 'text-white' : 'text-slate-500'}`} />
                    </div>
                    <div className="min-w-0">
                      <p className={`font-black text-sm uppercase tracking-tight truncate ${activeSessionId === session._id ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                        {session.user_name || 'Visitor'}
                      </p>
                      <p className={`text-[10px] font-bold uppercase tracking-widest truncate mt-0.5 ${activeSessionId === session._id ? 'text-white/60' : 'text-slate-400'}`}>
                        {session.subject || 'Support Request'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pl-1">
                  <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full ${session.status === 'waiting'
                    ? 'bg-amber-400/20 text-amber-500 border border-amber-400/30'
                    : 'bg-green-400/20 text-green-500 border border-green-400/30'
                    }`}>
                    {session.status}
                  </span>
                  <div className="flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                    <Clock className="w-3 h-3" />
                    <span className="text-[9px] font-black">ACTIVE</span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Active Chat Area - Main content, hidden only when showing Info/Sessions on mobile */}
      <div className={`${panelClass} flex-1 min-w-0 bg-transparent relative z-20 ${mobileView === 'chat' ? 'flex' : 'hidden md:flex'
        }`}>
        {activeSessionId && activeSession ? (
          <>
            {/* Chat Area Header */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/60 p-6 flex items-center justify-between shadow-sm relative">
              <div className="flex items-center gap-4 min-w-0">
                {/* Back button for mobile */}
                <button
                  onClick={() => setMobileView('sessions')}
                  className="md:hidden p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <Minimize2 className="h-5 w-5 rotate-90 text-slate-600 dark:text-slate-400" />
                </button>

                <div className="relative shrink-0">
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center border border-indigo-200 dark:border-indigo-800/50">
                    <User className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-4 border-white dark:border-slate-900 rounded-full shadow-lg"></div>
                </div>
                <div className="min-w-0">
                  <h4 className="font-black text-base uppercase tracking-tight text-slate-900 dark:text-white truncate">
                    {activeSession.user_name || 'Anonymous User'}
                  </h4>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 truncate">
                    {activeSession.user_email || 'In Session'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMobileView(mobileView === 'info' ? 'chat' : 'info')}
                  className={`p-3 rounded-2xl transition-all flex items-center gap-2 border ${mobileView === 'info'
                    ? 'bg-indigo-600 text-white border-transparent'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                >
                  <User className="h-5 w-5" />
                  <span className="hidden lg:inline text-xs font-black uppercase tracking-widest">Detail View</span>
                </button>
                {activeSession.status !== 'ended' && (
                  <button
                    onClick={handleEndChat}
                    className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-2xl hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors border border-rose-100 dark:border-rose-900/30 group"
                  >
                    <X className="h-5 w-5 group-hover:rotate-90 transition-transform" />
                  </button>
                )}
              </div>
            </div>

            {/* Messages - Ultra Premium Look */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide bg-slate-50/50 dark:bg-slate-950/50">
              {(messages ?? []).map((message: any) => (
                <div key={message._id} className={`flex ${message.sender_id === agentId ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                  <div className={`max-w-[75%] ${message.sender_id === agentId ? 'order-1' : 'order-2'}`}>
                    <div className={`p-4 rounded-3xl shadow-sm text-sm font-medium leading-relaxed ${message.sender_id === agentId
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-700 text-white rounded-tr-md'
                      : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-md'
                      }`}>
                      <p className="whitespace-pre-wrap break-words">{message.body}</p>
                    </div>
                    <div className={`flex items-center gap-2 mt-2 px-1 ${message.sender_id === agentId ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {new Date(message._creationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {message.sender_id === agentId && message.read_at && (
                        <CheckCheck className="h-4 w-4 text-indigo-500" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} className="h-8" />
            </div>

            {/* Agent Input Area */}
            {activeSession.status !== 'ended' ? (
              <div className="p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800/60 sticky bottom-0">
                <div className="flex items-end gap-4 max-w-5xl mx-auto">
                  <div className="relative flex-1 group">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your response..."
                      rows={1}
                      className="w-full px-6 py-4 border border-slate-200 dark:border-slate-700 rounded-[1.5rem] bg-slate-50 dark:bg-slate-805 text-sm max-h-40 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400 dark:text-white"
                    />
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={!newMessage.trim()}
                    className="h-14 w-14 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-slate-900/20 dark:shadow-white/5 active:scale-90 disabled:opacity-30 transition-all shrink-0 hover:scale-105"
                  >
                    <Send className="h-6 w-6 translate-x-0.5 -translate-y-0.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 bg-slate-100 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 text-center animate-in fade-in duration-500">
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-white dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Archived Conversation</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="relative w-24 h-24 mb-8">
              <div className="absolute inset-0 bg-indigo-500/10 rounded-[2.5rem] blur-2xl animate-pulse"></div>
              <div className="relative w-full h-full bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-inner">
                <MessageCircle className="h-10 w-10 text-slate-300 dark:text-slate-600" />
              </div>
            </div>
            <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Support Hub</h4>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest max-w-xs">Select a session from the left to start helping</p>
          </div>
        )}
      </div>

      {/* User Details Sidebar - Responsive Toggle */}
      <div className={`${panelClass} w-full md:w-80 md:flex bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-l border-slate-200 dark:border-slate-800/60 z-30 shrink-0 ${mobileView === 'info' ? 'flex fixed inset-0 z-[60] bg-white dark:bg-slate-900' : 'hidden lg:flex'
        } ${!activeSessionId ? 'lg:hidden' : ''}`}>

        {/* Mobile Header for Info View */}
        {mobileView === 'info' && (
          <div className="p-6 border-b border-slate-200 dark:border-slate-800/60 flex items-center justify-between">
            <h4 className="font-black uppercase tracking-widest text-sm">Customer Intel</h4>
            <button
              onClick={() => setMobileView('chat')}
              className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {loadingUser ? (
            <div className="flex flex-col items-center justify-center h-48 gap-4">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fetching Data</span>
            </div>
          ) : userProfile ? (
            <div className="p-6 space-y-8">
              {/* Profile Card */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                    <User className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">User Profile</h4>
                </div>

                <div className="bg-white dark:bg-slate-900/50 rounded-3xl p-5 border border-slate-100 dark:border-slate-800/50 shadow-sm space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center font-black text-white text-lg border border-white/20">
                      {userProfile.full_name?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-sm uppercase tracking-tight text-slate-900 dark:text-white truncate">{userProfile.full_name || 'Anonymous'}</p>
                      <p className="text-[10px] font-bold text-slate-400 truncate">{userProfile.email}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${userProfile.subscription_status === 'active'
                      ? 'bg-green-400/10 text-green-500 border-green-400/20'
                      : 'bg-slate-400/10 text-slate-500 border-slate-400/20'
                      }`}>
                      {userProfile.subscription_plan || 'Free'}
                    </span>
                    <span className="px-3 py-1.5 bg-indigo-400/10 text-indigo-500 border border-indigo-400/20 rounded-xl text-[10px] font-black uppercase tracking-widest">
                      Member
                    </span>
                  </div>
                </div>
              </section>

              {/* Sub Management */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
                    <Crown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Subscription</h4>
                </div>

                <div className="bg-amber-50/50 dark:bg-amber-900/10 rounded-3xl p-5 border border-amber-100 dark:border-amber-900/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Plan Status</span>
                    <span className="text-[10px] font-black uppercase text-amber-600">{userProfile.subscription_status}</span>
                  </div>

                  <div className="space-y-3">
                    <select
                      value={extendDays}
                      onChange={(e) => setExtendDays(Number(e.target.value))}
                      className="w-full px-4 py-3 text-[11px] font-black uppercase tracking-widest border border-amber-200 dark:border-amber-800/40 rounded-2xl bg-white dark:bg-slate-900 outline-none"
                    >
                      <option value={7}>Extend 7 Days</option>
                      <option value={30}>Extend 30 Days</option>
                      <option value={90}>Extend 90 Days</option>
                    </select>
                    <button
                      onClick={extendSubscription}
                      className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                    >
                      Process Extension
                    </button>
                  </div>
                </div>
              </section>

              {/* Payment History */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                    <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Recent Ledger</h4>
                </div>

                <div className="space-y-3">
                  {userPayments.length === 0 ? (
                    <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No Transactions</p>
                    </div>
                  ) : (
                    userPayments.map((payment) => (
                      <div key={payment.id} className="bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
                        <div>
                          <p className="font-black text-sm text-slate-900 dark:text-white">${(payment.amount / 100).toFixed(2)}</p>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{new Date(payment.created_at).toLocaleDateString()}</p>
                        </div>
                        <span className="px-2 py-1 bg-emerald-400/10 text-emerald-500 text-[8px] font-black uppercase tracking-tighter rounded-md border border-emerald-400/20">
                          {payment.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* Internal Notes */}
              <section className="pb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-rose-50 dark:bg-rose-900/30 rounded-xl">
                    <FileText className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  </div>
                  <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Support Notes</h4>
                </div>

                <div className="space-y-4">
                  <div className="space-y-3">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add agent memo..."
                      rows={2}
                      className="w-full px-5 py-4 text-xs font-semibold rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none shadow-sm dark:text-white"
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all border ${noteImportant ? 'bg-rose-500 border-rose-500' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                          }`}>
                          {noteImportant && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <input
                          type="checkbox"
                          checked={noteImportant}
                          onChange={(e) => setNoteImportant(e.target.checked)}
                          className="hidden"
                        />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-rose-500">Urgent</span>
                      </label>
                      <button
                        onClick={addNote}
                        disabled={!newNote.trim()}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 disabled:opacity-30 active:scale-95 transition-all"
                      >
                        Save
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {userNotes.map((note) => (
                      <div
                        key={note.id}
                        className={`p-4 rounded-2xl relative overflow-hidden ${note.is_important
                          ? 'bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800'
                          : 'bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800'
                          }`}
                      >
                        {note.is_important && <div className="absolute top-0 right-0 w-8 h-8 bg-rose-500/10 rounded-bl-3xl flex items-center justify-center"><AlertCircle className="w-3 h-3 text-rose-500" /></div>}
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">{note.note}</p>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-3">{new Date(note.created_at).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-3xl flex items-center justify-center mb-6">
                <User className="h-8 w-8 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest leading-loose">Waiting for user data context</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

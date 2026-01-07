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
  Star,
  FileText,
  Mail,
  Crown,
  Plus,
  Check,
  CreditCard,
  AlertCircle,
  Calendar
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
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [sessionId, setSessionId] = useState<Id<"chatSessions"> | null>(
    existingSessionId ? existingSessionId as Id<"chatSessions"> : null
  );
  const [isStarting, setIsStarting] = useState(false);
  const [previousStatus, setPreviousStatus] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mutations
  const startChatMutation = useMutation(api.chat.startChat);
  const sendMessageMutation = useMutation(api.chat.sendMessage);
  const endChatMutation = useMutation(api.chat.endChat);
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
      // Check if ended by agent (not by the current user)
      if (session.ended_by && session.ended_by !== userId) {
        // Show rating modal for the user (tutor) side
        if (userRole === 'tutor') {
          setShowRatingModal(true);
          onSessionEnded?.(true); // Notify parent that agent ended
        }
      }
    }

    setPreviousStatus(session.status);
  }, [session?.status, session?.ended_by, previousStatus, userId, userRole, onSessionEnded]);

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

  // End chat
  const endSession = useCallback(async () => {
    if (!sessionId) return;

    try {
      await endChatMutation({
        session_id: sessionId,
        ended_by: userId,
        ended_by_role: userRole === 'tutor' ? 'tutor' : 'user'
      });
    } catch (error) {
      console.error('Failed to end chat:', error);
    }
  }, [sessionId, userId, userRole, endChatMutation]);

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
    await rateSession(stars, ratingFeedback);
    setShowRatingModal(false);
    await endSession();
    setSessionId(null);
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
          className={`fixed bottom-4 right-4 sm:bottom-8 sm:right-8 p-4 sm:p-4.5 rounded-[1.5rem] shadow-[0_20px_40px_rgba(79,70,229,0.3)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all duration-500 z-40 group bg-gradient-to-tr from-indigo-600 to-violet-600 text-white hover:scale-110 active:scale-95`}
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
      )}

      {/* Main Chat Window */}
      {isOpen && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-24 sm:right-8 sm:w-[400px] sm:h-[650px] bg-white/70 dark:bg-slate-900/70 backdrop-blur-[40px] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.2)] dark:shadow-[0_32px_80px_-16px_rgba(0,0,0,0.5)] rounded-none sm:rounded-[2.5rem] flex flex-col overflow-hidden border border-white/40 dark:border-slate-800/60 z-50 animate-in slide-in-from-bottom-12 fade-in duration-500 ease-out">
          {/* Subtle glass texture overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>

          {/* Premium Header */}
          <div className="relative p-5 sm:p-6 bg-gradient-to-tr from-indigo-600 via-indigo-600 to-violet-700 flex justify-between items-center text-white shrink-0 overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-pulse"></div>

            <div className="relative flex items-center gap-3 sm:gap-4">
              <div className="h-10 w-10 sm:h-12 sm:w-12 bg-white/20 backdrop-blur-md rounded-xl sm:rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
                <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-md" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black tracking-tight leading-none uppercase">Live Support</h3>
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
                            className={`px-4 sm:px-5 py-3 sm:py-3.5 shadow-sm transition-all hover:shadow-md ${isMe
                              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-[1.25rem] sm:rounded-[1.5rem] rounded-tr-[0.4rem] sm:rounded-tr-[0.5rem] font-medium'
                              : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-[1.25rem] sm:rounded-[1.5rem] rounded-tl-[0.4rem] sm:rounded-tl-[0.5rem] border border-slate-100 dark:border-slate-700/50 font-medium'
                              }`}
                          >
                            <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
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
                  <div className="flex flex-col gap-3">
                    <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Chat has ended</p>
                    <button
                      onClick={() => {
                        setSessionId(null);
                        startSession();
                      }}
                      className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2"
                    >
                      Start New Conversation
                    </button>
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

      {/* Ultra-Premium Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[20px] flex items-center justify-center z-[999] p-4 animate-in fade-in duration-500">
          <div className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-[40px] rounded-[3rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] max-w-md w-full p-10 transform animate-in zoom-in-95 duration-500 overflow-hidden border border-white/40 dark:border-slate-800/60">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]"></div>

            <div className="relative text-center mb-10">
              <div className="inline-flex h-20 w-20 bg-gradient-to-tr from-indigo-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-3xl items-center justify-center mb-6 shadow-inner border border-indigo-100 dark:border-slate-700">
                <span className="text-4xl animate-bounce">⭐</span>
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Help Us <br />Get Better</h3>
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

            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleRate(selectedRating)}
                disabled={selectedRating === 0}
                className="w-full py-5 rounded-[1.5rem] bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center"
              >
                Submit Experience
              </button>
              <button
                onClick={() => {
                  setShowRatingModal(false);
                  endSession();
                  setSessionId(null);
                }}
                className="w-full py-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
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
  const [showUserPanel, setShowUserPanel] = useState(true);
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

  if (!enabled || allSessions === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Filter sessions: show waiting + assigned to this agent
  const sessions = (allSessions ?? []).filter((s: any) =>
    s.status === 'waiting' || s.assigned_to === agentId
  );

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">
      {/* Sessions List */}
      <div className="w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <h3 className="font-bold flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Chat Sessions
          </h3>
          {waitingCount !== undefined && waitingCount > 0 && (
            <div className="mt-2 text-sm flex items-center gap-1 text-yellow-200">
              <Clock className="h-4 w-4 animate-pulse" />
              {waitingCount} waiting for support
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
          {sessions.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No chat sessions</p>
            </div>
          ) : (
            sessions.map((session: any) => (
              <button
                key={session._id}
                onClick={() => {
                  if (session.status === 'waiting') {
                    handleAssign(session._id);
                  } else {
                    setActiveSessionId(session._id);
                  }
                }}
                className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors ${activeSessionId === session._id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-600' : ''
                  }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm truncate text-gray-900 dark:text-white">
                    {session.user_name || 'Anonymous'}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${session.status === 'waiting'
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    : session.status === 'active'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                    {session.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {session.subject || 'No subject'}
                </p>
                {session.user_email && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                    {session.user_email}
                  </p>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Active Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeSessionId && activeSession ? (
          <>
            {/* Chat Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  {activeSession.status === 'active' && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></span>
                  )}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {activeSession.user_name || 'Anonymous'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {activeSession.user_email || activeSession.subject || 'Support Chat'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowUserPanel(!showUserPanel)}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                >
                  <User className="h-4 w-4" />
                  {showUserPanel ? 'Hide' : 'Show'} Info
                </button>
                {activeSession.status !== 'ended' && (
                  <button
                    onClick={handleEndChat}
                    className="px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    End Chat
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50 dark:bg-gray-900">
              {(messages ?? []).map((message: any) => (
                <div key={message._id} className={`flex ${message.sender_id === agentId ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] ${message.sender_id === agentId ? 'order-1' : 'order-2'}`}>
                    <div className={`rounded-2xl px-4 py-2 ${message.sender_id === agentId ? 'bg-indigo-600 text-white rounded-br-md' : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-bl-md'}`}>
                      <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
                    </div>
                    <div className={`flex items-center gap-1 mt-1 ${message.sender_id === agentId ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-xs text-gray-400">
                        {new Date(message._creationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {message.sender_id === agentId && message.read_at && (
                        <CheckCheck className="h-3 w-3 text-indigo-500" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            {activeSession.status !== 'ended' ? (
              <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 shrink-0">
                <div className="flex items-end gap-3">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    rows={1}
                    className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl resize-none bg-gray-50 dark:bg-gray-900 text-sm max-h-32 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!newMessage.trim()}
                    className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 text-center shrink-0">
                <p className="text-sm text-gray-500 dark:text-gray-400">This chat has ended</p>
                {activeSession.rating !== undefined && activeSession.rating > 0 && (
                  <div className="flex items-center justify-center gap-1 mt-2">
                    <span className="text-xs text-gray-400">Rating:</span>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${star <= (activeSession.rating ?? 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center text-gray-400">
            <div>
              <User className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Select a chat session</p>
            </div>
          </div>
        )}
      </div>

      {/* User Details Sidebar */}
      {showUserPanel && activeSessionId && activeSession && (
        <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto shrink-0">
          {loadingUser ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            </div>
          ) : userProfile ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {/* User Profile */}
              <div className="p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  User Profile
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <User className="h-4 w-4" />
                    <span>{userProfile.full_name || 'No name'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{userProfile.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4" />
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${userProfile.subscription_status === 'active'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                      {userProfile.subscription_plan || 'Free'} - {userProfile.subscription_status || 'inactive'}
                    </span>
                  </div>
                  {userProfile.subscription_end_date && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Calendar className="h-4 w-4" />
                      <span>Expires: {new Date(userProfile.subscription_end_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Subscription Extension */}
              <div className="p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Crown className="h-4 w-4" />
                  Extend Subscription
                </h4>
                <div className="space-y-2">
                  <select
                    value={extendDays}
                    onChange={(e) => setExtendDays(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900"
                  >
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days</option>
                    <option value={60}>60 days</option>
                    <option value={90}>90 days</option>
                  </select>
                  <input
                    type="text"
                    value={extendReason}
                    onChange={(e) => setExtendReason(e.target.value)}
                    placeholder="Reason (optional)"
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900"
                  />
                  <button
                    onClick={extendSubscription}
                    className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg font-medium transition-colors"
                  >
                    Extend Subscription
                  </button>
                </div>
              </div>

              {/* Recent Payments */}
              <div className="p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Recent Payments
                </h4>
                {userPayments.length === 0 ? (
                  <p className="text-sm text-gray-500">No payments found</p>
                ) : (
                  <div className="space-y-2">
                    {userPayments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            ${(payment.amount / 100).toFixed(2)}
                          </span>
                          <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${payment.status === 'succeeded' || payment.status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                            }`}>
                            {payment.status}
                          </span>
                        </div>
                        <span className="text-gray-400 text-xs">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Agent Notes */}
              <div className="p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notes
                </h4>
                <div className="space-y-2 mb-3">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a note about this user..."
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                      <input
                        type="checkbox"
                        checked={noteImportant}
                        onChange={(e) => setNoteImportant(e.target.checked)}
                        className="rounded"
                      />
                      <AlertCircle className="h-3 w-3" />
                      Important
                    </label>
                    <button
                      onClick={addNote}
                      disabled={!newNote.trim()}
                      className="ml-auto px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg font-medium disabled:opacity-50 flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </button>
                  </div>
                </div>

                {userNotes.length > 0 && (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {userNotes.map((note) => (
                      <div
                        key={note.id}
                        className={`p-2 rounded-lg text-sm ${note.is_important
                          ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                          : 'bg-gray-50 dark:bg-gray-900'
                          }`}
                      >
                        <p className="text-gray-700 dark:text-gray-300">{note.note}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(note.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-400">
              <User className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">User info not available</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

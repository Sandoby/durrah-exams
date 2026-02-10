import { useState, useRef, useEffect, useCallback } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import {
  MessageSquare,
  Send,
  X,
  Minimize2,
  User,
  CheckCheck,
  Loader2,
  Clock,
  Star,
  CreditCard,
  FileText,
  Calendar,
  Mail,
  Crown,
  Plus,
  Zap,
  ChevronLeft,
  Activity
} from 'lucide-react';
import { CONVEX_FEATURES } from '../main';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

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
  _creationTime: number;
  read_at?: number;
}

// Session type
interface ChatSession {
  _id: Id<"chatSessions">;
  status: 'waiting' | 'active' | 'ended';
  student_name?: string;
  ended_by?: string; // Track who ended the session
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
  const [isMinimized, setIsMinimized] = useState(true); // Start minimized/closed by default
  const [newMessage, setNewMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [showRating, setShowRating] = useState(false);
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
          setShowRating(true);
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
  const handleSend = useCallback(async () => {
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
  const rateSession = useCallback(async (stars: number) => {
    if (!sessionId) return;

    try {
      await rateSessionMutation({
        session_id: sessionId,
        rating: stars,
      });
    } catch (error) {
      console.error('Failed to rate session:', error);
    }
  }, [sessionId, rateSessionMutation]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEndChat = () => {
    if (userRole === 'student') {
      setShowRating(true);
    } else {
      endSession();
    }
  };

  const handleRate = async (stars: number) => {
    setRating(stars);
    await rateSession(stars);
    setShowRating(false);
    await endSession();
  };

  if (!enabled) {
    return null;
  }

  const isTyping = typingUsers && typingUsers.length > 0;
  const isLoading = session === undefined && sessionId !== null;

  // Show rating modal
  if (showRating) {
    return (
      <div className="fixed bottom-4 right-4 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
        <div className="p-6 text-center">
          <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Rate your experience</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">How was your chat support?</p>

          <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => handleRate(star)}
                className="p-1 hover:scale-105 transition-transform"
              >
                <Star
                  className={`h-8 w-8 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                />
              </button>
            ))}
          </div>

          <button
            onClick={() => { setShowRating(false); endSession(); }}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  // Minimized state
  if (isMinimized) {
    const unreadCount = (messages ?? []).filter((m: ChatMessage) => !m.read_at && m.sender_id !== userId).length;
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 w-14 h-14 bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg flex items-center justify-center text-white transition-colors z-40"
      >
        <MessageSquare className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center font-semibold">
            {unreadCount}
          </span>
        )}
      </button>
    );
  }

  // No active session - show start button
  if (!sessionId) {
    return (
      <div className="fixed bottom-4 right-4 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-40">
        <div className="bg-blue-600 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <span className="font-semibold">Live Support</span>
          </div>
          <div className="flex gap-1">
            <button onClick={() => setIsMinimized(true)} className="p-1 hover:bg-white/20 rounded transition-colors">
              <Minimize2 className="h-4 w-4" />
            </button>
            {onClose && (
              <button onClick={onClose} className="p-1 hover:bg-white/20 rounded transition-colors">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">Need help?</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {questionText
              ? `Question: "${questionText.substring(0, 50)}..."`
              : 'Start a chat with our support team'
            }
          </p>

          <button
            onClick={startSession}
            disabled={isStarting}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
          >
            {isStarting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <MessageSquare className="h-4 w-4" />
                Start Chat
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-80 sm:w-96 h-[500px] bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden z-40">
      {/* Header */}
      <div className="bg-blue-600 p-4 text-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <User className="h-5 w-5" />
            </div>
            {session?.status === 'active' && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></span>
            )}
          </div>
          <div>
            <div className="font-semibold">Live Support</div>
            <div className="text-xs opacity-80">
              {session?.status === 'waiting' && 'Waiting for agent...'}
              {session?.status === 'active' && 'Agent connected'}
              {session?.status === 'ended' && 'Chat ended'}
            </div>
          </div>
        </div>

        <div className="flex gap-1">
          <button onClick={() => setIsMinimized(true)} className="p-1.5 hover:bg-white/20 rounded transition-colors">
            <Minimize2 className="h-4 w-4" />
          </button>
          <button onClick={handleEndChat} className="p-1.5 hover:bg-white/20 rounded transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Waiting indicator */}
      {session?.status === 'waiting' && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 px-4 py-2 flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-400 shrink-0">
          <Clock className="h-4 w-4 animate-pulse" />
          <span>Waiting for an agent to join...</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        )}

        {(messages ?? []).map((message: ChatMessage) => (
          <MessageBubble
            key={message._id}
            message={message}
            isOwn={message.sender_id === userId}
          />
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
            <span>typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {session?.status !== 'ended' && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl resize-none bg-transparent text-sm max-h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim()}
              className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Closed state */}
      {session?.status === 'ended' && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-center shrink-0">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">This chat has ended</p>
          <button
            onClick={() => setSessionId(null)}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold transition-colors"
          >
            Start new chat
          </button>
        </div>
      )}
    </div>
  );
}

// Message Bubble Component
function MessageBubble({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${isOwn ? 'order-1' : 'order-2'}`}>
        <div
          className={`rounded-2xl px-4 py-2 ${isOwn
            ? 'bg-blue-600 text-white rounded-br-md'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md'
            }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
        </div>
        <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          <span className="text-xs text-gray-400">
            {new Date(message._creationTime).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
          {isOwn && message.read_at && (
            <CheckCheck className="h-3 w-3 text-blue-500" />
          )}
        </div>
      </div>
    </div>
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

interface AgentDashboardPayment {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  provider: string;
  currency?: string;
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
  const [userPayments, setUserPayments] = useState<AgentDashboardPayment[]>([]);
  const [userNotes, setUserNotes] = useState<AgentNote[]>([]);
  const [loadingUser, setLoadingUser] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [noteImportant, setNoteImportant] = useState(false);
  const [extendDays, setExtendDays] = useState(30);
  const [extendReason, setExtendReason] = useState('');

  // Missing data states
  const [userExams, setUserExams] = useState<any[]>([]);
  const [cannedResponses, setCannedResponses] = useState<any[]>([]);
  const [showCannedMenu, setShowCannedMenu] = useState(false);

  // Mobile responsiveness states
  const [showSessionsList, setShowSessionsList] = useState(true);
  const [showUserPanelMobile, setShowUserPanelMobile] = useState(false);

  // Get messages for active session
  const activeSession = useQuery(
    api.chatQueries.getSession,
    activeSessionId ? { session_id: activeSessionId } : 'skip'
  );

  const messages = useQuery(
    api.chatQueries.getMessages,
    activeSessionId ? { session_id: activeSessionId, limit: 100 } : 'skip'
  );

  // Auto-scroll when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch user details and auxiliary data when active session changes
  useEffect(() => {
    if (activeSession?.user_id) {
      fetchUserDetails(activeSession.user_id);
    } else {
      setUserProfile(null);
      setUserPayments([]);
      setUserNotes([]);
      setUserExams([]);
    }

    // Always fetch canned responses if session changes or on mount
    fetchCannedResponses();
  }, [activeSession?.user_id]);

  const fetchCannedResponses = async () => {
    try {
      const { data } = await supabase
        .from('canned_responses')
        .select('*')
        .eq('is_active', true)
        .order('category');

      if (data) setCannedResponses(data);
    } catch (error) {
      console.error('Error fetching canned responses:', error);
    }
  };

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
        .limit(10);

      setUserPayments(paymentsData || []);

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

      toast.success('Note added');
      setNewNote('');
      setNoteImportant(false);
      fetchUserDetails(userProfile.id);
    } catch (error) {
      console.error('Failed to add note:', error);
      toast.error('Failed to add note');
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
        p_reason: extendReason || 'Extended by support agent',
        p_plan: userProfile.subscription_plan || 'pro'
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(data.message || 'Subscription extended');
        setExtendReason('');
        fetchUserDetails(userProfile.id);
      } else {
        toast.error(data?.error || 'Failed to extend');
      }
    } catch (error: any) {
      console.error('Failed to extend subscription:', error);
      toast.error(error.message || 'Failed to extend');
    }
  };

  if (!enabled || allSessions === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Filter sessions: show waiting + assigned to this agent
  const sessions = (allSessions ?? []).filter((s: any) =>
    s.status === 'waiting' || s.assigned_to === agentId
  );

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
      {/* Sessions List Sidebar */}
      <div className={`
        ${showSessionsList ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:relative md:flex
        fixed inset-y-0 left-0 z-30
        w-[85vw] max-w-[320px] md:w-72
        bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
        transition-transform duration-300 ease-in-out
        flex flex-col shrink-0
      `}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-blue-600 text-white flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Chat Sessions
            {waitingCount !== undefined && waitingCount > 0 && (
              <span className="bg-white text-blue-600 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                {waitingCount}
              </span>
            )}
          </h3>
          <button onClick={() => setShowSessionsList(false)} className="md:hidden p-1 hover:bg-white/20 rounded transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
          {sessions.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
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
                  setShowSessionsList(false);
                }}
                className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors ${activeSessionId === session._id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600' : ''
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
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <button
                  onClick={() => setShowSessionsList(true)}
                  className="md:hidden p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg shrink-0"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="relative shrink-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  {activeSession.status === 'active' && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base truncate">
                    {activeSession.user_name || 'Anonymous'}
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
                    {activeSession.user_email || activeSession.subject || 'Support Chat'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => setShowUserPanelMobile(true)}
                  className="p-2 sm:px-3 sm:py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5"
                  title="View User Data"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">User Data</span>
                </button>
                {activeSession.status !== 'ended' && (
                  <button
                    onClick={handleEndChat}
                    className="p-2 sm:px-4 sm:py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-xl text-sm font-semibold transition-colors flex items-center"
                    title="End Chat"
                  >
                    <X className="h-4 w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">End</span>
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50 dark:bg-gray-900">
              {(messages ?? []).map((message: any) => (
                <MessageBubble
                  key={message._id}
                  message={message}
                  isOwn={message.sender_id === agentId}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            {activeSession.status !== 'ended' ? (
              <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3 sm:p-4 shrink-0">
                <div className="flex items-end gap-2 sm:gap-3">
                  <div className="relative flex-1">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      rows={1}
                      className="w-full px-4 py-2.5 sm:py-3 border border-gray-200 dark:border-gray-700 rounded-xl resize-none bg-gray-50 dark:bg-gray-900 text-sm max-h-32 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => setShowCannedMenu(!showCannedMenu)}
                      className="absolute bottom-2 right-2 p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Quick Replies"
                    >
                      <Zap className="h-4 w-4" />
                    </button>

                    {showCannedMenu && (
                      <div className="absolute bottom-full right-0 mb-2 w-64 sm:w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 max-h-60 overflow-y-auto z-50 animate-in slide-in-from-bottom-2 duration-200">
                        <div className="p-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2">Quick Replies</span>
                          <button onClick={() => setShowCannedMenu(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                        {cannedResponses.length === 0 ? (
                          <div className="p-4 text-center text-gray-400 text-xs italic">No canned responses found</div>
                        ) : (
                          cannedResponses.map((response) => (
                            <button
                              key={response.id}
                              onClick={() => {
                                setNewMessage(response.content);
                                setShowCannedMenu(false);
                              }}
                              className="w-full text-left p-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-b border-gray-50 dark:border-gray-700/50 last:border-0 transition-colors"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-xs text-blue-600 dark:text-blue-400">{response.title}</span>
                                {response.shortcut && <span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-1.5 rounded text-gray-500">{response.shortcut}</span>}
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{response.content}</p>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={!newMessage.trim()}
                    className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
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
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Select a chat session</p>
              <p className="text-sm mt-1">Click on a waiting session to assign it to yourself</p>
            </div>
          </div>
        )}
      </div>

      {/* User Details Sidebar */}
      {showUserPanelMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-[40] md:hidden backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setShowUserPanelMobile(false)}
        />
      )}

      {activeSessionId && activeSession && (
        <div className={`
          ${showUserPanelMobile ? 'translate-y-0' : 'translate-y-full'}
          md:translate-y-0 md:relative
          fixed inset-x-0 bottom-0 z-[50]
          md:w-80 lg:w-96 shrink-0
          bg-white dark:bg-gray-800 border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-700
          rounded-t-3xl md:rounded-none
          max-h-[85vh] md:max-h-none overflow-y-auto
          transition-transform duration-300 ease-in-out
          flex flex-col shadow-2xl md:shadow-none
        `}>
          {/* Mobile Drag Handle */}
          <div className="md:hidden flex justify-center py-3 sticky top-0 bg-white dark:bg-gray-800 z-10 border-b border-gray-50 dark:border-gray-700">
            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full" />
          </div>

          {loadingUser ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : userProfile ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {/* User Profile Header */}
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-500" />
                    Student Data
                  </h4>
                  <button onClick={() => setShowUserPanelMobile(false)} className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="space-y-3 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800/50">
                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Email</p>
                      <p className="text-sm font-medium dark:text-gray-200 break-all">{userProfile.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Full Name</p>
                      <p className="text-sm font-medium dark:text-gray-200">{userProfile.full_name || 'Anonymous'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subscription Status */}
              <div className="p-5">
                <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500" />
                  Subscription
                </h4>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800/50">
                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Plan</p>
                    <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{userProfile.subscription_plan || 'Free'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800/50">
                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Status</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${userProfile.subscription_status === 'active' || userProfile.subscription_status === 'trialing'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                      {userProfile.subscription_status?.toUpperCase() || 'INACTIVE'}
                    </span>
                  </div>
                </div>

                {userProfile.subscription_end_date && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium">
                    <Calendar className="h-4 w-4" />
                    Expires: {new Date(userProfile.subscription_end_date).toLocaleDateString()}
                  </div>
                )}

                {/* Subscription Extension Form */}
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/50">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Days</label>
                        <select
                          value={extendDays}
                          onChange={(e) => setExtendDays(Number(e.target.value))}
                          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value={7}>7 Days</option>
                          <option value={14}>14 Days</option>
                          <option value={30}>30 Days</option>
                          <option value={90}>90 Days</option>
                          <option value={365}>1 Year</option>
                        </select>
                      </div>
                      <div className="col-span-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Reason</label>
                        <input
                          type="text"
                          value={extendReason}
                          onChange={(e) => setExtendReason(e.target.value)}
                          placeholder="Ex: Loyalty"
                          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <button
                      onClick={extendSubscription}
                      className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                    >
                      Extend Subscription
                    </button>
                  </div>
                </div>
              </div>

              {/* Exam History */}
              <div className="p-5">
                <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  Recent Exams
                </h4>
                {userExams.length === 0 ? (
                  <p className="text-sm text-gray-400 italic text-center py-4">No exam history found</p>
                ) : (
                  <div className="space-y-2">
                    {userExams.map((exam) => (
                      <div key={exam.id} className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800/50 flex items-center justify-between">
                        <div className="min-w-0 pr-2">
                          <p className="text-sm font-bold truncate dark:text-gray-200">{exam.exam_type?.replace(/_/g, ' ') || 'General Quiz'}</p>
                          <p className="text-[10px] text-gray-500">{new Date(exam.created_at).toLocaleDateString()}</p>
                        </div>
                        <span className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-black ${exam.score >= 50 ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-red-600 bg-red-50 dark:bg-red-900/20'
                          }`}>
                          {exam.score}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment History */}
              <div className="p-5">
                <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-emerald-500" />
                  Recent Payments
                </h4>
                {userPayments.length === 0 ? (
                  <p className="text-sm text-gray-400 italic text-center py-4">No payments found</p>
                ) : (
                  <div className="space-y-2">
                    {userPayments.map((payment: AgentDashboardPayment) => (
                      <div key={payment.id} className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800/50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                            {(payment.amount / 100).toFixed(2)} {payment.currency || 'USD'}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${payment.status === 'succeeded' || payment.status === 'paid' || payment.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-200 text-gray-600'
                            }`}>
                            {payment.status?.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-gray-500">
                          <span className="font-medium">{payment.provider?.toUpperCase()}</span>
                          <span>{new Date(payment.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Agent Notes */}
              <div className="p-5">
                <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-500" />
                  Agent Logs & Notes
                </h4>
                <div className="space-y-3 mb-4">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add student behavior notes..."
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 resize-none outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${noteImportant ? 'bg-red-500 border-red-500' : 'bg-white dark:bg-gray-800 border-gray-300'}`}>
                        {noteImportant && <CheckCheck className="h-3 w-3 text-white" />}
                        <input
                          type="checkbox"
                          checked={noteImportant}
                          onChange={(e) => setNoteImportant(e.target.checked)}
                          className="absolute opacity-0"
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-tighter">Mark Critical</span>
                    </label>
                    <button
                      onClick={addNote}
                      disabled={!newNote.trim()}
                      className="ml-auto px-4 py-1.5 bg-gray-900 dark:bg-white dark:text-gray-900 text-white text-xs rounded-xl font-bold disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Note
                    </button>
                  </div>
                </div>

                {userNotes.length > 0 && (
                  <div className="space-y-2">
                    {userNotes.map((note) => (
                      <div
                        key={note.id}
                        className={`p-3 rounded-2xl text-sm border-l-4 ${note.is_important
                          ? 'bg-red-50 dark:bg-red-900/10 border-red-500 text-red-900 dark:text-red-200'
                          : 'bg-gray-50 dark:bg-gray-900/50 border-gray-300 text-gray-700 dark:text-gray-300'
                          }`}
                      >
                        {note.is_important && <span className="text-[10px] font-bold uppercase mb-1 block tracking-widest text-red-500">Critical Note</span>}
                        <p className="text-sm leading-relaxed">{note.note}</p>
                        <p className="text-[10px] opacity-60 mt-1 font-mono">
                          {new Date(note.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="h-10 md:hidden" /> {/* Spacer for mobile */}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-gray-400" />
              </div>
              <p className="font-bold text-gray-900 dark:text-white mb-2">Visitor Profile</p>
              <p className="text-sm text-gray-500">This visitor hasn't registered a profile yet.</p>
              <button
                onClick={() => setShowUserPanelMobile(false)}
                className="mt-6 md:hidden w-full py-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-bold"
              >
                Close Info
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


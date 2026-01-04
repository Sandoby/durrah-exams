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
  Star
} from 'lucide-react';
import { CONVEX_FEATURES } from '../main';

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
  const [isMinimized, setIsMinimized] = useState(false);
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
      <div className="fixed bottom-4 right-4 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
        <div className="p-6 text-center">
          <h3 className="text-lg font-semibold mb-2">Rate your experience</h3>
          <p className="text-sm text-gray-500 mb-4">How was your chat support?</p>
          
          <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => handleRate(star)}
                className="p-1 hover:scale-110 transition-transform"
              >
                <Star 
                  className={`h-8 w-8 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                />
              </button>
            ))}
          </div>
          
          <button
            onClick={() => { setShowRating(false); endSession(); }}
            className="text-sm text-gray-500 hover:text-gray-700"
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
        className="fixed bottom-4 right-4 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 rounded-full shadow-lg flex items-center justify-center text-white transition-all z-50"
      >
        <MessageSquare className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>
    );
  }

  // No active session - show start button
  if (!sessionId) {
    return (
      <div className="fixed bottom-4 right-4 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <span className="font-semibold">Live Support</span>
          </div>
          <div className="flex gap-1">
            <button onClick={() => setIsMinimized(true)} className="p-1 hover:bg-white/20 rounded">
              <Minimize2 className="h-4 w-4" />
            </button>
            {onClose && (
              <button onClick={onClose} className="p-1 hover:bg-white/20 rounded">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="h-8 w-8 text-indigo-600" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Need help?</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {questionText 
              ? `Question: "${questionText.substring(0, 50)}..."`
              : 'Start a chat with our support team'
            }
          </p>
          
          <button
            onClick={startSession}
            disabled={isStarting}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
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
    <div className="fixed bottom-4 right-4 w-80 sm:w-96 h-[500px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden z-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white flex items-center justify-between shrink-0">
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
          <button onClick={() => setIsMinimized(true)} className="p-1.5 hover:bg-white/20 rounded">
            <Minimize2 className="h-4 w-4" />
          </button>
          <button onClick={handleEndChat} className="p-1.5 hover:bg-white/20 rounded">
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
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
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
              className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg resize-none bg-transparent text-sm max-h-24 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim()}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Closed state */}
      {session?.status === 'ended' && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-center shrink-0">
          <p className="text-sm text-gray-500 mb-2">This chat has ended</p>
          <button
            onClick={() => setSessionId(null)}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
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
          className={`rounded-2xl px-4 py-2 ${
            isOwn 
              ? 'bg-indigo-600 text-white rounded-br-md' 
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
            <CheckCheck className="h-3 w-3 text-indigo-500" />
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
 */
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
      <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <h3 className="font-bold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
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
                }}
                className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors ${
                  activeSessionId === session._id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-600' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm truncate text-gray-900 dark:text-white">
                    {session.user_name || 'Anonymous'}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    session.status === 'waiting' 
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
      <div className="flex-1 flex flex-col">
        {activeSessionId && activeSession ? (
          <>
            {/* Chat Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
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
              <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
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
              <div className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">This chat has ended</p>
                {activeSession.rating && (
                  <div className="flex items-center justify-center gap-1 mt-2">
                    <span className="text-xs text-gray-400">Rating:</span>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star}
                        className={`h-4 w-4 ${star <= activeSession.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
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
    </div>
  );
}


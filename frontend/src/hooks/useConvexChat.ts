import { useEffect, useRef, useCallback, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { CONVEX_FEATURES } from '../main';

/**
 * useConvexChat
 * 
 * Hook for real-time chat functionality:
 * - Start/end chat sessions
 * - Send and receive messages
 * - Track typing status
 * - Mark messages as read
 * 
 * Usage:
 * const { 
 *   session, messages, sendMessage, setTyping, endChat, unreadCount 
 * } = useConvexChat({
 *   sessionId: 'session-123',
 *   userId: 'user-456',
 *   userName: 'John Doe',
 * });
 */

interface UseConvexChatOptions {
  sessionId?: Id<"chatSessions">;
  userId: string;
  userName: string;
  userRole: 'user' | 'agent' | 'tutor';
  enabled?: boolean;
}

export function useConvexChat(options: UseConvexChatOptions) {
  const {
    sessionId,
    userId,
    userName,
    userRole,
    enabled = CONVEX_FEATURES.chat,
  } = options;

  // Mutations
  const sendMessageMutation = useMutation(api.chat.sendMessage);
  const markReadMutation = useMutation(api.chat.markRead);
  const endChatMutation = useMutation(api.chat.endChat);
  const rateSessionMutation = useMutation(api.chat.rateSession);
  const setTypingMutation = useMutation(api.presence.setTyping);

  // Queries - use "skip" when disabled
  const session = useQuery(
    api.chatQueries.getSession,
    enabled && sessionId ? { session_id: sessionId } : 'skip'
  );

  const messages = useQuery(
    api.chatQueries.getMessages,
    enabled && sessionId ? { session_id: sessionId, limit: 100 } : 'skip'
  );

  const unreadCount = useQuery(
    api.chatQueries.getUnreadCount,
    enabled && sessionId ? { session_id: sessionId, user_id: userId } : 'skip'
  );

  const typingUsers = useQuery(
    api.presence.getTypingUsers,
    enabled && sessionId ? { session_id: sessionId, exclude_user_id: userId } : 'skip'
  );

  // Typing debounce
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isTyping, setIsTypingLocal] = useState(false);

  // Send message
  const sendMessage = useCallback(async (
    body: string,
    attachments?: Array<{ url: string; name: string; type: string; size?: number }>
  ) => {
    if (!enabled || !sessionId) return null;

    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    await setTypingMutation({ user_id: userId, is_typing: false });

    try {
      const messageId = await sendMessageMutation({
        session_id: sessionId,
        sender_id: userId,
        sender_name: userName,
        sender_role: userRole,
        body,
        attachments,
        message_type: attachments?.length ? 'file' : 'text',
      });
      return messageId;
    } catch (error) {
      console.error('Failed to send message:', error);
      return null;
    }
  }, [enabled, sessionId, userId, userName, userRole, sendMessageMutation, setTypingMutation]);

  // Set typing status with debounce
  const setTyping = useCallback(async (typing: boolean) => {
    if (!enabled || !sessionId) return;

    setIsTypingLocal(typing);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (typing) {
      await setTypingMutation({
        user_id: userId,
        is_typing: true,
        typing_in: sessionId,
      });

      // Auto-clear after 3 seconds
      typingTimeoutRef.current = setTimeout(async () => {
        setIsTypingLocal(false);
        await setTypingMutation({ user_id: userId, is_typing: false });
      }, 3000);
    } else {
      await setTypingMutation({ user_id: userId, is_typing: false });
    }
  }, [enabled, sessionId, userId, setTypingMutation]);

  // Mark messages as read
  const markAsRead = useCallback(async () => {
    if (!enabled || !sessionId) return;

    try {
      await markReadMutation({
        session_id: sessionId,
        user_id: userId,
      });
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  }, [enabled, sessionId, userId, markReadMutation]);

  // End chat session
  const endChat = useCallback(async () => {
    if (!enabled || !sessionId) return null;

    try {
      return await endChatMutation({
        session_id: sessionId,
        ended_by: userId,
      });
    } catch (error) {
      console.error('Failed to end chat:', error);
      return null;
    }
  }, [enabled, sessionId, userId, endChatMutation]);

  // Rate session
  const rateSession = useCallback(async (rating: number, feedback?: string) => {
    if (!enabled || !sessionId) return null;

    try {
      return await rateSessionMutation({
        session_id: sessionId,
        rating,
        feedback,
      });
    } catch (error) {
      console.error('Failed to rate session:', error);
      return null;
    }
  }, [enabled, sessionId, rateSessionMutation]);

  // Auto-mark as read when messages update
  useEffect(() => {
    if (messages && messages.length > 0) {
      markAsRead();
    }
  }, [messages, markAsRead]);

  // Cleanup typing on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    session,
    messages: messages ?? [],
    sendMessage,
    setTyping,
    isTyping,
    markAsRead,
    endChat,
    rateSession,
    unreadCount: unreadCount ?? 0,
    typingUsers: typingUsers ?? [],
    isLoading: session === undefined,
    enabled,
  };
}

/**
 * useConvexChatSessions
 * 
 * Hook for agents/tutors to list and manage chat sessions.
 */
export function useConvexChatSessions(options: {
  scope: 'support' | 'exam';
  userId?: string;
  status?: 'waiting' | 'active' | 'ended';
  enabled?: boolean;
}) {
  const { scope, userId, status, enabled = CONVEX_FEATURES.chat } = options;

  // Start chat mutation
  const startChatMutation = useMutation(api.chat.startChat);
  const assignAgentMutation = useMutation(api.chat.assignAgent);

  // List sessions - use "skip" for disabled
  const sessions = useQuery(
    api.chatQueries.listSessions,
    enabled ? { scope, status, assigned_to: userId } : 'skip'
  );

  // Waiting count (for badge)
  const waitingCount = useQuery(
    api.chatQueries.getWaitingCount,
    enabled ? { scope } : 'skip'
  );

  // Start new chat session
  const startChat = useCallback(async (params: {
    userId: string;
    userName: string;
    userEmail?: string;
    userRole: 'student' | 'tutor';
    examId?: string;
    subject?: string;
    priority?: 'low' | 'medium' | 'high';
  }) => {
    if (!enabled) return null;

    try {
      return await startChatMutation({
        scope,
        exam_id: params.examId,
        user_id: params.userId,
        user_name: params.userName,
        user_email: params.userEmail,
        user_role: params.userRole,
        subject: params.subject,
        priority: params.priority,
      });
    } catch (error) {
      console.error('Failed to start chat:', error);
      return null;
    }
  }, [enabled, scope, startChatMutation]);

  // Assign agent to session
  const assignAgent = useCallback(async (
    sessionId: Id<"chatSessions">,
    agentId: string,
    agentName: string
  ) => {
    if (!enabled) return null;

    try {
      return await assignAgentMutation({
        session_id: sessionId,
        agent_id: agentId,
        agent_name: agentName,
      });
    } catch (error) {
      console.error('Failed to assign agent:', error);
      return null;
    }
  }, [enabled, assignAgentMutation]);

  return {
    sessions: sessions ?? [],
    waitingCount: waitingCount ?? 0,
    startChat,
    assignAgent,
    isLoading: sessions === undefined,
    enabled,
  };
}

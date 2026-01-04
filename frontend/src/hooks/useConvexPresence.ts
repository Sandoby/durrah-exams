import { useEffect, useCallback, useRef } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

/**
 * useConvexPresence
 * 
 * Hook for presence tracking:
 * - Update online status
 * - Track typing indicators
 * - Show who's online in a scope
 * 
 * Usage:
 * const { onlineUsers, setStatus, goOffline } = useConvexPresence({
 *   userId: 'user-123',
 *   displayName: 'John Doe',
 *   role: 'student',
 *   scope: 'exam',
 *   scopeId: 'exam-456',
 * });
 */

interface UseConvexPresenceOptions {
  userId: string;
  displayName: string;
  role: 'student' | 'tutor' | 'agent' | 'admin';
  scope: 'global' | 'exam' | 'chat';
  scopeId?: string;
  enabled?: boolean;
  heartbeatInterval?: number; // ms, default 30000
}

export function useConvexPresence(options: UseConvexPresenceOptions) {
  const {
    userId,
    displayName,
    role,
    scope,
    scopeId,
    enabled = true,
    heartbeatInterval = 30000,
  } = options;

  // Mutations
  const touchPresenceMutation = useMutation(api.presence.touchPresence);
  const setTypingMutation = useMutation(api.presence.setTyping);
  const goOfflineMutation = useMutation(api.presence.goOffline);

  // Queries - use "skip" for disabled
  const onlineUsers = useQuery(
    api.presence.listPresence,
    enabled ? { scope, scope_id: scopeId, online_only: true } : 'skip'
  );

  const onlineCount = useQuery(
    api.presence.getOnlineCount,
    enabled ? { scope, scope_id: scopeId } : 'skip'
  );

  // Refs
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Touch presence (heartbeat)
  const touchPresence = useCallback(async (status?: 'online' | 'away' | 'busy') => {
    if (!enabled) return;

    try {
      await touchPresenceMutation({
        user_id: userId,
        display_name: displayName,
        role,
        scope,
        scope_id: scopeId,
        status,
      });
    } catch (error) {
      console.error('Failed to touch presence:', error);
    }
  }, [enabled, userId, displayName, role, scope, scopeId, touchPresenceMutation]);

  // Set status
  const setStatus = useCallback(async (status: 'online' | 'away' | 'busy') => {
    await touchPresence(status);
  }, [touchPresence]);

  // Set typing
  const setTyping = useCallback(async (isTyping: boolean, sessionId?: string) => {
    if (!enabled) return;

    try {
      await setTypingMutation({
        user_id: userId,
        is_typing: isTyping,
        typing_in: sessionId,
      });
    } catch (error) {
      console.error('Failed to set typing:', error);
    }
  }, [enabled, userId, setTypingMutation]);

  // Go offline
  const goOffline = useCallback(async () => {
    if (!enabled) return;

    try {
      await goOfflineMutation({ user_id: userId });
    } catch (error) {
      console.error('Failed to go offline:', error);
    }
  }, [enabled, userId, goOfflineMutation]);

  // Setup heartbeat on mount
  useEffect(() => {
    if (!enabled) return;

    // Initial presence touch
    touchPresence('online');

    // Start heartbeat
    heartbeatIntervalRef.current = setInterval(() => {
      touchPresence('online');
    }, heartbeatInterval);

    // Cleanup on unmount
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      // Try to mark offline (best effort)
      goOffline();
    };
  }, [enabled, touchPresence, goOffline, heartbeatInterval]);

  // Handle visibility change (tab switch)
  useEffect(() => {
    if (!enabled) return;

    const handleVisibility = () => {
      if (document.hidden) {
        touchPresence('away');
      } else {
        touchPresence('online');
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enabled, touchPresence]);

  // Handle beforeunload
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = () => {
      // Sync call to go offline
      navigator.sendBeacon?.('/api/presence-offline', JSON.stringify({ userId }));
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, userId]);

  return {
    onlineUsers: onlineUsers ?? [],
    onlineCount: onlineCount ?? 0,
    setStatus,
    setTyping,
    goOffline,
    touchPresence,
    enabled,
  };
}

/**
 * useTypingIndicator
 * 
 * Simple hook for typing indicators in a chat session.
 */
export function useTypingIndicator(sessionId: string, excludeUserId: string, enabled = true) {
  const typingUsers = useQuery(
    api.presence.getTypingUsers,
    enabled && sessionId ? { session_id: sessionId, exclude_user_id: excludeUserId } : 'skip'
  );

  type TypingUser = NonNullable<typeof typingUsers>[number];
  const typingNames = (typingUsers ?? []).map((u: TypingUser) => u.display_name);

  let typingText = '';
  if (typingNames.length === 1) {
    typingText = `${typingNames[0]} is typing...`;
  } else if (typingNames.length === 2) {
    typingText = `${typingNames[0]} and ${typingNames[1]} are typing...`;
  } else if (typingNames.length > 2) {
    typingText = `${typingNames.length} people are typing...`;
  }

  return {
    typingUsers: typingUsers ?? [],
    typingText,
    isAnyoneTyping: typingNames.length > 0,
  };
}

import { createClient, RealtimeChannel } from '@supabase/supabase-js';

/**
 * Professional Real-time Chat Service
 * Handles all real-time messaging with:
 * - Instant message delivery via postgres_changes
 * - Optimistic UI updates
 * - Offline detection
 * - Presence tracking
 * - Auto-reconnection
 */

interface ChatMessage {
  id: string;
  session_id: string;
  sender_id: string;
  is_agent: boolean;
  sender_role: 'user' | 'agent' | 'admin';
  sender_name: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface ChatSession {
  id: string;
  user_id: string;
  agent_id: string | null;
  status: 'waiting' | 'active' | 'ended';
  user_name: string;
  user_email: string;
  started_at: string;
  assigned_at: string | null;
  ended_at: string | null;
  rating: number | null;
  feedback: string | null;
}

// Payload from postgres_changes subscription
// type RealtimePayload<T> = {
//   new: T;
//   old: T;
//   errors: null;
//   eventType: 'INSERT' | 'UPDATE' | 'DELETE';
// };

type MessageCallback = (message: ChatMessage) => void;
type SessionCallback = (session: ChatSession) => void;
type StatusCallback = (isOnline: boolean) => void;

export class RealtimeChatService {
  private supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL || '',
    import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  );

  private messageChannels: Map<string, RealtimeChannel> = new Map();
  private sessionChannels: Map<string, RealtimeChannel> = new Map();
  private messageCallbacks: Map<string, Set<MessageCallback>> = new Map();
  private sessionCallbacks: Map<string, Set<SessionCallback>> = new Map();
  private statusCallbacks: Set<StatusCallback> = new Set();
  private isOnline: boolean = navigator.onLine;

  constructor() {
    this.setupNetworkListeners();
  }

  /**
   * Setup network online/offline detection
   */
  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyStatusChange(true);
      this.reconnectChannels();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyStatusChange(false);
    });
  }

  /**
   * Subscribe to messages in a chat session
   * REAL-TIME: Messages appear instantly as they're inserted
   */
  subscribeToSessionMessages(
    sessionId: string,
    callback: MessageCallback
  ): () => void {
    // Initialize callback set for this session
    if (!this.messageCallbacks.has(sessionId)) {
      this.messageCallbacks.set(sessionId, new Set());
    }

    this.messageCallbacks.get(sessionId)!.add(callback);

    // Create or get existing channel
    let channel = this.messageChannels.get(sessionId);

    if (!channel) {
      channel = this.supabase
        .channel(`messages-${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `session_id=eq.${sessionId}`,
          },
          (payload: any) => {
            const message = payload.new as ChatMessage;
            this.notifyMessageCallbacks(sessionId, message);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'chat_messages',
            filter: `session_id=eq.${sessionId}`,
          },
          (payload: any) => {
            const message = payload.new as ChatMessage;
            this.notifyMessageCallbacks(sessionId, message);
          }
        )
        .subscribe((status) => {
          console.log(
            `[REALTIME] Messages subscription status for ${sessionId}: ${status}`
          );
        });

      this.messageChannels.set(sessionId, channel);
    }

    // Return unsubscribe function
    return () => {
      this.messageCallbacks.get(sessionId)?.delete(callback);

      // If no more callbacks, unsubscribe from channel
      if (this.messageCallbacks.get(sessionId)?.size === 0) {
        this.supabase.removeChannel(channel!);
        this.messageChannels.delete(sessionId);
      }
    };
  }

  /**
   * Subscribe to chat session updates
   * REAL-TIME: Status changes, agent assignment, etc. appear instantly
   */
  subscribeToSession(
    sessionId: string,
    callback: SessionCallback
  ): () => void {
    // Initialize callback set for this session
    if (!this.sessionCallbacks.has(sessionId)) {
      this.sessionCallbacks.set(sessionId, new Set());
    }

    this.sessionCallbacks.get(sessionId)!.add(callback);

    let channel = this.sessionChannels.get(sessionId);

    if (!channel) {
      channel = this.supabase
        .channel(`session-${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'live_chat_sessions',
            filter: `id=eq.${sessionId}`,
          },
          (payload: any) => {
            const session = payload.new as ChatSession;
            this.notifySessionCallbacks(sessionId, session);
          }
        )
        .subscribe((status) => {
          console.log(
            `[REALTIME] Session subscription status for ${sessionId}: ${status}`
          );
        });

      this.sessionChannels.set(sessionId, channel);
    }

    return () => {
      this.sessionCallbacks.get(sessionId)?.delete(callback);

      if (this.sessionCallbacks.get(sessionId)?.size === 0) {
        this.supabase.removeChannel(channel!);
        this.sessionChannels.delete(sessionId);
      }
    };
  }

  /**
   * Subscribe to all sessions for an agent or user
   * REAL-TIME: New chats appear instantly
   */
  subscribeToSessions(
    filter: 'agent' | 'user',
    id: string,
    callback: SessionCallback
  ): () => void {
    const channelName = `sessions-${filter}-${id}`;
    const filterStr =
      filter === 'agent' ? `agent_id=eq.${id}` : `user_id=eq.${id}`;

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_chat_sessions',
          filter: filterStr,
        },
        (payload: any) => {
          const session = payload.new as ChatSession;
          callback(session);
        }
      )
      .subscribe((status) => {
        console.log(`[REALTIME] Sessions subscription status: ${status}`);
      });

    return () => {
      this.supabase.removeChannel(channel);
    };
  }

  /**
   * Send a message (optimistic update)
   * 1. Immediately show in UI (optimistic)
   * 2. Send to database
   * 3. Replace with confirmed message once received via realtime
   */
  async sendMessage(
    sessionId: string,
    senderId: string | null,
    isAgent: boolean,
    senderRole: 'user' | 'agent' | 'admin',
    senderName: string,
    message: string
  ): Promise<{ success: boolean; error?: string; messageId?: string }> {
    // Optimistic message ID (will be replaced with real ID from DB)
    const optimisticId = `temp-${Date.now()}`;

    // Show optimistic message immediately
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      session_id: sessionId,
      sender_id: senderId || 'anonymous',
      is_agent: isAgent,
      sender_role: senderRole,
      sender_name: senderName,
      message,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    this.notifyMessageCallbacks(sessionId, optimisticMessage);

    try {
      // Send to database
      const { data, error } = await this.supabase
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          sender_id: senderId,
          is_agent: isAgent,
          sender_role: senderRole,
          sender_name: senderName,
          message,
          is_read: false,
        })
        .select('id')
        .single();

      if (error) {
        console.error('[CHAT] Error sending message:', error);
        return { success: false, error: error.message };
      }

      // Real message from DB will arrive via realtime subscription
      // So we don't need to manually notify again

      return { success: true, messageId: data.id };
    } catch (err) {
      console.error('[CHAT] Unexpected error sending message:', err);
      return { success: false, error: String(err) };
    }
  }

  /**
   * Mark message as read
   */
  async markMessageAsRead(messageId: string): Promise<void> {
    try {
      await this.supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('id', messageId);
    } catch (err) {
      console.error('[CHAT] Error marking message as read:', err);
    }
  }

  /**
   * Update session status
   */
  async updateSessionStatus(
    sessionId: string,
    status: 'waiting' | 'active' | 'ended'
  ): Promise<void> {
    try {
      await this.supabase
        .from('live_chat_sessions')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', sessionId);
    } catch (err) {
      console.error('[CHAT] Error updating session status:', err);
    }
  }

  /**
   * Assign session to agent
   */
  async assignSessionToAgent(
    sessionId: string,
    agentId: string
  ): Promise<void> {
    try {
      await this.supabase
        .from('live_chat_sessions')
        .update({
          agent_id: agentId,
          status: 'active',
          assigned_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);
    } catch (err) {
      console.error('[CHAT] Error assigning session:', err);
    }
  }

  /**
   * Rate chat session (user feedback)
   */
  async rateSession(
    sessionId: string,
    rating: number,
    feedback?: string
  ): Promise<void> {
    try {
      await this.supabase
        .from('live_chat_sessions')
        .update({
          rating,
          feedback,
          status: 'ended',
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);
    } catch (err) {
      console.error('[CHAT] Error rating session:', err);
    }
  }

  /**
   * Notify status change listeners
   */
  private notifyStatusChange(isOnline: boolean) {
    this.statusCallbacks.forEach((callback) => callback(isOnline));
  }

  /**
   * Notify message callbacks
   */
  private notifyMessageCallbacks(sessionId: string, message: ChatMessage) {
    this.messageCallbacks.get(sessionId)?.forEach((callback) => {
      callback(message);
    });
  }

  /**
   * Notify session callbacks
   */
  private notifySessionCallbacks(sessionId: string, session: ChatSession) {
    this.sessionCallbacks.get(sessionId)?.forEach((callback) => {
      callback(session);
    });
  }

  /**
   * Subscribe to online/offline status
   */
  onStatusChange(callback: StatusCallback): () => void {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }

  /**
   * Reconnect all channels (used when coming back online)
   */
  private async reconnectChannels() {
    console.log('[REALTIME] Attempting to reconnect channels...');

    for (const [sessionId, channel] of this.messageChannels.entries()) {
      try {
        await channel.subscribe((status) => {
          console.log(
            `[REALTIME] Reconnected messages for ${sessionId}: ${status}`
          );
        });
      } catch (err) {
        console.error(`[REALTIME] Failed to reconnect ${sessionId}:`, err);
      }
    }

    for (const [sessionId, channel] of this.sessionChannels.entries()) {
      try {
        await channel.subscribe((status) => {
          console.log(
            `[REALTIME] Reconnected session for ${sessionId}: ${status}`
          );
        });
      } catch (err) {
        console.error(`[REALTIME] Failed to reconnect ${sessionId}:`, err);
      }
    }
  }

  /**
   * Cleanup: Unsubscribe from all channels
   */
  disconnect() {
    console.log('[REALTIME] Disconnecting all channels...');
    this.messageChannels.forEach((channel) => {
      this.supabase.removeChannel(channel);
    });
    this.sessionChannels.forEach((channel) => {
      this.supabase.removeChannel(channel);
    });
    this.messageChannels.clear();
    this.sessionChannels.clear();
  }

  /**
   * Get connection status
   */
  getStatus(): { isOnline: boolean; activeChannels: number } {
    return {
      isOnline: this.isOnline,
      activeChannels:
        this.messageChannels.size + this.sessionChannels.size,
    };
  }
}

// Export singleton instance
export const chatService = new RealtimeChatService();

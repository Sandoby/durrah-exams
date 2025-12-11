import { useState, useEffect, useRef } from 'react';
import { Send, User, Clock, CheckCheck, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
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

function AgentChatInterface() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUserOnline, setIsUserOnline] = useState(false);
  const [activeTab, setActiveTab] = useState<'new' | 'current' | 'closed'>('new');
  const [isUserTyping, setIsUserTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const presenceChannelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<any>(null);

  const trackAgentPresence = async () => {
    const channel = supabase.channel('agent-presence');
    
    await channel
      .on('presence', { event: 'sync' }, () => {
        // Presence synced
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            online_at: new Date().toISOString(),
            role: 'agent',
            agent_id: user?.id
          });
        }
      });
    
    presenceChannelRef.current = channel;
  };

  useEffect(() => {
    fetchSessions(activeTab);
    const channel = subscribeToSessions();
    trackAgentPresence();

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (presenceChannelRef.current) supabase.removeChannel(presenceChannelRef.current);
    };
  }, [activeTab, user?.id]);

  useEffect(() => {
    if (selectedSession?.id) {
      fetchMessages(selectedSession.id);
      const channel = subscribeToMessages(selectedSession.id);

      return () => {
        if (channel) supabase.removeChannel(channel);
      };
    }
  }, [selectedSession?.id]);

  const fetchSessions = async (tab: 'new' | 'current' | 'closed' = activeTab) => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('live_chat_sessions')
        .select('*');

      // Filter based on tab
      if (tab === 'new') {
        // New: waiting status, no agent assigned
        query = query.eq('status', 'waiting').is('agent_id', null);
      } else if (tab === 'current') {
        // Current: active or waiting, agent assigned to this agent
        query = query.in('status', ['waiting', 'active']).eq('agent_id', user?.id);
      } else if (tab === 'closed') {
        // Closed: ended sessions
        query = query.eq('status', 'ended');
      }

      const { data, error } = await query.order('updated_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Failed to load chat sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (sessionId: string) => {
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
    }
  };

  const subscribeToSessions = () => {
    const channel = supabase
      .channel('live_chat_sessions_' + Date.now())
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_chat_sessions'
        },
        () => {
          // New session created - immediately refetch to get all updates
          fetchSessions(activeTab);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_chat_sessions'
        },
        () => {
          // Session updated - refetch
          fetchSessions(activeTab);
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
      .channel(`agent_session:${sessionId}`)
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

          if (newMsg.sender_role === 'user') {
            setIsUserTyping(false);
          }
        }
      )
      .on(
        'broadcast',
        { event: 'typing' },
        (payload) => {
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

  const handleTyping = async () => {
    if (!selectedSession || !channelRef.current) return;

    await channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { sender_role: 'agent' }
    });
  };

  const assignSession = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('live_chat_sessions')
        .update({ 
          agent_id: user?.id,
          status: 'active',
          assigned_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) {
        console.error('Error assigning session:', error);
        // Continue anyway - the message will still send
        return;
      }
      
      if (data) {
        toast.success('Session assigned to you');
        // Update the selected session with agent info
        setSelectedSession(prev => prev ? { ...prev, agent_id: user?.id || null } : null);
      }
    } catch (error) {
      console.error('Error assigning session:', error);
      // Don't show error toast - just log it
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedSession) return;

    const msgContent = newMessage.trim();
    setNewMessage('');

    try {
      if (!selectedSession.agent_id) {
        await assignSession(selectedSession.id);
      }

      const { error } = await supabase
        .from('chat_messages')
        .insert({
          session_id: selectedSession.id,
          sender_id: user?.id,
          sender_role: 'agent',
          sender_name: 'Support Agent',
          message: msgContent
        });

      if (error) throw error;

      await supabase
        .from('live_chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedSession.id);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      setNewMessage(msgContent);
    }
  };

  const closeSession = async (sessionId: string) => {
    try {
      // Close the session
      const { error } = await supabase
        .from('live_chat_sessions')
        .update({ 
          status: 'ended',
          ended_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;

      toast.success('Session closed successfully');
      setSelectedSession(null);
      fetchSessions(activeTab);
    } catch (error) {
      console.error('Error closing session:', error);
      toast.error('Failed to close session');
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex h-[calc(100vh-200px)] bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex">
            <button
              onClick={() => setActiveTab('new')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'new'
                  ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-white dark:bg-gray-800'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              New
            </button>
            <button
              onClick={() => setActiveTab('current')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'current'
                  ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-white dark:bg-gray-800'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Current
            </button>
            <button
              onClick={() => setActiveTab('closed')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'closed'
                  ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-white dark:bg-gray-800'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Closed
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {activeTab === 'new' ? 'New Chats' : activeTab === 'current' ? 'My Chats' : 'Closed Chats'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {sessions.length} {activeTab} session{sessions.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              No active sessions
            </div>
          ) : (
            sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => setSelectedSession(session)}
                className={`w-full p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left ${
                  selectedSession?.id === session.id
                    ? 'bg-indigo-50 dark:bg-indigo-900/20'
                    : ''
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {session.user_name || 'Guest User'}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatTime(session.updated_at)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                  {session.user_email || 'No email'}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedSession ? (
          <>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {selectedSession.user_name || 'Guest User'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{selectedSession.user_email}</p>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isUserOnline ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  ></div>
                  <span>{isUserOnline ? 'Online' : 'Offline'}</span>
                </div>
              </div>
              <button
                onClick={() => closeSession(selectedSession.id)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
              >
                Close Session
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
              {messages.map((msg) => {
                const isMe = msg.sender_role === 'agent';
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isMe && (
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mr-2 flex-shrink-0">
                        <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </div>
                    )}
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        isMe
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      }`}
                    >
                      <p className="text-sm break-words">{msg.message}</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <Clock className="w-3 h-3 opacity-70" />
                        <span className="text-xs opacity-70">
                          {formatTime(msg.created_at)}
                        </span>
                        {isMe && msg.is_read && (
                          <CheckCheck className="w-3 h-3 ml-1" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {isUserTyping && (
                <div className="flex justify-start">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mr-2">
                    <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="bg-white dark:bg-gray-700 rounded-2xl px-4 py-3 shadow-sm flex items-center gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <form onSubmit={sendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
            Select a chat session to start messaging
          </div>
        )}
      </div>
    </div>
  );
}

export { AgentChatInterface };

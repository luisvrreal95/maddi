import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MessageSquare, Send, User, Search, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import BusinessHeader from '@/components/navigation/BusinessHeader';
import OwnerDashboardHeader from '@/components/navigation/OwnerDashboardHeader';

interface Conversation {
  id: string;
  billboard_id: string;
  business_id: string;
  owner_id: string;
  last_message_at: string;
  billboard?: {
    title: string;
    image_url: string | null;
  };
  other_user?: {
    full_name: string;
  };
  last_message?: {
    content: string;
    sender_id: string;
    is_read: boolean;
  };
  unread_count?: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

const Messages: React.FC = () => {
  const { user, userRole } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      markMessagesAsRead(selectedConversation.id);
      
      const channel = supabase
        .channel(`messages-${selectedConversation.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${selectedConversation.id}`
          },
          (payload) => {
            const newMsg = payload.new as Message;
            setMessages(prev => [...prev, newMsg]);
            if (newMsg.sender_id !== user?.id) {
              markMessagesAsRead(selectedConversation.id);
            }
            // Refresh conversations to update last message
            fetchConversations();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedConversation, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          billboard:billboards(title, image_url)
        `)
        .or(`business_id.eq.${user.id},owner_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      const conversationsWithDetails = await Promise.all(
        (data || []).map(async (conv) => {
          const otherUserId = conv.business_id === user.id ? conv.owner_id : conv.business_id;
          
          // Get other user profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', otherUserId)
            .single();
          
          // Get last message
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('content, sender_id, is_read')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Get unread count
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_id', user.id);
          
          return {
            ...conv,
            other_user: profile || { full_name: 'Usuario' },
            last_message: lastMessage || null,
            unread_count: unreadCount || 0
          };
        })
      );

      setConversations(conversationsWithDetails);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
  };

  const markMessagesAsRead = async (conversationId: string) => {
    if (!user) return;
    
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id);
    
    // Update local state
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId 
        ? { ...conv, unread_count: 0, last_message: conv.last_message ? { ...conv.last_message, is_read: true } : undefined }
        : conv
    ));
  };

  const sendMessage = async () => {
    if (!user || !selectedConversation || !newMessage.trim()) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          content: newMessage.trim()
        });

      if (error) throw error;
      setNewMessage('');
      
      // Refresh conversations to show updated last message
      fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error al enviar mensaje');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.other_user?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.billboard?.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const truncateMessage = (content: string, maxLength: number = 35) => {
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  };

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex flex-col">
      {/* Header - use role-specific header */}
      {userRole === 'owner' ? <OwnerDashboardHeader /> : <BusinessHeader />}

      <div className="flex-1 flex overflow-hidden">
        {/* Conversations List */}
        <div className="w-80 border-r border-white/5 bg-[#141414] flex flex-col">
          <div className="p-4 border-b border-white/5">
            <h2 className="text-white font-semibold flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-[#9BFF43]" />
              Mensajes
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                placeholder="Buscar conversaciones..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-[#1A1A1A] border-white/10 text-white placeholder:text-white/30"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse bg-white/5 rounded-lg h-16"></div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-white/40 text-sm">No tienes conversaciones</p>
              </div>
            ) : (
              <div className="p-2">
                {filteredConversations.map(conv => {
                  const hasUnread = (conv.unread_count || 0) > 0;
                  const isMyLastMessage = conv.last_message?.sender_id === user?.id;
                  
                  return (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className={`w-full p-3 rounded-lg text-left transition-all duration-200 ${
                        selectedConversation?.id === conv.id 
                          ? 'bg-[#9BFF43]/10 border border-[#9BFF43]/30' 
                          : 'hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#2A2A2A] flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-white/40" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`truncate ${
                              hasUnread 
                                ? 'font-bold text-white' 
                                : selectedConversation?.id === conv.id 
                                  ? 'font-medium text-[#9BFF43]' 
                                  : 'font-medium text-white'
                            }`}>
                              {conv.other_user?.full_name}
                            </p>
                            {hasUnread && (
                              <span className="min-w-[18px] h-[18px] rounded-full bg-[#9BFF43] text-[#1A1A1A] text-[10px] font-bold flex items-center justify-center px-1 ml-1">
                                {conv.unread_count}
                              </span>
                            )}
                          </div>
                          <p className="text-white/40 text-xs truncate mt-0.5">
                            {conv.billboard?.title}
                          </p>
                          {conv.last_message && (
                            <div className="flex items-center gap-1 mt-1">
                              {isMyLastMessage && (
                                conv.last_message.is_read 
                                  ? <CheckCheck className="w-3 h-3 text-[#9BFF43] flex-shrink-0" />
                                  : <Check className="w-3 h-3 text-white/40 flex-shrink-0" />
                              )}
                              <p className={`text-xs truncate ${
                                hasUnread && !isMyLastMessage
                                  ? 'font-semibold text-white/80' 
                                  : 'text-white/50'
                              }`}>
                                {isMyLastMessage ? 'Tú: ' : ''}{truncateMessage(conv.last_message.content)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col bg-[#1A1A1A]">
          {selectedConversation ? (
            <>
              <div className="p-4 border-b border-white/5 bg-[#141414]">
                <div className="flex items-center gap-3">
                  {selectedConversation.billboard?.image_url ? (
                    <img
                      src={selectedConversation.billboard.image_url}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-[#2A2A2A] flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-white/40" />
                    </div>
                  )}
                  <div>
                    <p className="text-white font-semibold">
                      {selectedConversation.other_user?.full_name}
                    </p>
                    <p className="text-white/40 text-sm">
                      {selectedConversation.billboard?.title}
                    </p>
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((msg, idx) => {
                    const isMyMessage = msg.sender_id === user?.id;
                    const isLastInGroup = idx === messages.length - 1 || messages[idx + 1]?.sender_id !== msg.sender_id;
                    
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                            isMyMessage
                              ? 'bg-[#9BFF43] text-[#141414] rounded-br-md'
                              : 'bg-[#2A2A2A] text-white rounded-bl-md'
                          }`}
                        >
                          <p>{msg.content}</p>
                          <div className={`flex items-center gap-1 justify-end mt-1 ${
                            isMyMessage ? 'text-[#141414]/60' : 'text-white/40'
                          }`}>
                            <span className="text-xs">
                              {new Date(msg.created_at).toLocaleTimeString('es-MX', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                            {isMyMessage && isLastInGroup && (
                              msg.is_read 
                                ? <CheckCheck className="w-3.5 h-3.5" />
                                : <Check className="w-3.5 h-3.5" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className="p-4 border-t border-white/5 bg-[#141414]">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Escribe un mensaje..."
                    className="bg-[#1A1A1A] border-white/10 text-white placeholder:text-white/30"
                  />
                  <Button 
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="bg-[#9BFF43] text-[#141414] hover:bg-[#8AE63A]"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-[#1A1A1A]">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <p className="text-white/40">
                  Selecciona una conversación para ver los mensajes
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
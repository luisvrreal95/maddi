import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MessageSquare, Send, User, Search, Check, CheckCheck, MoreVertical, Trash2, Mail, MailOpen, Pin, MapPin, DollarSign, ExternalLink } from 'lucide-react';
import { sendNotificationEmail, getUserEmailAndName } from '@/lib/emailService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import BusinessHeader from '@/components/navigation/BusinessHeader';
import OwnerDashboardHeader from '@/components/navigation/OwnerDashboardHeader';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Conversation {
  id: string;
  billboard_id: string;
  business_id: string;
  owner_id: string;
  last_message_at: string;
  is_pinned?: boolean;
  is_manually_unread?: boolean;
  billboard?: {
    title: string;
    image_url: string | null;
    price_per_month?: number;
    city?: string;
    state?: string;
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
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [showBillboardContext, setShowBillboardContext] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-select conversation from URL params
  const conversationIdFromUrl = searchParams.get('conversation');
  const billboardIdFromUrl = searchParams.get('billboard');

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
          billboard:billboards(title, image_url, price_per_month, city, state)
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
      
      // Auto-select conversation from URL if provided
      if (conversationIdFromUrl && conversationsWithDetails.length > 0) {
        const targetConv = conversationsWithDetails.find(c => c.id === conversationIdFromUrl);
        if (targetConv) {
          setSelectedConversation(targetConv);
          // Show billboard context if coming from billboard detail page
          if (billboardIdFromUrl) {
            setShowBillboardContext(true);
          }
        }
      }
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
        ? { ...conv, unread_count: 0, is_manually_unread: false, last_message: conv.last_message ? { ...conv.last_message, is_read: true } : undefined }
        : conv
    ));
  };

  const togglePinConversation = (conversationId: string) => {
    setConversations(prev => {
      const updated = prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, is_pinned: !conv.is_pinned }
          : conv
      );
      // Sort: pinned first, then by last_message_at
      return updated.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
      });
    });
    toast.success('Conversación actualizada');
  };

  const markAsUnread = (conversationId: string) => {
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId 
        ? { ...conv, is_manually_unread: true, unread_count: Math.max(1, conv.unread_count || 0) }
        : conv
    ));
    toast.success('Marcada como no leída');
  };

  const handleDeleteClick = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    setConversationToDelete(conversationId);
    setDeleteDialogOpen(true);
  };

  const deleteConversation = async () => {
    if (!conversationToDelete) return;
    
    try {
      // Delete all messages first
      await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationToDelete);
      
      // Then delete conversation
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationToDelete);

      if (error) throw error;

      setConversations(prev => prev.filter(c => c.id !== conversationToDelete));
      if (selectedConversation?.id === conversationToDelete) {
        setSelectedConversation(null);
        setMessages([]);
      }
      toast.success('Conversación eliminada');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Error al eliminar conversación');
    } finally {
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
    }
  };

  const sendMessage = async () => {
    if (!user || !selectedConversation || !newMessage.trim()) return;

    const messageContent = newMessage.trim();

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          content: messageContent
        });

      if (error) throw error;
      setNewMessage('');
      
      // Refresh conversations to show updated last message
      fetchConversations();

      // Send email notification to the other user (fire-and-forget)
      const recipientId = selectedConversation.business_id === user.id 
        ? selectedConversation.owner_id 
        : selectedConversation.business_id;
      
      const recipientInfo = await getUserEmailAndName(recipientId);
      // Try to get email from auth - we need to use edge function for this
      // The edge function handles rate limiting (5 min per conversation)
      const preview = messageContent.length > 120 ? messageContent.substring(0, 120) + '...' : messageContent;
      
      sendNotificationEmail({
        email: '', // Edge function will look up the email
        type: 'new_message',
        recipientName: recipientInfo.name,
        userId: recipientId,
        entityId: selectedConversation.id,
        data: {
          senderName: user.user_metadata?.full_name || 'Usuario',
          messagePreview: preview,
          billboardTitle: selectedConversation.billboard?.title || '',
          conversationId: selectedConversation.id,
        }
      }).catch(() => {}); // Silent fail for email
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
                  const hasUnread = (conv.unread_count || 0) > 0 || conv.is_manually_unread;
                  const isMyLastMessage = conv.last_message?.sender_id === user?.id;
                  
                  return (
                    <div
                      key={conv.id}
                      className={`relative group rounded-lg transition-all duration-200 ${
                        selectedConversation?.id === conv.id 
                          ? 'bg-[#9BFF43]/10 border border-[#9BFF43]/30' 
                          : 'hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <button
                        onClick={() => setSelectedConversation(conv)}
                        className="w-full p-3 text-left"
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative w-10 h-10 rounded-full bg-[#2A2A2A] flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-white/40" />
                            {conv.is_pinned && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#9BFF43] flex items-center justify-center">
                                <Pin className="w-2.5 h-2.5 text-[#1A1A1A]" />
                              </div>
                            )}
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
                                  {conv.unread_count || 1}
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
                      
                      {/* Context Menu */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-white hover:bg-white/10">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[#2A2A2A] border-white/10">
                            <DropdownMenuItem 
                              onClick={(e) => { e.stopPropagation(); togglePinConversation(conv.id); }}
                              className="text-white hover:bg-white/10 gap-2"
                            >
                              <Pin className="w-4 h-4" />
                              {conv.is_pinned ? 'Quitar fijado' : 'Fijar conversación'}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => { e.stopPropagation(); markAsUnread(conv.id); }}
                              className="text-white hover:bg-white/10 gap-2"
                            >
                              {hasUnread ? <MailOpen className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                              Marcar como no leído
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => handleDeleteClick(e, conv.id)}
                              className="text-destructive hover:bg-destructive/10 gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Eliminar conversación
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
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
                  <div className="flex-1">
                    <p className="text-white font-semibold flex items-center gap-2">
                      <User className="w-4 h-4 text-white/40" />
                      {selectedConversation.other_user?.full_name || 'Usuario'}
                    </p>
                    <p className="text-white/40 text-sm">
                      {selectedConversation.billboard?.title}
                    </p>
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {/* Billboard Context Card - shown when coming from billboard detail */}
                  {showBillboardContext && selectedConversation.billboard && messages.length === 0 && (
                    <div className="bg-[#2A2A2A] border border-white/10 rounded-xl p-4 mb-4">
                      <p className="text-white/50 text-xs mb-2">Conversación sobre:</p>
                      <Link 
                        to={`/billboard/${selectedConversation.billboard_id}`}
                        className="flex gap-3 hover:bg-white/5 rounded-lg transition-colors"
                      >
                        {selectedConversation.billboard.image_url ? (
                          <img 
                            src={selectedConversation.billboard.image_url} 
                            alt="" 
                            className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-lg bg-[#3A3A3A] flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-8 h-8 text-white/20" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-semibold truncate">
                            {selectedConversation.billboard.title}
                          </h4>
                          {selectedConversation.billboard.city && (
                            <p className="text-white/50 text-sm flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3" />
                              {selectedConversation.billboard.city}, {selectedConversation.billboard.state}
                            </p>
                          )}
                          {selectedConversation.billboard.price_per_month && (
                            <p className="text-[#9BFF43] font-bold mt-1 flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              ${selectedConversation.billboard.price_per_month.toLocaleString()}/mes
                            </p>
                          )}
                        </div>
                      </Link>
                      <p className="text-white/40 text-xs mt-3 pt-3 border-t border-white/10">
                        Escribe tu mensaje para contactar al propietario sobre este espectacular.
                      </p>
                    </div>
                  )}
                  
                  {messages.map((msg, idx) => {
                    const isMyMessage = msg.sender_id === user?.id;
                    const isLastInGroup = idx === messages.length - 1 || messages[idx + 1]?.sender_id !== msg.sender_id;
                    
                    // Date separator logic
                    const msgDate = new Date(msg.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
                    const prevMsgDate = idx > 0 ? new Date(messages[idx - 1].created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
                    const showDateSeparator = idx === 0 || msgDate !== prevMsgDate;
                    
                    // System booking message detection
                    const isSystemBooking = msg.content.startsWith('__SYSTEM_BOOKING__');
                    let bookingMeta: { bookingId: string; billboardTitle: string; startDate: string; endDate: string; totalPrice: number } | null = null;
                    if (isSystemBooking) {
                      try {
                        bookingMeta = JSON.parse(msg.content.replace('__SYSTEM_BOOKING__', ''));
                      } catch { /* ignore */ }
                    }

                    return (
                      <React.Fragment key={msg.id}>
                        {showDateSeparator && (
                          <div className="flex items-center justify-center my-4">
                            <span className="text-white/40 text-xs bg-[#1A1A1A] px-3 py-1 rounded-full border border-white/10">
                              {msgDate}
                            </span>
                          </div>
                        )}
                        
                        {isSystemBooking && bookingMeta ? (
                          <div className="flex justify-center my-3">
                            <div className="bg-[#2A2A2A] border border-white/10 rounded-xl px-4 py-3 max-w-[85%] text-center">
                              <p className="text-white/70 text-sm">
                                Tu solicitud para <strong className="text-white">{bookingMeta.billboardTitle}</strong> del {bookingMeta.startDate} al {bookingMeta.endDate} ha sido enviada.
                              </p>
                              <Link
                                to={`/business?booking=${bookingMeta.bookingId}`}
                                className="inline-flex items-center gap-1 text-[#9BFF43] text-sm font-medium mt-1.5 hover:underline"
                              >
                                Ver solicitud
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            </div>
                          </div>
                        ) : (
                          <div className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
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
                        )}
                      </React.Fragment>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#2A2A2A] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">¿Eliminar conversación?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Esta acción no se puede deshacer. Se eliminarán todos los mensajes de esta conversación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10 text-white border-white/10 hover:bg-white/20">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={deleteConversation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Messages;
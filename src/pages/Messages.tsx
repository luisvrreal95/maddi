import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MessageSquare, Send, User, Search, Check, CheckCheck, MoreVertical, Trash2, Mail, MailOpen, Pin, MapPin, ExternalLink, ArrowLeft, CalendarDays, CreditCard, ShieldCheck, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import BookingDecisionDialog, { bookingFees, money } from '@/components/booking/BookingDecisionDialog';
import { sendNotificationEmail, getUserEmailAndName } from '@/lib/emailService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import BusinessHeader from '@/components/navigation/BusinessHeader';
import OwnerDashboardHeader from '@/components/navigation/OwnerDashboardHeader';
import MobileNavBar from '@/components/navigation/MobileNavBar';
import { useIsMobile } from '@/hooks/use-mobile';
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

interface ConvBooking {
  id: string;
  billboard_id: string;
  business_id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  status: string;
  payment_status?: string | null;
  stripe_payment_intent_id?: string | null;
  platform_fee?: number | null;
  owner_payout?: number | null;
  payment_expires_at?: string | null;
  created_at: string;
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
  const isMobile = useIsMobile();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [showBillboardContext, setShowBillboardContext] = useState(false);
  const [bookingMap, setBookingMap] = useState<Record<string, ConvBooking>>({});
  const [filter, setFilter] = useState<'all' | 'unread' | 'requests'>('all');
  const [decision, setDecision] = useState<{ mode: 'approve' | 'reject' } | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
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
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', otherUserId)
            .single();
          
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('content, sender_id, is_read')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

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

      // última solicitud de reserva por conversación (billboard + anunciante)
      const bbIds = Array.from(new Set(conversationsWithDetails.map(c => c.billboard_id)));
      if (bbIds.length) {
        const { data: bks } = await supabase.from('bookings').select('*').in('billboard_id', bbIds).order('created_at', { ascending: false });
        const map: Record<string, ConvBooking> = {};
        ((bks as any[]) || []).forEach(b => {
          if (['requires_payment', 'failed'].includes(b.payment_status)) return;
          const key = `${b.billboard_id}:${b.business_id}`;
          if (!map[key]) map[key] = b;
        });
        setBookingMap(map);
      }
      
      if (conversationIdFromUrl && conversationsWithDetails.length > 0) {
        const targetConv = conversationsWithDetails.find(c => c.id === conversationIdFromUrl);
        if (targetConv) {
          setSelectedConversation(targetConv);
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
      await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationToDelete);
      
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
      fetchConversations();

      const recipientId = selectedConversation.business_id === user.id 
        ? selectedConversation.owner_id 
        : selectedConversation.business_id;
      
      const recipientInfo = await getUserEmailAndName(recipientId);
      const preview = messageContent.length > 120 ? messageContent.substring(0, 120) + '...' : messageContent;
      
      sendNotificationEmail({
        email: '',
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
      }).catch(() => {});
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

  // ---------- Reservas ligadas a las conversaciones ----------
  const bookingFor = (c: Conversation | null) => (c ? bookingMap[`${c.billboard_id}:${c.business_id}`] : undefined);
  const selectedBooking = bookingFor(selectedConversation);
  const isOwner = userRole === 'owner';

  const statusChip = (b?: ConvBooking) => {
    if (!b) return null;
    const map: Record<string, { label: string; cls: string }> = {
      pending: { label: 'Solicitud pendiente', cls: 'bg-amber-100 text-amber-800' },
      approved: { label: 'Aprobada', cls: 'bg-[#E3F9C9] text-[#2F6B00]' },
      rejected: { label: 'Rechazada', cls: 'bg-muted text-muted-foreground' },
      cancelled: { label: 'Cancelada', cls: 'bg-muted text-muted-foreground' },
    };
    const m = map[b.status];
    return m ? <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${m.cls}`}>{m.label}</span> : null;
  };

  const needsAnswer = (c: Conversation) => isOwner && bookingFor(c)?.status === 'pending';

  const filteredConversations = conversations.filter(conv => {
    const q = searchQuery.toLowerCase();
    const matches = conv.other_user?.full_name.toLowerCase().includes(q) || conv.billboard?.title.toLowerCase().includes(q);
    if (!matches) return false;
    if (filter === 'unread') return (conv.unread_count || 0) > 0 || conv.is_manually_unread;
    if (filter === 'requests') return bookingFor(conv)?.status === 'pending';
    return true;
  });
  const requestsCount = conversations.filter(c => bookingFor(c)?.status === 'pending').length;

  const truncateMessage = (content: string, maxLength: number = 40) => {
    if (content.startsWith('__SYSTEM_BOOKING__')) return 'Solicitud de reserva';
    return content.length > maxLength ? content.substring(0, maxLength) + '…' : content;
  };

  const shortDate = (d: string) => format(new Date(d), 'd MMM', { locale: es });
  const longDate = (d: string) => format(new Date(d), 'd MMM yyyy', { locale: es });

  const quickReplies = isOwner
    ? ['Gracias por tu solicitud 🙌', '¿Me mandas tu arte?', '¿Qué fechas tienes en mente?']
    : ['¿Puedo cambiar las fechas?', 'Te mando mi arte hoy', 'Gracias'];

  // ---------- Mensajes ----------
  const renderMessages = () => (
    <div className="space-y-3">
      {showBillboardContext && selectedConversation?.billboard && messages.length === 0 && (
        <div className="bg-muted rounded-2xl p-4 mb-4">
          <p className="text-muted-foreground text-xs mb-2">Conversación sobre:</p>
          <Link to={`/billboard/${selectedConversation.billboard_id}`} className="flex gap-3">
            {selectedConversation.billboard.image_url ? (
              <img src={selectedConversation.billboard.image_url} alt="" className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0"><MapPin className="w-8 h-8 text-muted-foreground" /></div>
            )}
            <div className="min-w-0">
              <h4 className="font-semibold truncate">{selectedConversation.billboard.title}</h4>
              {selectedConversation.billboard.city && <p className="text-muted-foreground text-sm mt-1">{selectedConversation.billboard.city}, {selectedConversation.billboard.state}</p>}
              {selectedConversation.billboard.price_per_month ? <p className="font-bold mt-1">${selectedConversation.billboard.price_per_month.toLocaleString()}/mes</p> : null}
            </div>
          </Link>
          <p className="text-muted-foreground text-xs mt-3 pt-3 border-t border-border">Escribe tu mensaje para contactar al propietario sobre este espectacular.</p>
        </div>
      )}

      {messages.map((msg, idx) => {
        const isMine = msg.sender_id === user?.id;
        const isLastInGroup = idx === messages.length - 1 || messages[idx + 1]?.sender_id !== msg.sender_id;
        const dayKey = (m: Message) => new Date(m.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
        const showDate = idx === 0 || dayKey(msg) !== dayKey(messages[idx - 1]);

        let meta: { bookingId: string; billboardTitle: string; startDate: string; endDate: string; totalPrice: number } | null = null;
        if (msg.content.startsWith('__SYSTEM_BOOKING__')) {
          try { meta = JSON.parse(msg.content.replace('__SYSTEM_BOOKING__', '')); } catch { /* ignore */ }
        }
        const payLine = meta && selectedBooking && selectedBooking.id === meta.bookingId
          ? (selectedBooking.payment_status === 'authorized' ? `Pago autorizado · ${money(selectedBooking.total_price)} retenidos en la tarjeta`
            : selectedBooking.payment_status === 'captured' ? `Pago cobrado · ${money(selectedBooking.total_price)}`
            : selectedBooking.payment_status === 'canceled' ? 'Tarjeta liberada · no se cobró nada' : null)
          : null;

        return (
          <React.Fragment key={msg.id}>
            {showDate && (
              <div className="flex justify-center my-3"><span className="text-muted-foreground text-xs">{dayKey(msg)}</span></div>
            )}
            {meta ? (
              <div className="flex flex-col items-center gap-1.5 my-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-full px-4 py-1.5 max-w-full">
                  <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {isOwner ? 'Solicitud recibida' : 'Solicitud enviada'} · {meta.billboardTitle} · {meta.startDate} – {meta.endDate}
                  </span>
                </div>
                {payLine && (
                  <div className="flex items-center gap-2 text-xs font-medium text-[#2F6B00] bg-[#EAF9D6] rounded-full px-4 py-1.5">
                    <CreditCard className="w-3.5 h-3.5 shrink-0" /> {payLine}
                  </div>
                )}
              </div>
            ) : (
              <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isMine ? 'bg-foreground text-background rounded-br-md' : 'bg-muted text-foreground rounded-bl-md'}`}>
                  <p className="whitespace-pre-wrap break-words text-[15px]">{msg.content}</p>
                  <div className={`flex items-center gap-1 justify-end mt-1 ${isMine ? 'opacity-60' : 'text-muted-foreground'}`}>
                    <span className="text-[11px]">{new Date(msg.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                    {isMine && isLastInGroup && (msg.is_read ? <CheckCheck className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />)}
                  </div>
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );

  const composer = (
    <div className="border-t border-border bg-background p-3 md:p-4" style={{ paddingBottom: isMobile ? 'calc(env(safe-area-inset-bottom, 0px) + 12px)' : undefined }}>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {quickReplies.map(q => (
          <button key={q} onClick={() => setNewMessage(q)} className="whitespace-nowrap text-xs border border-border rounded-full px-3 py-1.5 hover:bg-muted transition-colors">{q}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={handleKeyPress}
          placeholder="Escribe un mensaje…" className="rounded-full bg-background border-border" />
        <Button onClick={sendMessage} disabled={!newMessage.trim()} className="rounded-full bg-[#9BFF43] text-[#07110B] hover:bg-[#8AEE32] px-4">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  // ---------- Panel de detalles de la reserva ----------
  const bookingPanel = (compact = false) => {
    const b = selectedBooking;
    const c = selectedConversation;
    if (!c) return null;
    const paid = !!b?.stripe_payment_intent_id;
    const fees = b ? bookingFees(b as any) : null;
    const deadline = b?.payment_expires_at ? format(new Date(b.payment_expires_at), "d 'de' MMMM", { locale: es }) : null;
    return (
      <div className={compact ? 'p-4 space-y-3' : 'p-5 space-y-4'}>
        {!compact && <h3 className="font-bold text-lg">Detalles de la reserva</h3>}
        {c.billboard?.image_url && !compact && (
          <img src={c.billboard.image_url} alt="" className="w-full h-40 object-cover rounded-2xl" />
        )}
        <div>
          <Link to={`/billboard/${c.billboard_id}`} className="font-semibold hover:underline">{c.billboard?.title}</Link>
          {c.billboard?.city && <p className="text-sm text-muted-foreground">{c.billboard.city}, {c.billboard.state}</p>}
        </div>
        {!b ? (
          <p className="text-sm text-muted-foreground">Aún no hay una solicitud de reserva en esta conversación.</p>
        ) : (
          <>
            <div className="flex items-center justify-between">{statusChip(b)}
              {b.status === 'pending' && paid && <span className="text-[11px] text-[#2F6B00] font-medium flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" />Tarjeta retenida</span>}
            </div>
            <div className="rounded-2xl border border-border divide-y divide-border text-sm">
              <div className="flex justify-between p-3"><span className="text-muted-foreground">Fechas</span><span className="font-medium">{shortDate(b.start_date)} – {longDate(b.end_date)}</span></div>
              <div className="flex justify-between p-3"><span className="text-muted-foreground">{paid ? 'Total' : 'Total de la campaña'}</span><b>{money(b.total_price)}</b></div>
              {paid && fees && isOwner && (
                <>
                  <div className="flex justify-between p-3"><span className="text-muted-foreground">Comisión Maddi (15%)</span><span>− {money(fees.fee)}</span></div>
                  <div className="flex justify-between p-3"><span className="font-semibold">Recibes</span><b className="text-[#2F7A00]">{money(fees.payout)}</b></div>
                </>
              )}
            </div>
            {b.status === 'pending' && deadline && paid && (
              <p className="text-xs text-muted-foreground">{isOwner ? `Responde antes del ${deadline}. Después, la tarjeta se libera y la solicitud vence.` : `El propietario responde antes del ${deadline}. Si no, tu tarjeta se libera sin cobro.`}</p>
            )}
            {isOwner && b.status === 'pending' && (
              <div className="flex gap-2">
                <Button onClick={() => setDecision({ mode: 'approve' })} className="flex-1 rounded-full bg-[#9BFF43] text-[#07110B] hover:bg-[#8AEE32] font-semibold">
                  {paid ? 'Aprobar y cobrar' : 'Aprobar'}
                </Button>
                <Button onClick={() => setDecision({ mode: 'reject' })} variant="outline" className="rounded-full">Rechazar</Button>
              </div>
            )}
            <Link to={isOwner ? `/owner?tab=reservas&booking=${b.id}` : `/business?booking=${b.id}`} className="inline-flex items-center gap-1 text-sm font-medium hover:underline">
              Ver solicitud completa <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </>
        )}
      </div>
    );
  };

  const decisionDialog = (
    <BookingDecisionDialog
      booking={decision && selectedBooking ? ({ ...selectedBooking, billboard: selectedConversation?.billboard, profile: { full_name: selectedConversation?.other_user?.full_name } } as any) : null}
      mode={decision?.mode ?? null}
      onClose={() => setDecision(null)}
      onDone={() => { setDecision(null); fetchConversations(); }}
    />
  );

  const deleteDialog = (
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent className="theme-light bg-white border-border">
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar conversación?</AlertDialogTitle>
          <AlertDialogDescription>Esta acción no se puede deshacer. Se eliminarán todos los mensajes de esta conversación.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={deleteConversation} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  // ---------- Lista de conversaciones ----------
  const listColumn = (
    <div className="flex flex-col min-h-0 h-full bg-background">
      <div className="p-4 pb-3 space-y-3 flex-shrink-0">
        <h2 className="text-2xl font-bold tracking-tight">Mensajes</h2>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar conversaciones" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-full bg-muted border-transparent" />
        </div>
        <div className="flex gap-2">
          {([['all', 'Todos'], ['unread', 'Sin leer'], ['requests', requestsCount ? `Solicitudes · ${requestsCount}` : 'Solicitudes']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)}
              className={`text-xs font-medium rounded-full px-3.5 py-1.5 border transition-colors ${filter === id ? 'bg-foreground text-background border-foreground' : 'border-border hover:bg-muted'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <ScrollArea className="flex-1 min-h-0">
        {isLoading ? (
          <div className="p-4 space-y-3">{[1, 2, 3].map(i => <div key={i} className="animate-pulse bg-muted rounded-xl h-16" />)}</div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No hay conversaciones aquí</p>
          </div>
        ) : (
          <div className="px-2 pb-24 md:pb-4">
            {filteredConversations.map(conv => {
              const hasUnread = (conv.unread_count || 0) > 0 || conv.is_manually_unread;
              const mine = conv.last_message?.sender_id === user?.id;
              const active = selectedConversation?.id === conv.id;
              return (
                <div key={conv.id} className={`relative group rounded-2xl transition-colors ${active ? 'bg-muted' : 'hover:bg-muted/60'}`}>
                  <button onClick={() => setSelectedConversation(conv)} className="w-full p-3 text-left flex gap-3">
                    <div className="relative w-12 h-12 rounded-xl bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {conv.billboard?.image_url ? <img src={conv.billboard.image_url} alt="" className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-muted-foreground" />}
                      {conv.is_pinned && <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-foreground flex items-center justify-center"><Pin className="w-2.5 h-2.5 text-background" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`truncate text-sm ${hasUnread ? 'font-bold' : 'font-medium'}`}>{conv.other_user?.full_name}</p>
                        <span className="text-[11px] text-muted-foreground flex-shrink-0">{format(new Date(conv.last_message_at), 'd MMM', { locale: es })}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{conv.billboard?.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {conv.last_message && (
                          <p className={`text-xs truncate flex-1 ${hasUnread && !mine ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                            {mine ? 'Tú: ' : ''}{truncateMessage(conv.last_message.content)}
                          </p>
                        )}
                        {needsAnswer(conv) ? statusChip(bookingFor(conv)) : null}
                        {hasUnread && <span className="min-w-[18px] h-[18px] rounded-full bg-[#9BFF43] text-[#07110B] text-[10px] font-bold flex items-center justify-center px-1">{conv.unread_count || 1}</span>}
                      </div>
                      {!needsAnswer(conv) && bookingFor(conv) && <div className="mt-1">{statusChip(bookingFor(conv))}</div>}
                    </div>
                  </button>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7 bg-background/80"><MoreVertical className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="theme-light bg-white">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); togglePinConversation(conv.id); }} className="gap-2"><Pin className="w-4 h-4" />{conv.is_pinned ? 'Quitar fijado' : 'Fijar conversación'}</DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); markAsUnread(conv.id); }} className="gap-2">{hasUnread ? <MailOpen className="w-4 h-4" /> : <Mail className="w-4 h-4" />}Marcar como no leído</DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleDeleteClick(e, conv.id)} className="text-destructive gap-2"><Trash2 className="w-4 h-4" />Eliminar conversación</DropdownMenuItem>
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
  );

  const chatHeader = selectedConversation && (
    <div className="px-4 py-3 border-b border-border flex items-center gap-3 flex-shrink-0 bg-background">
      {isMobile && (
        <button onClick={() => { setSelectedConversation(null); setMessages([]); setPanelOpen(false); }} className="w-8 h-8 flex items-center justify-center"><ArrowLeft className="w-5 h-5" /></button>
      )}
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"><User className="w-5 h-5 text-muted-foreground" /></div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{selectedConversation.other_user?.full_name || 'Usuario'}</p>
        <p className="text-muted-foreground text-xs truncate">{selectedConversation.billboard?.title}</p>
      </div>
      {isMobile && (
        <button onClick={() => setPanelOpen(o => !o)} className="text-xs font-medium border border-border rounded-full px-3 py-1.5 flex items-center gap-1">
          Reserva <ChevronDown className={`w-3.5 h-3.5 transition-transform ${panelOpen ? 'rotate-180' : ''}`} />
        </button>
      )}
    </div>
  );

  const header = isOwner ? <OwnerDashboardHeader /> : <BusinessHeader />;

  // ==================== MÓVIL ====================
  if (isMobile) {
    if (selectedConversation) {
      return (
        <div className="theme-light h-screen bg-background text-foreground flex flex-col">
          {chatHeader}
          {panelOpen && <div className="border-b border-border bg-muted/40 max-h-[55vh] overflow-y-auto flex-shrink-0">{bookingPanel(true)}</div>}
          {!panelOpen && selectedBooking?.status === 'pending' && isOwner && (
            <div className="px-4 py-2 border-b border-border bg-amber-50 flex items-center justify-between gap-2 flex-shrink-0">
              <span className="text-xs text-amber-900">Solicitud · {money(selectedBooking.total_price)}</span>
              <button onClick={() => setPanelOpen(true)} className="text-xs font-semibold underline">Revisar</button>
            </div>
          )}
          <ScrollArea className="flex-1 p-4">{renderMessages()}</ScrollArea>
          {composer}
          {deleteDialog}{decisionDialog}
        </div>
      );
    }
    return (
      <div className="theme-light h-screen bg-background text-foreground flex flex-col">
        {header}
        <div className="flex-1 min-h-0">{listColumn}</div>
        <MobileNavBar />
        {deleteDialog}{decisionDialog}
      </div>
    );
  }

  // ==================== ESCRITORIO ====================
  return (
    <div className="theme-light h-screen bg-background text-foreground flex flex-col">
      {header}
      <div className="flex-1 min-h-0 grid grid-cols-[340px_minmax(0,1fr)_360px] border-t border-border">
        <div className="border-r border-border min-h-0">{listColumn}</div>
        <div className="flex flex-col min-h-0 min-w-0">
          {selectedConversation ? (
            <>
              {chatHeader}
              <ScrollArea className="flex-1 min-h-0 p-5">{renderMessages()}</ScrollArea>
              {composer}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center">
              <div>
                <MessageSquare className="w-14 h-14 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Selecciona una conversación</p>
              </div>
            </div>
          )}
        </div>
        <div className="border-l border-border overflow-y-auto min-h-0">{selectedConversation ? bookingPanel() : null}</div>
      </div>
      {deleteDialog}{decisionDialog}
    </div>
  );
};

export default Messages;

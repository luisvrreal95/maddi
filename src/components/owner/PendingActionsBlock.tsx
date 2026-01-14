import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Calendar, MessageSquare, Clock, ChevronRight } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface PendingAction {
  id: string;
  type: 'booking_pending' | 'booking_expiring' | 'message_unread';
  title: string;
  subtitle: string;
  link: string;
  urgent?: boolean;
}

interface PendingActionsBlockProps {
  pendingBookings: Array<{
    id: string;
    billboard_id: string;
    billboard?: { title: string };
    created_at: string;
    business_id: string;
    profile?: { full_name: string; company_name?: string };
  }>;
  expiringBookings: Array<{
    id: string;
    billboard_id: string;
    billboard?: { title: string };
    end_date: string;
    business_id: string;
  }>;
  unreadMessages: number;
}

const PendingActionsBlock: React.FC<PendingActionsBlockProps> = ({
  pendingBookings,
  expiringBookings,
  unreadMessages,
}) => {
  const navigate = useNavigate();
  
  const actions: PendingAction[] = [];
  
  // Add pending bookings
  pendingBookings.forEach((booking) => {
    actions.push({
      id: `pending-${booking.id}`,
      type: 'booking_pending',
      title: `Solicitud de reserva pendiente`,
      subtitle: `${booking.billboard?.title || 'Espectacular'} - ${booking.profile?.company_name || booking.profile?.full_name || 'Anunciante'}`,
      link: '/owner?tab=reservas',
      urgent: true,
    });
  });
  
  // Add expiring bookings (next 7 days)
  expiringBookings.forEach((booking) => {
    const daysLeft = differenceInDays(new Date(booking.end_date), new Date());
    if (daysLeft > 0 && daysLeft <= 7) {
      actions.push({
        id: `expiring-${booking.id}`,
        type: 'booking_expiring',
        title: `Reserva por vencer en ${daysLeft} día${daysLeft === 1 ? '' : 's'}`,
        subtitle: booking.billboard?.title || 'Espectacular',
        link: '/owner?tab=reservas',
      });
    }
  });
  
  // Add unread messages
  if (unreadMessages > 0) {
    actions.push({
      id: 'unread-messages',
      type: 'message_unread',
      title: `${unreadMessages} mensaje${unreadMessages === 1 ? '' : 's'} sin leer`,
      subtitle: 'Tienes conversaciones pendientes de responder',
      link: '/messages',
    });
  }
  
  // Don't render if no actions
  if (actions.length === 0) return null;
  
  const getIcon = (type: PendingAction['type']) => {
    switch (type) {
      case 'booking_pending':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      case 'booking_expiring':
        return <Calendar className="w-5 h-5 text-orange-400" />;
      case 'message_unread':
        return <MessageSquare className="w-5 h-5 text-blue-400" />;
    }
  };
  
  const getBgColor = (type: PendingAction['type']) => {
    switch (type) {
      case 'booking_pending':
        return 'bg-yellow-500/10';
      case 'booking_expiring':
        return 'bg-orange-500/10';
      case 'message_unread':
        return 'bg-blue-500/10';
    }
  };

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-yellow-400" />
        <h2 className="text-white font-semibold text-lg">Acciones pendientes</h2>
        <span className="ml-2 bg-yellow-500/20 text-yellow-400 text-xs font-medium px-2 py-0.5 rounded-full">
          {actions.length}
        </span>
      </div>
      
      <div className="space-y-2">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => navigate(action.link)}
            className={`w-full ${getBgColor(action.type)} border ${
              action.urgent ? 'border-yellow-500/30' : 'border-white/5'
            } rounded-xl p-4 flex items-center gap-4 hover:bg-white/5 transition-colors group text-left`}
          >
            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
              {getIcon(action.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium">{action.title}</p>
              <p className="text-white/50 text-sm truncate">{action.subtitle}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default PendingActionsBlock;

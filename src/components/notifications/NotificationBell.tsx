import React, { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Calendar, X, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [prevUnreadCount, setPrevUnreadCount] = useState(0);

  // Show toast when new notification arrives
  useEffect(() => {
    if (unreadCount > prevUnreadCount && prevUnreadCount > 0) {
      const latestNotification = notifications[0];
      if (latestNotification && !latestNotification.is_read) {
        toast(latestNotification.title, {
          description: latestNotification.message,
          icon: getNotificationIcon(latestNotification.type),
        });
      }
    }
    setPrevUnreadCount(unreadCount);
  }, [unreadCount, notifications, prevUnreadCount]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking_request':
        return <Calendar className="w-4 h-4 text-[#9BFF43]" />;
      case 'booking_approved':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'booking_rejected':
        return <X className="w-4 h-4 text-red-500" />;
      default:
        return <FileText className="w-4 h-4 text-blue-500" />;
    }
  };

  const getNotificationLink = (notification: Notification): string | null => {
    // For booking requests, go to owner's booking management
    if (notification.type === 'booking_request') {
      return '/owner?tab=reservas';
    }
    // For booking approved/rejected, go to business dashboard
    if (notification.type === 'booking_approved' || notification.type === 'booking_rejected') {
      return '/business';
    }
    // Admin action notifications go to the billboard detail
    if (notification.type === 'admin_action' && notification.related_billboard_id) {
      return `/billboard/${notification.related_billboard_id}`;
    }
    // For billboard-related notifications, go to that billboard
    if (notification.related_billboard_id) {
      return `/billboard/${notification.related_billboard_id}`;
    }
    // For booking-related notifications without specific type, go to appropriate dashboard
    if (notification.related_booking_id) {
      return '/owner?tab=reservas';
    }
    return null;
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-white/70 hover:text-white hover:bg-white/10"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#9BFF43] text-[#202020] text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0 bg-[#1A1A1A] border-white/10"
        align="end"
        sideOffset={8}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="text-white font-semibold">Notificaciones</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-[#9BFF43] hover:text-[#9BFF43]/80 hover:bg-white/5 h-auto py-1 px-2 text-xs"
            >
              <CheckCheck className="w-3 h-3 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>

        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-center">
              <Bell className="w-10 h-10 text-white/20 mb-3" />
              <p className="text-white/50 text-sm">No tienes notificaciones</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {notifications.map((notification) => {
                const link = getNotificationLink(notification);
                const content = (
                  <div
                    className={cn(
                      "flex gap-3 px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer",
                      !notification.is_read && "bg-[#9BFF43]/5"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm",
                        notification.is_read ? "text-white/70" : "text-white font-medium"
                      )}>
                        {notification.title}
                      </p>
                      <p className="text-white/50 text-xs mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-white/30 text-xs mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: es
                        })}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-[#9BFF43] rounded-full" />
                      </div>
                    )}
                  </div>
                );

                return link ? (
                  <Link key={notification.id} to={link}>
                    {content}
                  </Link>
                ) : (
                  <div key={notification.id}>{content}</div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;

import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { cn } from '@/lib/utils';

interface MessageBadgeProps {
  className?: string;
}

const MessageBadge: React.FC<MessageBadgeProps> = ({ className }) => {
  const { unreadCount } = useUnreadMessages();

  return (
    <Link to="/messages" className={cn("relative", className)}>
      <button className="p-2 rounded-full hover:bg-foreground/10 transition-colors relative">
        <MessageSquare className="w-5 h-5 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </Link>
  );
};

export default MessageBadge;

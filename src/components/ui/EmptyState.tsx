import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center text-center py-16 px-6',
      className,
    )}
  >
    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-5">
      <Icon className="w-10 h-10 text-muted-foreground" />
    </div>
    <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
    {description && (
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
    )}
    {actionLabel && onAction && (
      <Button
        onClick={onAction}
        className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
      >
        {actionLabel}
      </Button>
    )}
  </div>
);

export default EmptyState;

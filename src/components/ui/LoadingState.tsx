import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fullScreen?: boolean;
}

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
} as const;

const LoadingState: React.FC<LoadingStateProps> = ({
  message,
  size = 'md',
  className,
  fullScreen = false,
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center gap-3',
      fullScreen ? 'min-h-screen bg-background' : 'py-12',
      className,
    )}
  >
    <Loader2 className={cn('animate-spin text-primary', sizeMap[size])} />
    {message && (
      <p className="text-sm text-muted-foreground">{message}</p>
    )}
  </div>
);

export default LoadingState;

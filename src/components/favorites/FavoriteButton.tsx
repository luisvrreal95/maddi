import React from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFavorites } from '@/hooks/useFavorites';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  billboardId: string;
  className?: string;
  variant?: 'icon' | 'button';
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({ 
  billboardId, 
  className,
  variant = 'icon'
}) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(billboardId);

  if (variant === 'button') {
    return (
      <Button
        variant={favorited ? 'default' : 'outline'}
        size="sm"
        onClick={() => toggleFavorite(billboardId)}
        className={cn(
          favorited && 'bg-destructive hover:bg-destructive/90 border-destructive',
          className
        )}
      >
        <Heart className={cn('w-4 h-4 mr-2', favorited && 'fill-current')} />
        {favorited ? 'Guardado' : 'Guardar'}
      </Button>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(billboardId);
      }}
      className={cn(
        'p-2 rounded-full transition-all',
        favorited 
          ? 'bg-destructive text-destructive-foreground' 
          : 'bg-background/80 text-foreground hover:bg-background',
        className
      )}
    >
      <Heart className={cn('w-5 h-5', favorited && 'fill-current')} />
    </button>
  );
};

export default FavoriteButton;

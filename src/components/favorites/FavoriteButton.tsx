import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import AddToFolderDialog from './AddToFolderDialog';

interface FavoriteButtonProps {
  billboardId: string;
  className?: string;
  variant?: 'icon' | 'button';
  showFolderDialog?: boolean;
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({ 
  billboardId, 
  className,
  variant = 'icon',
  showFolderDialog = true
}) => {
  const { user, userRole } = useAuth();
  const { isFavorite, getFavorite, toggleFavorite, addToFolder } = useFavorites();
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const favorited = isFavorite(billboardId);
  const currentFavorite = getFavorite(billboardId);

  // Only show for business users
  if (!user || userRole !== 'business') {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (favorited) {
      // If already favorite, remove it
      toggleFavorite(billboardId);
    } else if (showFolderDialog) {
      // If not favorite, show folder dialog
      setDialogOpen(true);
    } else {
      // Add without folder
      toggleFavorite(billboardId);
    }
  };

  const handleSelectFolder = async (folderId: string | null) => {
    await addToFolder(billboardId, folderId);
  };

  if (variant === 'button') {
    return (
      <>
        <Button
          variant={favorited ? 'default' : 'outline'}
          size="sm"
          onClick={handleClick}
          className={cn(
            favorited && 'bg-red-500 hover:bg-red-600 border-red-500',
            className
          )}
        >
          <Heart className={cn('w-4 h-4 mr-2', favorited && 'fill-current')} />
          {favorited ? 'Guardado' : 'Guardar'}
        </Button>

        <AddToFolderDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSelectFolder={handleSelectFolder}
          currentFolderId={currentFavorite?.folder_id}
        />
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={cn(
          'p-2 rounded-full transition-all',
          favorited 
            ? 'bg-red-500 text-white' 
            : 'bg-background/80 text-foreground hover:bg-background',
          className
        )}
      >
        <Heart className={cn('w-5 h-5', favorited && 'fill-current')} />
      </button>

      <AddToFolderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSelectFolder={handleSelectFolder}
        currentFolderId={currentFavorite?.folder_id}
      />
    </>
  );
};

export default FavoriteButton;
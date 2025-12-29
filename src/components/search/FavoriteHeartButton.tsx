import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/hooks/useAuth';
import AddToFolderDialog from '@/components/favorites/AddToFolderDialog';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface FavoriteHeartButtonProps {
  billboardId: string;
  className?: string;
}

const FavoriteHeartButton: React.FC<FavoriteHeartButtonProps> = ({ billboardId, className = '' }) => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const { isFavorite, getFavorite, addToFolder, toggleFavorite } = useFavorites();
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  
  const isCurrentlyFavorite = isFavorite(billboardId);
  const currentFavorite = getFavorite(billboardId);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      toast.error('Inicia sesión para guardar favoritos');
      navigate('/auth');
      return;
    }

    if (userRole !== 'business') {
      toast.error('Solo negocios pueden guardar favoritos');
      return;
    }

    if (isCurrentlyFavorite) {
      // If already favorite, remove it
      toggleFavorite(billboardId);
    } else {
      // If not favorite, show folder dialog
      setShowFolderDialog(true);
    }
  };

  const handleSelectFolder = async (folderId: string | null) => {
    await addToFolder(billboardId, folderId);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={`p-2 rounded-full transition-all duration-200 ${
          isCurrentlyFavorite
            ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
            : 'bg-black/40 text-white/70 hover:text-red-500 hover:bg-black/60'
        } ${className}`}
        title={isCurrentlyFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      >
        <Heart 
          className={`w-5 h-5 ${isCurrentlyFavorite ? 'fill-current' : ''}`} 
        />
      </button>

      <AddToFolderDialog
        open={showFolderDialog}
        onOpenChange={setShowFolderDialog}
        onSelectFolder={handleSelectFolder}
        currentFolderId={currentFavorite?.folder_id}
      />
    </>
  );
};

export default FavoriteHeartButton;
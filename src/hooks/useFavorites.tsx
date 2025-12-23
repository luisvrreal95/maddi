import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Favorite {
  id: string;
  billboard_id: string;
  created_at: string;
}

export const useFavorites = () => {
  const { user, userRole } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchFavorites = useCallback(async () => {
    if (!user || userRole !== 'business') return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setFavorites(data || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, userRole]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const isFavorite = useCallback((billboardId: string) => {
    return favorites.some(f => f.billboard_id === billboardId);
  }, [favorites]);

  const toggleFavorite = async (billboardId: string) => {
    if (!user) {
      toast.error('Inicia sesión para guardar favoritos');
      return;
    }

    if (userRole !== 'business') {
      toast.error('Solo negocios pueden guardar favoritos');
      return;
    }

    const existing = favorites.find(f => f.billboard_id === billboardId);

    if (existing) {
      // Remove favorite
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', existing.id);

      if (error) {
        toast.error('Error al eliminar favorito');
        return;
      }

      setFavorites(prev => prev.filter(f => f.id !== existing.id));
      toast.success('Eliminado de favoritos');
    } else {
      // Add favorite
      const { data, error } = await supabase
        .from('favorites')
        .insert({ user_id: user.id, billboard_id: billboardId })
        .select()
        .single();

      if (error) {
        toast.error('Error al agregar favorito');
        return;
      }

      setFavorites(prev => [...prev, data]);
      toast.success('Agregado a favoritos');
    }
  };

  return {
    favorites,
    isLoading,
    isFavorite,
    toggleFavorite,
    refetch: fetchFavorites
  };
};

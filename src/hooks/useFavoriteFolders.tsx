import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface FavoriteFolder {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export const useFavoriteFolders = () => {
  const { user, userRole } = useAuth();
  const [folders, setFolders] = useState<FavoriteFolder[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchFolders = useCallback(async () => {
    if (!user || userRole !== 'business') return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('favorite_folders')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setFolders(data || []);
    } catch (error) {
      console.error('Error fetching folders:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, userRole]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const createFolder = async (name: string): Promise<FavoriteFolder | null> => {
    if (!user) {
      toast.error('Inicia sesión para crear carpetas');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('favorite_folders')
        .insert({ user_id: user.id, name })
        .select()
        .single();

      if (error) throw error;

      setFolders(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success(`Carpeta "${name}" creada`);
      return data;
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Error al crear carpeta');
      return null;
    }
  };

  const deleteFolder = async (folderId: string) => {
    try {
      const { error } = await supabase
        .from('favorite_folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;

      setFolders(prev => prev.filter(f => f.id !== folderId));
      toast.success('Carpeta eliminada');
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error('Error al eliminar carpeta');
    }
  };

  const renameFolder = async (folderId: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('favorite_folders')
        .update({ name: newName })
        .eq('id', folderId);

      if (error) throw error;

      setFolders(prev => prev.map(f => 
        f.id === folderId ? { ...f, name: newName } : f
      ).sort((a, b) => a.name.localeCompare(b.name)));
      toast.success('Carpeta renombrada');
    } catch (error) {
      console.error('Error renaming folder:', error);
      toast.error('Error al renombrar carpeta');
    }
  };

  return {
    folders,
    isLoading,
    createFolder,
    deleteFolder,
    renameFolder,
    refetch: fetchFolders
  };
};
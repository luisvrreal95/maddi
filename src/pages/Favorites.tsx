import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFavorites } from '@/hooks/useFavorites';
import { useFavoriteFolders } from '@/hooks/useFavoriteFolders';
import { Billboard } from '@/hooks/useBillboards';
import { Heart, MapPin, Trash2, Folder, FolderPlus, MoreVertical, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import BusinessHeader from '@/components/navigation/BusinessHeader';

const Favorites: React.FC = () => {
  const { user } = useAuth();
  const { favorites, toggleFavorite, addToFolder } = useFavorites();
  const { folders, createFolder, deleteFolder, renameFolder } = useFavoriteFolders();
  const [billboards, setBillboards] = useState<Billboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    const fetchFavoriteBillboards = async () => {
      if (favorites.length === 0) {
        setBillboards([]);
        setIsLoading(false);
        return;
      }

      const billboardIds = favorites.map(f => f.billboard_id);
      const { data, error } = await supabase
        .from('billboards')
        .select('*')
        .in('id', billboardIds);

      if (!error && data) {
        setBillboards(data);
      }
      setIsLoading(false);
    };

    fetchFavoriteBillboards();
  }, [favorites]);

  const filteredFavorites = selectedFolder
    ? favorites.filter(f => f.folder_id === selectedFolder)
    : favorites;

  const filteredBillboards = billboards.filter(b =>
    filteredFavorites.some(f => f.billboard_id === b.id)
  );

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder(newFolderName.trim());
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  const handleRenameFolder = async () => {
    if (!renameValue.trim() || !renamingFolder) return;
    await renameFolder(renamingFolder, renameValue.trim());
    setRenamingFolder(null);
    setRenameValue('');
  };

  const getFolderCount = (folderId: string) => {
    return favorites.filter(f => f.folder_id === folderId).length;
  };

  const getUnfolderedCount = () => {
    return favorites.filter(f => !f.folder_id).length;
  };

  return (
    <div className="min-h-screen bg-[#1A1A1A]">
      <BusinessHeader />

      <main className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Heart className="w-8 h-8 text-[#9BFF43]" />
            <h1 className="text-white text-3xl font-bold">Mis Favoritos</h1>
          </div>
          <Button
            onClick={() => setIsCreatingFolder(true)}
            className="bg-[#9BFF43] text-[#1A1A1A] hover:bg-[#8AE63A]"
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            Nueva Carpeta
          </Button>
        </div>

        {/* Folders */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-3">
            {/* All favorites */}
            <button
              onClick={() => setSelectedFolder(null)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                selectedFolder === null
                  ? 'bg-[#9BFF43] text-[#1A1A1A]'
                  : 'bg-[#2A2A2A] text-white/70 hover:bg-[#3A3A3A]'
              }`}
            >
              <Heart className="w-4 h-4" />
              <span>Todos</span>
              <span className={`text-xs ${selectedFolder === null ? 'text-[#1A1A1A]/60' : 'text-white/40'}`}>
                ({favorites.length})
              </span>
            </button>

            {/* Unfoldered */}
            <button
              onClick={() => setSelectedFolder('none')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                selectedFolder === 'none'
                  ? 'bg-[#9BFF43] text-[#1A1A1A]'
                  : 'bg-[#2A2A2A] text-white/70 hover:bg-[#3A3A3A]'
              }`}
            >
              <Folder className="w-4 h-4" />
              <span>Sin carpeta</span>
              <span className={`text-xs ${selectedFolder === 'none' ? 'text-[#1A1A1A]/60' : 'text-white/40'}`}>
                ({getUnfolderedCount()})
              </span>
            </button>

            {/* Folder list */}
            {folders.map(folder => (
              <div key={folder.id} className="relative group">
                <button
                  onClick={() => setSelectedFolder(folder.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                    selectedFolder === folder.id
                      ? 'bg-[#9BFF43] text-[#1A1A1A]'
                      : 'bg-[#2A2A2A] text-white/70 hover:bg-[#3A3A3A]'
                  }`}
                >
                  <Folder className="w-4 h-4" />
                  <span>{folder.name}</span>
                  <span className={`text-xs ${selectedFolder === folder.id ? 'text-[#1A1A1A]/60' : 'text-white/40'}`}>
                    ({getFolderCount(folder.id)})
                  </span>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="absolute -right-1 -top-1 w-5 h-5 rounded-full bg-[#3A3A3A] text-white/60 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <MoreVertical className="w-3 h-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[#2A2A2A] border-white/10">
                    <DropdownMenuItem
                      onClick={() => {
                        setRenamingFolder(folder.id);
                        setRenameValue(folder.name);
                      }}
                      className="text-white hover:bg-white/10"
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Renombrar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => deleteFolder(folder.id)}
                      className="text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </div>

        {/* Billboard Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-[#2A2A2A] rounded-xl h-64"></div>
            ))}
          </div>
        ) : filteredBillboards.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h2 className="text-white text-xl font-semibold mb-2">
              {selectedFolder ? 'Esta carpeta está vacía' : 'No tienes favoritos guardados'}
            </h2>
            <p className="text-white/40 mb-6">
              Explora espectaculares y guarda tus favoritos para verlos aquí.
            </p>
            <Link to="/search">
              <Button className="bg-[#9BFF43] text-[#1A1A1A] hover:bg-[#8AE63A]">
                Explorar espectaculares
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBillboards.map(billboard => (
              <Card key={billboard.id} className="bg-[#2A2A2A] border-white/5 overflow-hidden group">
                <Link to={`/billboard/${billboard.id}`}>
                  <div className="relative h-48">
                    {billboard.image_url ? (
                      <img
                        src={billboard.image_url}
                        alt={billboard.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#3A3A3A] flex items-center justify-center">
                        <MapPin className="w-12 h-12 text-white/20" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        billboard.is_available 
                          ? 'bg-[#9BFF43]/20 text-[#9BFF43]' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {billboard.is_available ? 'Disponible' : 'Ocupado'}
                      </span>
                    </div>
                  </div>
                </Link>
                <CardContent className="p-4">
                  <Link to={`/billboard/${billboard.id}`}>
                    <h3 className="text-white font-semibold mb-1 group-hover:text-[#9BFF43] transition-colors">
                      {billboard.title}
                    </h3>
                  </Link>
                  <p className="text-white/40 text-sm flex items-center gap-1 mb-3">
                    <MapPin className="w-3 h-3" />
                    {billboard.city}, {billboard.state}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-[#9BFF43] font-bold">
                      ${billboard.price_per_month.toLocaleString()}/mes
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFavorite(billboard.id)}
                      className="text-red-400 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Create Folder Dialog */}
      <Dialog open={isCreatingFolder} onOpenChange={setIsCreatingFolder}>
        <DialogContent className="bg-[#1A1A1A] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Crear nueva carpeta</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              placeholder="Nombre de la carpeta..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
              className="bg-[#2A2A2A] border-white/10 text-white"
              autoFocus
            />
            <Button
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim()}
              className="bg-[#9BFF43] text-[#1A1A1A] hover:bg-[#8AE63A]"
            >
              Crear
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Dialog */}
      <Dialog open={!!renamingFolder} onOpenChange={() => setRenamingFolder(null)}>
        <DialogContent className="bg-[#1A1A1A] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Renombrar carpeta</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              placeholder="Nuevo nombre..."
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleRenameFolder()}
              className="bg-[#2A2A2A] border-white/10 text-white"
              autoFocus
            />
            <Button
              onClick={handleRenameFolder}
              disabled={!renameValue.trim()}
              className="bg-[#9BFF43] text-[#1A1A1A] hover:bg-[#8AE63A]"
            >
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Favorites;
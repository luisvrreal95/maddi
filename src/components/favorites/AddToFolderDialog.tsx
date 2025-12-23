import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Folder, Plus, Check } from 'lucide-react';
import { useFavoriteFolders } from '@/hooks/useFavoriteFolders';

interface AddToFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectFolder: (folderId: string | null) => void;
  currentFolderId?: string | null;
}

const AddToFolderDialog: React.FC<AddToFolderDialogProps> = ({
  open,
  onOpenChange,
  onSelectFolder,
  currentFolderId
}) => {
  const { folders, createFolder, isLoading } = useFavoriteFolders();
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    const folder = await createFolder(newFolderName.trim());
    if (folder) {
      setNewFolderName('');
      setIsCreating(false);
      onSelectFolder(folder.id);
      onOpenChange(false);
    }
  };

  const handleSelectFolder = (folderId: string | null) => {
    onSelectFolder(folderId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1A1A1A] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Guardar en carpeta</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Create new folder */}
          {isCreating ? (
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
              <Button
                variant="ghost"
                onClick={() => {
                  setIsCreating(false);
                  setNewFolderName('');
                }}
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => setIsCreating(true)}
              className="w-full border-dashed border-white/20 text-white/70 hover:bg-white/5 hover:text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear nueva carpeta
            </Button>
          )}

          {/* Folder list */}
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-1">
              {/* No folder option */}
              <button
                onClick={() => handleSelectFolder(null)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  !currentFolderId
                    ? 'bg-[#9BFF43]/10 border border-[#9BFF43]/30'
                    : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                <Folder className="w-5 h-5 text-white/50" />
                <span className="flex-1 text-left text-white/70">Sin carpeta</span>
                {!currentFolderId && <Check className="w-4 h-4 text-[#9BFF43]" />}
              </button>

              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => handleSelectFolder(folder.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    currentFolderId === folder.id
                      ? 'bg-[#9BFF43]/10 border border-[#9BFF43]/30'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Folder className="w-5 h-5 text-[#9BFF43]" />
                  <span className="flex-1 text-left text-white">{folder.name}</span>
                  {currentFolderId === folder.id && (
                    <Check className="w-4 h-4 text-[#9BFF43]" />
                  )}
                </button>
              ))}

              {folders.length === 0 && !isLoading && (
                <p className="text-center text-white/40 py-4 text-sm">
                  No tienes carpetas. Crea una para organizar tus favoritos.
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddToFolderDialog;
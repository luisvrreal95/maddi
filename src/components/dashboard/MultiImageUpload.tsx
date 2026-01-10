import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { X, Loader2, Image as ImageIcon, Plus } from 'lucide-react';

interface MultiImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  userId: string;
  maxImages?: number;
}

const MultiImageUpload: React.FC<MultiImageUploadProps> = ({ 
  value = [], 
  onChange, 
  userId,
  maxImages = 6 
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - value.length;
    if (remainingSlots <= 0) {
      toast.error(`Máximo ${maxImages} imágenes permitidas`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);

    setIsUploading(true);
    const newUrls: string[] = [];

    try {
      for (const file of filesToUpload) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name}: Solo se permiten imágenes`);
          continue;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name}: La imagen no debe superar 5MB`);
          continue;
        }

        // Create unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('billboard-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          console.error('Error uploading:', error);
          toast.error(`Error al subir ${file.name}`);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('billboard-images')
          .getPublicUrl(data.path);

        newUrls.push(urlData.publicUrl);
      }

      if (newUrls.length > 0) {
        onChange([...value, ...newUrls]);
        toast.success(`${newUrls.length} imagen(es) subida(s) correctamente`);
      }
    } catch (error: any) {
      console.error('Error uploading images:', error);
      toast.error(error.message || 'Error al subir imágenes');
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async (index: number) => {
    const urlToRemove = value[index];
    
    try {
      // Extract path from URL
      const url = new URL(urlToRemove);
      const pathParts = url.pathname.split('/billboard-images/');
      if (pathParts.length > 1) {
        const filePath = pathParts[1];
        await supabase.storage.from('billboard-images').remove([filePath]);
      }
    } catch (error) {
      console.error('Error removing image:', error);
    }

    const newUrls = value.filter((_, i) => i !== index);
    onChange(newUrls);
  };

  return (
    <div className="space-y-3">
      {/* Image Grid */}
      <div className="grid grid-cols-3 gap-2">
        {value.map((url, index) => (
          <div key={url} className="relative aspect-video rounded-lg overflow-hidden border border-white/10 group">
            <img
              src={url}
              alt={`Image ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => handleRemove(index)}
            >
              <X className="h-3 w-3" />
            </Button>
            {index === 0 && (
              <span className="absolute bottom-1 left-1 text-xs bg-[#9BFF43] text-[#121212] px-1.5 py-0.5 rounded font-medium">
                Principal
              </span>
            )}
          </div>
        ))}

        {/* Upload Button */}
        {value.length < maxImages && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="aspect-video flex flex-col items-center justify-center border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:border-[#9BFF43]/50 transition-colors bg-[#1A1A1A]"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-6 w-6 text-[#9BFF43] animate-spin mb-1" />
                <p className="text-white/60 text-xs">Subiendo...</p>
              </>
            ) : (
              <>
                <Plus className="h-6 w-6 text-white/40 mb-1" />
                <p className="text-white/60 text-xs text-center px-2">Agregar foto</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Helper text */}
      <p className="text-white/40 text-xs">
        {value.length}/{maxImages} imágenes · La primera será la principal · JPG, PNG, WebP (máx 5MB c/u)
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
        multiple
      />
    </div>
  );
};

export default MultiImageUpload;

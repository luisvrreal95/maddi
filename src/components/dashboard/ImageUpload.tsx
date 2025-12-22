import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  userId: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ value, onChange, userId }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no debe superar 5MB');
      return;
    }

    setIsUploading(true);

    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('billboard-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('billboard-images')
        .getPublicUrl(data.path);

      setPreview(urlData.publicUrl);
      onChange(urlData.publicUrl);
      toast.success('Imagen subida correctamente');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(error.message || 'Error al subir imagen');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!value) {
      setPreview(null);
      return;
    }

    try {
      // Extract path from URL
      const url = new URL(value);
      const pathParts = url.pathname.split('/billboard-images/');
      if (pathParts.length > 1) {
        const filePath = pathParts[1];
        await supabase.storage.from('billboard-images').remove([filePath]);
      }
    } catch (error) {
      console.error('Error removing image:', error);
    }

    setPreview(null);
    onChange('');
  };

  return (
    <div className="space-y-2">
      {preview ? (
        <div className="relative rounded-lg overflow-hidden border border-white/10">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-40 object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:border-[#9BFF43]/50 transition-colors bg-[#1A1A1A]"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 text-[#9BFF43] animate-spin mb-2" />
              <p className="text-white/60 text-sm">Subiendo...</p>
            </>
          ) : (
            <>
              <ImageIcon className="h-8 w-8 text-white/40 mb-2" />
              <p className="text-white/60 text-sm">Haz clic para subir imagen</p>
              <p className="text-white/40 text-xs mt-1">JPG, PNG, WebP (máx 5MB)</p>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default ImageUpload;

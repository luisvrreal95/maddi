import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Billboard } from '@/hooks/useBillboards';
import { toast } from 'sonner';
import { z } from 'zod';
import ImageUpload from './ImageUpload';

const billboardSchema = z.object({
  title: z.string().min(3, 'Mínimo 3 caracteres').max(100),
  description: z.string().max(500).optional(),
  address: z.string().min(5, 'Dirección requerida'),
  city: z.string().min(2, 'Ciudad requerida'),
  state: z.string().min(2, 'Estado requerido'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  width_m: z.number().min(1, 'Mínimo 1m'),
  height_m: z.number().min(1, 'Mínimo 1m'),
  billboard_type: z.string(),
  illumination: z.string(),
  faces: z.number().min(1).max(4),
  daily_impressions: z.number().optional(),
  price_per_month: z.number().min(100, 'Mínimo $100'),
  image_url: z.string().url().optional().or(z.literal('')),
});

interface AddBillboardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billboard?: Billboard | null;
  onSave: () => void;
}

const AddBillboardDialog: React.FC<AddBillboardDialogProps> = ({
  open,
  onOpenChange,
  billboard,
  onSave,
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    address: '',
    city: '',
    state: '',
    latitude: 32.6245,
    longitude: -115.4523,
    width_m: 12,
    height_m: 8,
    billboard_type: 'espectacular',
    illumination: 'ninguna',
    faces: 1,
    daily_impressions: 0,
    price_per_month: 10000,
    image_url: '',
  });

  useEffect(() => {
    if (billboard) {
      setFormData({
        title: billboard.title,
        description: billboard.description || '',
        address: billboard.address,
        city: billboard.city,
        state: billboard.state,
        latitude: Number(billboard.latitude),
        longitude: Number(billboard.longitude),
        width_m: Number(billboard.width_m),
        height_m: Number(billboard.height_m),
        billboard_type: billboard.billboard_type,
        illumination: billboard.illumination,
        faces: billboard.faces,
        daily_impressions: billboard.daily_impressions || 0,
        price_per_month: Number(billboard.price_per_month),
        image_url: billboard.image_url || '',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        address: '',
        city: '',
        state: '',
        latitude: 32.6245,
        longitude: -115.4523,
        width_m: 12,
        height_m: 8,
        billboard_type: 'espectacular',
        illumination: 'ninguna',
        faces: 1,
        daily_impressions: 0,
        price_per_month: 10000,
        image_url: '',
      });
    }
    setErrors({});
  }, [billboard, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = billboardSchema.safeParse(formData);
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        newErrors[err.path[0] as string] = err.message;
      });
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      const billboardData = {
        ...formData,
        owner_id: user?.id,
        daily_impressions: formData.daily_impressions || null,
        image_url: formData.image_url || null,
        description: formData.description || null,
      };

      if (billboard) {
        const { error } = await supabase
          .from('billboards')
          .update(billboardData)
          .eq('id', billboard.id);

        if (error) throw error;
        toast.success('Espectacular actualizado');
      } else {
        const { error } = await supabase
          .from('billboards')
          .insert(billboardData);

        if (error) throw error;
        toast.success('Espectacular agregado');
      }

      onSave();
    } catch (error: any) {
      console.error('Error saving billboard:', error);
      toast.error(error.message || 'Error al guardar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#2A2A2A] border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {billboard ? 'Editar Espectacular' : 'Agregar Espectacular'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image Upload - Prominent at top */}
          <div className="border-2 border-dashed border-white/20 rounded-xl p-4 bg-[#1A1A1A]/50">
            <Label className="text-lg font-medium mb-3 block">📸 Imagen del Espectacular</Label>
            <ImageUpload
              value={formData.image_url}
              onChange={(url) => setFormData({ ...formData, image_url: url })}
              userId={user?.id || ''}
            />
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-[#1A1A1A] border-white/10"
                placeholder="Plaza Juárez Premium"
              />
              {errors.title && <p className="text-red-400 text-sm mt-1">{errors.title}</p>}
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-[#1A1A1A] border-white/10"
                placeholder="Descripción del espectacular..."
                rows={2}
              />
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="address">Dirección *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="bg-[#1A1A1A] border-white/10"
                placeholder="Blvd. Benito Juárez 2151"
              />
              {errors.address && <p className="text-red-400 text-sm mt-1">{errors.address}</p>}
            </div>

            <div>
              <Label htmlFor="city">Ciudad *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="bg-[#1A1A1A] border-white/10"
                placeholder="Mexicali"
              />
              {errors.city && <p className="text-red-400 text-sm mt-1">{errors.city}</p>}
            </div>

            <div>
              <Label htmlFor="state">Estado *</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="bg-[#1A1A1A] border-white/10"
                placeholder="Baja California"
              />
              {errors.state && <p className="text-red-400 text-sm mt-1">{errors.state}</p>}
            </div>

            <div>
              <Label htmlFor="latitude">Latitud *</Label>
              <Input
                id="latitude"
                type="number"
                step="0.0001"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
                className="bg-[#1A1A1A] border-white/10"
              />
            </div>

            <div>
              <Label htmlFor="longitude">Longitud *</Label>
              <Input
                id="longitude"
                type="number"
                step="0.0001"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
                className="bg-[#1A1A1A] border-white/10"
              />
            </div>
          </div>

          {/* Dimensions & Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="width_m">Ancho (m) *</Label>
              <Input
                id="width_m"
                type="number"
                step="0.5"
                value={formData.width_m}
                onChange={(e) => setFormData({ ...formData, width_m: parseFloat(e.target.value) || 0 })}
                className="bg-[#1A1A1A] border-white/10"
              />
            </div>

            <div>
              <Label htmlFor="height_m">Alto (m) *</Label>
              <Input
                id="height_m"
                type="number"
                step="0.5"
                value={formData.height_m}
                onChange={(e) => setFormData({ ...formData, height_m: parseFloat(e.target.value) || 0 })}
                className="bg-[#1A1A1A] border-white/10"
              />
            </div>

            <div>
              <Label>Tipo *</Label>
              <Select
                value={formData.billboard_type}
                onValueChange={(value) => setFormData({ ...formData, billboard_type: value })}
              >
                <SelectTrigger className="bg-[#1A1A1A] border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#2A2A2A] border-white/10">
                  <SelectItem value="espectacular">Espectacular</SelectItem>
                  <SelectItem value="muro">Muro</SelectItem>
                  <SelectItem value="pantalla_led">Pantalla LED</SelectItem>
                  <SelectItem value="totem">Tótem</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Iluminación *</Label>
              <Select
                value={formData.illumination}
                onValueChange={(value) => setFormData({ ...formData, illumination: value })}
              >
                <SelectTrigger className="bg-[#1A1A1A] border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#2A2A2A] border-white/10">
                  <SelectItem value="ninguna">Sin iluminación</SelectItem>
                  <SelectItem value="iluminado">Iluminado</SelectItem>
                  <SelectItem value="led">LED</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="faces">Caras</Label>
              <Input
                id="faces"
                type="number"
                min="1"
                max="4"
                value={formData.faces}
                onChange={(e) => setFormData({ ...formData, faces: parseInt(e.target.value) || 1 })}
                className="bg-[#1A1A1A] border-white/10"
              />
            </div>

            <div>
              <Label htmlFor="daily_impressions">Impresiones diarias</Label>
              <Input
                id="daily_impressions"
                type="number"
                value={formData.daily_impressions}
                onChange={(e) => setFormData({ ...formData, daily_impressions: parseInt(e.target.value) || 0 })}
                className="bg-[#1A1A1A] border-white/10"
                placeholder="25000"
              />
            </div>
          </div>

          {/* Price */}
          <div>
            <Label htmlFor="price_per_month">Precio mensual (MXN) *</Label>
            <Input
              id="price_per_month"
              type="number"
              value={formData.price_per_month}
              onChange={(e) => setFormData({ ...formData, price_per_month: parseFloat(e.target.value) || 0 })}
              className="bg-[#1A1A1A] border-white/10"
            />
            {errors.price_per_month && <p className="text-red-400 text-sm mt-1">{errors.price_per_month}</p>}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-white/20 text-white hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-[#9BFF43] text-[#202020] hover:bg-[#8AE63A]"
            >
              {isLoading ? 'Guardando...' : billboard ? 'Actualizar' : 'Agregar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddBillboardDialog;

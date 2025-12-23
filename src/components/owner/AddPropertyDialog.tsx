import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Billboard } from '@/hooks/useBillboards';
import { toast } from 'sonner';
import { ArrowLeft, Eye, Clock, MapPin, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AddPropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billboard?: Billboard | null;
  onSave: () => void;
}

const POINTS_OF_INTEREST = [
  'Plaza comerciales',
  'Escuelas',
  'Restaurantes',
  'Gasolineras',
  'Oficinas',
  'Áreas verdes',
];

const AddPropertyDialog: React.FC<AddPropertyDialogProps> = ({
  open,
  onOpenChange,
  billboard,
  onSave,
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  // Step 1 form data
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [address, setAddress] = useState('');

  // Step 2 form data
  const [pointsOfInterest, setPointsOfInterest] = useState<string[]>([]);
  const [status, setStatus] = useState('');
  const [height, setHeight] = useState('');
  const [width, setWidth] = useState('');
  const [availability, setAvailability] = useState<'immediate' | 'scheduled'>('immediate');
  const [availableFrom, setAvailableFrom] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (billboard) {
      setTitle(billboard.title);
      setPrice(billboard.price_per_month.toString());
      setCity(billboard.city);
      setState(billboard.state);
      setAddress(billboard.address);
      setHeight(billboard.height_m.toString());
      setWidth(billboard.width_m.toString());
      setStatus(billboard.is_available ? 'alto' : 'bajo');
    } else {
      resetForm();
    }
  }, [billboard, open]);

  const resetForm = () => {
    setStep(1);
    setTitle('');
    setPrice('');
    setCity('');
    setState('');
    setAddress('');
    setPointsOfInterest([]);
    setStatus('');
    setHeight('');
    setWidth('');
    setAvailability('immediate');
    setAvailableFrom(undefined);
  };

  const handleContinue = () => {
    if (!title || !price || !city || !state || !address) {
      toast.error('Por favor completa todos los campos');
      return;
    }
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handlePointOfInterestChange = (point: string, checked: boolean) => {
    if (checked) {
      setPointsOfInterest(prev => [...prev, point]);
    } else {
      setPointsOfInterest(prev => prev.filter(p => p !== point));
    }
  };

  const handleSubmit = async () => {
    if (!height || !width || !status) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    setIsLoading(true);

    try {
      const billboardData = {
        title,
        price_per_month: parseFloat(price),
        city,
        state,
        address,
        height_m: parseFloat(height),
        width_m: parseFloat(width),
        is_available: availability === 'immediate',
        owner_id: user?.id,
        latitude: 32.6245,
        longitude: -115.4523,
        billboard_type: 'espectacular',
        illumination: 'iluminado',
        faces: 1,
      };

      if (billboard) {
        const { error } = await supabase
          .from('billboards')
          .update(billboardData)
          .eq('id', billboard.id);

        if (error) throw error;
        toast.success('Propiedad actualizada');
      } else {
        const { error } = await supabase
          .from('billboards')
          .insert(billboardData);

        if (error) throw error;
        toast.success('Propiedad agregada');
      }

      onSave();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('Error saving billboard:', error);
      toast.error(error.message || 'Error al guardar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-border text-foreground max-w-xl p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button onClick={handleBack} className="text-foreground hover:text-muted-foreground">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-xl font-bold">Agregar propiedad</h2>
          </div>
          <span className="text-3xl font-black italic text-foreground">M</span>
        </div>

        {step === 1 ? (
          /* Step 1: Basic Info */
          <div className="px-6 pb-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Nombre para propiedad</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 bg-background border-border"
                  placeholder="Plaza Cataviña"
                />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Precio por mes</Label>
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="mt-1 bg-background border-border"
                  placeholder="785"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Ciudad</Label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-1 bg-background border-border"
                  placeholder="Mexicali"
                />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Estado</Label>
                <Input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="mt-1 bg-background border-border"
                  placeholder="B.C."
                />
              </div>
            </div>

            <div>
              <Label className="text-sm text-muted-foreground">Dirección</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1 bg-background border-border"
                placeholder="Calz. Cetys 1800, Privada Vista Hermosa"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleContinue}
                className="flex-1 bg-[hsl(220,80%,55%)] hover:bg-[hsl(220,80%,50%)] text-white"
              >
                Continuar
              </Button>
            </div>
          </div>
        ) : (
          /* Step 2: Details */
          <div className="px-6 pb-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Property Preview Card */}
            <div className="bg-foreground text-background rounded-xl p-4 flex items-start justify-between">
              <div>
                <h3 className="font-bold text-lg">{title}</h3>
                <p className="text-background/70 text-sm">
                  {address}, {city} {state}
                </p>
              </div>
              <div className="bg-background text-foreground rounded-lg px-3 py-2 text-right">
                <span className="font-bold">{parseInt(price || '0').toLocaleString()}</span>
                <span className="text-sm text-muted-foreground"> /mes</span>
              </div>
            </div>

            {/* Puntos de Interés */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Puntos de Interés</Label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {POINTS_OF_INTEREST.map((point) => (
                  <div key={point} className="flex items-center gap-2">
                    <Checkbox
                      id={point}
                      checked={pointsOfInterest.includes(point)}
                      onCheckedChange={(checked) => 
                        handlePointOfInterestChange(point, checked as boolean)
                      }
                    />
                    <label htmlFor={point} className="text-sm cursor-pointer">
                      {point}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Status & Tamaño */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Status</Label>
                </div>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Selecciona uno" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bajo">Bajo</SelectItem>
                    <SelectItem value="medio">Medio</SelectItem>
                    <SelectItem value="alto">Alto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Tamaño</Label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="Alto"
                    className="bg-background border-border"
                  />
                  <Input
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    placeholder="Ancho"
                    className="bg-background border-border"
                  />
                </div>
              </div>
            </div>

            {/* Disponibilidad */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Disponibilidad</Label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAvailability('immediate')}
                  className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                    availability === 'immediate'
                      ? 'border-[hsl(220,80%,55%)] bg-[hsl(220,80%,55%)]/5'
                      : 'border-border'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    availability === 'immediate'
                      ? 'border-[hsl(220,80%,55%)]'
                      : 'border-muted-foreground'
                  }`}>
                    {availability === 'immediate' && (
                      <div className="w-2 h-2 rounded-full bg-[hsl(220,80%,55%)]" />
                    )}
                  </div>
                  <span className="text-sm">Inmediata</span>
                </button>

                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setAvailability('scheduled')}
                      className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left ${
                        availability === 'scheduled'
                          ? 'border-[hsl(220,80%,55%)] bg-[hsl(220,80%,55%)]/5'
                          : 'border-border'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        availability === 'scheduled'
                          ? 'border-[hsl(220,80%,55%)]'
                          : 'border-muted-foreground'
                      }`}>
                        {availability === 'scheduled' && (
                          <div className="w-2 h-2 rounded-full bg-[hsl(220,80%,55%)]" />
                        )}
                      </div>
                      <span className="text-sm">
                        {availableFrom 
                          ? `A partir de ${format(availableFrom, 'd MMMM yyyy', { locale: es })}`
                          : 'A partir de'
                        }
                      </span>
                    </button>
                  </PopoverTrigger>
                  {availability === 'scheduled' && (
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={availableFrom}
                        onSelect={setAvailableFrom}
                        locale={es}
                        initialFocus
                      />
                    </PopoverContent>
                  )}
                </Popover>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-muted rounded-xl p-4">
              <div className="flex items-center gap-4 text-muted-foreground text-sm mb-2">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span>Vistas por día</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Horas pico</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Calculadas automáticamente con información en tiempo real
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex-1 bg-[hsl(220,80%,55%)] hover:bg-[hsl(220,80%,50%)] text-white"
              >
                {isLoading ? 'Guardando...' : 'Guardar Propiedad'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddPropertyDialog;

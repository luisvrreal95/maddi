import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useMapboxToken } from '@/contexts/MapboxTokenContext';
import { toast } from 'sonner';
import { Billboard } from '@/hooks/useBillboards';
import FacingPicker from './FacingPicker';
import { getFacing, normalizeFaceLabel } from '@/lib/billboardFaces';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  face: Billboard | null;
  /** Todas las caras de la estructura */
  faces: Billboard[];
  onSaved: () => void;
}

/** Indica (o corrige) hacia dónde mira una cara ya publicada. */
const SetFacingDialog: React.FC<Props> = ({ open, onOpenChange, face, faces, onSaved }) => {
  const { token } = useMapboxToken();
  const [facing, setFacing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open && face) setFacing((face as any).facing || null); }, [open, face?.id]);
  if (!face) return null;

  const idx = faces.findIndex(f => f.id === face.id);
  const label = normalizeFaceLabel((face as any).face_label, Math.max(idx, 0));
  const other = faces.find(f => f.id !== face.id);
  const otherIdx = other ? faces.findIndex(f => f.id === other.id) : -1;
  const cur = getFacing(facing);

  const save = async () => {
    if (!facing) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('billboards').update({ facing } as any).eq('id', face.id);
      if (error) throw error;
      // En estructuras de dos caras, la otra suele mirar al lado opuesto
      if (other && !(other as any).facing && cur) {
        await supabase.from('billboards').update({ facing: cur.opposite } as any).eq('id', other.id);
      }
      toast.success('Orientación guardada');
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error('No se pudo guardar');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="theme-light bg-white text-foreground max-w-xl rounded-3xl">
        <DialogHeader>
          <DialogTitle>¿Hacia dónde mira la {label}?</DialogTitle>
          <DialogDescription>Toca la flecha en el mapa. Los anunciantes verán qué cara les conviene.</DialogDescription>
        </DialogHeader>
        {token ? (
          <FacingPicker
            latitude={Number(face.latitude)} longitude={Number(face.longitude)} mapboxToken={token}
            value={facing} onChange={setFacing} currentLabel={label}
            otherFace={other && (other as any).facing ? { label: normalizeFaceLabel((other as any).face_label, otherIdx), facing: (other as any).facing } : undefined}
          />
        ) : <div className="h-[300px] rounded-2xl bg-secondary" />}
        {cur && (
          <p className="text-sm text-muted-foreground">
            La {label} mira al <b className="text-foreground">{cur.label}</b>: la ven quienes circulan hacia el <b className="text-foreground">{getFacing(cur.opposite)?.label}</b>.
            {other && !(other as any).facing ? ` Marcaremos la otra cara hacia el ${getFacing(cur.opposite)?.label}.` : ''}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!facing || saving} onClick={save} className="rounded-full bg-[#9BFF43] text-[#07110B] hover:bg-[#8AEE32] font-semibold">{saving ? 'Guardando…' : 'Guardar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SetFacingDialog;

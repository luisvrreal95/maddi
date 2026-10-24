import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMapboxToken } from '@/contexts/MapboxTokenContext';
import { toast } from 'sonner';
import { Billboard } from '@/hooks/useBillboards';
import FacingPicker from './FacingPicker';
import { getFacing, defaultFaceLabel, normalizeFaceLabel } from '@/lib/billboardFaces';
import { ImagePlus, Loader2 } from 'lucide-react';

interface AddFaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Caras ya existentes de la estructura (ordenadas) */
  faces: Billboard[];
  onSaved: () => void;
}

const AddFaceDialog: React.FC<AddFaceDialogProps> = ({ open, onOpenChange, faces, onSaved }) => {
  const { user } = useAuth();
  const { token } = useMapboxToken();
  const source = faces[0];
  const nextIndex = faces.length;
  const label = defaultFaceLabel(nextIndex); // "Cara B"
  const first = faces[0];
  const firstLabel = first ? normalizeFaceLabel(first.face_label, 0) : 'Cara A';

  const suggestedFacing = useMemo(() => getFacing(first?.facing)?.opposite ?? null, [first]);
  const [facing, setFacing] = useState<string | null>(null);
  const [copySpecs, setCopySpecs] = useState(true);
  const [price, setPrice] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [w, setW] = useState('');
  const [h, setH] = useState('');

  const needsFirstFacing = !!first && !getFacing(first.facing);

  useEffect(() => {
    if (open) {
      setFacing(suggestedFacing);
      setPrice(source ? String(source.price_per_month) : '');
      setPhoto(null);
      setPreview(null);
      setCopySpecs(true);
      setW(''); setH('');

    }
  }, [open, suggestedFacing, source?.id]);

  useEffect(() => {
    if (!photo) { setPreview(null); return; }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  if (!source) return null;

  const f = getFacing(facing);
  const effectiveFirst = getFacing(first.facing);
  const priceNum = Number(price.replace(/[^0-9.]/g, ''));
  const canSave = !!facing && !!photo && priceNum > 0 && (copySpecs || (Number(w) > 0 && Number(h) > 0)) && !saving;

  const save = async () => {
    if (!user || !canSave || !photo) return;
    setSaving(true);
    try {
      const ext = photo.name.split('.').pop() || 'jpg';
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 11)}.${ext}`;
      const up = await supabase.storage.from('billboard-images').upload(path, photo, { cacheControl: '3600', upsert: false });
      if (up.error) throw up.error;
      const imageUrl = supabase.storage.from('billboard-images').getPublicUrl(up.data.path).data.publicUrl;

      // La estructura necesita un structure_id compartido
      const structureId = source.structure_id || crypto.randomUUID();
      if (!source.structure_id || !first.face_label || needsFirstFacing) {
        const patch: Record<string, string> = {};
        if (!source.structure_id) patch.structure_id = structureId;
        if (!first.face_label) patch.face_label = 'A';
        if (needsFirstFacing && getFacing(facing)) patch.facing = getFacing(facing)!.opposite;
        const { error: e1 } = await supabase.from('billboards').update(patch).eq('id', source.id);
        if (e1) throw e1;
      }

      const base = {
        billboard_type: source.billboard_type,
        width_m: copySpecs ? source.width_m : Number(w),
        height_m: copySpecs ? source.height_m : Number(h),
        illumination: source.illumination,
        is_digital: source.is_digital,
      };

      const { error } = await supabase.from('billboards').insert({
        owner_id: user.id,
        title: source.title,
        address: source.address,
        city: source.city,
        state: source.state,
        latitude: source.latitude,
        longitude: source.longitude,
        description: source.description,
        points_of_interest: source.points_of_interest,
        min_campaign_days: source.min_campaign_days,
        min_advance_booking_days: source.min_advance_booking_days,
        ...base,
        price_per_month: priceNum,
        image_url: imageUrl,
        image_urls: [imageUrl],
        is_available: true,
        structure_id: structureId,
        face_label: label.replace('Cara ', ''),
        facing,
      });
      if (error) throw error;
      toast.success(`${label} publicada`);
      onSaved();
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error('No se pudo publicar la cara');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="theme-light bg-card text-foreground border-border max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Agregar otra cara</DialogTitle>
          <DialogDescription>
            Estructura: <b className="text-foreground">{source.title}</b> · {source.address}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold">¿Hacia dónde mira esta cara?</p>
            <p className="text-xs text-muted-foreground mt-0.5">Toca una dirección. {suggestedFacing ? 'Ya marcamos la opuesta a la ' + firstLabel + ', que es lo más común.' : 'Mira el mapa y toca hacia dónde ve la cara. La ' + firstLabel + ' quedará hacia el lado opuesto (puedes cambiarlo después).'}</p>
          </div>

          <div className="grid md:grid-cols-[1fr_190px] gap-4">
            {token ? (
              <FacingPicker
                latitude={Number(source.latitude)}
                longitude={Number(source.longitude)}
                mapboxToken={token}
                value={facing}
                onChange={setFacing}
                otherFace={effectiveFirst ? { label: firstLabel, facing: effectiveFirst.key } : undefined}
                currentLabel={label}
              />
            ) : <div className="h-[300px] rounded-2xl bg-secondary" />}
            <div className="space-y-3 self-center">
              <div className="rounded-2xl bg-[#EAF9D6] p-4">
                <p className="text-xs font-semibold text-[#2F6B00]">{label}</p>
                <p className="text-lg font-bold leading-tight">{f ? `Mira al ${f.label}` : 'Elige una dirección'}</p>
                {f && <p className="text-xs text-[#33413a] mt-1.5">La ven quienes circulan hacia el {getFacing(f.opposite)?.label}.</p>}
              </div>
              {effectiveFirst && (
                <div className="rounded-2xl bg-secondary p-3">
                  <p className="text-xs font-semibold text-muted-foreground">{firstLabel}</p>
                  <p className="text-sm font-semibold">Mira al {effectiveFirst.label}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-border p-4">
            <div>
              <p className="text-sm font-semibold">Misma medida e iluminación que la {firstLabel}</p>
              <p className="text-xs text-muted-foreground">
                {Number(source.width_m)} × {Number(source.height_m)} m · {source.illumination} · {source.is_digital ? 'Digital' : 'Estático'}
              </p>
            </div>
            <Switch checked={copySpecs} onCheckedChange={setCopySpecs} />
          </div>

          {!copySpecs && (
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-semibold">Ancho (m)</label><Input inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} className="mt-1.5 rounded-xl" /></div>
              <div><label className="text-xs font-semibold">Alto (m)</label><Input inputMode="decimal" value={h} onChange={(e) => setH(e.target.value)} className="mt-1.5 rounded-xl" /></div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold">Precio por mes (MXN)</label>
              <Input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1.5 rounded-xl" />
              <p className="text-xs text-muted-foreground mt-1">Sugerido a partir de la {firstLabel}.</p>
            </div>
            <div>
              <label className="text-xs font-semibold">Foto de esta cara</label>
              <label className="mt-1.5 flex items-center justify-center gap-2 h-10 rounded-xl border-2 border-dashed border-border text-sm font-medium cursor-pointer hover:bg-secondary overflow-hidden">
                {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : (<><ImagePlus className="w-4 h-4" />Subir foto de frente</>)}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
              </label>
              <p className="text-xs text-muted-foreground mt-1">Obligatoria.</p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary-hover font-semibold" disabled={!canSave} onClick={save}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Publicar {label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddFaceDialog;

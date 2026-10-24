import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { FaceStatus, StatusChip } from './OwnerStructureCard';

export interface ShareItem { id: string; title: string; label: string; status: FaceStatus; price: number; until?: Date }

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string;
  items: ShareItem[];
  /** Caras ya marcadas en la Lista (si hay, empieza en modo personalizado) */
  preselected?: string[];
}

type Mode = 'all' | 'free' | 'custom';

const PortfolioShareDialog: React.FC<Props> = ({ open, onOpenChange, userId, items, preselected = [] }) => {
  const [mode, setMode] = useState<Mode>('all');
  const [custom, setCustom] = useState<string[]>([]);
  const [prices, setPrices] = useState(true);

  const notPaused = useMemo(() => items.filter((i) => i.status !== 'paused' && i.status !== 'inactive').map((i) => i.id), [items]);
  const free = useMemo(() => items.filter((i) => i.status === 'available').map((i) => i.id), [items]);

  useEffect(() => {
    if (!open) return;
    if (preselected.length) { setMode('custom'); setCustom(preselected); }
    else { setMode('all'); setCustom([]); }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const checked = mode === 'all' ? notPaused : mode === 'free' ? free : custom;

  const toggle = (id: string, on: boolean) => {
    const next = on ? [...checked, id] : checked.filter((x) => x !== id);
    setCustom(next);
    setMode('custom');
  };

  const params = new URLSearchParams();
  if (mode === 'all') params.set('todo', '1');
  else params.set('ids', checked.join(','));
  if (!prices) params.set('precios', '0');
  const url = `${window.location.origin}/profile/${userId}?${params.toString()}`;
  const msg = encodeURIComponent(`Te comparto mi portafolio de espectaculares en Maddi: ${url}`);
  const empty = checked.length === 0;

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast.success('Enlace copiado'); }
    catch { toast.error('No se pudo copiar el enlace'); }
  };

  const chip = (id: Mode, label: string) => (
    <button key={id} onClick={() => setMode(id)}
      className={cn('px-4 py-2 rounded-full text-sm font-semibold border transition-colors', mode === id ? 'bg-foreground text-background border-foreground' : 'bg-card border-border hover:bg-secondary')}>
      {label}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="theme-light bg-card text-foreground border-border sm:max-w-[540px] w-[calc(100vw-2rem)] max-h-[90vh] rounded-3xl overflow-hidden flex flex-col gap-4 [&>*]:min-w-0">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Compartir portafolio</DialogTitle>
          <DialogDescription>Elige qué espectaculares verá quien reciba el enlace.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          {chip('all', 'Todas')}{chip('free', 'Libres hoy')}
          {mode === 'custom' && <span className="px-4 py-2 rounded-full text-sm font-semibold bg-foreground text-background">Personalizada</span>}
        </div>

        <div className="border border-border rounded-2xl overflow-y-auto max-h-[280px] divide-y divide-border">
          {items.map((i) => {
            const disabled = i.status === 'paused' || i.status === 'inactive';
            return (
              <label key={i.id} className={cn('flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/50', disabled && 'opacity-50 cursor-default')}>
                <Checkbox checked={checked.includes(i.id)} disabled={disabled} onCheckedChange={(c) => toggle(i.id, !!c)} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{i.title} <span className="font-normal text-muted-foreground">· {i.label}</span></div>
                  <div className="text-xs text-muted-foreground">${Number(i.price).toLocaleString('es-MX')}/mes</div>
                </div>
                <StatusChip s={{ status: i.status, until: i.until }} />
              </label>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-sm">
          <span>Mostrar precios</span>
          <Switch checked={prices} onCheckedChange={setPrices} />
        </div>

        <div className="text-xs text-muted-foreground -mt-1">
          {empty ? 'Marca al menos una cara.' : mode === 'all' ? `${checked.length} de ${items.length} caras. Las nuevas que publiques se agregan solas.` : `${checked.length} de ${items.length} caras.`}
        </div>

        <div className="flex items-center gap-2 border border-border rounded-xl pl-4 pr-1.5 py-1.5 text-sm">
          <span className="flex-1 min-w-0 truncate text-muted-foreground">{url.replace(/^https?:\/\//, '')}</span>
          <button disabled={empty} onClick={copy} className="flex-none bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-full hover:bg-primary-hover disabled:opacity-40">Copiar enlace</button>
        </div>

        <div className="flex gap-2 text-sm font-medium">
          <a aria-disabled={empty} href={empty ? undefined : `https://wa.me/?text=${msg}`} target="_blank" rel="noopener noreferrer" className={cn('flex-1 text-center border border-border rounded-full py-2.5 hover:bg-secondary', empty && 'opacity-40 pointer-events-none')}>WhatsApp</a>
          <a aria-disabled={empty} href={empty ? undefined : `mailto:?subject=${encodeURIComponent('Portafolio de espectaculares en Maddi')}&body=${msg}`} className={cn('flex-1 text-center border border-border rounded-full py-2.5 hover:bg-secondary', empty && 'opacity-40 pointer-events-none')}>Correo</a>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PortfolioShareDialog;

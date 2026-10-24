import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export type ShareMode = 'all' | 'available' | 'selection';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string;
  totalStructures: number;
  selectedIds: string[];
  initialMode?: ShareMode;
}

const PortfolioShareDialog: React.FC<Props> = ({ open, onOpenChange, userId, totalStructures, selectedIds, initialMode }) => {
  const [mode, setMode] = useState<ShareMode>('available');
  const [prices, setPrices] = useState(true);

  useEffect(() => {
    if (open) setMode(initialMode ?? (selectedIds.length ? 'selection' : 'available'));
  }, [open, initialMode, selectedIds.length]);

  const params = new URLSearchParams();
  if (mode === 'all') params.set('todo', '1');
  if (mode === 'selection' && selectedIds.length) params.set('ids', selectedIds.join(','));
  if (!prices) params.set('precios', '0');
  const qs = params.toString();
  const url = `${window.location.origin}/profile/${userId}${qs ? `?${qs}` : ''}`;
  const msg = encodeURIComponent(`Te comparto mi portafolio de espectaculares en Maddi: ${url}`);

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast.success('Enlace copiado'); }
    catch { toast.error('No se pudo copiar el enlace'); }
  };

  const tabs: { id: ShareMode; label: string; disabled?: boolean }[] = [
    { id: 'all', label: `Todo (${totalStructures})` },
    { id: 'available', label: 'Solo disponibles' },
    { id: 'selection', label: `Selección${selectedIds.length ? ` (${selectedIds.length})` : ''}`, disabled: selectedIds.length === 0 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="theme-light bg-card text-foreground border-border sm:max-w-[520px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Compartir portafolio</DialogTitle>
          <DialogDescription>Un enlace público con tus espectaculares. Lo mandas por WhatsApp o correo.</DialogDescription>
        </DialogHeader>

        <div className="flex bg-secondary rounded-full p-1 text-sm font-semibold">
          {tabs.map((t) => (
            <button key={t.id} disabled={t.disabled} onClick={() => setMode(t.id)}
              className={cn('flex-1 py-2 rounded-full transition-colors', mode === t.id ? 'bg-foreground text-background' : 'text-muted-foreground', t.disabled && 'opacity-40 cursor-not-allowed')}>
              {t.label}
            </button>
          ))}
        </div>
        {selectedIds.length === 0 && <p className="text-xs text-muted-foreground -mt-2">Para compartir una selección, márcala en la vista Lista.</p>}

        <div className="border border-border rounded-2xl p-4 flex items-center justify-between text-sm">
          <span>Mostrar precios</span>
          <Switch checked={prices} onCheckedChange={setPrices} />
        </div>

        <div className="flex items-center gap-2 border border-border rounded-xl pl-4 pr-1.5 py-1.5 text-sm">
          <span className="flex-1 truncate text-muted-foreground">{url.replace(/^https?:\/\//, '')}</span>
          <button onClick={copy} className="bg-primary text-primary-foreground font-semibold px-5 py-2 rounded-full hover:bg-primary-hover">Copiar enlace</button>
        </div>

        <div className="flex gap-2 text-sm font-medium">
          <a href={`https://wa.me/?text=${msg}`} target="_blank" rel="noopener noreferrer" className="flex-1 text-center border border-border rounded-full py-2.5 hover:bg-secondary">WhatsApp</a>
          <a href={`mailto:?subject=${encodeURIComponent('Portafolio de espectaculares en Maddi')}&body=${msg}`} className="flex-1 text-center border border-border rounded-full py-2.5 hover:bg-secondary">Correo</a>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PortfolioShareDialog;

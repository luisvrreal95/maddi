import React, { useMemo, useState } from 'react';
import { Plus, Search, LayoutGrid, List, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Billboard } from '@/hooks/useBillboards';
import PortfolioShareDialog from './PortfolioShareDialog';
import { Share2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { structureKey, normalizeFaceLabel, facingText } from '@/lib/billboardFaces';
import OwnerStructureCard, { BookingRange, Structure, StatusChip, faceStatus } from './OwnerStructureCard';
import StripeConnectCard from './StripeConnectCard';
import AddFaceDialog from './AddFaceDialog';
import SetFacingDialog from './SetFacingDialog';
import { cn } from '@/lib/utils';

interface Props {
  billboards: Billboard[];
  bookings: BookingRange[]; // aprobadas, próximos 90 días
  pendingCount: number;
  isLoading: boolean;
  displayName: string;
  userId: string;
  onAdd: () => void;
  onOpenFace: (b: Billboard) => void;
  onEdit: (b: Billboard) => void;
  onPause: (b: Billboard) => void;
  onDelete: (b: Billboard) => void;
  onCalendar: (b: Billboard) => void;
  onGoReservas: () => void;
  onRefresh: () => void;
  onBulkPause: (ids: string[]) => void;
}

type StatusFilter = 'all' | 'available' | 'rented' | 'paused';
type Sort = 'recent' | 'name' | 'price';

const OwnerPropertiesTab: React.FC<Props> = (p) => {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [q, setQ] = useState('');
  const [city, setCity] = useState('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<Sort>('recent');
  const [selected, setSelected] = useState<string[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareFromList, setShareFromList] = useState(false);
  const [addFaceFor, setAddFaceFor] = useState<Structure | null>(null);
  const [facingFor, setFacingFor] = useState<{ face: any; faces: any[] } | null>(null);

  const structures = useMemo<Structure[]>(() => {
    const m: Record<string, Billboard[]> = {};
    const order: string[] = [];
    p.billboards.forEach((b) => {
      const k = structureKey(b);
      if (!m[k]) { m[k] = []; order.push(k); }
      m[k].push(b);
    });
    return order.map((k) => {
      const faces = m[k].slice().sort((a, b) => (a.face_label || '').localeCompare(b.face_label || '') || a.created_at.localeCompare(b.created_at));
      const f = faces[0];
      return { key: k, title: f.title, address: f.address, city: f.city, faces };
    });
  }, [p.billboards]);

  const cities = useMemo(() => [...new Set(p.billboards.map((b) => b.city))].sort(), [p.billboards]);

  const visible = useMemo(() => {
    const text = q.trim().toLowerCase();
    const list = structures.filter((s) => {
      if (city !== 'all' && s.city !== city) return false;
      if (text && !`${s.title} ${s.address} ${s.city}`.toLowerCase().includes(text)) return false;
      if (status !== 'all') {
        return s.faces.some((f) => {
          const st = faceStatus(f, p.bookings).status;
          return status === 'available' ? st === 'available' : status === 'rented' ? st === 'rented' : st === 'paused' || st === 'inactive';
        });
      }
      return true;
    });
    if (sort === 'name') list.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === 'price') list.sort((a, b) => Number(b.faces[0].price_per_month) - Number(a.faces[0].price_per_month));
    return list;
  }, [structures, q, city, status, sort, p.bookings]);

  const allIds = useMemo(() => visible.flatMap((s) => s.faces.map((f) => f.id)), [visible]);

  // KPIs
  const faceCount = p.billboards.length;
  const rented = p.billboards.filter((b) => faceStatus(b, p.bookings).status === 'rented').length;
  const published = p.billboards.filter((b) => faceStatus(b, p.bookings).status !== 'paused').length;
  const occupancy = published ? Math.round((rented / published) * 100) : 0;
  const in30 = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const limit = today.getTime() + 30 * 86400000;
    const ids = new Set<string>();
    p.bookings.forEach((b) => {
      const e = new Date(b.end_date).getTime();
      if (new Date(b.start_date).getTime() <= today.getTime() && e >= today.getTime() && e <= limit) ids.add(b.billboard_id);
    });
    return ids.size;
  }, [p.bookings]);
  const noPhoto = p.billboards.filter((b) => !(b.image_urls?.length || b.image_url)).length;

  const hasFilters = q !== '' || city !== 'all' || status !== 'all';
  const chip = (id: StatusFilter, label: string) => (
    <button key={id} onClick={() => setStatus(id)}
      className={cn('px-4 py-2 rounded-full text-sm font-medium border transition-colors', status === id ? 'bg-foreground text-background border-foreground' : 'bg-card border-border text-foreground hover:bg-secondary')}>
      {label}
    </button>
  );
  const attn = (n: number, text: string, hot?: boolean, onClick?: () => void) => n > 0 && (
    <button key={text} onClick={onClick} className={cn('flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-full', hot ? 'bg-[#FFF1CF] text-[#6B4800]' : 'bg-secondary text-foreground', !onClick && 'cursor-default')}>
      <b>{n}</b> {text}
    </button>
  );

  return (
    <div className="theme-light">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Mis espectaculares</h1>
          <p className="text-sm text-muted-foreground mt-1">Cada estructura puede tener varias caras. Cada cara se renta por separado.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-card border border-border rounded-full p-1 text-xs font-semibold">
            <button onClick={() => setView('grid')} className={cn('px-3.5 py-1.5 rounded-full flex items-center gap-1.5', view === 'grid' ? 'bg-foreground text-background' : 'text-muted-foreground')}><LayoutGrid className="w-3.5 h-3.5" />Tarjetas</button>
            <button onClick={() => setView('list')} className={cn('px-3.5 py-1.5 rounded-full flex items-center gap-1.5', view === 'list' ? 'bg-foreground text-background' : 'text-muted-foreground')}><List className="w-3.5 h-3.5" />Lista</button>
          </div>
          <Button variant="outline" className="rounded-full bg-card border-border font-semibold" onClick={() => { setShareFromList(false); setShareOpen(true); }}>
            <Share2 className="w-4 h-4 mr-1.5" />Compartir portafolio
          </Button>
          <Button onClick={p.onAdd} className="rounded-full bg-primary text-primary-foreground hover:bg-primary-hover font-semibold">
            <Plus className="w-4 h-4 mr-1.5" />Agregar espectacular
          </Button>
        </div>
      </div>

      <StripeConnectCard />

      {faceCount > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4 mb-5 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1 flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold mr-2">Necesita tu atención</span>
            {attn(p.pendingCount, p.pendingCount === 1 ? 'solicitud por responder' : 'solicitudes por responder', true, p.onGoReservas)}
            {attn(in30, in30 === 1 ? 'renta termina en 30 días' : 'rentas terminan en 30 días')}
            {attn(noPhoto, noPhoto === 1 ? 'cara sin foto' : 'caras sin foto')}
            {p.pendingCount + in30 + noPhoto === 0 && <span className="text-sm text-muted-foreground">Todo al día ✓</span>}
          </div>
          <div className="flex gap-7 md:text-right">
            <div><div className="text-[11px] text-muted-foreground">Estructuras / caras</div><div className="text-xl font-bold">{structures.length} / {faceCount}</div></div>
            <div><div className="text-[11px] text-muted-foreground">Ocupación hoy</div><div className="text-xl font-bold">{occupancy}%</div></div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2.5 mb-6">
        <div className="relative w-full sm:w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o dirección…" className="pl-10 rounded-full bg-card border-border" />
        </div>
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger className="w-[190px] rounded-full bg-card border-border"><SelectValue placeholder="Todas las ciudades" /></SelectTrigger>
          <SelectContent className="theme-light bg-card border-border">
            <SelectItem value="all">Todas las ciudades</SelectItem>
            {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        {chip('all', 'Todas')}{chip('available', 'Disponibles')}{chip('rented', 'Rentadas')}{chip('paused', 'Pausadas')}
        {hasFilters && <button onClick={() => { setQ(''); setCity('all'); setStatus('all'); }} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"><X className="w-4 h-4" />Limpiar</button>}
        <div className="sm:ml-auto flex items-center gap-2 text-sm text-muted-foreground">
          Ordenar:
          <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
            <SelectTrigger className="w-[150px] rounded-full bg-card border-border text-foreground"><SelectValue /></SelectTrigger>
            <SelectContent className="theme-light bg-card border-border">
              <SelectItem value="recent">Más recientes</SelectItem>
              <SelectItem value="name">Nombre</SelectItem>
              <SelectItem value="price">Precio</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {p.isLoading ? (
        <div className="text-muted-foreground text-center py-12">Cargando espectaculares…</div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16">
          <h2 className="text-foreground text-xl font-bold mb-2">{faceCount === 0 ? 'Sin espectaculares' : 'Nada coincide con tus filtros'}</h2>
          <p className="text-muted-foreground mb-6">{faceCount === 0 ? 'Agrega tu primer espectacular para comenzar a recibir contactos' : 'Prueba quitando algún filtro.'}</p>
          {faceCount === 0 && <Button onClick={p.onAdd} className="rounded-full bg-primary text-primary-foreground font-semibold"><Plus className="w-4 h-4 mr-1.5" />Agregar espectacular</Button>}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-start">
          {visible.map((s) => (
            <OwnerStructureCard key={s.key} structure={s} bookings={p.bookings}
              onOpenFace={p.onOpenFace} onEdit={p.onEdit} onSetFacing={(f, st) => setFacingFor({ face: f, faces: st.faces })} onPause={p.onPause} onDelete={p.onDelete} onCalendar={p.onCalendar} onAddFace={setAddFaceFor} />
          ))}
        </div>
      ) : (
        <>
        {view === 'list' && selected.length > 0 && (
          <div className="mb-3 bg-foreground text-background rounded-2xl px-5 py-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <b>{selected.length} {selected.length === 1 ? 'seleccionada' : 'seleccionadas'}</b>
            <button className="font-semibold bg-[#9BFF43] text-[#07110B] rounded-full px-4 py-1.5" onClick={() => { setShareFromList(true); setShareOpen(true); }}>Compartir selección</button>
            <button onClick={() => { p.onBulkPause(selected); setSelected([]); }}>Pausar</button>
            <button className="opacity-70" onClick={() => setSelected([])} aria-label="Limpiar selección"><X className="w-4 h-4" /></button>
          </div>
        )}


        <div className="bg-card border border-border rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-xs text-muted-foreground bg-secondary/60">
                <th className="pl-4 py-3 w-8"><Checkbox aria-label="Seleccionar todo" checked={allIds.length > 0 && selected.length === allIds.length} onCheckedChange={(c) => setSelected(c ? allIds : [])} /></th>
                <th className="px-2 py-3 font-semibold">Espectacular</th><th className="px-2 py-3 font-semibold">Cara</th>
                <th className="px-2 py-3 font-semibold">Precio/mes</th><th className="px-2 py-3 font-semibold">Vistas/día</th>
                <th className="px-2 py-3 font-semibold">Estado</th><th className="px-2 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visible.flatMap((s) => s.faces.map((f, i) => {
                const st = faceStatus(f, p.bookings);
                return (
                  <tr key={f.id} className="border-t border-border hover:bg-secondary/40 cursor-pointer" onClick={() => p.onOpenFace(f)}>
                    <td className="pl-4 py-3" onClick={(e) => e.stopPropagation()}><Checkbox aria-label="Seleccionar" checked={selected.includes(f.id)} onCheckedChange={(c) => setSelected((prev) => c ? [...prev, f.id] : prev.filter((x) => x !== f.id))} /></td>
                    <td className="px-2 py-3"><div className="font-semibold">{s.title}</div><div className="text-xs text-muted-foreground">{s.city}</div></td>
                    <td className="px-2 py-3 whitespace-nowrap">{normalizeFaceLabel(f.face_label, i).replace('Cara ', '')}{f.facing ? ` · ${facingText(f.facing).replace('Mira al ', '')}` : ''}</td>
                    <td className="px-2 py-3">${Number(f.price_per_month).toLocaleString('es-MX')}</td>
                    <td className="px-2 py-3">{f.daily_impressions ? f.daily_impressions.toLocaleString('es-MX') : '—'}</td>
                    <td className="px-2 py-3"><StatusChip s={st} /></td>
                    <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-3 text-xs font-semibold">
                        <button onClick={() => p.onEdit(f)} className="hover:underline">Editar</button>
                        <button onClick={() => p.onCalendar(f)} className="hover:underline">Calendario</button>
                        <button onClick={() => p.onPause(f)} className="hover:underline">{st.status === 'paused' ? 'Reactivar' : 'Pausar'}</button>
                      </div>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
        </>
      )}

      <PortfolioShareDialog open={shareOpen} onOpenChange={setShareOpen} userId={p.userId} preselected={shareFromList ? selected : []}
        items={structures.flatMap((st) => st.faces.map((f, i) => { const x = faceStatus(f, p.bookings); return { id: f.id, title: st.title, label: normalizeFaceLabel(f.face_label, i), status: x.status, until: x.until, price: Number(f.price_per_month) }; }))} />

      <SetFacingDialog open={!!facingFor} onOpenChange={(o) => !o && setFacingFor(null)} face={facingFor?.face || null} faces={facingFor?.faces || []} onSaved={p.onRefresh} />
      <AddFaceDialog open={!!addFaceFor} onOpenChange={(o) => !o && setAddFaceFor(null)} faces={addFaceFor?.faces || []} onSaved={p.onRefresh} />
    </div>
  );
};

export default OwnerPropertiesTab;

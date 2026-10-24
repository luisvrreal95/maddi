import React from 'react';
import { MoreHorizontal, Pencil, CalendarDays, Pause, Play, Trash2, Plus, MapPin } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Billboard } from '@/hooks/useBillboards';
import { facingText, normalizeFaceLabel } from '@/lib/billboardFaces';
import { cn } from '@/lib/utils';

export interface BookingRange { billboard_id: string; start_date: string; end_date: string }
export interface Structure { key: string; title: string; address: string; city: string; faces: Billboard[] }

export type FaceStatus = 'paused' | 'rented' | 'available' | 'inactive';
export const faceStatus = (b: Billboard, bookings: BookingRange[]): { status: FaceStatus; until?: Date } => {
  if (!b.is_available && b.pause_reason === 'owner') return { status: 'paused' };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const active = bookings.filter(x => x.billboard_id === b.id && new Date(x.start_date) <= today && new Date(x.end_date) >= today);
  if (active.length) return { status: 'rented', until: new Date(Math.max(...active.map(a => new Date(a.end_date).getTime()))) };
  if (!b.is_available) return { status: 'inactive' };
  return { status: 'available' };
};

const fmtMoney = (n: number) => `$${Number(n).toLocaleString('es-MX')}`;
const fmtDate = (d: Date) => d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });

export const StatusChip: React.FC<{ s: ReturnType<typeof faceStatus> }> = ({ s }) => {
  const map = {
    available: ['Disponible', 'bg-[#EAF9D6] text-[#2F7A00]'],
    rented: [`Rentada${s.until ? ' · ' + fmtDate(s.until) : ''}`, 'bg-[#FFF1CF] text-[#7A5200]'],
    paused: ['Pausada', 'bg-secondary text-muted-foreground'],
    inactive: ['No disponible', 'bg-secondary text-muted-foreground'],
  } as const;
  const [t, c] = map[s.status];
  return <span className={cn('text-[11px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap', c)}>{t}</span>;
};

/** Barra de 90 días: oscuro = rentada */
const NinetyDayBar: React.FC<{ id: string; bookings: BookingRange[] }> = ({ id, bookings }) => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const DAY = 86400000;
  const segs = bookings.filter(b => b.billboard_id === id).map(b => {
    const s = Math.max(0, (new Date(b.start_date).getTime() - start.getTime()) / DAY);
    const e = Math.min(90, (new Date(b.end_date).getTime() - start.getTime()) / DAY + 1);
    return { left: (s / 90) * 100, width: Math.max(0, ((e - s) / 90) * 100) };
  }).filter(x => x.width > 0);
  return (
    <div className="relative h-1.5 rounded-full bg-border overflow-hidden mt-2.5" title="Próximos 90 días · oscuro = rentada">
      {segs.map((x, i) => <span key={i} className="absolute top-0 h-full bg-[#33413a]" style={{ left: `${x.left}%`, width: `${x.width}%` }} />)}
    </div>
  );
};

interface Props {
  structure: Structure;
  bookings: BookingRange[];
  onOpenFace: (b: Billboard) => void;
  onEdit: (b: Billboard) => void;
  onPause: (b: Billboard) => void;
  onDelete: (b: Billboard) => void;
  onCalendar: (b: Billboard) => void;
  onAddFace: (s: Structure) => void;
}

const OwnerStructureCard: React.FC<Props> = ({ structure, bookings, onOpenFace, onEdit, onPause, onDelete, onCalendar, onAddFace }) => {
  const img = structure.faces[0].image_urls?.[0] || structure.faces[0].image_url;
  return (
    <div className="bg-card border border-border rounded-3xl overflow-hidden">
      <div className="relative h-36 bg-secondary">
        {img ? <img src={img} alt={structure.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><MapPin className="w-8 h-8 text-muted-foreground" /></div>}
        <span className="absolute right-3 top-3 text-[11px] font-semibold bg-white text-[#111] px-2.5 py-1 rounded-full">
          {structure.faces.length} {structure.faces.length === 1 ? 'cara' : 'caras'}
        </span>
      </div>
      <div className="p-4">
        <h3 className="text-base font-semibold text-foreground truncate">{structure.title}</h3>
        <p className="text-xs text-muted-foreground truncate">{structure.address}{structure.city ? `, ${structure.city}` : ''}</p>

        <div className="mt-3 space-y-2">
          {structure.faces.map((f, i) => {
            const st = faceStatus(f, bookings);
            const label = normalizeFaceLabel(f.face_label, i);
            return (
              <div key={f.id} className="border border-border rounded-xl px-3 py-2.5 cursor-pointer hover:bg-secondary/60 transition-colors" onClick={() => onOpenFace(f)}>
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center flex-none">{label.replace('Cara ', '')}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{fmtMoney(f.price_per_month)}<span className="font-normal text-muted-foreground">/mes</span></div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {[facingText(f.facing), f.daily_impressions ? `${f.daily_impressions.toLocaleString('es-MX')} vistas/día` : ''].filter(Boolean).join(' · ') || label}
                    </div>
                  </div>
                  <StatusChip s={st} />
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 rounded-full hover:bg-secondary text-muted-foreground" aria-label="Acciones"><MoreHorizontal className="w-4 h-4" /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="theme-light bg-card border-border">
                        <DropdownMenuItem onClick={() => onEdit(f)}><Pencil className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onCalendar(f)}><CalendarDays className="w-4 h-4 mr-2" />Calendario</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onPause(f)}>
                          {st.status === 'paused' ? <><Play className="w-4 h-4 mr-2" />Reactivar</> : <><Pause className="w-4 h-4 mr-2" />Pausar</>}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onDelete(f)} className="text-red-600"><Trash2 className="w-4 h-4 mr-2" />Eliminar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <NinetyDayBar id={f.id} bookings={bookings} />
              </div>
            );
          })}
          {structure.faces.length < 2 && (
            <button onClick={() => onAddFace(structure)} className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-3 text-sm font-semibold text-foreground hover:bg-secondary/60">
              <Plus className="w-4 h-4" />Agregar otra cara
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OwnerStructureCard;

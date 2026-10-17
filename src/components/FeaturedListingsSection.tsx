import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Monitor, Square, Footprints, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { HomeBillboards } from '@/hooks/useHomeBillboards';
import type { Billboard } from '@/hooks/useBillboards';
import Reveal from '@/components/Reveal';

const badges = ['Top tráfico', 'Zona comercial', 'Alta exposición'];

const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="flex items-center gap-2 text-sm font-semibold text-ink">
    <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.4)]" />
    {children}
  </p>
);

const formatAddress = (b: Billboard) => {
  if (!b.address) return b.city;
  return b.city && !b.address.toLowerCase().includes(b.city.toLowerCase())
    ? `${b.address}, ${b.city}`
    : b.address;
};

const ListingCard: React.FC<{ b: Billboard; badge: string; onClick: () => void }> = ({ b, badge, onClick }) => {
  const img = b.image_urls?.[0] || b.image_url;
  return (
    <article
      onClick={onClick}
      className="listing-card scan-card group h-full cursor-pointer overflow-hidden rounded-3xl border border-line-light bg-surface-card transition-all duration-[280ms] hover:-translate-y-2 hover:border-ink motion-reduce:hover:translate-y-0"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-surface-light">
        {img ? (
          <img
            src={img}
            alt={b.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-muted">
            <MapPin className="h-12 w-12" />
          </div>
        )}
        <span className="viewfinder pointer-events-none absolute left-4 top-4 z-10 h-[18px] w-[18px] border-l-2 border-t-2 border-primary" />
        <span className="viewfinder pointer-events-none absolute bottom-4 right-4 z-10 h-[18px] w-[18px] border-b-2 border-r-2 border-primary" />
        <span className="absolute right-4 top-4 z-10 rounded-full bg-ink px-3 py-1 text-xs font-semibold text-primary">
          {badge}
        </span>
      </div>
      <div className="p-6">
        <h3 className="text-xl font-semibold text-ink tracking-normal">{b.title}</h3>
        <p className="mt-1 truncate text-sm text-ink-muted">{formatAddress(b)}</p>
        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs text-ink-muted">Precio mensual</p>
            <p className="text-[32px] font-bold leading-tight text-ink tabular-nums">
              ${b.price_per_month.toLocaleString()}
              <span className="text-sm font-normal text-ink-muted"> /mes</span>
            </p>
          </div>
          {b.daily_impressions ? (
            <span className="whitespace-nowrap rounded-xl bg-primary px-3 py-1.5 text-sm font-semibold text-ink tabular-nums">
              +{b.daily_impressions.toLocaleString()} al día
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
};

const OwnerCTACard: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <div className="scan-card scan-card-dark relative flex h-full min-h-[420px] flex-col justify-between gap-8 overflow-hidden rounded-3xl border border-transparent bg-background p-8">
    <div className="hero-glow pointer-events-none absolute -right-32 -top-32 h-80 w-80" />
    <div className="relative">
      <p className="text-sm font-semibold text-primary">Para propietarios</p>
      <h3 className="mt-3 text-[28px] font-bold leading-tight text-foreground">
        ¿Tienes un espectacular? Publícalo gratis.
      </h3>
      <p className="mt-3 text-muted-foreground">
        Publica tu espacio y empieza a recibir solicitudes de anunciantes en tu ciudad.
      </p>
    </div>
    <button
      onClick={onClick}
      className="relative inline-flex w-fit items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
    >
      Publicar mi espectacular <ArrowRight className="h-4 w-4" />
    </button>
  </div>
);

const FeaturedListingsSection: React.FC<{ home: HomeBillboards }> = ({ home }) => {
  const navigate = useNavigate();
  const { available, isLoading, userCity } = home;
  const featured = available.slice(0, 2);
  // featured[0].city is unreliable (some records store other text there)
  const displayCity = userCity || 'Mexicali';
  const gridCls = 'grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))] max-sm:[grid-template-columns:1fr]';

  if (isLoading) {
    return (
      <section className="px-6 pt-20 max-sm:px-4 max-sm:pt-14 md:px-16">
        <div className="mx-auto max-w-7xl">
          <Skeleton className="mb-10 h-10 w-72 bg-line-light" />
          <div className={gridCls}>
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="aspect-[4/5] rounded-3xl bg-line-light" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (featured.length === 0) return <CategoriesSection />;

  const seeAll = (
    <button
      onClick={() => navigate('/search')}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink px-5 py-3 font-semibold text-ink transition-colors hover:bg-ink hover:text-surface-light"
    >
      Ver todos en el mapa →
    </button>
  );

  return (
    <section className="px-6 pt-20 max-sm:px-4 max-sm:pt-14 md:px-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <Eyebrow>Destacados</Eyebrow>
            <h2 className="mt-3 text-[40px] font-bold leading-tight text-ink max-sm:text-[28px]">
              Espectaculares en {displayCity}
            </h2>
          </div>
          <div className="max-md:hidden">{seeAll}</div>
        </div>

        <div className={gridCls}>
          {featured.map((b, idx) => (
            <Reveal key={b.id} delay={idx * 90}>
              <ListingCard b={b} badge={badges[idx % badges.length]} onClick={() => navigate(`/billboard/${b.id}`)} />
            </Reveal>
          ))}
          <Reveal delay={featured.length * 90}>
            <OwnerCTACard onClick={() => navigate('/auth?role=owner')} />
          </Reveal>
        </div>

        <div className="mt-8 md:hidden [&>button]:w-full">{seeAll}</div>
      </div>
    </section>
  );
};

const CategoriesSection: React.FC = () => {
  const navigate = useNavigate();
  const categories = [
    { label: 'Espectaculares', icon: MapPin, desc: 'Gran formato en avenidas principales' },
    { label: 'Pantallas LED', icon: Monitor, desc: 'Contenido digital dinámico' },
    { label: 'Muros', icon: Square, desc: 'Publicidad estática de alto impacto' },
    { label: 'Puentes Peatonales', icon: Footprints, desc: 'Visibilidad en zonas de alto tráfico' },
  ];

  return (
    <section className="px-6 pt-20 max-sm:px-4 max-sm:pt-14 md:px-16">
      <div className="mx-auto max-w-7xl">
        <Eyebrow>Categorías</Eyebrow>
        <h2 className="mt-3 text-[40px] font-bold leading-tight text-ink max-sm:text-[28px]">Explora por categoría</h2>
        <p className="mb-10 mt-2 text-ink-muted max-sm:mb-6 max-sm:text-sm">Encuentra el formato ideal para tu marca</p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 max-sm:gap-3">
          {categories.map((cat) => (
            <button
              key={cat.label}
              onClick={() => navigate(`/search?type=${encodeURIComponent(cat.label)}`)}
              className="flex flex-col items-start gap-3 rounded-2xl border border-line-light bg-surface-card p-6 text-left transition-colors hover:border-ink max-sm:p-4"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
                <cat.icon className="h-5 w-5 text-ink" />
              </span>
              <div>
                <h3 className="font-semibold text-ink tracking-normal max-sm:text-sm">{cat.label}</h3>
                <p className="mt-1 text-sm text-ink-muted max-sm:text-xs">{cat.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedListingsSection;

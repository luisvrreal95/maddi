import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBillboards } from '@/hooks/useBillboards';
import { MapPin, Eye, TrendingUp, Zap, Building2, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const badges = [
  { label: 'Top tráfico', icon: TrendingUp, color: 'bg-primary/20 text-primary' },
  { label: 'Zona comercial', icon: Building2, color: 'bg-blue-500/20 text-blue-400' },
  { label: 'Alta exposición', icon: Zap, color: 'bg-amber-500/20 text-amber-400' },
];

const FeaturedListingsSection: React.FC = () => {
  const navigate = useNavigate();
  const [userCity, setUserCity] = useState<string | undefined>(undefined);
  const [geoReady, setGeoReady] = useState(false);

  // Reverse geocode user's location to get their city
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoReady(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=es`
          );
          const data = await resp.json();
          const city = data?.address?.city || data?.address?.town || data?.address?.municipality;
          if (city) setUserCity(city);
        } catch { /* ignore */ }
        setGeoReady(true);
      },
      () => setGeoReady(true),
      { timeout: 5000 }
    );
  }, []);

  const { billboards, isLoading } = useBillboards(
    geoReady && userCity ? { city: userCity } : undefined
  );

  const featured = billboards.filter(b => b.is_available && !b.pause_reason).slice(0, 6);
  const displayCity = userCity || (featured.length > 0 ? featured[0].city : 'Mexicali');

  if (isLoading || !geoReady) {
    return (
      <section className="bg-[hsl(0,0%,8%)] py-20 px-6 md:px-16">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-10 w-64 mb-8 bg-white/10" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-80 rounded-2xl bg-white/5" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (featured.length === 0) {
    return <CategoriesSection />;
  }

  return (
    <section className="bg-[hsl(0,0%,8%)] py-20 px-6 md:px-16">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-white text-3xl md:text-4xl font-bold">
              Espectaculares destacados en{' '}
              <span className="text-primary">{displayCity}</span>
            </h2>
            <p className="text-white/40 mt-2">Ubicaciones estratégicas con alta visibilidad</p>
          </div>
          <button
            onClick={() => navigate('/search')}
            className="hidden md:flex items-center gap-1 text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Ver todos <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featured.map((b, idx) => {
            const badge = badges[idx % badges.length];
            const BadgeIcon = badge.icon;
            return (
              <article
                key={b.id}
                onClick={() => navigate(`/billboard/${b.id}`)}
                className="group cursor-pointer bg-[hsl(0,0%,13%)] rounded-2xl overflow-hidden border border-white/5 hover:border-white/15 transition-all duration-300 hover:translate-y-[-2px] hover:shadow-xl"
              >
                <div className="relative h-48 bg-[hsl(0,0%,18%)] overflow-hidden">
                  {b.image_url ? (
                    <img
                      src={b.image_url}
                      alt={b.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20">
                      <MapPin className="w-12 h-12" />
                    </div>
                  )}
                  <div className={`absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                    <BadgeIcon className="w-3 h-3" />
                    {badge.label}
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="text-white font-semibold text-lg group-hover:text-primary transition-colors">
                    {b.title}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1.5 text-white/40 text-sm">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="truncate">{b.address}, {b.city}</span>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                    <div>
                      <p className="text-white/40 text-xs">Precio mensual</p>
                      <p className="text-white font-bold text-xl">
                        ${b.price_per_month.toLocaleString()}
                        <span className="text-white/40 text-sm font-normal"> /mes</span>
                      </p>
                    </div>
                    {b.daily_impressions && (
                      <div className="text-right">
                        <p className="text-white/40 text-xs">Impresiones</p>
                        <div className="flex items-center gap-1 text-primary text-sm font-medium">
                          <Eye className="w-3.5 h-3.5" />
                          +{b.daily_impressions.toLocaleString()}/día
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <button
          onClick={() => navigate('/search')}
          className="mt-8 w-full md:hidden flex items-center justify-center gap-2 text-primary border border-primary/30 rounded-xl py-3 font-medium hover:bg-primary/5 transition-colors"
        >
          Ver todos los espacios <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
};

const CategoriesSection: React.FC = () => {
  const navigate = useNavigate();
  const categories = [
    { label: 'Espectaculares', icon: '🏗️', desc: 'Gran formato en avenidas principales' },
    { label: 'Pantallas LED', icon: '📺', desc: 'Contenido digital dinámico' },
    { label: 'Muros', icon: '🧱', desc: 'Publicidad estática de alto impacto' },
    { label: 'Puentes Peatonales', icon: '🌉', desc: 'Visibilidad en zonas de alto tráfico' },
  ];

  return (
    <section className="bg-[hsl(0,0%,8%)] py-20 px-6 md:px-16">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-white text-3xl md:text-4xl font-bold mb-3">
          Explora por categoría
        </h2>
        <p className="text-white/40 mb-10">Encuentra el formato ideal para tu marca</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <button
              key={cat.label}
              onClick={() => navigate(`/search?type=${encodeURIComponent(cat.label)}`)}
              className="group flex flex-col items-start gap-3 p-6 rounded-2xl bg-[hsl(0,0%,13%)] border border-white/5 hover:border-primary/30 hover:bg-[hsl(0,0%,15%)] transition-all duration-300"
            >
              <span className="text-3xl">{cat.icon}</span>
              <div>
                <h3 className="text-white font-semibold group-hover:text-primary transition-colors">{cat.label}</h3>
                <p className="text-white/40 text-sm mt-1">{cat.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedListingsSection;

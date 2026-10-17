import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, GitCompareArrows, Rocket, Camera, BellRing, Wallet, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type Role = 'advertiser' | 'owner';

interface Step {
  icon: React.ElementType;
  title: string;
  description: string;
}

const content: Record<Role, { label: string; steps: Step[]; cta: { text: string; to: string } }> = {
  advertiser: {
    label: 'Soy anunciante',
    steps: [
      { icon: Search, title: 'Explora el inventario', description: 'Busca espectaculares por zona, precio y tráfico real.' },
      { icon: GitCompareArrows, title: 'Compara y elige', description: 'Analiza métricas y el perfil comercial de cada ubicación.' },
      { icon: Rocket, title: 'Lanza tu campaña', description: 'Reserva las fechas y coordina con el propietario.' },
    ],
    cta: { text: 'Explorar espectaculares', to: '/search' },
  },
  owner: {
    label: 'Soy propietario',
    steps: [
      { icon: Camera, title: 'Registra tu espectacular', description: 'Sube fotos y datos de tu espacio. Publicar es gratis.' },
      { icon: BellRing, title: 'Recibe solicitudes', description: 'Los anunciantes te contactan directamente.' },
      { icon: Wallet, title: 'Genera ingresos', description: 'Cobra mensualmente por cada campaña.' },
    ],
    cta: { text: 'Publicar mi espectacular', to: '/auth?role=owner' },
  },
};

/** Three steps joined by a lime line that draws itself when the block enters the viewport. */
const StepsTimeline: React.FC<{ steps: Step[] }> = ({ steps }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || typeof IntersectionObserver === 'undefined') {
      setActive(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative grid gap-10 md:grid-cols-3 md:gap-6">
      {/* Line: horizontal on desktop (between first and last icon centers), vertical on mobile */}
      <div className="pointer-events-none absolute left-[16.66%] right-[16.66%] top-8 hidden h-px bg-border md:block">
        <div
          className="h-full origin-left bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.7)] transition-transform duration-[1400ms] ease-out motion-reduce:transition-none"
          style={{ transform: `scaleX(${active ? 1 : 0})` }}
        />
      </div>
      <div className="pointer-events-none absolute bottom-8 left-8 top-8 w-px bg-border md:hidden">
        <div
          className="h-full origin-top bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.7)] transition-transform duration-[1400ms] ease-out motion-reduce:transition-none"
          style={{ transform: `scaleY(${active ? 1 : 0})` }}
        />
      </div>

      {steps.map((step, i) => {
        const Icon = step.icon;
        return (
          <div key={step.title} className="relative flex gap-5 md:flex-col md:items-center md:gap-6 md:text-center">
            <div
              style={{ transitionDelay: active ? `${i * 650}ms` : '0ms' }}
              className={cn(
                'relative z-10 flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full border transition-all duration-500 motion-reduce:transition-none',
                active
                  ? 'border-primary bg-primary text-primary-foreground shadow-[0_0_30px_hsl(var(--primary)/0.35)]'
                  : 'border-border bg-card text-primary'
              )}
            >
              <Icon className="h-7 w-7" strokeWidth={2} />
            </div>
            <div className="min-w-0 pt-1 md:pt-0">
              <p className="text-sm font-medium text-muted-foreground">Paso {i + 1}</p>
              <h3 className="mt-1 text-xl font-semibold text-foreground tracking-normal">{step.title}</h3>
              <p className="mt-2 text-base leading-relaxed text-muted-foreground md:mx-auto md:max-w-[28ch]">
                {step.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const HowItWorksSection: React.FC = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>('advertiser');
  const current = content[role];

  return (
    <section className="bg-background px-6 py-24 max-md:py-16 max-sm:px-4">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <h2 className="mb-3 text-4xl font-bold text-foreground md:text-5xl max-sm:text-3xl">
            ¿Cómo funciona <span className="text-primary">Maddi</span>?
          </h2>
          <p className="text-lg text-muted-foreground max-sm:text-base">
            Elige tu rol y mira lo simple que es.
          </p>
        </div>

        <div className="mb-16 flex justify-center max-sm:mb-12">
          <div role="tablist" aria-label="Rol" className="inline-flex rounded-full border border-border bg-card p-1">
            {(Object.keys(content) as Role[]).map((r) => (
              <button
                key={r}
                role="tab"
                aria-selected={role === r}
                onClick={() => setRole(r)}
                className={cn(
                  'rounded-full px-5 py-2.5 text-sm font-semibold transition-colors max-sm:px-4',
                  role === r
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {content[r].label}
              </button>
            ))}
          </div>
        </div>

        {/* key remounts the timeline so the line redraws when switching role */}
        <StepsTimeline key={role} steps={current.steps} />

        <div className="mt-14 flex justify-center">
          <button
            onClick={() => navigate(current.cta.to)}
            className="inline-flex items-center gap-2 text-base font-semibold text-primary transition-colors hover:text-primary-hover"
          >
            {current.cta.text} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;

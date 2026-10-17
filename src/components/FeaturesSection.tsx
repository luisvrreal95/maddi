import React from 'react';

// Kept the 3 most important items. Removed: "Perfil comercial INEGI"
// (Análisis del entorno comercial basado en datos oficiales de INEGI).
const features = [
  {
    title: 'Datos reales de tráfico',
    description: 'Información verificada de flujo vehicular y peatonal para cada ubicación.',
  },
  {
    title: 'Optimiza tu inversión',
    description: 'Compara ubicaciones, precios y métricas para tomar la mejor decisión.',
  },
  {
    title: 'Reserva por fechas',
    description: 'Selecciona el periodo exacto de tu campaña y gestiona todo en línea.',
  },
];

const FeaturesSection: React.FC = () => {
  return (
    <section className="px-6 max-sm:px-4 md:px-16 mt-20">
      <div className="max-w-7xl mx-auto grid gap-8 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
        {features.map((f, i) => (
          <div key={f.title} className="border-t-2 border-ink pt-6">
            <span className="inline-flex rounded-full bg-primary px-2.5 py-0.5 text-[13px] font-semibold text-ink tabular-nums">
              {String(i + 1).padStart(2, '0')}
            </span>
            <h3 className="mt-4 text-lg font-semibold text-ink tracking-normal">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{f.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeaturesSection;

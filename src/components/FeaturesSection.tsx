import React from 'react';
import { BarChart3, Building2, TrendingUp, CalendarCheck } from 'lucide-react';

const features = [
  {
    icon: BarChart3,
    title: 'Datos reales de tráfico',
    description: 'Información verificada de flujo vehicular y peatonal para cada ubicación.',
  },
  {
    icon: Building2,
    title: 'Perfil comercial INEGI',
    description: 'Análisis del entorno comercial basado en datos oficiales de INEGI.',
  },
  {
    icon: TrendingUp,
    title: 'Optimiza tu inversión',
    description: 'Compara ubicaciones, precios y métricas para tomar la mejor decisión.',
  },
  {
    icon: CalendarCheck,
    title: 'Reserva por fechas',
    description: 'Selecciona el periodo exacto de tu campaña y gestiona todo en línea.',
  },
];

const FeaturesSection: React.FC = () => {
  return (
    <section className="bg-[hsl(0,0%,10%)] py-20 px-6 md:px-16">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-white text-3xl md:text-4xl font-bold">
            Todo lo que necesitas para{' '}
            <span className="text-primary">decidir mejor</span>
          </h2>
          <p className="text-white/40 mt-3 max-w-xl mx-auto">
            Herramientas inteligentes para que tu inversión en publicidad exterior rinda al máximo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="group flex flex-col items-start gap-4 p-6 rounded-2xl bg-[hsl(0,0%,13%)] border border-white/5 hover:border-primary/20 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <f.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-white font-semibold text-lg">{f.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;

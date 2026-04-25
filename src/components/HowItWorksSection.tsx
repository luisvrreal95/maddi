import React from 'react';
import { Building2, TrendingUp } from 'lucide-react';

interface Step {
  title: string;
  description: string;
}

interface RoleCardProps {
  icon: React.ReactNode;
  role: string;
  steps: Step[];
}

const RoleCard: React.FC<RoleCardProps> = ({ icon, role, steps }) => (
  <div className="flex-1 bg-[hsl(0,0%,10%)] border border-white/10 rounded-2xl p-8 max-sm:p-6 hover:border-[#9BFF43]/30 transition-colors">
    <div className="flex items-center gap-3 mb-8">
      <div className="w-12 h-12 rounded-xl bg-[#9BFF43]/10 flex items-center justify-center text-[#9BFF43]">
        {icon}
      </div>
      <h3 className="text-white text-2xl font-bold">{role}</h3>
    </div>
    <div className="flex flex-col gap-6">
      {steps.map((step, idx) => (
        <div key={idx} className="flex gap-4">
          <span className="text-[#9BFF43] text-3xl font-bold leading-none w-10 flex-shrink-0">
            {String(idx + 1).padStart(2, '0')}
          </span>
          <div>
            <h4 className="text-white text-base font-semibold mb-1">{step.title}</h4>
            <p className="text-white/50 text-sm leading-relaxed">{step.description}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const HowItWorksSection: React.FC = () => {
  return (
    <section className="bg-[#121212] py-24 max-md:py-16 px-6 max-sm:px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14 max-sm:mb-10">
          <h2 className="text-white text-4xl md:text-5xl font-bold mb-3 max-sm:text-3xl">
            ¿Cómo funciona <span className="text-[#9BFF43]">Maddi</span>?
          </h2>
          <p className="text-white/50 text-lg max-sm:text-sm">
            Un proceso simple para propietarios y anunciantes
          </p>
        </div>
        <div className="flex gap-6 max-md:flex-col">
          <RoleCard
            icon={<Building2 className="w-6 h-6" />}
            role="Propietarios"
            steps={[
              { title: 'Registra tu espectacular', description: 'Sube fotos y datos gratis' },
              { title: 'Recibe solicitudes', description: 'Los anunciantes te contactan' },
              { title: 'Genera ingresos', description: 'Cobra mensualmente' },
            ]}
          />
          <RoleCard
            icon={<TrendingUp className="w-6 h-6" />}
            role="Anunciantes"
            steps={[
              { title: 'Explora el inventario', description: 'Busca por zona, precio y tráfico' },
              { title: 'Compara y elige', description: 'Analiza métricas reales' },
              { title: 'Lanza tu campaña', description: 'Reserva y coordina con el propietario' },
            ]}
          />
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;

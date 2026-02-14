import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const OwnerCTASection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="bg-[hsl(0,0%,8%)] py-20 px-6 md:px-16">
      <div className="max-w-4xl mx-auto">
        <div className="relative bg-[hsl(0,0%,13%)] rounded-3xl p-10 md:p-16 text-center border border-white/5 overflow-hidden">
          {/* Subtle glow */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-40 bg-primary opacity-[0.06] blur-[80px] pointer-events-none" />

          <h2 className="text-white text-3xl md:text-4xl lg:text-5xl font-bold leading-tight relative z-10">
            ¿Tienes un espectacular?
          </h2>
          <p className="text-white/40 text-lg mt-4 mb-8 relative z-10 max-w-lg mx-auto">
            Publica tu propiedad y conecta con marcas que buscan el espacio ideal para su publicidad.
          </p>
          <button
            onClick={() => navigate('/auth?role=owner')}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold text-lg px-10 py-4 rounded-full hover:bg-primary/90 transition-colors relative z-10"
          >
            Publicar propiedad
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default OwnerCTASection;

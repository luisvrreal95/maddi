import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const EmptyCampaigns: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* Illustration */}
      <div className="relative mb-8">
        <div className="w-64 h-32 bg-muted/30 rounded-2xl flex items-center justify-center relative overflow-hidden">
          {/* Timeline visualization */}
          <div className="absolute inset-0 flex items-center px-8">
            <div className="flex-1 h-0.5 bg-muted-foreground/30" />
          </div>
          
          {/* Timeline nodes */}
          <div className="absolute left-8 w-4 h-4 rounded-full bg-muted-foreground/30 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
          </div>
          
          <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-2">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
          </div>
          
          <div className="absolute right-8 flex flex-col items-center">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-foreground mb-3">
        Lanza tu primera campaña
      </h2>
      
      <p className="text-muted-foreground max-w-md mb-8">
        Explora espectaculares en tu ciudad. Cuando reserves, tu campaña aparecerá aquí con métricas de impacto en tiempo real.
      </p>

      <Button asChild size="lg" className="gap-2 rounded-full px-8">
        <Link to="/search">
          <MapPin className="w-5 h-5" />
          Iniciar nueva campaña
          <ArrowRight className="w-4 h-4 ml-1" />
        </Link>
      </Button>
    </div>
  );
};

export default EmptyCampaigns;

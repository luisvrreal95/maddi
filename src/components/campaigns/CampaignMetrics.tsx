import React from 'react';
import { Users, Car, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface CampaignMetricsProps {
  totalImpressions: number;
  averageDaily: number;
  activeDays: number;
  totalDays: number;
}

const CampaignMetrics: React.FC<CampaignMetricsProps> = ({
  totalImpressions,
  averageDaily,
  activeDays,
  totalDays,
}) => {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toLocaleString();
  };

  return (
    <div className="grid grid-cols-3 gap-3">
      <Card className="p-4 text-center bg-card">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <p className="text-2xl font-bold text-foreground">{formatNumber(totalImpressions)}</p>
        <p className="text-xs text-muted-foreground">Personas impactadas</p>
      </Card>

      <Card className="p-4 text-center bg-card">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
          <Car className="w-5 h-5 text-primary" />
        </div>
        <p className="text-2xl font-bold text-foreground">{formatNumber(averageDaily)}</p>
        <p className="text-xs text-muted-foreground">Tráfico promedio/día</p>
      </Card>

      <Card className="p-4 text-center bg-card">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
          <Calendar className="w-5 h-5 text-primary" />
        </div>
        <p className="text-2xl font-bold text-foreground">{activeDays}/{totalDays}</p>
        <p className="text-xs text-muted-foreground">Días activos</p>
      </Card>
    </div>
  );
};

export default CampaignMetrics;

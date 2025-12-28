import React, { useState, useEffect } from 'react';
import { X, Eye, Car, Clock, Building2, MapPin, TrendingUp, Zap, Target } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { supabase } from '@/integrations/supabase/client';

interface PropertyDetailPanelProps {
  property: {
    id: string;
    name: string;
    address: string;
    price: string;
    viewsPerDay: string;
    pointsOfInterest: string;
    peakHours: string;
    size: string;
    status: string;
    availability: string;
    lat: number;
    lng: number;
    imageUrl?: string | null;
  };
  onClose: () => void;
  onReserve: () => void;
}

interface HourlyTraffic {
  hour: string;
  flow: number;
  isPeak: boolean;
}

const PropertyDetailPanel: React.FC<PropertyDetailPanelProps> = ({ property, onClose, onReserve }) => {
  const [hourlyData, setHourlyData] = useState<HourlyTraffic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roadType, setRoadType] = useState<string>('Avenida Principal');
  const [influenceRadius, setInfluenceRadius] = useState<number>(500);

  const viewsNumber = parseInt(property.viewsPerDay.replace(/[^0-9]/g, '')) || 0;

  useEffect(() => {
    // Generate hourly traffic data based on estimated views
    const generateHourlyData = (): HourlyTraffic[] => {
      const baseFlow = viewsNumber / 16; // Divide by active hours
      const hours = [];
      
      for (let i = 0; i < 24; i++) {
        let multiplier = 0.3; // Base for night hours
        let isPeak = false;
        
        // Morning rush (7-9 AM)
        if (i >= 7 && i <= 9) {
          multiplier = 1.5 + Math.random() * 0.5;
          isPeak = true;
        }
        // Midday (10 AM - 1 PM)
        else if (i >= 10 && i <= 13) {
          multiplier = 1.0 + Math.random() * 0.3;
        }
        // Lunch peak (1-3 PM)
        else if (i >= 13 && i <= 15) {
          multiplier = 1.3 + Math.random() * 0.4;
        }
        // Afternoon (3-5 PM)
        else if (i >= 15 && i <= 17) {
          multiplier = 1.1 + Math.random() * 0.3;
        }
        // Evening rush (5-8 PM)
        else if (i >= 17 && i <= 20) {
          multiplier = 1.6 + Math.random() * 0.5;
          isPeak = true;
        }
        // Night (8 PM - 10 PM)
        else if (i >= 20 && i <= 22) {
          multiplier = 0.7 + Math.random() * 0.2;
        }
        // Early morning (5-7 AM)
        else if (i >= 5 && i <= 7) {
          multiplier = 0.5 + Math.random() * 0.2;
        }
        
        hours.push({
          hour: `${i.toString().padStart(2, '0')}:00`,
          flow: Math.round(baseFlow * multiplier),
          isPeak
        });
      }
      
      return hours;
    };

    // Determine road type based on traffic volume
    const determineRoadType = () => {
      if (viewsNumber >= 50000) {
        setRoadType('Autopista / Boulevard');
        setInfluenceRadius(800);
      } else if (viewsNumber >= 30000) {
        setRoadType('Avenida Principal');
        setInfluenceRadius(500);
      } else if (viewsNumber >= 15000) {
        setRoadType('Avenida Secundaria');
        setInfluenceRadius(300);
      } else {
        setRoadType('Calle Local');
        setInfluenceRadius(200);
      }
    };

    setHourlyData(generateHourlyData());
    determineRoadType();
    setIsLoading(false);
  }, [viewsNumber]);

  // Calculate metrics
  const peakHour = hourlyData.reduce((max, curr) => curr.flow > max.flow ? curr : max, { hour: '08:00', flow: 0, isPeak: true });
  const avgFlow = hourlyData.length > 0 ? Math.round(hourlyData.reduce((sum, h) => sum + h.flow, 0) / hourlyData.length) : 0;
  const monthlyImpressions = viewsNumber * 30;
  const cpm = viewsNumber > 0 ? (parseInt(property.price.replace(/[^0-9]/g, '')) / (monthlyImpressions / 1000)).toFixed(2) : '0';

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-sm">
      <div className="h-full w-full max-w-lg bg-[#1A1A1A] overflow-y-auto animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#1A1A1A] border-b border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold text-lg">{property.name}</h2>
              <p className="text-white/60 text-sm flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {property.address}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Summary Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#2A2A2A] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-5 h-5 text-[#9BFF43]" />
                <span className="text-white/60 text-sm">Impresiones Mensuales</span>
              </div>
              <p className="text-white text-2xl font-bold">{formatNumber(monthlyImpressions)}</p>
            </div>
            <div className="bg-[#2A2A2A] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-blue-400" />
                <span className="text-white/60 text-sm">CPM Estimado</span>
              </div>
              <p className="text-white text-2xl font-bold">${cpm}</p>
            </div>
            <div className="bg-[#2A2A2A] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <span className="text-white/60 text-sm">Hora Pico</span>
              </div>
              <p className="text-white text-2xl font-bold">{peakHour.hour}</p>
            </div>
            <div className="bg-[#2A2A2A] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Car className="w-5 h-5 text-purple-400" />
                <span className="text-white/60 text-sm">Flujo Promedio/Hora</span>
              </div>
              <p className="text-white text-2xl font-bold">{formatNumber(avgFlow)}</p>
            </div>
          </div>

          {/* Hourly Traffic Chart */}
          <div className="bg-[#2A2A2A] rounded-xl p-4">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#9BFF43]" />
              Tráfico por Hora
            </h3>
            <div className="h-48">
              {isLoading ? (
                <div className="h-full flex items-center justify-center text-white/50">
                  Cargando...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyData}>
                    <defs>
                      <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#9BFF43" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#9BFF43" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="hour" 
                      tick={{ fill: '#fff', fontSize: 10, opacity: 0.5 }}
                      axisLine={false}
                      tickLine={false}
                      interval={3}
                    />
                    <YAxis 
                      tick={{ fill: '#fff', fontSize: 10, opacity: 0.5 }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#2A2A2A',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      formatter={(value: number) => [`${formatNumber(value)} vehículos`, 'Flujo']}
                    />
                    <Area
                      type="monotone"
                      dataKey="flow"
                      stroke="#9BFF43"
                      strokeWidth={2}
                      fill="url(#trafficGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex items-center justify-center gap-4 mt-3 text-xs text-white/50">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <span>Hora pico</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-[#9BFF43]" />
                <span>Tráfico normal</span>
              </div>
            </div>
          </div>

          {/* Area Context */}
          <div className="bg-[#2A2A2A] rounded-xl p-4">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-400" />
              Contexto del Área
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/60">Tipo de Vialidad</span>
                <span className="text-white font-medium">{roadType}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Radio de Influencia</span>
                <span className="text-white font-medium">{influenceRadius}m</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Tamaño</span>
                <span className="text-white font-medium">{property.size}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Iluminación</span>
                <span className="text-white font-medium">{property.status === 'Alto' ? 'LED / Digital' : 'Estándar'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">POIs Cercanos</span>
                <span className="text-[#9BFF43] font-medium">{property.pointsOfInterest}</span>
              </div>
            </div>
          </div>

          {/* Decision Metrics */}
          <div className="bg-gradient-to-br from-[#9BFF43]/20 to-transparent rounded-xl p-4 border border-[#9BFF43]/30">
            <h3 className="text-white font-semibold mb-3">Métricas para tu Decisión</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-white/70">Costo por 1,000 impresiones</span>
                <span className="text-white font-bold">${cpm} MXN</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Alcance mensual estimado</span>
                <span className="text-white font-bold">{formatNumber(monthlyImpressions * 0.7)} personas</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Frecuencia promedio</span>
                <span className="text-white font-bold">2.1x / persona</span>
              </div>
            </div>
          </div>

          {/* Price & CTA */}
          <div className="sticky bottom-0 bg-[#1A1A1A] border-t border-white/10 p-4 -mx-4 -mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-white/60 text-sm">Precio mensual</span>
                <p className="text-white text-2xl font-bold">{property.price}</p>
              </div>
              <div className="text-right">
                <span className="text-white/60 text-sm">Disponibilidad</span>
                <p className="text-[#9BFF43] font-medium">{property.availability}</p>
              </div>
            </div>
            <button
              onClick={onReserve}
              className="w-full py-3 rounded-xl bg-[#9BFF43] text-[#1A1A1A] font-bold hover:bg-[#8AE63A] transition-colors"
            >
              Reservar Ahora
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetailPanel;

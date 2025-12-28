import React from 'react';
import { X, Eye, Car, DollarSign, TrendingUp, MapPin, Zap, Check, Minus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface CompareProperty {
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
  imageUrl?: string | null;
}

interface ComparisonPanelProps {
  properties: CompareProperty[];
  onClose: () => void;
  onRemove: (id: string) => void;
  onReserve: (property: CompareProperty) => void;
}

const COLORS = ['#9BFF43', '#3B82F6', '#F59E0B', '#EC4899'];

const ComparisonPanel: React.FC<ComparisonPanelProps> = ({ 
  properties, 
  onClose, 
  onRemove,
  onReserve 
}) => {
  if (properties.length === 0) return null;

  // Parse numeric values for comparison
  const parseViews = (views: string) => parseInt(views.replace(/[^0-9]/g, '')) || 0;
  const parsePrice = (price: string) => parseInt(price.replace(/[^0-9]/g, '')) || 0;
  const parsePOIs = (pois: string) => parseInt(pois.replace(/[^0-9]/g, '')) || 0;

  // Calculate metrics for comparison
  const propertiesWithMetrics = properties.map(p => {
    const views = parseViews(p.viewsPerDay);
    const price = parsePrice(p.price);
    const pois = parsePOIs(p.pointsOfInterest);
    const monthlyImpressions = views * 30;
    const cpm = views > 0 ? price / (monthlyImpressions / 1000) : 0;
    
    return {
      ...p,
      viewsNum: views,
      priceNum: price,
      poisNum: pois,
      monthlyImpressions,
      cpm,
      // Score based on value (lower CPM = better)
      valueScore: cpm > 0 ? Math.round((1 / cpm) * 1000) : 0
    };
  });

  // Find best in each category
  const maxViews = Math.max(...propertiesWithMetrics.map(p => p.viewsNum));
  const minPrice = Math.min(...propertiesWithMetrics.map(p => p.priceNum));
  const maxPOIs = Math.max(...propertiesWithMetrics.map(p => p.poisNum));
  const maxValue = Math.max(...propertiesWithMetrics.map(p => p.valueScore));

  // Prepare chart data
  const viewsChartData = propertiesWithMetrics.map((p, idx) => ({
    name: p.name.substring(0, 15),
    value: p.viewsNum,
    color: COLORS[idx % COLORS.length]
  }));

  const priceChartData = propertiesWithMetrics.map((p, idx) => ({
    name: p.name.substring(0, 15),
    value: p.priceNum,
    color: COLORS[idx % COLORS.length]
  }));

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h2 className="text-white text-xl font-bold">Comparar Espectaculares</h2>
            <p className="text-white/60 text-sm">{properties.length} espectaculares seleccionados</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-4">
          {/* Property Cards Row */}
          <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: `repeat(${Math.min(properties.length, 4)}, 1fr)` }}>
            {propertiesWithMetrics.map((property, idx) => (
              <div 
                key={property.id} 
                className="bg-[#2A2A2A] rounded-xl overflow-hidden border-2"
                style={{ borderColor: COLORS[idx % COLORS.length] }}
              >
                {/* Image */}
                <div className="relative h-28 bg-[#3A3A3A]">
                  {property.imageUrl ? (
                    <img src={property.imageUrl} alt={property.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MapPin className="w-8 h-8 text-white/30" />
                    </div>
                  )}
                  <button
                    onClick={() => onRemove(property.id)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white/70 hover:text-white hover:bg-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div 
                    className="absolute bottom-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: COLORS[idx % COLORS.length], color: '#1A1A1A' }}
                  >
                    {idx + 1}
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <h4 className="text-white font-semibold text-sm truncate mb-1">{property.name}</h4>
                  <p className="text-white/50 text-xs truncate mb-3">{property.address}</p>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Vistas/día</span>
                      <span className={`font-bold ${property.viewsNum === maxViews ? 'text-[#9BFF43]' : 'text-white'}`}>
                        {property.viewsPerDay}
                        {property.viewsNum === maxViews && <Check className="inline w-3 h-3 ml-1" />}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Precio</span>
                      <span className={`font-bold ${property.priceNum === minPrice ? 'text-[#9BFF43]' : 'text-white'}`}>
                        {property.price}
                        {property.priceNum === minPrice && <Check className="inline w-3 h-3 ml-1" />}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">CPM</span>
                      <span className={`font-bold ${property.valueScore === maxValue ? 'text-[#9BFF43]' : 'text-white'}`}>
                        ${property.cpm.toFixed(2)}
                        {property.valueScore === maxValue && <Check className="inline w-3 h-3 ml-1" />}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">POIs</span>
                      <span className={`font-bold ${property.poisNum === maxPOIs ? 'text-[#9BFF43]' : 'text-white'}`}>
                        {property.pointsOfInterest}
                        {property.poisNum === maxPOIs && <Check className="inline w-3 h-3 ml-1" />}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onReserve(property)}
                    className="w-full mt-3 py-2 rounded-lg bg-[#9BFF43] text-[#1A1A1A] font-bold text-xs hover:bg-[#8AE63A] transition-colors"
                  >
                    Reservar
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Comparison Charts */}
          <div className="grid grid-cols-2 gap-4">
            {/* Views Comparison */}
            <div className="bg-[#2A2A2A] rounded-xl p-4">
              <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#9BFF43]" />
                Visibilidad (Vistas/Día)
              </h4>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={viewsChartData} layout="vertical">
                    <XAxis type="number" tick={{ fill: '#fff', fontSize: 10, opacity: 0.5 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#fff', fontSize: 10, opacity: 0.7 }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#2A2A2A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                      formatter={(value: number) => [formatNumber(value), 'Vistas']}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {viewsChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Price Comparison */}
            <div className="bg-[#2A2A2A] rounded-xl p-4">
              <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-400" />
                Precio Mensual
              </h4>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priceChartData} layout="vertical">
                    <XAxis type="number" tick={{ fill: '#fff', fontSize: 10, opacity: 0.5 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#fff', fontSize: 10, opacity: 0.7 }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#2A2A2A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                      formatter={(value: number) => [`$${formatNumber(value)}`, 'Precio']}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {priceChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="bg-[#2A2A2A] rounded-xl p-4 mt-4 overflow-x-auto">
            <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              Comparación Detallada
            </h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/60 border-b border-white/10">
                  <th className="text-left py-2 pr-4">Métrica</th>
                  {propertiesWithMetrics.map((p, idx) => (
                    <th key={p.id} className="text-center py-2 px-2">
                      <span style={{ color: COLORS[idx % COLORS.length] }}>#{idx + 1}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-white">
                <tr className="border-b border-white/5">
                  <td className="py-2 pr-4 text-white/70">Impresiones Mensuales</td>
                  {propertiesWithMetrics.map(p => (
                    <td key={p.id} className="text-center py-2 px-2 font-medium">
                      {formatNumber(p.monthlyImpressions)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 pr-4 text-white/70">CPM (Costo por Mil)</td>
                  {propertiesWithMetrics.map(p => (
                    <td key={p.id} className={`text-center py-2 px-2 font-medium ${p.valueScore === maxValue ? 'text-[#9BFF43]' : ''}`}>
                      ${p.cpm.toFixed(2)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 pr-4 text-white/70">Tamaño</td>
                  {propertiesWithMetrics.map(p => (
                    <td key={p.id} className="text-center py-2 px-2 font-medium">{p.size}</td>
                  ))}
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 pr-4 text-white/70">Horas Pico</td>
                  {propertiesWithMetrics.map(p => (
                    <td key={p.id} className="text-center py-2 px-2 font-medium">{p.peakHours}</td>
                  ))}
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 pr-4 text-white/70">Iluminación</td>
                  {propertiesWithMetrics.map(p => (
                    <td key={p.id} className="text-center py-2 px-2 font-medium">
                      {p.status === 'Alto' ? <Check className="inline w-4 h-4 text-[#9BFF43]" /> : <Minus className="inline w-4 h-4 text-white/30" />}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-white/70">Disponibilidad</td>
                  {propertiesWithMetrics.map(p => (
                    <td key={p.id} className="text-center py-2 px-2 font-medium text-[#9BFF43]">{p.availability}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Best Value Recommendation */}
          {propertiesWithMetrics.length > 1 && (
            <div className="bg-gradient-to-r from-[#9BFF43]/20 to-blue-500/20 rounded-xl p-4 mt-4 border border-[#9BFF43]/30">
              <div className="flex items-center gap-3">
                <Zap className="w-8 h-8 text-[#9BFF43]" />
                <div>
                  <h4 className="text-white font-bold">Mejor Valor</h4>
                  <p className="text-white/70 text-sm">
                    <span className="text-[#9BFF43] font-semibold">
                      {propertiesWithMetrics.find(p => p.valueScore === maxValue)?.name}
                    </span>
                    {' '}tiene el mejor CPM (${propertiesWithMetrics.find(p => p.valueScore === maxValue)?.cpm.toFixed(2)}) 
                    - mayor visibilidad por cada peso invertido.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComparisonPanel;

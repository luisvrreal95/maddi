import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BookingSuccessData {
  billboardTitle: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
}

interface BookingSuccessScreenProps {
  data: BookingSuccessData;
  onClose: () => void;
}

const BookingSuccessScreen: React.FC<BookingSuccessScreenProps> = ({ data, onClose }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center text-center py-4 animate-fade-in">
      {/* Animated checkmark */}
      <div className="relative mb-6">
        {/* Glow ring */}
        <div className="absolute inset-0 rounded-full bg-[#9BFF43]/20 animate-ping" style={{ animationDuration: '1.5s', animationIterationCount: '1' }} />
        <div
          className="relative w-20 h-20 rounded-full bg-[#9BFF43] flex items-center justify-center"
          style={{ animation: 'successPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
        >
          <svg
            className="w-10 h-10 text-[#1A1A1A]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline
              points="4 12 9 17 20 6"
              style={{
                strokeDasharray: 30,
                strokeDashoffset: 30,
                animation: 'checkDraw 0.4s ease-out 0.3s forwards',
              }}
            />
          </svg>
        </div>

        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-[#9BFF43]"
            style={{
              top: '50%',
              left: '50%',
              animation: `particle${i} 0.8s ease-out 0.2s forwards`,
              opacity: 0,
            }}
          />
        ))}
      </div>

      {/* Title */}
      <h2
        className="text-xl font-bold text-white mb-2"
        style={{ animation: 'fadeSlideUp 0.4s ease-out 0.4s both' }}
      >
        ¡Solicitud enviada!
      </h2>

      <div
        className="flex items-center gap-1.5 text-[#9BFF43] text-sm font-medium mb-5"
        style={{ animation: 'fadeSlideUp 0.4s ease-out 0.5s both' }}
      >
        <Sparkles className="w-4 h-4" />
        Tu campaña está en camino
      </div>

      {/* Summary card */}
      <div
        className="w-full bg-[#1A1A1A] rounded-xl p-4 mb-5 border border-white/10 text-left"
        style={{ animation: 'fadeSlideUp 0.4s ease-out 0.6s both' }}
      >
        <p className="text-white font-semibold text-sm mb-3">{data.billboardTitle}</p>
        <div className="flex items-center gap-2 text-white/60 text-xs mb-2">
          <Calendar className="w-3.5 h-3.5" />
          <span>{data.startDate} — {data.endDate}</span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-white/10">
          <span className="text-white/50 text-xs">Total estimado</span>
          <span className="text-[#9BFF43] font-bold text-sm">${data.totalPrice.toLocaleString()} MXN</span>
        </div>
      </div>

      {/* Message */}
      <p
        className="text-white/60 text-sm leading-relaxed mb-6 px-2"
        style={{ animation: 'fadeSlideUp 0.4s ease-out 0.7s both' }}
      >
        El propietario revisará tu solicitud y se pondrá en contacto contigo para coordinar detalles y pago.
      </p>

      {/* CTAs */}
      <div
        className="w-full space-y-2"
        style={{ animation: 'fadeSlideUp 0.4s ease-out 0.8s both' }}
      >
        <Button
          onClick={() => { onClose(); navigate('/business'); }}
          className="w-full bg-[#9BFF43] text-[#1A1A1A] hover:bg-[#8AE63A] font-semibold"
        >
          Ver mis campañas
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
        <Button
          variant="ghost"
          onClick={onClose}
          className="w-full text-white/60 hover:text-white hover:bg-white/5"
        >
          Seguir buscando
        </Button>
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes successPop {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes checkDraw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        ${[...Array(6)].map((_, i) => {
          const angle = (i * 60) * (Math.PI / 180);
          const x = Math.cos(angle) * 50;
          const y = Math.sin(angle) * 50;
          return `@keyframes particle${i} {
            0% { transform: translate(0, 0) scale(1); opacity: 1; }
            100% { transform: translate(${x}px, ${y}px) scale(0); opacity: 0; }
          }`;
        }).join('\n')}
      `}</style>
    </div>
  );
};

export default BookingSuccessScreen;

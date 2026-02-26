import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const STORAGE_KEY = 'maddi_promo_banner_dismissed';

const PromoBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  if (!visible) return null;

  return (
    <div className="relative bg-gradient-to-r from-[#0a0a0a] via-[#111a0e] to-[#0a0a0a] border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-center gap-3 text-sm">
        <a
          href="https://maddi.com.mx/auth?role=owner"
          className="flex items-center gap-2 md:gap-3 text-center"
        >
          <span className="bg-[#9BFF43] text-black text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
            Nuevo
          </span>
          <span className="text-white/80 text-xs md:text-sm">
            Lanzamiento 2026 — Comisión 0% en etapa inicial para Propietarios Fundadores
          </span>
          <span className="text-[#9BFF43] font-medium text-xs md:text-sm whitespace-nowrap">
            Conocer más →
          </span>
        </a>
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors p-1"
          aria-label="Cerrar banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default PromoBanner;

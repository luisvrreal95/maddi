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
    <div className="flex justify-center px-4 pt-4">
      <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.06] py-1.5 pl-3.5 pr-1.5 text-[13px] text-muted-foreground max-sm:text-xs">
        <span className="relative flex h-[7px] w-[7px] flex-shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
          <span className="relative inline-flex h-[7px] w-[7px] rounded-full bg-primary" />
        </span>
        <a href="https://maddi.com.mx/auth?role=owner" className="flex min-w-0 items-center">
          <span className="truncate max-sm:hidden">Lanzamiento 2026 · Comisión 0% para Propietarios Fundadores</span>
          <span className="truncate sm:hidden">0% comisión Fundadores</span>
          <span className="ml-2 font-semibold text-primary whitespace-nowrap">Conocer más →</span>
        </a>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Cerrar banner"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default PromoBanner;

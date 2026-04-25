import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const useCountUp = (target: number, start: boolean, duration = 1500) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    const startTime = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, start, duration]);
  return value;
};

const LiveStatsSection: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  const [billboards, setBillboards] = useState(0);
  const [advertisers, setAdvertisers] = useState(0);

  useEffect(() => {
    (async () => {
      const [{ count: bbCount }, { count: advCount }] = await Promise.all([
        supabase.from('billboards').select('*', { count: 'exact', head: true }).eq('is_available', true),
        supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'business'),
      ]);
      setBillboards(bbCount ?? 0);
      setAdvertisers(advCount ?? 0);
    })();
  }, []);

  useEffect(() => {
    if (!sectionRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setInView(true),
      { threshold: 0.3 }
    );
    obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  const bbValue = useCountUp(billboards, inView);
  const advValue = useCountUp(advertisers, inView);
  const cityValue = useCountUp(2, inView);

  const Stat = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center text-center">
      <span className="text-primary text-5xl md:text-6xl font-bold tabular-nums">
        {value}
      </span>
      <span className="text-white/60 text-sm md:text-base mt-2 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );

  return (
    <section ref={sectionRef} className="bg-background py-20 max-md:py-14 px-6 max-sm:px-4 border-y border-white/5">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-around gap-8 max-sm:gap-4 max-sm:flex-wrap">
          <Stat value={bbValue} label="Espectaculares" />
          <span className="text-white/20 text-3xl max-sm:hidden">·</span>
          <Stat value={cityValue} label="Ciudades" />
          <span className="text-white/20 text-3xl max-sm:hidden">·</span>
          <Stat value={advValue} label="Anunciantes" />
        </div>
      </div>
    </section>
  );
};

export default LiveStatsSection;

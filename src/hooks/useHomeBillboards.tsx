import { useEffect, useState } from 'react';
import { useBillboards } from '@/hooks/useBillboards';

/**
 * Single source of billboards for the home page (hero floating cards + featured).
 * Reverse-geocodes the user's city, then loads billboards once.
 */
export function useHomeBillboards() {
  const [userCity, setUserCity] = useState<string | undefined>(undefined);
  const [geoReady, setGeoReady] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoReady(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=es`
          );
          const data = await resp.json();
          const city = data?.address?.city || data?.address?.town || data?.address?.municipality;
          if (city) setUserCity(city);
        } catch { /* ignore */ }
        setGeoReady(true);
      },
      () => setGeoReady(true),
      { timeout: 5000 }
    );
  }, []);

  const { billboards, isLoading } = useBillboards(
    geoReady && userCity ? { city: userCity } : undefined
  );

  const available = billboards.filter(b => b.is_available && !b.pause_reason);

  return { available, isLoading: isLoading || !geoReady, userCity };
}

export type HomeBillboards = ReturnType<typeof useHomeBillboards>;

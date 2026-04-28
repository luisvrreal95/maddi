import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const CACHE_KEY = 'maddi_mapbox_token';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry {
  token: string;
  expiresAt: number;
}

interface MapboxTokenContextValue {
  token: string;
  isLoading: boolean;
}

const MapboxTokenContext = createContext<MapboxTokenContextValue>({ token: '', isLoading: true });

export function MapboxTokenProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Return cached token if still valid
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const entry: CacheEntry = JSON.parse(raw);
        if (entry.expiresAt > Date.now() && entry.token) {
          setToken(entry.token);
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // Corrupt cache — fall through to fetch
    }

    supabase.functions.invoke('get-mapbox-token')
      .then(({ data, error }) => {
        if (!error && data?.token) {
          setToken(data.token);
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
              token: data.token,
              expiresAt: Date.now() + CACHE_TTL_MS,
            }));
          } catch {
            // Storage quota exceeded — token still works in memory
          }
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <MapboxTokenContext.Provider value={{ token, isLoading }}>
      {children}
    </MapboxTokenContext.Provider>
  );
}

export function useMapboxToken(): MapboxTokenContextValue {
  return useContext(MapboxTokenContext);
}

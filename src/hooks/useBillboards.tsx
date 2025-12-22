import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Billboard {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  width_m: number;
  height_m: number;
  billboard_type: string;
  illumination: string;
  faces: number;
  daily_impressions: number | null;
  price_per_month: number;
  image_url: string | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface BillboardFilters {
  location?: string; // Search in city, state, or address
  city?: string;
  state?: string;
  minPrice?: number;
  maxPrice?: number;
  billboardType?: string;
  illumination?: string;
}

export function useBillboards(filters?: BillboardFilters) {
  const [billboards, setBillboards] = useState<Billboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchBillboards = async () => {
      try {
        setIsLoading(true);
        let query = supabase
          .from('billboards')
          .select('*')
          .eq('is_available', true);

        // Search across city, state, and address
        if (filters?.location) {
          query = query.or(
            `city.ilike.%${filters.location}%,state.ilike.%${filters.location}%,address.ilike.%${filters.location}%`
          );
        }
        if (filters?.city) {
          query = query.ilike('city', `%${filters.city}%`);
        }
        if (filters?.state) {
          query = query.ilike('state', `%${filters.state}%`);
        }
        if (filters?.minPrice) {
          query = query.gte('price_per_month', filters.minPrice);
        }
        if (filters?.maxPrice) {
          query = query.lte('price_per_month', filters.maxPrice);
        }
        if (filters?.billboardType) {
          query = query.eq('billboard_type', filters.billboardType);
        }
        if (filters?.illumination) {
          query = query.eq('illumination', filters.illumination);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;
        setBillboards(data || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBillboards();
  }, [filters?.location, filters?.city, filters?.state, filters?.minPrice, filters?.maxPrice, filters?.billboardType, filters?.illumination]);

  return { billboards, isLoading, error };
}

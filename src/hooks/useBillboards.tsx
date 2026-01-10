import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BillboardOwner {
  full_name: string;
  company_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_anonymous: boolean;
}

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
  image_urls: string[] | null;
  is_available: boolean;
  points_of_interest: string[] | null;
  created_at: string;
  updated_at: string;
  owner?: BillboardOwner;
}

export interface BillboardFilters {
  location?: string;
  city?: string;
  state?: string;
  minPrice?: number;
  maxPrice?: number;
  billboardType?: string;
  illumination?: string;
  bbox?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
}

export function useBillboards(filters?: BillboardFilters) {
  const [billboards, setBillboards] = useState<Billboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBillboards = useCallback(async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('billboards')
        .select('*')
        .eq('is_available', true);

      // Priority 1: Use bbox if available (most precise)
      if (filters?.bbox) {
        const [minLng, minLat, maxLng, maxLat] = filters.bbox;
        query = query
          .gte('latitude', minLat)
          .lte('latitude', maxLat)
          .gte('longitude', minLng)
          .lte('longitude', maxLng);
      }
      // Priority 2: Use structured city if available
      else if (filters?.city) {
        query = query.ilike('city', `%${filters.city}%`);
      }
      // Priority 3: Parse location to extract city name for filtering (fallback)
      else if (filters?.location) {
        // Extract city name from location string (e.g., "Mexicali, Baja California, México" -> "Mexicali")
        const locationParts = filters.location.split(',').map(s => s.trim());
        const cityName = locationParts[0];
        
        if (cityName && cityName.length > 1) {
          // Filter by partial city match (case insensitive)
          query = query.ilike('city', `%${cityName}%`);
        }
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

      // Fetch owner profiles for each billboard
      const billboardsWithOwners = await Promise.all(
        (data || []).map(async (billboard) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, company_name, phone, avatar_url, is_anonymous')
            .eq('user_id', billboard.owner_id)
            .single();

          // If owner is anonymous, don't include owner info
          const ownerInfo = profileData?.is_anonymous ? undefined : profileData;

          return {
            ...billboard,
            owner: ownerInfo || undefined
          };
        })
      );

      setBillboards(billboardsWithOwners);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [filters?.location, filters?.city, filters?.state, filters?.minPrice, filters?.maxPrice, filters?.billboardType, filters?.illumination, filters?.bbox]);

  useEffect(() => {
    fetchBillboards();
  }, [fetchBillboards]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('billboards-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'billboards'
        },
        (payload) => {
          console.log('Billboard change detected:', payload);
          // Refetch all billboards to ensure consistency with filters
          fetchBillboards();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBillboards]);

  return { billboards, isLoading, error, refetch: fetchBillboards };
}

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Review {
  id: string;
  billboard_id: string;
  booking_id: string;
  business_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  billboard?: {
    title: string;
    city: string;
    image_url: string | null;
  };
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
}

export function useReviews(billboardId?: string) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>({ averageRating: 0, totalReviews: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setIsLoading(true);
        
        let query = supabase
          .from('reviews')
          .select('*')
          .order('created_at', { ascending: false });

        if (billboardId) {
          query = query.eq('billboard_id', billboardId);
        }

        const { data, error } = await query;

        if (error) throw error;

        setReviews(data || []);

        // Calculate stats
        if (data && data.length > 0) {
          const totalRating = data.reduce((sum, r) => sum + r.rating, 0);
          setStats({
            averageRating: totalRating / data.length,
            totalReviews: data.length
          });
        } else {
          setStats({ averageRating: 0, totalReviews: 0 });
        }
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviews();
  }, [billboardId]);

  return { reviews, stats, isLoading };
}

export function useUserReviews() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReviews = async () => {
    if (!user) {
      setReviews([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          billboard:billboards(title, city, image_url)
        `)
        .eq('business_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to flatten billboard info
      const transformedData = (data || []).map(review => ({
        ...review,
        billboard: review.billboard ? {
          title: review.billboard.title,
          city: review.billboard.city,
          image_url: review.billboard.image_url
        } : undefined
      }));

      setReviews(transformedData);
    } catch (error) {
      console.error('Error fetching user reviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [user]);

  return { reviews, isLoading, refetch: fetchReviews };
}

export function useBillboardReviewStats() {
  const [statsMap, setStatsMap] = useState<Record<string, ReviewStats>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAllStats = async () => {
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('reviews')
          .select('billboard_id, rating');

        if (error) throw error;

        // Group by billboard_id and calculate stats
        const grouped: Record<string, number[]> = {};
        (data || []).forEach(review => {
          if (!grouped[review.billboard_id]) {
            grouped[review.billboard_id] = [];
          }
          grouped[review.billboard_id].push(review.rating);
        });

        const stats: Record<string, ReviewStats> = {};
        Object.entries(grouped).forEach(([billboardId, ratings]) => {
          const total = ratings.reduce((sum, r) => sum + r, 0);
          stats[billboardId] = {
            averageRating: total / ratings.length,
            totalReviews: ratings.length
          };
        });

        setStatsMap(stats);
      } catch (error) {
        console.error('Error fetching review stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllStats();
  }, []);

  return { statsMap, isLoading };
}

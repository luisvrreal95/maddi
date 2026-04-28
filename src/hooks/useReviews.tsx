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

export interface ReceivedReview {
  id: string;
  billboard_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  billboard: { title: string; city: string; image_url: string | null };
  reviewer_name: string;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
}

export function useReviews(billboardId?: string) {
  const { user } = useAuth();
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
        } else {
          // No billboard scope — restrict to current user's own reviews
          if (!user) {
            setReviews([]);
            setStats({ averageRating: 0, totalReviews: 0 });
            setIsLoading(false);
            return;
          }
          query = query.eq('business_id', user.id);
        }

        const { data, error } = await query;
        if (error) throw error;

        setReviews(data || []);

        if (data && data.length > 0) {
          const totalRating = data.reduce((sum, r) => sum + r.rating, 0);
          setStats({ averageRating: totalRating / data.length, totalReviews: data.length });
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
  }, [billboardId, user?.id]);

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

export function useOwnerReceivedReviews() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ReceivedReview[]>([]);
  const [stats, setStats] = useState<ReviewStats>({ averageRating: 0, totalReviews: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReceivedReviews = async () => {
      if (!user) {
        setReviews([]);
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);

        // Step 1: get billboard IDs owned by this user
        const { data: billboards, error: bErr } = await supabase
          .from('billboards')
          .select('id')
          .eq('owner_id', user.id);
        if (bErr) throw bErr;

        const ids = (billboards || []).map((b: { id: string }) => b.id);
        if (ids.length === 0) {
          setReviews([]);
          setStats({ averageRating: 0, totalReviews: 0 });
          setIsLoading(false);
          return;
        }

        // Step 2: get reviews for those billboards
        const { data, error } = await supabase
          .from('reviews')
          .select('id, billboard_id, rating, comment, created_at, business_id, billboard:billboards(title, city, image_url)')
          .in('billboard_id', ids)
          .order('created_at', { ascending: false });
        if (error) throw error;

        // Step 3: fetch reviewer names from profiles
        const businessIds = [...new Set((data || []).map((r: { business_id: string }) => r.business_id))];
        const nameMap: Record<string, string> = {};
        if (businessIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name, company_name')
            .in('user_id', businessIds);
          (profiles || []).forEach((p: { user_id: string; full_name: string | null; company_name: string | null }) => {
            nameMap[p.user_id] = p.company_name || p.full_name || 'Anunciante';
          });
        }

        const transformed: ReceivedReview[] = (data || []).map((r: {
          id: string; billboard_id: string; rating: number; comment: string | null;
          created_at: string; business_id: string;
          billboard: { title: string; city: string; image_url: string | null } | null;
        }) => ({
          id: r.id,
          billboard_id: r.billboard_id,
          rating: r.rating,
          comment: r.comment,
          created_at: r.created_at,
          billboard: r.billboard
            ? { title: r.billboard.title, city: r.billboard.city, image_url: r.billboard.image_url }
            : { title: 'Espectacular', city: '', image_url: null },
          reviewer_name: nameMap[r.business_id] || 'Anunciante',
        }));

        setReviews(transformed);
        if (transformed.length > 0) {
          const total = transformed.reduce((s, r) => s + r.rating, 0);
          setStats({ averageRating: total / transformed.length, totalReviews: transformed.length });
        } else {
          setStats({ averageRating: 0, totalReviews: 0 });
        }
      } catch (err) {
        console.error('[useOwnerReceivedReviews]', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReceivedReviews();
  }, [user?.id]);

  return { reviews, stats, isLoading };
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

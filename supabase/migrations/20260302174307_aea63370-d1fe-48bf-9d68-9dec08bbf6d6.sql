
-- Drop and recreate foreign keys with CASCADE for all tables referencing billboards

-- bookings
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_billboard_id_fkey;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_billboard_id_fkey 
  FOREIGN KEY (billboard_id) REFERENCES public.billboards(id) ON DELETE CASCADE;

-- traffic_data
ALTER TABLE public.traffic_data DROP CONSTRAINT IF EXISTS traffic_data_billboard_id_fkey;
ALTER TABLE public.traffic_data ADD CONSTRAINT traffic_data_billboard_id_fkey 
  FOREIGN KEY (billboard_id) REFERENCES public.billboards(id) ON DELETE CASCADE;

-- blocked_dates
ALTER TABLE public.blocked_dates DROP CONSTRAINT IF EXISTS blocked_dates_billboard_id_fkey;
ALTER TABLE public.blocked_dates ADD CONSTRAINT blocked_dates_billboard_id_fkey 
  FOREIGN KEY (billboard_id) REFERENCES public.billboards(id) ON DELETE CASCADE;

-- favorites
ALTER TABLE public.favorites DROP CONSTRAINT IF EXISTS favorites_billboard_id_fkey;
ALTER TABLE public.favorites ADD CONSTRAINT favorites_billboard_id_fkey 
  FOREIGN KEY (billboard_id) REFERENCES public.billboards(id) ON DELETE CASCADE;

-- conversations
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_billboard_id_fkey;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_billboard_id_fkey 
  FOREIGN KEY (billboard_id) REFERENCES public.billboards(id) ON DELETE CASCADE;

-- inegi_demographics
ALTER TABLE public.inegi_demographics DROP CONSTRAINT IF EXISTS inegi_demographics_billboard_id_fkey;
ALTER TABLE public.inegi_demographics ADD CONSTRAINT inegi_demographics_billboard_id_fkey 
  FOREIGN KEY (billboard_id) REFERENCES public.billboards(id) ON DELETE CASCADE;

-- poi_overview_cache
ALTER TABLE public.poi_overview_cache DROP CONSTRAINT IF EXISTS poi_overview_cache_billboard_id_fkey;
ALTER TABLE public.poi_overview_cache ADD CONSTRAINT poi_overview_cache_billboard_id_fkey 
  FOREIGN KEY (billboard_id) REFERENCES public.billboards(id) ON DELETE CASCADE;

-- pricing_overrides
ALTER TABLE public.pricing_overrides DROP CONSTRAINT IF EXISTS pricing_overrides_billboard_id_fkey;
ALTER TABLE public.pricing_overrides ADD CONSTRAINT pricing_overrides_billboard_id_fkey 
  FOREIGN KEY (billboard_id) REFERENCES public.billboards(id) ON DELETE CASCADE;

-- reviews
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_billboard_id_fkey;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_billboard_id_fkey 
  FOREIGN KEY (billboard_id) REFERENCES public.billboards(id) ON DELETE CASCADE;

-- notifications
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_related_billboard_id_fkey;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_related_billboard_id_fkey 
  FOREIGN KEY (related_billboard_id) REFERENCES public.billboards(id) ON DELETE SET NULL;

-- api_usage_logs
ALTER TABLE public.api_usage_logs DROP CONSTRAINT IF EXISTS api_usage_logs_billboard_id_fkey;
ALTER TABLE public.api_usage_logs ADD CONSTRAINT api_usage_logs_billboard_id_fkey 
  FOREIGN KEY (billboard_id) REFERENCES public.billboards(id) ON DELETE SET NULL;

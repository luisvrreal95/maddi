
-- Create private bucket for campaign design uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('campaign-designs', 'campaign-designs', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']);

-- Business users can upload their own designs (folder = user_id)
CREATE POLICY "Business can upload designs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'campaign-designs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Authenticated users can view designs (access controlled by bookings RLS)
CREATE POLICY "Authenticated can view designs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'campaign-designs'
  AND auth.role() = 'authenticated'
);

-- Users can delete their own designs
CREATE POLICY "Users can delete own designs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'campaign-designs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own designs
CREATE POLICY "Users can update own designs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'campaign-designs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

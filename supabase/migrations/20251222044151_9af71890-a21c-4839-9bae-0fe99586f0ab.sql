-- Create storage bucket for billboard images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'billboard-images', 
  'billboard-images', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Policy: Anyone can view billboard images (public bucket)
CREATE POLICY "Anyone can view billboard images"
ON storage.objects FOR SELECT
USING (bucket_id = 'billboard-images');

-- Policy: Owners can upload images to their folder
CREATE POLICY "Owners can upload billboard images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'billboard-images' 
  AND auth.uid() IS NOT NULL
  AND public.has_role(auth.uid(), 'owner')
);

-- Policy: Owners can update their own images
CREATE POLICY "Owners can update their billboard images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'billboard-images' 
  AND auth.uid() IS NOT NULL
  AND public.has_role(auth.uid(), 'owner')
);

-- Policy: Owners can delete their own images
CREATE POLICY "Owners can delete their billboard images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'billboard-images' 
  AND auth.uid() IS NOT NULL
  AND public.has_role(auth.uid(), 'owner')
);
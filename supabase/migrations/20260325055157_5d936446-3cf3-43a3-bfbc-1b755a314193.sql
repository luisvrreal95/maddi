
-- Allow admins to upload images to billboard-images bucket
CREATE POLICY "Admins can upload billboard images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'billboard-images'
  AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
);

-- Allow admins to delete billboard images
CREATE POLICY "Admins can delete billboard images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'billboard-images'
  AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
);

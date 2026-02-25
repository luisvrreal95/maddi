-- Drop existing restrictive policies for billboard-images INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Owners can upload billboard images" ON storage.objects;
DROP POLICY IF EXISTS "Owners can update their billboard images" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete their billboard images" ON storage.objects;

-- Recreate with folder-level restriction
CREATE POLICY "Owners can upload billboard images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'billboard-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Owners can update their billboard images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'billboard-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Owners can delete their billboard images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'billboard-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
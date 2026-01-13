-- Create private bucket for verification documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-docs', 'verification-docs', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for verification-docs bucket
-- Allow authenticated users to upload their own verification documents
CREATE POLICY "Users can upload their own verification docs"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'verification-docs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their own verification documents
CREATE POLICY "Users can view their own verification docs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'verification-docs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own verification documents
CREATE POLICY "Users can delete their own verification docs"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'verification-docs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow admins to view all verification documents
CREATE POLICY "Admins can view all verification docs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'verification-docs' 
  AND EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);
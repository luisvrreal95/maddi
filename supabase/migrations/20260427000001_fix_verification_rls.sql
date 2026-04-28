-- Fix 1: Replace USING(true) admin policy on verification_requests with proper admin check
DROP POLICY IF EXISTS "Admin can read all verifications" ON verification_requests;

CREATE POLICY "Admin can manage all verifications"
  ON verification_requests FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

-- Fix 2: Storage policies for the 'verifications' bucket
-- (The previous migration dropped these but never recreated them for the new bucket)

DROP POLICY IF EXISTS "Owners can upload own verification docs" ON storage.objects;
DROP POLICY IF EXISTS "Owners can view own verification docs" ON storage.objects;
DROP POLICY IF EXISTS "Owners can read own verification docs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all verification docs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can read all verification docs" ON storage.objects;

-- Owners upload their own documents (folder must match their user_id)
CREATE POLICY "Owners can upload own verification docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'verifications'
    AND auth.uid() IS NOT NULL
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Owners can view (signed URL generation) their own documents
CREATE POLICY "Owners can read own verification docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'verifications'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Owners can overwrite their own documents (upsert: true in upload)
CREATE POLICY "Owners can update own verification docs"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'verifications'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Admins can view all verification documents
CREATE POLICY "Admins can read all verification docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'verifications'
    AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

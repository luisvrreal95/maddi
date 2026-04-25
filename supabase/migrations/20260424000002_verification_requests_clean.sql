-- Drop previous policies if they exist (idempotent re-run)
DROP POLICY IF EXISTS "Users can view own verification requests" ON public.verification_requests;
DROP POLICY IF EXISTS "Users can insert own verification requests" ON public.verification_requests;
DROP POLICY IF EXISTS "Admins can manage all verification requests" ON public.verification_requests;
DROP POLICY IF EXISTS "Users can insert own verification" ON verification_requests;
DROP POLICY IF EXISTS "Users can read own verification" ON verification_requests;
DROP POLICY IF EXISTS "Admin can read all verifications" ON verification_requests;
DROP POLICY IF EXISTS "Owners can upload own verification docs" ON storage.objects;
DROP POLICY IF EXISTS "Owners can view own verification docs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all verification docs" ON storage.objects;

-- Create verification_requests table
CREATE TABLE IF NOT EXISTS verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ine_front_url text NOT NULL,
  ine_back_url text NOT NULL,
  rfc text,
  address_proof_url text,
  status text DEFAULT 'pending',
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own verification"
  ON verification_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own verification"
  ON verification_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can read all verifications"
  ON verification_requests FOR ALL
  USING (true);

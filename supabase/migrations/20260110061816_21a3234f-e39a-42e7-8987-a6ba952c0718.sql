-- Add identity verification fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'none' CHECK (verification_status IN ('none', 'pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS verification_document_url text,
ADD COLUMN IF NOT EXISTS verification_document_type text,
ADD COLUMN IF NOT EXISTS verification_submitted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS verification_reviewed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS verification_reviewed_by uuid,
ADD COLUMN IF NOT EXISTS verification_notes text;

-- Create index for faster verification queries
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status ON public.profiles(verification_status);

-- Add RLS policy for admins to update verification status
CREATE POLICY "Admins can update profile verification"
ON public.profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid()
  )
);
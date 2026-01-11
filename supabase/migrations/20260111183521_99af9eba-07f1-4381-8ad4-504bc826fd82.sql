-- Fix: Allow users to insert their own role during signup (even before email confirmation)
-- The auth.uid() is available even for unconfirmed users in Supabase

-- Drop existing insert policy
DROP POLICY IF EXISTS "Users can insert their own role on signup" ON public.user_roles;

-- Create new policy that allows inserts for authenticated users (confirmed or not)
-- Uses the raw_user_meta_data to get the user_id from the JWT
CREATE POLICY "Users can insert their own role on signup"
ON public.user_roles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Also create a policy to allow the signup function to work
-- This creates a more permissive insert that checks the user_id matches
CREATE POLICY "Allow authenticated users to insert own role"
ON public.user_roles
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);
-- Fix the overly permissive policy on admin_invitations
-- Drop the "Anyone can view invitation by token" policy and replace with a more secure one
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.admin_invitations;

-- This policy allows reading invitations only by matching email (for the acceptance flow)
-- Since the acceptance will be done via edge function with service role, we don't need public access
-- The edge function will verify the token serverside
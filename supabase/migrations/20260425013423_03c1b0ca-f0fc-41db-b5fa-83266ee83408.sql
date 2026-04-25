CREATE POLICY "Admins can view all verification requests"
ON public.verification_requests
FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.user_id = auth.uid()));
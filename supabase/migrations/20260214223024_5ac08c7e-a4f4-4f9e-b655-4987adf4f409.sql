-- Allow admins to update any billboard
CREATE POLICY "Admins can update all billboards"
ON public.billboards
FOR UPDATE
USING (EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid()));
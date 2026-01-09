-- Fix RLS recursion on admin_users caused by policies that reference admin_users inside admin_users policies
-- The policy "Admins can view admin users" uses a subquery on admin_users, which triggers infinite recursion.

DROP POLICY IF EXISTS "Admins can view admin users" ON public.admin_users;

-- Keep least-privilege access model:
-- - any admin can read their own admin record (already exists)
-- - super admins can read/update/delete all admin records (already exists)

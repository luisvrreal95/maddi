-- Add role + email + timestamps to admin_users
ALTER TABLE public.admin_users
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'admin',
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

-- Backfill existing rows as super_admin (bootstrap)
UPDATE public.admin_users
SET role = 'super_admin'
WHERE role IS NULL OR role = 'admin';

-- Constrain role values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'admin_users_role_check'
  ) THEN
    ALTER TABLE public.admin_users
    ADD CONSTRAINT admin_users_role_check
    CHECK (role IN ('super_admin', 'admin'));
  END IF;
END
$$;

-- Enable Row Level Security
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Helper function to check super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = _user_id
      AND role = 'super_admin'
  )
$$;

-- Policies
DROP POLICY IF EXISTS "Admin users can read own admin record" ON public.admin_users;
CREATE POLICY "Admin users can read own admin record"
ON public.admin_users
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admins can read all admin records" ON public.admin_users;
CREATE POLICY "Super admins can read all admin records"
ON public.admin_users
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can create admin records" ON public.admin_users;
CREATE POLICY "Super admins can create admin records"
ON public.admin_users
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can update admin records" ON public.admin_users;
CREATE POLICY "Super admins can update admin records"
ON public.admin_users
FOR UPDATE
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can delete admin records" ON public.admin_users;
CREATE POLICY "Super admins can delete admin records"
ON public.admin_users
FOR DELETE
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_admin_users_updated_at ON public.admin_users;
CREATE TRIGGER trg_admin_users_updated_at
BEFORE UPDATE ON public.admin_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
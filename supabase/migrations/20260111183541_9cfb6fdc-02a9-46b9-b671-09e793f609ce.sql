-- Create a trigger to automatically create user role from metadata when user confirms email
-- This solves the RLS issue by having the role created by a SECURITY DEFINER function

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user has role in metadata and doesn't have a role yet
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    -- Check if role already exists
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, (NEW.raw_user_meta_data->>'role')::public.app_role);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;

-- Create trigger that fires on insert (new signup)
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Also update the existing insert policies to be cleaner
DROP POLICY IF EXISTS "Users can insert their own role on signup" ON public.user_roles;
DROP POLICY IF EXISTS "Allow authenticated users to insert own role" ON public.user_roles;

-- Allow service role / trigger to insert roles (the trigger uses SECURITY DEFINER so it bypasses RLS)
-- But also allow authenticated users to insert their own role as fallback
CREATE POLICY "Users can insert own role"
ON public.user_roles
FOR INSERT
WITH CHECK (auth.uid() = user_id);
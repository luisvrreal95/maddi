-- Enable realtime for billboards table
ALTER PUBLICATION supabase_realtime ADD TABLE public.billboards;

-- Create RLS policy to allow viewing owner profiles for billboards
CREATE POLICY "Anyone can view billboard owner profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.billboards 
    WHERE billboards.owner_id = profiles.user_id 
    AND billboards.is_available = true
  )
);
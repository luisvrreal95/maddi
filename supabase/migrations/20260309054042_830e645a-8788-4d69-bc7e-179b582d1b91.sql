
CREATE TABLE public.spectacular_valuation_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  city text,
  location_coordinates jsonb,
  structure_type text,
  size text,
  is_currently_rented text,
  estimated_value_min numeric,
  estimated_value_max numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.spectacular_valuation_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can insert leads" ON public.spectacular_valuation_leads
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view leads" ON public.spectacular_valuation_leads
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid())
  );

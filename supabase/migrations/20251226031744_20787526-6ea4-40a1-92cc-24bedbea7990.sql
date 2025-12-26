-- Create pricing_overrides table for custom pricing by date range
CREATE TABLE public.pricing_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  billboard_id UUID NOT NULL REFERENCES public.billboards(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  price_per_month NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Create blocked_dates table for unavailable periods
CREATE TABLE public.blocked_dates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  billboard_id UUID NOT NULL REFERENCES public.billboards(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_blocked_range CHECK (end_date >= start_date)
);

-- Enable RLS on both tables
ALTER TABLE public.pricing_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;

-- Policies for pricing_overrides: Only owners can manage their billboard pricing
CREATE POLICY "Owners can view their pricing overrides"
  ON public.pricing_overrides FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.billboards
    WHERE billboards.id = pricing_overrides.billboard_id
    AND billboards.owner_id = auth.uid()
  ));

CREATE POLICY "Owners can insert pricing overrides"
  ON public.pricing_overrides FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.billboards
    WHERE billboards.id = pricing_overrides.billboard_id
    AND billboards.owner_id = auth.uid()
  ));

CREATE POLICY "Owners can update their pricing overrides"
  ON public.pricing_overrides FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.billboards
    WHERE billboards.id = pricing_overrides.billboard_id
    AND billboards.owner_id = auth.uid()
  ));

CREATE POLICY "Owners can delete their pricing overrides"
  ON public.pricing_overrides FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.billboards
    WHERE billboards.id = pricing_overrides.billboard_id
    AND billboards.owner_id = auth.uid()
  ));

-- Policies for blocked_dates: Only owners can manage their billboard blocked dates
CREATE POLICY "Owners can view their blocked dates"
  ON public.blocked_dates FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.billboards
    WHERE billboards.id = blocked_dates.billboard_id
    AND billboards.owner_id = auth.uid()
  ));

CREATE POLICY "Owners can insert blocked dates"
  ON public.blocked_dates FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.billboards
    WHERE billboards.id = blocked_dates.billboard_id
    AND billboards.owner_id = auth.uid()
  ));

CREATE POLICY "Owners can update their blocked dates"
  ON public.blocked_dates FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.billboards
    WHERE billboards.id = blocked_dates.billboard_id
    AND billboards.owner_id = auth.uid()
  ));

CREATE POLICY "Owners can delete their blocked dates"
  ON public.blocked_dates FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.billboards
    WHERE billboards.id = blocked_dates.billboard_id
    AND billboards.owner_id = auth.uid()
  ));

-- Businesses can view blocked dates for available billboards
CREATE POLICY "Businesses can view blocked dates for available billboards"
  ON public.blocked_dates FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.billboards
    WHERE billboards.id = blocked_dates.billboard_id
    AND billboards.is_available = true
  ));

-- Businesses can view pricing overrides for available billboards
CREATE POLICY "Businesses can view pricing for available billboards"
  ON public.pricing_overrides FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.billboards
    WHERE billboards.id = pricing_overrides.billboard_id
    AND billboards.is_available = true
  ));

-- Add triggers for updated_at
CREATE TRIGGER update_pricing_overrides_updated_at
  BEFORE UPDATE ON public.pricing_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
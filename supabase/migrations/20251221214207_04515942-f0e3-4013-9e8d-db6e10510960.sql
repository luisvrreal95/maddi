-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('owner', 'business');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  company_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create billboards table
CREATE TABLE public.billboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  width_m DECIMAL(5, 2) NOT NULL,
  height_m DECIMAL(5, 2) NOT NULL,
  billboard_type TEXT NOT NULL DEFAULT 'espectacular',
  illumination TEXT NOT NULL DEFAULT 'ninguna',
  faces INTEGER NOT NULL DEFAULT 1,
  daily_impressions INTEGER,
  price_per_month DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billboard_id UUID NOT NULL REFERENCES public.billboards(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  ad_design_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- User roles policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own role on signup"
ON public.user_roles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Billboards policies
CREATE POLICY "Anyone can view available billboards"
ON public.billboards FOR SELECT
USING (is_available = true);

CREATE POLICY "Owners can view all their billboards"
ON public.billboards FOR SELECT
USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert their billboards"
ON public.billboards FOR INSERT
WITH CHECK (auth.uid() = owner_id AND public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can update their billboards"
ON public.billboards FOR UPDATE
USING (auth.uid() = owner_id AND public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can delete their billboards"
ON public.billboards FOR DELETE
USING (auth.uid() = owner_id AND public.has_role(auth.uid(), 'owner'));

-- Bookings policies
CREATE POLICY "Businesses can view their own bookings"
ON public.bookings FOR SELECT
USING (auth.uid() = business_id);

CREATE POLICY "Owners can view bookings for their billboards"
ON public.bookings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.billboards
    WHERE billboards.id = bookings.billboard_id
    AND billboards.owner_id = auth.uid()
  )
);

CREATE POLICY "Businesses can create bookings"
ON public.bookings FOR INSERT
WITH CHECK (auth.uid() = business_id AND public.has_role(auth.uid(), 'business'));

CREATE POLICY "Businesses can update their pending bookings"
ON public.bookings FOR UPDATE
USING (auth.uid() = business_id AND status = 'pending');

CREATE POLICY "Owners can update bookings for their billboards"
ON public.bookings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.billboards
    WHERE billboards.id = bookings.billboard_id
    AND billboards.owner_id = auth.uid()
  )
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_billboards_updated_at
BEFORE UPDATE ON public.billboards
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''));
  RETURN NEW;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
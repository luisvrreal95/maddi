-- Create reviews table for businesses to rate billboards after use
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  billboard_id UUID NOT NULL REFERENCES public.billboards(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  business_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(booking_id) -- One review per booking
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Businesses can view all reviews
CREATE POLICY "Anyone can view reviews"
ON public.reviews
FOR SELECT
USING (true);

-- Businesses can create reviews only for their completed bookings
CREATE POLICY "Businesses can create reviews for their completed bookings"
ON public.reviews
FOR INSERT
WITH CHECK (
  auth.uid() = business_id 
  AND EXISTS (
    SELECT 1 FROM public.bookings 
    WHERE bookings.id = reviews.booking_id 
    AND bookings.business_id = auth.uid()
    AND bookings.status = 'completed'
  )
);

-- Businesses can update their own reviews
CREATE POLICY "Businesses can update their own reviews"
ON public.reviews
FOR UPDATE
USING (auth.uid() = business_id);

-- Businesses can delete their own reviews
CREATE POLICY "Businesses can delete their own reviews"
ON public.reviews
FOR DELETE
USING (auth.uid() = business_id);

-- Create index for faster queries
CREATE INDEX idx_reviews_billboard_id ON public.reviews(billboard_id);
CREATE INDEX idx_reviews_business_id ON public.reviews(business_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
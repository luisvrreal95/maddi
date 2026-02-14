
-- Drop the existing restrictive policy
DROP POLICY "Businesses can update their pending bookings" ON public.bookings;

-- Recreate with proper WITH CHECK that allows cancellation
CREATE POLICY "Businesses can update their pending bookings"
ON public.bookings
FOR UPDATE
TO authenticated
USING (auth.uid() = business_id AND status = 'pending')
WITH CHECK (auth.uid() = business_id AND status IN ('pending', 'cancelled'));

-- Allow admins to view all user_roles for statistics and user management
CREATE POLICY "Admins can view all user roles" 
ON public.user_roles 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid()
));

-- Allow admins to view all bookings for campaign management
CREATE POLICY "Admins can view all bookings" 
ON public.bookings 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid()
));

-- Allow admins to update booking status
CREATE POLICY "Admins can update bookings" 
ON public.bookings 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid()
));

-- Allow admins to view all billboards (including non-available ones)
CREATE POLICY "Admins can view all billboards" 
ON public.billboards 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid()
));

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid()
));

-- Allow admins to delete user roles
CREATE POLICY "Admins can delete user roles" 
ON public.user_roles 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid()
));

-- Create a trigger function to auto-create platform_commissions when a booking is approved
CREATE OR REPLACE FUNCTION public.create_commission_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create commission when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Check if commission already exists
    IF NOT EXISTS (SELECT 1 FROM platform_commissions WHERE booking_id = NEW.id) THEN
      INSERT INTO platform_commissions (
        booking_id,
        total_amount,
        commission_rate,
        commission_amount,
        owner_payout,
        payment_status
      ) VALUES (
        NEW.id,
        NEW.total_price,
        0.15,
        NEW.total_price * 0.15,
        NEW.total_price * 0.85,
        'pending'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger
DROP TRIGGER IF EXISTS on_booking_approved ON public.bookings;
CREATE TRIGGER on_booking_approved
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.create_commission_on_approval();

-- Also create commission for already approved bookings that don't have one
INSERT INTO platform_commissions (booking_id, total_amount, commission_rate, commission_amount, owner_payout, payment_status)
SELECT 
  b.id,
  b.total_price,
  0.15,
  b.total_price * 0.15,
  b.total_price * 0.85,
  'pending'
FROM bookings b
WHERE b.status = 'approved' 
  AND NOT EXISTS (SELECT 1 FROM platform_commissions pc WHERE pc.booking_id = b.id);
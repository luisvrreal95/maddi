-- Create notifications table for in-app notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  related_booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  related_billboard_id UUID REFERENCES public.billboards(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- System can insert notifications (via triggers/functions)
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(user_id, is_read);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create function to notify owner when booking is created
CREATE OR REPLACE FUNCTION public.notify_owner_on_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  billboard_title TEXT;
  billboard_owner UUID;
BEGIN
  -- Get billboard info
  SELECT title, owner_id INTO billboard_title, billboard_owner
  FROM billboards WHERE id = NEW.billboard_id;
  
  -- Create notification for owner
  INSERT INTO notifications (user_id, title, message, type, related_booking_id, related_billboard_id)
  VALUES (
    billboard_owner,
    'Nueva solicitud de reserva',
    'Tienes una nueva solicitud de reserva para "' || billboard_title || '"',
    'booking_request',
    NEW.id,
    NEW.billboard_id
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for new bookings
CREATE TRIGGER on_booking_created
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_owner_on_booking();

-- Create function to notify business when booking status changes
CREATE OR REPLACE FUNCTION public.notify_business_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  billboard_title TEXT;
  notification_title TEXT;
  notification_message TEXT;
  notification_type TEXT;
BEGIN
  -- Only notify on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Get billboard info
  SELECT title INTO billboard_title
  FROM billboards WHERE id = NEW.billboard_id;
  
  -- Set notification content based on status
  IF NEW.status = 'approved' THEN
    notification_title := '¡Reserva aprobada!';
    notification_message := 'Tu reserva para "' || billboard_title || '" ha sido aprobada';
    notification_type := 'booking_approved';
  ELSIF NEW.status = 'rejected' THEN
    notification_title := 'Reserva rechazada';
    notification_message := 'Tu reserva para "' || billboard_title || '" ha sido rechazada';
    notification_type := 'booking_rejected';
  ELSE
    RETURN NEW;
  END IF;
  
  -- Create notification for business
  INSERT INTO notifications (user_id, title, message, type, related_booking_id, related_billboard_id)
  VALUES (
    NEW.business_id,
    notification_title,
    notification_message,
    notification_type,
    NEW.id,
    NEW.billboard_id
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for booking status changes
CREATE TRIGGER on_booking_status_changed
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_business_on_status_change();
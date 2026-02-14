
-- 1. Allow admins to DELETE billboards
CREATE POLICY "Admins can delete all billboards"
ON public.billboards
FOR DELETE
USING (EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid()));

-- 2. Allow admins to DELETE related data (for cascade)
CREATE POLICY "Admins can delete bookings"
ON public.bookings
FOR DELETE
USING (EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid()));

CREATE POLICY "Admins can delete favorites"
ON public.favorites
FOR DELETE
USING (EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid()));

CREATE POLICY "Admins can delete blocked_dates"
ON public.blocked_dates
FOR DELETE
USING (EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid()));

CREATE POLICY "Admins can delete pricing_overrides"
ON public.pricing_overrides
FOR DELETE
USING (EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid()));

CREATE POLICY "Admins can delete traffic_data"
ON public.traffic_data
FOR DELETE
USING (EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid()));

CREATE POLICY "Admins can delete reviews"
ON public.reviews
FOR DELETE
USING (EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid()));

CREATE POLICY "Admins can delete notifications"
ON public.notifications
FOR DELETE
USING (EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid()));

CREATE POLICY "Admins can delete poi_overview_cache"
ON public.poi_overview_cache
FOR DELETE
USING (EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid()));

CREATE POLICY "Admins can delete inegi_demographics"
ON public.inegi_demographics
FOR DELETE
USING (EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid()));

CREATE POLICY "Admins can delete conversations"
ON public.conversations
FOR DELETE
USING (EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid()));

CREATE POLICY "Admins can delete messages"
ON public.messages
FOR DELETE
USING (EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid()));

-- 3. Email notifications log table
CREATE TABLE public.email_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  to_email TEXT NOT NULL,
  user_id UUID,
  type TEXT NOT NULL,
  entity_id UUID,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can insert email logs"
ON public.email_notifications
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view email logs"
ON public.email_notifications
FOR SELECT
USING (EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid()));

-- Index for spam/digest check
CREATE INDEX idx_email_notifications_user_type ON public.email_notifications (user_id, type, created_at DESC);
CREATE INDEX idx_email_notifications_entity ON public.email_notifications (entity_id, type);

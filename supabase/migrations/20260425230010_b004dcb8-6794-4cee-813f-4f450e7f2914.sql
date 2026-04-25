CREATE TABLE public.contact_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a contact message"
ON public.contact_messages
FOR INSERT
WITH CHECK (
  length(trim(name)) > 0 AND length(name) <= 100
  AND length(trim(email)) > 0 AND length(email) <= 255
  AND length(trim(message)) > 0 AND length(message) <= 2000
);

CREATE POLICY "Admins can view contact messages"
ON public.contact_messages
FOR SELECT
USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

CREATE INDEX idx_contact_messages_created_at ON public.contact_messages(created_at DESC);
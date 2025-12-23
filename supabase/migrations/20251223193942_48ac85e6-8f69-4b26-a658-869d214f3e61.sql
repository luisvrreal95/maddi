-- Create favorites table for businesses to save billboards
CREATE TABLE public.favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  billboard_id UUID NOT NULL REFERENCES public.billboards(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, billboard_id)
);

-- Enable RLS
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- RLS policies for favorites
CREATE POLICY "Users can view their own favorites"
ON public.favorites FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorites"
ON public.favorites FOR INSERT
WITH CHECK (auth.uid() = user_id AND has_role(auth.uid(), 'business'::app_role));

CREATE POLICY "Users can remove their favorites"
ON public.favorites FOR DELETE
USING (auth.uid() = user_id);

-- Create design templates table
CREATE TABLE public.design_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  width_px INTEGER NOT NULL DEFAULT 1920,
  height_px INTEGER NOT NULL DEFAULT 1080,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.design_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for templates
CREATE POLICY "Users can view their own templates"
ON public.design_templates FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public templates"
ON public.design_templates FOR SELECT
USING (is_public = true);

CREATE POLICY "Users can create templates"
ON public.design_templates FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their templates"
ON public.design_templates FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their templates"
ON public.design_templates FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for templates updated_at
CREATE TRIGGER update_design_templates_updated_at
BEFORE UPDATE ON public.design_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create conversations table
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  billboard_id UUID NOT NULL REFERENCES public.billboards(id) ON DELETE CASCADE,
  business_id UUID NOT NULL,
  owner_id UUID NOT NULL,
  last_message_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(billboard_id, business_id)
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversations
CREATE POLICY "Users can view their conversations"
ON public.conversations FOR SELECT
USING (auth.uid() = business_id OR auth.uid() = owner_id);

CREATE POLICY "Businesses can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (auth.uid() = business_id AND has_role(auth.uid(), 'business'::app_role));

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for messages
CREATE POLICY "Users can view messages in their conversations"
ON public.messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.conversations c
  WHERE c.id = messages.conversation_id
  AND (c.business_id = auth.uid() OR c.owner_id = auth.uid())
));

CREATE POLICY "Users can send messages in their conversations"
ON public.messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
    AND (c.business_id = auth.uid() OR c.owner_id = auth.uid())
  )
);

CREATE POLICY "Users can mark messages as read"
ON public.messages FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.conversations c
  WHERE c.id = messages.conversation_id
  AND (c.business_id = auth.uid() OR c.owner_id = auth.uid())
));

-- Function to update conversation last_message_at
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update last_message_at
CREATE TRIGGER update_conversation_last_message_trigger
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_last_message();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
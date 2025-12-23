-- Create favorite folders table
CREATE TABLE public.favorite_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.favorite_folders ENABLE ROW LEVEL SECURITY;

-- Add folder_id to favorites table
ALTER TABLE public.favorites ADD COLUMN folder_id UUID REFERENCES public.favorite_folders(id) ON DELETE SET NULL;

-- Create policies for favorite_folders
CREATE POLICY "Users can view their own folders" 
ON public.favorite_folders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create folders" 
ON public.favorite_folders 
FOR INSERT 
WITH CHECK ((auth.uid() = user_id) AND has_role(auth.uid(), 'business'::app_role));

CREATE POLICY "Users can update their folders" 
ON public.favorite_folders 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their folders" 
ON public.favorite_folders 
FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_favorite_folders_updated_at
BEFORE UPDATE ON public.favorite_folders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
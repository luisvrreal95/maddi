-- Add image_urls array column to billboards table for multiple images
ALTER TABLE public.billboards
ADD COLUMN image_urls text[] DEFAULT '{}';

-- Migrate existing image_url to image_urls array
UPDATE public.billboards
SET image_urls = CASE 
  WHEN image_url IS NOT NULL AND image_url != '' THEN ARRAY[image_url]
  ELSE '{}'
END;
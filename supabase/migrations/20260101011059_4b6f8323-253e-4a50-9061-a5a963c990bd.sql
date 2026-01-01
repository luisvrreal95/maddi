-- Add is_anonymous column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false;

-- Add description field to billboards (800 char limit enforced in app)
ALTER TABLE public.billboards ADD COLUMN IF NOT EXISTS description text;

-- Add pause_reason to track who paused a property
ALTER TABLE public.billboards ADD COLUMN IF NOT EXISTS pause_reason text DEFAULT NULL;
-- Values: null (active), 'owner' (paused by owner), 'admin' (paused by Maddi)

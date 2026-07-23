-- Add recruiting_needs column to users table (from registration form)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS recruiting_needs TEXT;
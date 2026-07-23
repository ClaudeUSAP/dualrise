-- Add last_login column to users table for tracking magic link logins
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
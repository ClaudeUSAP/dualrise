-- Fix security issue: Add fixed search_path to database functions
-- This prevents potential schema-based attacks via search_path manipulation

-- 1. Drop obsolete prevent_role_update function and trigger
-- (No longer needed since role column was removed from users table)
DROP TRIGGER IF EXISTS prevent_user_role_update ON public.users;
DROP FUNCTION IF EXISTS public.prevent_role_update();

-- 2. Recreate auto_expire_athlete_status with fixed search_path
CREATE OR REPLACE FUNCTION auto_expire_athlete_status()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE athletes
  SET 
    status = 'available',
    status_expires_at = NULL
  WHERE status = 'new'
    AND status_expires_at IS NOT NULL
    AND status_expires_at < NOW();
END;
$$;

-- 3. Recreate set_status_expiry with fixed search_path
CREATE OR REPLACE FUNCTION set_status_expiry()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- If status is being set to 'new', set expiry to 3 weeks from creation
  IF NEW.status = 'new' AND (OLD.status IS NULL OR OLD.status != 'new') THEN
    NEW.status_expires_at := COALESCE(NEW.created_at, NOW()) + INTERVAL '21 days';
  -- If status is changed from 'new' to something else, clear expiry
  ELSIF NEW.status != 'new' THEN
    NEW.status_expires_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;
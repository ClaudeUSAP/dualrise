-- Add first_name and last_name columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Update existing users to split full_name into first_name and last_name
UPDATE public.users 
SET 
  first_name = COALESCE(SPLIT_PART(full_name, ' ', 1), full_name),
  last_name = CASE 
    WHEN POSITION(' ' IN full_name) > 0 
    THEN SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1)
    ELSE ''
  END
WHERE first_name IS NULL OR last_name IS NULL;

-- Update the handle_new_user function to populate first_name and last_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    full_name,
    first_name,
    last_name,
    role,
    status,
    school_name,
    position
  ) VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE(new.raw_user_meta_data->>'first_name', SPLIT_PART(COALESCE(new.raw_user_meta_data->>'full_name', 'New'), ' ', 1)),
    COALESCE(new.raw_user_meta_data->>'last_name', CASE 
      WHEN POSITION(' ' IN COALESCE(new.raw_user_meta_data->>'full_name', '')) > 0 
      THEN SUBSTRING(COALESCE(new.raw_user_meta_data->>'full_name', '') FROM POSITION(' ' IN COALESCE(new.raw_user_meta_data->>'full_name', '')) + 1)
      ELSE 'User'
    END),
    COALESCE(new.raw_user_meta_data->>'role', 'coach'),
    'active',
    new.raw_user_meta_data->>'school_name',
    new.raw_user_meta_data->>'position'
  );
  RETURN new;
END;
$$;
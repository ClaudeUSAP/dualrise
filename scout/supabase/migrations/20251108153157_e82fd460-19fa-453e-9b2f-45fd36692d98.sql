-- Update handle_new_user trigger to also create user_roles entry
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Insert into users table
  INSERT INTO public.users (
    id, email, full_name, first_name, last_name,
    role, status, school_name, position, phone, recruiting_needs, whatsapp_number
  ) VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'coach'),
    'pending', -- Set to pending by default for coach registrations
    new.raw_user_meta_data->>'school_name',
    new.raw_user_meta_data->>'position',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'recruiting_needs',
    new.raw_user_meta_data->>'phone' -- Use phone as whatsapp_number by default
  );
  
  -- Also create user_roles entry
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    new.id,
    COALESCE((new.raw_user_meta_data->>'role')::app_role, 'coach'::app_role)
  );
  
  RETURN new;
END;
$function$;

-- Drop existing policy if it exists, then create new one
DROP POLICY IF EXISTS "Users can view own role" ON user_roles;

CREATE POLICY "Users can view own role"
ON user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());
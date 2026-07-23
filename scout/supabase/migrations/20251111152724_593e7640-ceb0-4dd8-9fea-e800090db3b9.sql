CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert into users table (WITHOUT role column - role belongs in user_roles table)
  INSERT INTO public.users (
    id, email, full_name, first_name, last_name,
    status, school_name, position, phone, recruiting_needs, whatsapp_number
  ) VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    'pending',
    new.raw_user_meta_data->>'school_name',
    new.raw_user_meta_data->>'position',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'recruiting_needs',
    new.raw_user_meta_data->>'phone'
  );
  
  -- Create user_roles entry (role goes HERE, not in users table)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    new.id,
    COALESCE((new.raw_user_meta_data->>'role')::app_role, 'coach'::app_role)
  );
  
  RETURN new;
END;
$function$;
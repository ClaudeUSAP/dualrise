-- Sprint 2: Create list_universities RPC and update handle_new_user trigger

-- 1. Create the function to list verified universities (SECURITY DEFINER for unauthenticated access during registration)
CREATE OR REPLACE FUNCTION public.list_universities()
RETURNS TABLE(
  id uuid,
  name text,
  division text,
  state text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT u.id, u.name, u.division, u.state
  FROM public.universities u
  WHERE u.verified = true
  ORDER BY u.name ASC;
END;
$function$;

-- 2. Update handle_new_user trigger to handle university_id or new university creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_university_id UUID;
BEGIN
  -- Check if a new university is being requested
  IF new.raw_user_meta_data->>'new_university_name' IS NOT NULL 
     AND new.raw_user_meta_data->>'new_university_name' != '' THEN
    -- Create the new university with verified = false
    INSERT INTO public.universities (name, division, state, verified)
    VALUES (
      new.raw_user_meta_data->>'new_university_name',
      new.raw_user_meta_data->>'new_university_division',
      new.raw_user_meta_data->>'new_university_state',
      false  -- Requires admin verification
    )
    RETURNING id INTO v_university_id;
  ELSE
    -- Use the existing university_id from metadata
    v_university_id := (new.raw_user_meta_data->>'university_id')::UUID;
  END IF;

  -- Insert into users table
  INSERT INTO public.users (
    id, email, full_name, first_name, last_name,
    status, university_id, school_name, position, phone, 
    recruiting_needs, whatsapp_number
  ) VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    'pending',
    v_university_id,
    -- Fallback: also store school_name for backward compatibility
    COALESCE(
      new.raw_user_meta_data->>'new_university_name',
      (SELECT u.name FROM public.universities u WHERE u.id = v_university_id),
      new.raw_user_meta_data->>'school_name'
    ),
    new.raw_user_meta_data->>'position',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'recruiting_needs',
    new.raw_user_meta_data->>'phone'
  );
  
  -- Create user_roles entry
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    new.id,
    COALESCE((new.raw_user_meta_data->>'role')::app_role, 'coach'::app_role)
  );
  
  RETURN new;
END;
$function$;
-- 1. List all universities with coach counts (admin only)
CREATE OR REPLACE FUNCTION public.admin_list_universities()
RETURNS TABLE(
  id uuid,
  name text,
  division text,
  state text,
  verified boolean,
  created_at timestamptz,
  coach_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.name,
    u.division,
    u.state,
    u.verified,
    u.created_at,
    (SELECT COUNT(*) FROM users WHERE university_id = u.id) AS coach_count
  FROM universities u
  ORDER BY u.verified ASC, u.name ASC;
END;
$function$;

-- 2. Update a university (admin only)
CREATE OR REPLACE FUNCTION public.admin_update_university(
  p_university_id UUID,
  p_name TEXT DEFAULT NULL,
  p_division TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_verified BOOLEAN DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied.' USING ERRCODE = '42501';
  END IF;

  UPDATE universities SET
    name = COALESCE(p_name, name),
    division = COALESCE(p_division, division),
    state = COALESCE(p_state, state),
    verified = COALESCE(p_verified, verified)
  WHERE id = p_university_id;
END;
$function$;

-- 3. Merge two universities (admin only)
CREATE OR REPLACE FUNCTION public.admin_merge_universities(
  p_keep_id UUID,
  p_merge_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied.' USING ERRCODE = '42501';
  END IF;

  -- Transfer coaches from source to target
  UPDATE users SET university_id = p_keep_id WHERE university_id = p_merge_id;
  
  -- Delete the merged university
  DELETE FROM universities WHERE id = p_merge_id;
END;
$function$;

-- 4. Delete a university (admin only, only if no coaches linked)
CREATE OR REPLACE FUNCTION public.admin_delete_university(p_university_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied.' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (SELECT 1 FROM users WHERE university_id = p_university_id) THEN
    RAISE EXCEPTION 'Cannot delete university with linked coaches';
  END IF;

  DELETE FROM universities WHERE id = p_university_id;
END;
$function$;
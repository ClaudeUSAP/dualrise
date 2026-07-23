-- Fix: Drop and recreate admin_list_coaches with new division column
DROP FUNCTION IF EXISTS public.admin_list_coaches();

CREATE OR REPLACE FUNCTION public.admin_list_coaches()
RETURNS TABLE(
  id uuid, 
  email text, 
  first_name text, 
  last_name text, 
  full_name text, 
  school_name text, 
  division text,
  status text, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone, 
  recruiting_needs text, 
  search_count bigint, 
  favorites_count bigint, 
  contact_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.full_name,
    COALESCE(uni.name, u.school_name) as school_name,
    uni.division,
    u.status,
    u.created_at,
    u.updated_at,
    u.recruiting_needs,
    (SELECT COUNT(*) FROM saved_searches s WHERE s.coach_id = u.id) AS search_count,
    (SELECT COUNT(*) FROM favorites f WHERE f.coach_id = u.id) AS favorites_count,
    (SELECT COUNT(*) FROM contact_requests c WHERE c.coach_id = u.id) AS contact_count
  FROM public.users u
  INNER JOIN public.user_roles r ON r.user_id = u.id
  LEFT JOIN public.universities uni ON uni.id = u.university_id
  WHERE r.role = 'coach'::app_role
  ORDER BY u.created_at DESC;
END;
$function$;
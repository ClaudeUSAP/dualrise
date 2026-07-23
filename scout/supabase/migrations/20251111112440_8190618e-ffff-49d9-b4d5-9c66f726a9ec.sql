-- Fix get_current_user_role function to read from user_roles table instead of users.role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1
$$;
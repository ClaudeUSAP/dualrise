-- Fix recursive RLS on public.users causing 42P17 errors
-- 1) Helper function to check if current user is active (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.current_user_is_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND status = 'active'
  );
$$;

-- 2) Replace recursive policy with non-recursive version
DROP POLICY IF EXISTS "Coaches can view basic admin info" ON public.users;

CREATE POLICY "Coaches can view basic admin info"
ON public.users
FOR SELECT
USING (
  (id = auth.uid())
  OR (get_current_user_role() = 'admin')
  OR ((auth.uid() IS NOT NULL) AND (role = 'admin') AND public.current_user_is_active())
);

-- Drop existing restrictive UPDATE policies
DROP POLICY IF EXISTS "Admins can update any profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Recreate as PERMISSIVE policies (so either one passing allows the update)
CREATE POLICY "Admins can update any profile"
ON public.users
AS PERMISSIVE
FOR UPDATE
USING (get_current_user_role() = 'admin'::text)
WITH CHECK (get_current_user_role() = 'admin'::text);

CREATE POLICY "Users can update own profile"
ON public.users
AS PERMISSIVE
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());
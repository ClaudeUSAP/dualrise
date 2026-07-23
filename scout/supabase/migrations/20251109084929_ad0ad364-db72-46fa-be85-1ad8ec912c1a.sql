-- Drop RLS policies that depend on the role column
DROP POLICY IF EXISTS "Coaches can view basic admin info" ON public.users;

-- Remove duplicate role column from users table
-- Roles should ONLY exist in user_roles table for security
ALTER TABLE public.users DROP COLUMN IF EXISTS role;

-- Recreate the policy without the role column dependency
-- Coaches can see basic admin info (name, email) for admins they interact with
CREATE POLICY "Coaches can view basic admin info"
ON public.users
FOR SELECT
USING (
  (id = auth.uid()) 
  OR (get_current_user_role() = 'admin'::text) 
  OR (
    (auth.uid() IS NOT NULL) 
    AND (EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_roles.user_id = users.id 
      AND user_roles.role = 'admin'::app_role
    )) 
    AND current_user_is_active()
  )
);

-- Ensure all users have a role in user_roles table (migration safety)
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'coach'::app_role
FROM public.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id
)
ON CONFLICT (user_id, role) DO NOTHING;
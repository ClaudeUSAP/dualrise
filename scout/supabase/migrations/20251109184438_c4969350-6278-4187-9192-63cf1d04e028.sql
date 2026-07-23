-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Coaches can view basic admin info" ON public.users;

-- Create a new restricted policy that only allows viewing own profile or if user is admin
CREATE POLICY "Users can view own profile or admins can view all"
ON public.users
FOR SELECT
USING (
  (id = auth.uid()) OR 
  (get_current_user_role() = 'admin'::text)
);

-- Create a secure view for public admin information (non-sensitive fields only)
CREATE OR REPLACE VIEW public.admin_public_info AS
SELECT 
  u.id,
  u.first_name,
  u.last_name,
  u.full_name,
  ur.role
FROM public.users u
INNER JOIN public.user_roles ur ON u.id = ur.user_id
WHERE ur.role IN ('admin', 'agent');

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.admin_public_info TO authenticated;

-- Add RLS to the view (allow all authenticated users to view)
ALTER VIEW public.admin_public_info SET (security_invoker = true);
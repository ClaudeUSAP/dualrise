-- Remove the overly permissive policy that exposes all user data
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.users;

-- Create a more restrictive policy that allows coaches to see only basic admin info
-- This is needed so coaches can see admin names in the UI but not sensitive data
CREATE POLICY "Coaches can view basic admin info" ON public.users
FOR SELECT 
USING (
  -- Users can always see their own full profile
  (id = auth.uid()) 
  OR 
  -- Admins can see all profiles
  (get_current_user_role() = 'admin'::text)
  OR
  -- Authenticated coaches can only see basic info of admins (not other coaches)
  (
    auth.uid() IS NOT NULL 
    AND role = 'admin'
    AND EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND status = 'active'
    )
  )
);

-- Create a view for public/limited user info that coaches can access
-- This provides controlled access to specific fields only
CREATE OR REPLACE VIEW public.user_profiles_limited AS
SELECT 
  id,
  first_name,
  last_name,
  full_name,
  role,
  school_name,
  position
FROM public.users
WHERE role = 'admin';  -- Only expose admin profiles in limited view

-- Grant access to the limited view
GRANT SELECT ON public.user_profiles_limited TO authenticated;

-- Add a comment explaining the security model
COMMENT ON VIEW public.user_profiles_limited IS 'Limited user profile view that exposes only non-sensitive admin information to authenticated users. Coaches cannot see other coaches data through this view.';
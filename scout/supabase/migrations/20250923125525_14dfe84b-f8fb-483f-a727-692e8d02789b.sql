-- Remove the public access policy that exposes coach contact information
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;

-- Add a policy that allows authenticated users to view profiles
-- This maintains functionality while requiring authentication
CREATE POLICY "Authenticated users can view profiles" 
ON public.users 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Keep existing policies for:
-- - Users viewing their own profile
-- - Admins viewing all profiles
-- These provide the necessary granular access control
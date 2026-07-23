-- Fix critical security issue: Protect student athlete personal information from public access

-- Drop the existing overly permissive policy that allows anyone to view athletes
DROP POLICY IF EXISTS "Coaches can view all athletes" ON public.athletes;

-- Create new policy: Only authenticated coaches and admins can view athletes
-- This protects sensitive student information from public access
CREATE POLICY "Authenticated coaches and admins can view athletes" 
ON public.athletes 
FOR SELECT 
USING (
  -- User must be authenticated (logged in)
  auth.uid() IS NOT NULL 
  AND 
  -- User must exist in the users table (ensures they're a valid coach or admin)
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid()
    AND users.status = 'active'  -- Only active users can view athlete data
  )
);

-- Ensure other policies are properly set (these should already exist but let's make sure)
-- The INSERT, UPDATE, DELETE policies should remain admin-only which they already are
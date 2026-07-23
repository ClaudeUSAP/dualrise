-- Fix critical security issue: Update SELECT policy on athletes table
DROP POLICY IF EXISTS "Authenticated coaches and admins can view athletes" ON public.athletes;

-- Create proper SELECT policy that restricts access to active coaches and admins only
CREATE POLICY "Active coaches and admins can view athletes" 
ON public.athletes 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.status = 'active' 
    AND users.role IN ('coach', 'admin')
  )
);
-- Fix security issue: Protect coach contact information with proper RLS policies

-- Step 1: Create a security definer function to get user role (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
BEGIN
  -- Return the role of the current authenticated user
  -- This function runs with elevated privileges to bypass RLS
  RETURN (
    SELECT role 
    FROM public.users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Step 2: Drop existing policies that have recursion issues
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;

-- Step 3: Create new SELECT policies using the security definer function
-- Users can only view their own profile (protects contact info)
CREATE POLICY "Users can view own profile" 
ON public.users 
FOR SELECT 
USING (id = auth.uid());

-- Admins can view all profiles (for management purposes)
CREATE POLICY "Admins can view all profiles" 
ON public.users 
FOR SELECT 
USING (public.get_current_user_role() = 'admin');

-- Step 4: Add INSERT policy for user registration
-- Users can only insert their own profile during signup
CREATE POLICY "Users can insert own profile" 
ON public.users 
FOR INSERT 
WITH CHECK (id = auth.uid());

-- Step 5: Add UPDATE policies
-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON public.users 
FOR UPDATE 
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Admins can update any profile (for status changes, etc.)
CREATE POLICY "Admins can update any profile" 
ON public.users 
FOR UPDATE 
USING (public.get_current_user_role() = 'admin')
WITH CHECK (true);

-- Step 6: Add DELETE policies  
-- Users cannot delete profiles (prevents accidental data loss)
-- Only admins can delete profiles if needed
CREATE POLICY "Admins can delete profiles" 
ON public.users 
FOR DELETE 
USING (public.get_current_user_role() = 'admin');

-- Step 7: Update other tables that check admin role to use the new function
-- Fix tournaments table policies
DROP POLICY IF EXISTS "Only admins can insert tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Only admins can update tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Only admins can delete tournaments" ON public.tournaments;

CREATE POLICY "Only admins can insert tournaments" 
ON public.tournaments 
FOR INSERT 
WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "Only admins can update tournaments" 
ON public.tournaments 
FOR UPDATE 
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Only admins can delete tournaments" 
ON public.tournaments 
FOR DELETE 
USING (public.get_current_user_role() = 'admin');

-- Fix tournament_results table policies
DROP POLICY IF EXISTS "Only admins can insert tournament results" ON public.tournament_results;
DROP POLICY IF EXISTS "Only admins can update tournament results" ON public.tournament_results;
DROP POLICY IF EXISTS "Only admins can delete tournament results" ON public.tournament_results;

CREATE POLICY "Only admins can insert tournament results" 
ON public.tournament_results 
FOR INSERT 
WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "Only admins can update tournament results" 
ON public.tournament_results 
FOR UPDATE 
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Only admins can delete tournament results" 
ON public.tournament_results 
FOR DELETE 
USING (public.get_current_user_role() = 'admin');

-- Fix athletes table policies  
DROP POLICY IF EXISTS "Only admins can modify athletes" ON public.athletes;

CREATE POLICY "Only admins can insert athletes" 
ON public.athletes 
FOR INSERT 
WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "Only admins can update athletes" 
ON public.athletes 
FOR UPDATE 
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Only admins can delete athletes" 
ON public.athletes 
FOR DELETE 
USING (public.get_current_user_role() = 'admin');

-- Fix contact_requests table policy
DROP POLICY IF EXISTS "Admins can see all contact requests" ON public.contact_requests;

CREATE POLICY "Admins can see all contact requests" 
ON public.contact_requests 
FOR SELECT 
USING (public.get_current_user_role() = 'admin');
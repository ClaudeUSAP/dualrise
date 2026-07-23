-- Add policy to allow user_roles insertion during registration
-- This allows the trigger to create a role entry when a new user signs up
CREATE POLICY "Allow user role creation during signup"
ON public.user_roles
FOR INSERT
WITH CHECK (user_id = auth.uid());
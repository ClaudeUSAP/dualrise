DROP POLICY "Allow user role creation during signup" ON public.user_roles;
CREATE POLICY "Allow user role creation during signup"
  ON public.user_roles FOR INSERT
  TO public
  WITH CHECK (user_id = auth.uid() AND role = 'coach'::app_role);
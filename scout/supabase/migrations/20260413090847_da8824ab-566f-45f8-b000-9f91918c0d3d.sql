CREATE POLICY "Admins can view all search run history"
  ON public.search_run_history FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY "Service role can insert email logs" ON public.email_logs;
DROP POLICY "Service role can update email logs" ON public.email_logs;
CREATE POLICY "Service role can insert email logs"
  ON public.email_logs FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update email logs"
  ON public.email_logs FOR UPDATE TO service_role USING (true);
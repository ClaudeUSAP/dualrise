-- Add retry tracking columns to email_logs
ALTER TABLE public.email_logs 
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;

-- Create index for retry job
CREATE INDEX IF NOT EXISTS idx_email_logs_retry ON public.email_logs(status, next_retry_at) 
  WHERE status = 'failed';

-- Update policy to allow service role to update logs
CREATE POLICY "Service role can update email logs" 
  ON public.email_logs 
  FOR UPDATE 
  USING (true);
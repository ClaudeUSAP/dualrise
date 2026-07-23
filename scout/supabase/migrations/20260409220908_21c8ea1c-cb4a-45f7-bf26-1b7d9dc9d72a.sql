-- Fix 4: Tournament results — require authentication for SELECT
DROP POLICY IF EXISTS "Anyone can view tournament results" ON public.tournament_results;

CREATE POLICY "Authenticated users can view tournament results"
ON public.tournament_results
FOR SELECT
TO authenticated
USING (true);

-- Fix 2: Realtime channel access — restrict to own channels + admins
-- Enable RLS on realtime.messages if not already enabled
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only listen to own channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'notifications:' || auth.uid()::text
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);
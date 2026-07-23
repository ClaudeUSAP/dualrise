-- Enable RLS on tournaments table
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

-- Enable RLS on tournament_results table  
ALTER TABLE public.tournament_results ENABLE ROW LEVEL SECURITY;

-- Create policies for tournaments table
-- Allow everyone to view tournaments (public data)
CREATE POLICY "Anyone can view tournaments" 
ON public.tournaments 
FOR SELECT 
USING (true);

-- Only admins can insert tournaments
CREATE POLICY "Only admins can insert tournaments" 
ON public.tournaments 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Only admins can update tournaments
CREATE POLICY "Only admins can update tournaments" 
ON public.tournaments 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Only admins can delete tournaments
CREATE POLICY "Only admins can delete tournaments" 
ON public.tournaments 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Create policies for tournament_results table
-- Allow everyone to view tournament results (public data)
CREATE POLICY "Anyone can view tournament results" 
ON public.tournament_results 
FOR SELECT 
USING (true);

-- Only admins can insert tournament results
CREATE POLICY "Only admins can insert tournament results" 
ON public.tournament_results 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Only admins can update tournament results
CREATE POLICY "Only admins can update tournament results" 
ON public.tournament_results 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Only admins can delete tournament results
CREATE POLICY "Only admins can delete tournament results" 
ON public.tournament_results 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);
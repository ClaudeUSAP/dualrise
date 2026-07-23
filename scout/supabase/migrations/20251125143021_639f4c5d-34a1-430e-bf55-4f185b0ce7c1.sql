-- Add admin SELECT policies to allow admins to view all coach data

-- Policy for favorites table
CREATE POLICY "Admins can view all favorites" 
ON public.favorites
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy for saved_searches table
CREATE POLICY "Admins can view all saved searches" 
ON public.saved_searches
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy for athlete_notes table
CREATE POLICY "Admins can view all notes" 
ON public.athlete_notes
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));
-- Update RLS policies to include agents for read access to athletes
DROP POLICY IF EXISTS "Active coaches and admins can view athletes" ON athletes;
CREATE POLICY "Active coaches, admins and agents can view athletes" 
ON athletes FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.status = 'active' 
    AND (
      has_role(auth.uid(), 'coach'::app_role) 
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'agent'::app_role)
    )
  )
);

-- Allow agents to manage athletes (insert, update, delete)
DROP POLICY IF EXISTS "Only admins can insert athletes" ON athletes;
CREATE POLICY "Admins and agents can insert athletes" 
ON athletes FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'agent'::app_role)
);

DROP POLICY IF EXISTS "Only admins can update athletes" ON athletes;
CREATE POLICY "Admins and agents can update athletes" 
ON athletes FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'agent'::app_role)
);

DROP POLICY IF EXISTS "Only admins can delete athletes" ON athletes;
CREATE POLICY "Admins and agents can delete athletes" 
ON athletes FOR DELETE 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'agent'::app_role)
);

-- Allow agents to manage tournaments
DROP POLICY IF EXISTS "Only admins can insert tournaments" ON tournaments;
CREATE POLICY "Admins and agents can insert tournaments" 
ON tournaments FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'agent'::app_role)
);

DROP POLICY IF EXISTS "Only admins can update tournaments" ON tournaments;
CREATE POLICY "Admins and agents can update tournaments" 
ON tournaments FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'agent'::app_role)
);

DROP POLICY IF EXISTS "Only admins can delete tournaments" ON tournaments;
CREATE POLICY "Admins and agents can delete tournaments" 
ON tournaments FOR DELETE 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'agent'::app_role)
);

-- Allow agents to manage tournament results
DROP POLICY IF EXISTS "Only admins can insert tournament results" ON tournament_results;
CREATE POLICY "Admins and agents can insert tournament results" 
ON tournament_results FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'agent'::app_role)
);

DROP POLICY IF EXISTS "Only admins can update tournament results" ON tournament_results;
CREATE POLICY "Admins and agents can update tournament results" 
ON tournament_results FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'agent'::app_role)
);

DROP POLICY IF EXISTS "Only admins can delete tournament results" ON tournament_results;
CREATE POLICY "Admins and agents can delete tournament results" 
ON tournament_results FOR DELETE 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'agent'::app_role)
);

-- Allow agents to view athlete statistics
DROP POLICY IF EXISTS "Active coaches and admins can view statistics" ON athlete_statistics;
CREATE POLICY "Active coaches, admins and agents can view statistics" 
ON athlete_statistics FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.status = 'active' 
    AND (
      has_role(auth.uid(), 'coach'::app_role) 
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'agent'::app_role)
    )
  )
);

-- Allow agents to manage athlete statistics
DROP POLICY IF EXISTS "Only admins can insert statistics" ON athlete_statistics;
CREATE POLICY "Admins and agents can insert statistics" 
ON athlete_statistics FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'agent'::app_role)
);

DROP POLICY IF EXISTS "Only admins can update statistics" ON athlete_statistics;
CREATE POLICY "Admins and agents can update statistics" 
ON athlete_statistics FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'agent'::app_role)
);

DROP POLICY IF EXISTS "Only admins can delete statistics" ON athlete_statistics;
CREATE POLICY "Admins and agents can delete statistics" 
ON athlete_statistics FOR DELETE 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'agent'::app_role)
);
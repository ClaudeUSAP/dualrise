-- Create athlete_tournament_registrations table
CREATE TABLE athlete_tournament_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  registration_status TEXT DEFAULT 'registered' CHECK (registration_status IN ('registered', 'confirmed', 'withdrawn', 'waitlisted')),
  registration_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(athlete_id, tournament_id)
);

-- Enable RLS
ALTER TABLE athlete_tournament_registrations ENABLE ROW LEVEL SECURITY;

-- Active coaches can view registrations
CREATE POLICY "Active coaches can view registrations"
  ON athlete_tournament_registrations FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() 
        AND users.status = 'active'
        AND (has_role(auth.uid(), 'coach') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'agent'))
    )
  );

-- Admins and agents can insert registrations
CREATE POLICY "Admins and agents can insert registrations"
  ON athlete_tournament_registrations FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'agent'));

-- Admins and agents can update registrations
CREATE POLICY "Admins and agents can update registrations"
  ON athlete_tournament_registrations FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'agent'));

-- Admins and agents can delete registrations
CREATE POLICY "Admins and agents can delete registrations"
  ON athlete_tournament_registrations FOR DELETE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'agent'));

-- Add trigger for updated_at
CREATE TRIGGER update_athlete_tournament_registrations_updated_at
  BEFORE UPDATE ON athlete_tournament_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_athlete_tournament_registrations_athlete_id ON athlete_tournament_registrations(athlete_id);
CREATE INDEX idx_athlete_tournament_registrations_tournament_id ON athlete_tournament_registrations(tournament_id);
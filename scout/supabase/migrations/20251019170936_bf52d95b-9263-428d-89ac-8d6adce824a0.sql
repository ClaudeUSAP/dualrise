-- Add series_type column to tournaments table to store extracted tournament format
-- (e.g., Championship, Trophy, Grand Prix, Cup, Open, Stroke Play, Match Play)
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS series_type text;

-- Add comment explaining the field
COMMENT ON COLUMN tournaments.series_type IS 'The type/format of tournament series (e.g., Championship, Trophy, Grand Prix, Cup, Open, Stroke Play, Match Play) extracted from the tournament name';
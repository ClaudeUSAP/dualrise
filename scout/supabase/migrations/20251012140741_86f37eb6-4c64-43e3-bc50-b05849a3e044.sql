-- Add status_expires_at column to track when 'new' status expires
ALTER TABLE athletes 
ADD COLUMN IF NOT EXISTS status_expires_at TIMESTAMP WITH TIME ZONE;

-- Update default status from 'Uncommitted' to 'available'
ALTER TABLE athletes 
ALTER COLUMN status SET DEFAULT 'available';

-- Create function to automatically expire 'new' status to 'available'
CREATE OR REPLACE FUNCTION auto_expire_athlete_status()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE athletes
  SET 
    status = 'available',
    status_expires_at = NULL
  WHERE status = 'new'
    AND status_expires_at IS NOT NULL
    AND status_expires_at < NOW();
END;
$$;

-- Create trigger function to set expiry date when status is set to 'new'
CREATE OR REPLACE FUNCTION set_status_expiry()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If status is being set to 'new', set expiry to 3 weeks from creation
  IF NEW.status = 'new' AND (OLD.status IS NULL OR OLD.status != 'new') THEN
    NEW.status_expires_at := COALESCE(NEW.created_at, NOW()) + INTERVAL '21 days';
  -- If status is changed from 'new' to something else, clear expiry
  ELSIF NEW.status != 'new' THEN
    NEW.status_expires_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to automatically set status expiry
DROP TRIGGER IF EXISTS athlete_status_expiry_trigger ON athletes;
CREATE TRIGGER athlete_status_expiry_trigger
BEFORE INSERT OR UPDATE OF status ON athletes
FOR EACH ROW
EXECUTE FUNCTION set_status_expiry();

-- Add index for efficient querying of expirable statuses
CREATE INDEX IF NOT EXISTS idx_athletes_status_expires 
ON athletes(status, status_expires_at) 
WHERE status = 'new' AND status_expires_at IS NOT NULL;

-- Update athletes from graduation years 2023, 2024, 2025 to 'committed' status
UPDATE athletes
SET 
  status = 'committed',
  status_expires_at = NULL
WHERE graduation_year IN (2023, 2024, 2025)
  AND (status IS NULL OR status != 'committed');

-- Add comment for documentation
COMMENT ON COLUMN athletes.status IS 
'Athlete status: new (just added, expires after 3 weeks), available (default), transfer (transfer student), committed (hidden from search)';

COMMENT ON COLUMN athletes.status_expires_at IS 
'Timestamp when the new status expires and becomes available. Only applicable when status is new.';
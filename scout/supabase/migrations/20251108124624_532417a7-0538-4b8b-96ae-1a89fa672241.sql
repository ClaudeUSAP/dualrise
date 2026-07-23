-- Function to sync committed boolean with status field
CREATE OR REPLACE FUNCTION sync_committed_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- If status is 'committed', ensure committed boolean is true
  IF NEW.status = 'committed' THEN
    NEW.committed := true;
  -- If status is NOT 'committed', ensure committed boolean is false
  ELSIF NEW.status IS DISTINCT FROM 'committed' AND NEW.committed = true THEN
    NEW.committed := false;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically sync on insert/update
CREATE TRIGGER sync_committed_before_insert_update
BEFORE INSERT OR UPDATE OF status, committed ON athletes
FOR EACH ROW
EXECUTE FUNCTION sync_committed_status();

-- Fix existing out-of-sync records
UPDATE athletes 
SET committed = true 
WHERE status = 'committed' AND committed = false;

UPDATE athletes 
SET committed = false 
WHERE status != 'committed' AND status IS NOT NULL AND committed = true;
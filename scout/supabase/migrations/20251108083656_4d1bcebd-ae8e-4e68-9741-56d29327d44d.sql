-- Create trigger function to auto-update athlete statistics cache
CREATE OR REPLACE FUNCTION public.auto_update_athlete_statistics_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM update_athlete_statistics_cache(OLD.athlete_id, 'scoring_avg_vs_cr');
    RETURN OLD;
  ELSE
    PERFORM update_athlete_statistics_cache(NEW.athlete_id, 'scoring_avg_vs_cr');
    RETURN NEW;
  END IF;
END;
$$;

-- Create trigger on tournament_results table
DROP TRIGGER IF EXISTS trigger_auto_update_athlete_statistics ON tournament_results;
CREATE TRIGGER trigger_auto_update_athlete_statistics
AFTER INSERT OR UPDATE OR DELETE ON tournament_results
FOR EACH ROW
EXECUTE FUNCTION auto_update_athlete_statistics_cache();

-- Backfill all existing athletes with tournament results
DO $$
DECLARE
  athlete_record RECORD;
BEGIN
  FOR athlete_record IN 
    SELECT DISTINCT athlete_id 
    FROM tournament_results 
    WHERE athlete_id IS NOT NULL
      AND total_score IS NOT NULL
  LOOP
    PERFORM update_athlete_statistics_cache(athlete_record.athlete_id, 'scoring_avg_vs_cr');
  END LOOP;
END $$;
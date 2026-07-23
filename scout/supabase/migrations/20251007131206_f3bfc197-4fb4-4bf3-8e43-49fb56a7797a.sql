-- Fix search_path security issue for the trigger function
CREATE OR REPLACE FUNCTION auto_update_athlete_statistics_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
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
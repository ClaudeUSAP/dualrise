
-- Refresh all athlete statistics caches with corrected round-weighted scoring
-- This is a one-time data update to recalculate stale cached values
DO $$
DECLARE
  athlete_rec RECORD;
  processed INT := 0;
BEGIN
  FOR athlete_rec IN 
    SELECT DISTINCT athlete_id 
    FROM tournament_results 
    WHERE athlete_id IS NOT NULL AND total_score IS NOT NULL AND total_score > 0
  LOOP
    PERFORM update_athlete_statistics_cache(athlete_rec.athlete_id, 'scoring_avg_vs_cr');
    processed := processed + 1;
  END LOOP;
  RAISE NOTICE 'Refreshed % athletes', processed;
END $$;

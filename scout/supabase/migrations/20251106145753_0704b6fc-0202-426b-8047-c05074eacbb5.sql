-- Create trigger for INSERT operations on tournament_results
CREATE TRIGGER update_athlete_stats_on_insert
AFTER INSERT ON tournament_results
FOR EACH ROW
EXECUTE FUNCTION auto_update_athlete_statistics_cache();

-- Create trigger for UPDATE operations on tournament_results
CREATE TRIGGER update_athlete_stats_on_update
AFTER UPDATE ON tournament_results
FOR EACH ROW
EXECUTE FUNCTION auto_update_athlete_statistics_cache();

-- Create trigger for DELETE operations on tournament_results
CREATE TRIGGER update_athlete_stats_on_delete
AFTER DELETE ON tournament_results
FOR EACH ROW
EXECUTE FUNCTION auto_update_athlete_statistics_cache();

-- One-time refresh: Update statistics for all athletes who have tournament results
DO $$
DECLARE
  athlete_record RECORD;
BEGIN
  FOR athlete_record IN 
    SELECT DISTINCT athlete_id FROM tournament_results WHERE athlete_id IS NOT NULL
  LOOP
    PERFORM update_athlete_statistics_cache(athlete_record.athlete_id, 'scoring_avg_vs_cr');
  END LOOP;
END $$;
-- Triggers to refresh athlete statistics cache on tournament_results changes
-- Safe drop if existing
DROP TRIGGER IF EXISTS trg_update_athlete_stats_iud ON public.tournament_results;

-- Create trigger using existing function update_athlete_scoring_avg_vs_cr()
CREATE TRIGGER trg_update_athlete_stats_iud
AFTER INSERT OR UPDATE OR DELETE ON public.tournament_results
FOR EACH ROW EXECUTE FUNCTION public.update_athlete_scoring_avg_vs_cr();
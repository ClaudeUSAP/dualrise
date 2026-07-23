-- Phase 1: Database Foundation for Dynamic Scoring Average vs Course Rating

-- 1. Create dynamic calculation function that accepts filters
CREATE OR REPLACE FUNCTION public.calculate_scoring_avg_vs_cr_dynamic(
  athlete_uuid UUID,
  filter_type TEXT DEFAULT 'all', -- 'all', 'year', 'last_n'
  filter_value TEXT DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  avg_vs_cr DECIMAL;
  year_filter INTEGER;
  last_n_filter INTEGER;
BEGIN
  -- Parse filter values
  IF filter_type = 'year' AND filter_value IS NOT NULL THEN
    year_filter := filter_value::INTEGER;
  ELSIF filter_type = 'last_n' AND filter_value IS NOT NULL THEN
    last_n_filter := filter_value::INTEGER;
  END IF;

  -- Calculate based on filter type
  IF filter_type = 'year' THEN
    -- Filter by specific year
    SELECT 
      ROUND(AVG(
        CASE 
          WHEN tr.rounds IS NOT NULL AND tr.rounds != '' THEN 
            (tr.total_score::DECIMAL / array_length(string_to_array(tr.rounds, ','), 1)) - t.course_rating::DECIMAL
          WHEN t.field_size::INTEGER <= 30 THEN 
            (tr.total_score::DECIMAL / 3) - t.course_rating::DECIMAL
          ELSE 
            (tr.total_score::DECIMAL / 4) - t.course_rating::DECIMAL
        END
      ), 2)
    INTO avg_vs_cr
    FROM tournament_results tr
    JOIN tournaments t ON tr.tournament_id = t.id
    WHERE tr.athlete_id = athlete_uuid
      AND tr.total_score IS NOT NULL
      AND t.course_rating IS NOT NULL
      AND t.course_rating != ''
      AND t.year = year_filter::TEXT;
      
  ELSIF filter_type = 'last_n' THEN
    -- Get last N tournaments
    SELECT 
      ROUND(AVG(score_vs_cr), 2)
    INTO avg_vs_cr
    FROM (
      SELECT 
        CASE 
          WHEN tr.rounds IS NOT NULL AND tr.rounds != '' THEN 
            (tr.total_score::DECIMAL / array_length(string_to_array(tr.rounds, ','), 1)) - t.course_rating::DECIMAL
          WHEN t.field_size::INTEGER <= 30 THEN 
            (tr.total_score::DECIMAL / 3) - t.course_rating::DECIMAL
          ELSE 
            (tr.total_score::DECIMAL / 4) - t.course_rating::DECIMAL
        END as score_vs_cr
      FROM tournament_results tr
      JOIN tournaments t ON tr.tournament_id = t.id
      WHERE tr.athlete_id = athlete_uuid
        AND tr.total_score IS NOT NULL
        AND t.course_rating IS NOT NULL
        AND t.course_rating != ''
      ORDER BY t.end_date DESC, t.start_date DESC
      LIMIT last_n_filter
    ) recent_tournaments;
    
  ELSE
    -- All time calculation (default)
    SELECT 
      ROUND(AVG(
        CASE 
          WHEN tr.rounds IS NOT NULL AND tr.rounds != '' THEN 
            (tr.total_score::DECIMAL / array_length(string_to_array(tr.rounds, ','), 1)) - t.course_rating::DECIMAL
          WHEN t.field_size::INTEGER <= 30 THEN 
            (tr.total_score::DECIMAL / 3) - t.course_rating::DECIMAL
          ELSE 
            (tr.total_score::DECIMAL / 4) - t.course_rating::DECIMAL
        END
      ), 2)
    INTO avg_vs_cr
    FROM tournament_results tr
    JOIN tournaments t ON tr.tournament_id = t.id
    WHERE tr.athlete_id = athlete_uuid
      AND tr.total_score IS NOT NULL
      AND t.course_rating IS NOT NULL
      AND t.course_rating != '';
  END IF;
  
  RETURN COALESCE(avg_vs_cr, 0);
END;
$function$;

-- 2. Add new columns to athletes table for caching common metrics
ALTER TABLE public.athletes 
ADD COLUMN IF NOT EXISTS scoring_avg_vs_cr_current_year TEXT,
ADD COLUMN IF NOT EXISTS scoring_avg_vs_cr_last_5 TEXT,
ADD COLUMN IF NOT EXISTS scoring_avg_vs_cr_last_10 TEXT,
ADD COLUMN IF NOT EXISTS scoring_avg_vs_cr_last_update TIMESTAMP WITH TIME ZONE;

-- 3. Create athlete_statistics table for pre-calculated values
CREATE TABLE IF NOT EXISTS public.athlete_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL, -- 'scoring_avg_vs_cr'
  period_type TEXT NOT NULL, -- 'all_time', 'year', 'last_n'
  period_value TEXT, -- '2024' for year, '5' for last_n, NULL for all_time
  calculated_value DECIMAL,
  tournaments_included INTEGER,
  last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(athlete_id, metric_type, period_type, period_value)
);

-- Enable RLS on athlete_statistics
ALTER TABLE public.athlete_statistics ENABLE ROW LEVEL SECURITY;

-- RLS policies for athlete_statistics
CREATE POLICY "Active coaches and admins can view statistics" 
ON public.athlete_statistics 
FOR SELECT 
USING (
  (auth.uid() IS NOT NULL) AND 
  (EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = auth.uid() 
      AND users.status = 'active'
      AND users.role IN ('coach', 'admin')
  ))
);

CREATE POLICY "Only admins can insert statistics" 
ON public.athlete_statistics 
FOR INSERT 
WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "Only admins can update statistics" 
ON public.athlete_statistics 
FOR UPDATE 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Only admins can delete statistics" 
ON public.athlete_statistics 
FOR DELETE 
USING (get_current_user_role() = 'admin');

-- 4. Create function to update athlete statistics cache (fixed ambiguity)
CREATE OR REPLACE FUNCTION public.update_athlete_statistics_cache(
  p_athlete_id UUID,
  p_metric_type TEXT DEFAULT 'scoring_avg_vs_cr'
)
RETURNS VOID
LANGUAGE plpgsql
AS $function$
DECLARE
  current_year TEXT;
  calc_value DECIMAL;
  tournament_count INTEGER;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  -- Update all-time average
  calc_value := calculate_scoring_avg_vs_cr_dynamic(p_athlete_id, 'all', NULL);
  
  INSERT INTO athlete_statistics (
    athlete_id, metric_type, period_type, period_value, 
    calculated_value, tournaments_included, last_calculated
  ) VALUES (
    p_athlete_id, p_metric_type, 'all_time', NULL,
    calc_value, 
    (SELECT COUNT(*) FROM tournament_results tr 
     JOIN tournaments t ON tr.tournament_id = t.id 
     WHERE tr.athlete_id = p_athlete_id 
       AND tr.total_score IS NOT NULL 
       AND t.course_rating IS NOT NULL 
       AND t.course_rating != ''),
    NOW()
  )
  ON CONFLICT (athlete_id, metric_type, period_type, period_value)
  DO UPDATE SET 
    calculated_value = EXCLUDED.calculated_value,
    tournaments_included = EXCLUDED.tournaments_included,
    last_calculated = NOW();
  
  -- Update current year average
  calc_value := calculate_scoring_avg_vs_cr_dynamic(p_athlete_id, 'year', current_year);
  
  INSERT INTO athlete_statistics (
    athlete_id, metric_type, period_type, period_value,
    calculated_value, tournaments_included, last_calculated
  ) VALUES (
    p_athlete_id, p_metric_type, 'year', current_year,
    calc_value,
    (SELECT COUNT(*) FROM tournament_results tr 
     JOIN tournaments t ON tr.tournament_id = t.id 
     WHERE tr.athlete_id = p_athlete_id 
       AND tr.total_score IS NOT NULL 
       AND t.course_rating IS NOT NULL 
       AND t.course_rating != ''
       AND t.year = current_year),
    NOW()
  )
  ON CONFLICT (athlete_id, metric_type, period_type, period_value)
  DO UPDATE SET 
    calculated_value = EXCLUDED.calculated_value,
    tournaments_included = EXCLUDED.tournaments_included,
    last_calculated = NOW();
  
  -- Update last 5 tournaments
  calc_value := calculate_scoring_avg_vs_cr_dynamic(p_athlete_id, 'last_n', '5');
  
  INSERT INTO athlete_statistics (
    athlete_id, metric_type, period_type, period_value,
    calculated_value, tournaments_included, last_calculated
  ) VALUES (
    p_athlete_id, p_metric_type, 'last_n', '5',
    calc_value, 5, NOW()
  )
  ON CONFLICT (athlete_id, metric_type, period_type, period_value)
  DO UPDATE SET 
    calculated_value = EXCLUDED.calculated_value,
    last_calculated = NOW();
  
  -- Update last 10 tournaments
  calc_value := calculate_scoring_avg_vs_cr_dynamic(p_athlete_id, 'last_n', '10');
  
  INSERT INTO athlete_statistics (
    athlete_id, metric_type, period_type, period_value,
    calculated_value, tournaments_included, last_calculated
  ) VALUES (
    p_athlete_id, p_metric_type, 'last_n', '10',
    calc_value, 10, NOW()
  )
  ON CONFLICT (athlete_id, metric_type, period_type, period_value)
  DO UPDATE SET 
    calculated_value = EXCLUDED.calculated_value,
    last_calculated = NOW();
  
  -- Update cached columns in athletes table (using table alias to avoid ambiguity)
  UPDATE athletes SET
    scoring_average_vs_course_rating = (
      SELECT ast.calculated_value::TEXT 
      FROM athlete_statistics ast
      WHERE ast.athlete_id = p_athlete_id 
        AND ast.metric_type = p_metric_type 
        AND ast.period_type = 'all_time'
    ),
    scoring_avg_vs_cr_current_year = (
      SELECT ast.calculated_value::TEXT 
      FROM athlete_statistics ast
      WHERE ast.athlete_id = p_athlete_id 
        AND ast.metric_type = p_metric_type 
        AND ast.period_type = 'year'
        AND ast.period_value = current_year
    ),
    scoring_avg_vs_cr_last_5 = (
      SELECT ast.calculated_value::TEXT 
      FROM athlete_statistics ast
      WHERE ast.athlete_id = p_athlete_id 
        AND ast.metric_type = p_metric_type 
        AND ast.period_type = 'last_n'
        AND ast.period_value = '5'
    ),
    scoring_avg_vs_cr_last_10 = (
      SELECT ast.calculated_value::TEXT 
      FROM athlete_statistics ast
      WHERE ast.athlete_id = p_athlete_id 
        AND ast.metric_type = p_metric_type 
        AND ast.period_type = 'last_n'
        AND ast.period_value = '10'
    ),
    scoring_avg_vs_cr_last_update = NOW()
  WHERE id = p_athlete_id;
END;
$function$;

-- 5. Create or replace the trigger to update statistics when tournament results change
CREATE OR REPLACE FUNCTION public.update_athlete_scoring_avg_vs_cr()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Update the athlete's statistics cache
  PERFORM update_athlete_statistics_cache(COALESCE(NEW.athlete_id, OLD.athlete_id));
  
  RETURN NEW;
END;
$function$;

-- Ensure trigger is active
DROP TRIGGER IF EXISTS update_athlete_scoring_avg_vs_cr_trigger ON tournament_results;

CREATE TRIGGER update_athlete_scoring_avg_vs_cr_trigger
AFTER INSERT OR UPDATE OR DELETE ON tournament_results
FOR EACH ROW
EXECUTE FUNCTION update_athlete_scoring_avg_vs_cr();

-- 6. Initialize statistics for existing athletes with tournament results
DO $$
DECLARE
  athlete_record RECORD;
BEGIN
  FOR athlete_record IN 
    SELECT DISTINCT athlete_id 
    FROM tournament_results 
    WHERE athlete_id IS NOT NULL
  LOOP
    PERFORM update_athlete_statistics_cache(athlete_record.athlete_id);
  END LOOP;
END $$;
-- Drop the view that was causing security issues
DROP VIEW IF EXISTS public.user_profiles_limited;

-- Fix all functions to have immutable search_path
-- 1. Fix get_current_user_role function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE plpgsql
STABLE 
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Return the role of the current authenticated user
  -- This function runs with elevated privileges to bypass RLS
  RETURN (
    SELECT role 
    FROM public.users 
    WHERE id = auth.uid()
  );
END;
$function$;

-- 2. Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    full_name,
    first_name,
    last_name,
    role,
    status,
    school_name,
    position
  ) VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE(new.raw_user_meta_data->>'first_name', SPLIT_PART(COALESCE(new.raw_user_meta_data->>'full_name', 'New'), ' ', 1)),
    COALESCE(new.raw_user_meta_data->>'last_name', CASE 
      WHEN POSITION(' ' IN COALESCE(new.raw_user_meta_data->>'full_name', '')) > 0 
      THEN SUBSTRING(COALESCE(new.raw_user_meta_data->>'full_name', '') FROM POSITION(' ' IN COALESCE(new.raw_user_meta_data->>'full_name', '')) + 1)
      ELSE 'User'
    END),
    COALESCE(new.raw_user_meta_data->>'role', 'coach'),
    'active',
    new.raw_user_meta_data->>'school_name',
    new.raw_user_meta_data->>'position'
  );
  RETURN new;
END;
$function$;

-- 3. Fix calculate_scoring_avg_vs_cr function  
CREATE OR REPLACE FUNCTION public.calculate_scoring_avg_vs_cr(athlete_uuid uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path = 'public'
AS $function$
DECLARE
  avg_vs_cr DECIMAL;
BEGIN
  -- Calculate the average of (score per round - course rating) across all tournaments
  SELECT 
    ROUND(AVG(
      CASE 
        -- Assume 3 rounds for most tournaments if rounds data is missing
        WHEN tr.rounds IS NOT NULL AND tr.rounds != '' THEN 
          (tr.total_score::DECIMAL / array_length(string_to_array(tr.rounds, ','), 1)) - t.course_rating::DECIMAL
        -- For tournaments with known field sizes, use standard round counts
        WHEN t.field_size::INTEGER <= 30 THEN 
          (tr.total_score::DECIMAL / 3) - t.course_rating::DECIMAL  -- Smaller field = 3 rounds
        ELSE 
          (tr.total_score::DECIMAL / 4) - t.course_rating::DECIMAL  -- Larger field = 4 rounds
      END
    ), 1)
  INTO avg_vs_cr
  FROM tournament_results tr
  JOIN tournaments t ON tr.tournament_id = t.id
  WHERE tr.athlete_id = athlete_uuid
    AND tr.total_score IS NOT NULL
    AND t.course_rating IS NOT NULL
    AND t.course_rating != '';
  
  RETURN COALESCE(avg_vs_cr, 0);
END;
$function$;

-- 4. Fix update_athlete_scoring_avg_vs_cr function
CREATE OR REPLACE FUNCTION public.update_athlete_scoring_avg_vs_cr()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  -- Update the athlete's scoring average vs course rating
  UPDATE athletes
  SET scoring_average_vs_course_rating = calculate_scoring_avg_vs_cr(COALESCE(NEW.athlete_id, OLD.athlete_id))::TEXT
  WHERE id = COALESCE(NEW.athlete_id, OLD.athlete_id);
  
  RETURN NEW;
END;
$function$;

-- 5. Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 6. Fix import_athlete_simple function
CREATE OR REPLACE FUNCTION public.import_athlete_simple(
  p_first_name text, p_last_name text, p_date_of_birth text, p_country text, 
  p_graduation_year text, p_sex text, p_golf_club_team text, p_committed text, 
  p_committed_to text, p_academic_gpa text, p_sat text, p_duolingo text, 
  p_toefl text, p_intended_majors text, p_scoring_average text, 
  p_scoring_average_vs_par text, p_scoring_average_vs_course_rating text, 
  p_french_adult_ranking text, p_french_ranking_in_their_class text, 
  p_wagr_ranking text, p_drive_distance_carry text, p_seven_iron_distance_carry text, 
  p_max_club_head_speed text, p_strengths text, p_areas_of_improvement text, 
  p_preferences_budget text, p_preferences_division text, p_preferences_region text, 
  p_importance_large_city text, p_video_links text, p_profile_photo text, 
  p_status text, p_source_sync_id text, p_other_interests text, 
  p_why_good_recruit text, p_something_else_coaches_know text
)
RETURNS text
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
DECLARE
  parsed_dob DATE;
BEGIN
  -- Parse date (MM/DD/YYYY format)
  BEGIN
    IF p_date_of_birth IS NOT NULL AND p_date_of_birth != '' THEN
      parsed_dob := TO_DATE(p_date_of_birth, 'MM/DD/YYYY');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    parsed_dob := NULL;
  END;

  INSERT INTO athletes (
    first_name, last_name, date_of_birth, country, graduation_year,
    sex, golf_club_team, committed, committed_to, academic_gpa,
    sat, duolingo, toefl, intended_majors, scoring_average,
    scoring_average_vs_par, scoring_average_vs_course_rating,
    french_adult_ranking, french_ranking_in_their_class, wagr_ranking,
    drive_distance_carry, seven_iron_distance_carry, max_club_head_speed,
    strengths, areas_of_improvement, preferences_budget,
    preferences_division, preferences_region, importance_large_city,
    video_links, profile_photo, status, source_sync_id,
    other_interests, why_good_recruit, something_else_coaches_know
  ) VALUES (
    p_first_name, p_last_name, parsed_dob, p_country,
    CASE WHEN p_graduation_year ~ '^[0-9]+$' THEN p_graduation_year::INTEGER ELSE NULL END,
    p_sex, p_golf_club_team,
    CASE WHEN LOWER(p_committed) IN ('true', '1', 'yes') THEN TRUE ELSE FALSE END,
    NULLIF(p_committed_to, ''), 
    CASE WHEN p_academic_gpa ~ '^[0-9]+\.?[0-9]*$' THEN p_academic_gpa::DECIMAL ELSE NULL END,
    CASE WHEN p_sat ~ '^[0-9]+$' THEN p_sat::INTEGER ELSE NULL END,
    CASE WHEN p_duolingo ~ '^[0-9]+$' THEN p_duolingo::INTEGER ELSE NULL END,
    CASE WHEN p_toefl ~ '^[0-9]+$' THEN p_toefl::INTEGER ELSE NULL END,
    NULLIF(p_intended_majors, ''),
    CASE WHEN p_scoring_average ~ '^[0-9]+\.?[0-9]*$' THEN p_scoring_average::DECIMAL ELSE NULL END,
    CASE WHEN p_scoring_average_vs_par ~ '^-?[0-9]+\.?[0-9]*$' THEN p_scoring_average_vs_par::DECIMAL ELSE NULL END,
    CASE WHEN p_scoring_average_vs_course_rating ~ '^-?[0-9]+\.?[0-9]*$' THEN p_scoring_average_vs_course_rating::DECIMAL ELSE NULL END,
    CASE WHEN p_french_adult_ranking ~ '^[0-9]+$' THEN p_french_adult_ranking::INTEGER ELSE NULL END,
    CASE WHEN p_french_ranking_in_their_class ~ '^[0-9]+$' THEN p_french_ranking_in_their_class::INTEGER ELSE NULL END,
    CASE WHEN p_wagr_ranking ~ '^[0-9]+$' THEN p_wagr_ranking::INTEGER ELSE NULL END,
    CASE WHEN p_drive_distance_carry ~ '^[0-9]+$' THEN p_drive_distance_carry::INTEGER ELSE NULL END,
    CASE WHEN p_seven_iron_distance_carry ~ '^[0-9]+$' THEN p_seven_iron_distance_carry::INTEGER ELSE NULL END,
    CASE WHEN p_max_club_head_speed ~ '^[0-9]+$' THEN p_max_club_head_speed::INTEGER ELSE NULL END,
    NULLIF(p_strengths, ''), NULLIF(p_areas_of_improvement, ''),
    CASE WHEN p_preferences_budget ~ '^[0-9]+$' THEN p_preferences_budget::INTEGER ELSE NULL END,
    NULLIF(p_preferences_division, ''), NULLIF(p_preferences_region, ''),
    NULLIF(p_importance_large_city, ''), NULLIF(p_video_links, ''),
    NULLIF(p_profile_photo, ''), COALESCE(NULLIF(p_status, ''), 'Uncommitted'),
    COALESCE(NULLIF(p_source_sync_id, ''), p_first_name || '_' || p_last_name),
    NULLIF(p_other_interests, ''), NULLIF(p_why_good_recruit, ''),
    NULLIF(p_something_else_coaches_know, '')
  );
  
  RETURN 'Success: ' || p_first_name || ' ' || p_last_name;
EXCEPTION WHEN OTHERS THEN
  RETURN 'Error with ' || p_first_name || ' ' || p_last_name || ': ' || SQLERRM;
END;
$function$;
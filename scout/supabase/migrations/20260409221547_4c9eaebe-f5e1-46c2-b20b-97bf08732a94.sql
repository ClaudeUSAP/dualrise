CREATE OR REPLACE VIEW public.athletes_safe
WITH (security_invoker = true)
AS
SELECT
  id, first_name, last_name, country, graduation_year, sex, golf_club_team,
  committed, committed_to, slug, status, status_expires_at, star_rating,
  scoring_average, scoring_average_vs_par, scoring_average_vs_course_rating,
  french_adult_ranking, french_ranking_in_their_class, wagr_ranking,
  drive_distance_carry, seven_iron_distance_carry, max_club_head_speed,
  strengths, areas_of_improvement, preferences_budget, preferences_division,
  preferences_region, importance_large_city, video_links, profile_photo,
  cover_photo, source_sync_id, other_interests, why_good_recruit,
  something_else_coaches_know, created_at, updated_at, student_type,
  high_school_year, featured, preferred_states, instagram_handle, swing_coach,
  tournament_results_link, trackman_report_link, golf_data_link,
  transfer_individual_ranking, transfer_from_school, transfer_from_division,
  intended_majors,
  scoring_average_override, scoring_avg_vs_cr_override,
  default_scoring_period_type, default_scoring_period_value,
  best_recent_scoring_avg, best_recent_period,
  best_recent_scoring_avg_raw, best_recent_period_raw,
  scoring_avg_last_3_raw, scoring_avg_last_5_raw, scoring_avg_last_7_raw,
  scoring_avg_last_10_raw, scoring_avg_current_year_raw, scoring_avg_all_time_raw,
  scoring_avg_vs_cr_last_3, scoring_avg_vs_cr_last_5, scoring_avg_vs_cr_last_7,
  scoring_avg_vs_cr_last_10, scoring_avg_vs_cr_current_year, scoring_avg_vs_cr_last_update,
  scoring_avg_last_7,
  scoring_avg_vs_par_last_3, scoring_avg_vs_par_last_5, scoring_avg_vs_par_last_7,
  scoring_avg_vs_par_last_10, scoring_avg_vs_par_current_year, scoring_avg_vs_par_all_time,

  CASE
    WHEN public.has_role(auth.uid(), 'admin'::public.app_role) THEN email
    WHEN athletes.id = auth.uid() THEN email
    WHEN EXISTS (SELECT 1 FROM public.favorites f WHERE f.coach_id = auth.uid() AND f.athlete_id = athletes.id) THEN email
    ELSE NULL
  END AS email,

  CASE
    WHEN public.has_role(auth.uid(), 'admin'::public.app_role) THEN phone
    WHEN athletes.id = auth.uid() THEN phone
    WHEN EXISTS (SELECT 1 FROM public.favorites f WHERE f.coach_id = auth.uid() AND f.athlete_id = athletes.id) THEN phone
    ELSE NULL
  END AS phone,

  CASE
    WHEN public.has_role(auth.uid(), 'admin'::public.app_role) THEN date_of_birth
    WHEN athletes.id = auth.uid() THEN date_of_birth
    WHEN EXISTS (SELECT 1 FROM public.favorites f WHERE f.coach_id = auth.uid() AND f.athlete_id = athletes.id) THEN date_of_birth
    ELSE NULL
  END AS date_of_birth,

  CASE
    WHEN public.has_role(auth.uid(), 'admin'::public.app_role) THEN academic_gpa
    WHEN athletes.id = auth.uid() THEN academic_gpa
    WHEN EXISTS (SELECT 1 FROM public.favorites f WHERE f.coach_id = auth.uid() AND f.athlete_id = athletes.id) THEN academic_gpa
    ELSE NULL
  END AS academic_gpa,

  CASE
    WHEN public.has_role(auth.uid(), 'admin'::public.app_role) THEN sat
    WHEN athletes.id = auth.uid() THEN sat
    WHEN EXISTS (SELECT 1 FROM public.favorites f WHERE f.coach_id = auth.uid() AND f.athlete_id = athletes.id) THEN sat
    ELSE NULL
  END AS sat,

  CASE
    WHEN public.has_role(auth.uid(), 'admin'::public.app_role) THEN duolingo
    WHEN athletes.id = auth.uid() THEN duolingo
    WHEN EXISTS (SELECT 1 FROM public.favorites f WHERE f.coach_id = auth.uid() AND f.athlete_id = athletes.id) THEN duolingo
    ELSE NULL
  END AS duolingo,

  CASE
    WHEN public.has_role(auth.uid(), 'admin'::public.app_role) THEN toefl
    WHEN athletes.id = auth.uid() THEN toefl
    WHEN EXISTS (SELECT 1 FROM public.favorites f WHERE f.coach_id = auth.uid() AND f.athlete_id = athletes.id) THEN toefl
    ELSE NULL
  END AS toefl

FROM public.athletes;
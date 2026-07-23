-- Expose star_rating_at_commit (non-PII) through athletes_safe so coach-facing
-- surfaces can show a placed athlete's star rating at the time they committed.
-- Appended at the END of the column list (CREATE OR REPLACE VIEW requires the
-- existing columns to keep the same order; new columns may only be appended).
-- CRITICAL: athletes_safe MUST remain SECURITY DEFINER (security_invoker=off) so
-- coaches can read masked rows of the RLS-restricted base athletes table.
CREATE OR REPLACE VIEW public.athletes_safe AS
 SELECT id,
    first_name,
    last_name,
    country,
    graduation_year,
    sex,
    golf_club_team,
    committed,
    committed_to,
    slug,
    status,
    status_expires_at,
    star_rating,
    scoring_average,
    scoring_average_vs_par,
    scoring_average_vs_course_rating,
    french_adult_ranking,
    french_ranking_in_their_class,
    wagr_ranking,
    drive_distance_carry,
    seven_iron_distance_carry,
    max_club_head_speed,
    strengths,
    areas_of_improvement,
    preferences_budget,
    preferences_division,
    preferences_region,
    importance_large_city,
    video_links,
    profile_photo,
    cover_photo,
    source_sync_id,
    other_interests,
    why_good_recruit,
    something_else_coaches_know,
    created_at,
    updated_at,
    student_type,
    high_school_year,
    featured,
    preferred_states,
    instagram_handle,
    swing_coach,
    tournament_results_link,
    trackman_report_link,
    golf_data_link,
    transfer_individual_ranking,
    transfer_from_school,
    transfer_from_division,
    intended_majors,
    scoring_average_override,
    scoring_avg_vs_cr_override,
    default_scoring_period_type,
    default_scoring_period_value,
    best_recent_scoring_avg,
    best_recent_period,
    best_recent_scoring_avg_raw,
    best_recent_period_raw,
    scoring_avg_last_3_raw,
    scoring_avg_last_5_raw,
    scoring_avg_last_7_raw,
    scoring_avg_last_10_raw,
    scoring_avg_current_year_raw,
    scoring_avg_all_time_raw,
    scoring_avg_vs_cr_last_3,
    scoring_avg_vs_cr_last_5,
    scoring_avg_vs_cr_last_7,
    scoring_avg_vs_cr_last_10,
    scoring_avg_vs_cr_current_year,
    scoring_avg_vs_cr_last_update,
    scoring_avg_last_7,
    scoring_avg_vs_par_last_3,
    scoring_avg_vs_par_last_5,
    scoring_avg_vs_par_last_7,
    scoring_avg_vs_par_last_10,
    scoring_avg_vs_par_current_year,
    scoring_avg_vs_par_all_time,
        CASE
            WHEN has_role(auth.uid(), 'admin'::app_role) THEN email
            ELSE NULL::text
        END AS email,
        CASE
            WHEN has_role(auth.uid(), 'admin'::app_role) THEN phone
            ELSE NULL::text
        END AS phone,
        CASE
            WHEN has_role(auth.uid(), 'admin'::app_role) THEN date_of_birth
            ELSE "substring"(date_of_birth, '\d{4}'::text)
        END AS date_of_birth,
    academic_gpa,
    sat,
    duolingo,
    toefl,
    commit_date,
    french_adult_ranking_at_commit,
    french_ranking_1yr_before_college,
    scoreboard_current_rank,
    star_rating_at_commit
   FROM athletes;

-- Re-assert SECURITY DEFINER posture (never security_invoker=on). The
-- security_definer_view advisor warning on athletes_safe is intentional/accepted.
ALTER VIEW public.athletes_safe SET (security_invoker = false);

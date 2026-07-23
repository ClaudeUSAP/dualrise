-- =====================================================================
-- Dual Rise — seed: Matiej Reiter (class of 2027)
-- Run AFTER 20260715000000_tennis_adaptation.sql
-- =====================================================================
BEGIN;

-- ---- Athlete ----
INSERT INTO public.athletes (
  id, first_name, last_name, date_of_birth, country, city, sex,
  graduation_year, status, student_type, star_rating,
  club_team, height_cm, weight_kg,
  dominant_hand, backhand_type, preferred_surface, play_style,
  utr, wtn, national_ranking, national_ranking_country, itf_junior_ranking,
  utr_profile_link, wtn_profile_link,
  phys_flexibility, phys_strength, phys_endurance,
  tech_serve, tech_forehand, tech_backhand, tech_volley, tech_smash, tech_baseline, tech_net,
  tac_decision_making, tac_adaptability, tac_mental_resilience, tac_anticipation,
  strengths, weaknesses, areas_of_improvement, best_results, objectives, tennis_iq_comments,
  high_school, academic_gpa, duolingo, intended_majors, eligibility_years,
  preferences_budget, preferences_division,
  questionnaire_notes
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Matiej', 'Reiter', '2007-10-05', 'Luxembourg', 'Luxembourg', 'Men',
  '2027', 'available', 'first_year', 5,
  'Tennis Spora', 190, 74,
  'Left', 'One-handed', 'Hard', 'Aggressive Baseliner',
  11.60, 20.50, '#11', 'Luxembourg', '818',
  'https://app.utrsports.net/profiles/REPLACE', 'https://worldtennisnumber.com/REPLACE',
  6, 7, 9,
  7, 9, 8, 7, 8, 8, 6,
  7, 6, 7, 7,
  'Forehand; aggressive baseline play; moves opponents around the court; constant pressure',
  'Net approaches; serve consistency; serve speed; too many unforced errors',
  'Cut down easy errors; simplify tactical choices; improve the serve; improve net approaches; improve focus',
  'Runner-up Hasselt J30; Semifinalist Schifflange J60; Final qualifying round M25 Esch-sur-Alzette; Luxembourg champion U12/U14/U16/U18; 3rd round U14 European Championships; Doubles runner-up Schifflange J60',
  'Play the Davis Cup; reach ATP Top 500; turn professional if possible',
  'Competitive, positive, determined and serious; big lefty forehand, thrives dictating from the baseline.',
  'Lycée de Garçons Luxembourg', 3.38, '130', 'Economics', 5,
  '15000', 'NCAA D1',
  'School average 43, goal 45. Personality: motivated, positive, determined, serious. (Paste full tennis questionnaire answers here.)'
)
ON CONFLICT (id) DO NOTHING;

-- ---- Tournaments (minimal, tennis) ----
INSERT INTO public.tournaments (id, name, year, sex, country, location, series_name, category, surface, grade, tournament_type)
VALUES
  ('a1111111-0000-0000-0000-000000000001','Hasselt J30','2026','Men','Belgium','Hasselt, BEL','ITF Junior','International','Hard','J30','Junior'),
  ('a1111111-0000-0000-0000-000000000002','Schifflange J60','2026','Men','Luxembourg','Schifflange, LUX','ITF Junior','International','Hard','J60','Junior'),
  ('a1111111-0000-0000-0000-000000000003','M25 Esch-sur-Alzette','2026','Men','Luxembourg','Esch-sur-Alzette, LUX','ITF World Tennis Tour','PRO','Hard','M25','Adult'),
  ('a1111111-0000-0000-0000-000000000004','ITF J60 Arlon','2026','Men','Belgium','Arlon, BEL','ITF Junior','International','Hard','J60','Junior')
ON CONFLICT (id) DO NOTHING;

-- ---- Match results (Latest results table) ----
INSERT INTO public.tournament_results (athlete_id, tournament_id, round_reached, opponent_name, opponent_utr, match_score, match_result, notes)
VALUES
  ('11111111-1111-1111-1111-111111111111','a1111111-0000-0000-0000-000000000001','Final','T. Janssen',11.9,'4-6, 6-3, 6-7(5)','L','Runner-up'),
  ('11111111-1111-1111-1111-111111111111','a1111111-0000-0000-0000-000000000002','Semifinal','M. Keller',12.3,'3-6, 4-6','L',NULL),
  ('11111111-1111-1111-1111-111111111111','a1111111-0000-0000-0000-000000000002','Quarterfinal','A. Petit',11.2,'6-4, 6-2','W','Straight sets'),
  ('11111111-1111-1111-1111-111111111111','a1111111-0000-0000-0000-000000000003','Qualifying - final round','D. Moreau',13.1,'6-4, 2-6, 5-7','L','vs ranked senior'),
  ('11111111-1111-1111-1111-111111111111','a1111111-0000-0000-0000-000000000004','Round of 16','L. Weber',11.6,'7-6(4), 6-4','W','Tight opener');

COMMIT;

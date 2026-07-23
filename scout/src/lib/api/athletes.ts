import { supabase } from '@/integrations/supabase/client';
import { Athlete } from '@/types/athlete';
import { normalizeStatus } from '@/lib/athleteStatus';
import { normalizeDivisionsWithDefault, normalizeWeatherZones, normalizeIntendedMajors } from '@/lib/divisionNormalizer';

// Helper function to calculate star rating
export const calculateStarRating = (athlete: any): number => {
  let score = 0;
  
  const gpa = Number(athlete.academic_gpa) || 0;
  if (gpa >= 4.0) score += 2;
  else if (gpa >= 3.5) score += 1.5;
  else if (gpa >= 3.0) score += 1;
  
  const scoringAvg = Number(athlete.scoring_average) || 80;
  if (scoringAvg <= 70) score += 2;
  else if (scoringAvg <= 73) score += 1.5;
  else if (scoringAvg <= 76) score += 1;
  
  const ranking = parseInt(athlete.wagr_ranking || athlete.french_adult_ranking || '9999');
  if (ranking <= 100) score += 1;
  else if (ranking <= 500) score += 0.5;
  
  const sat = Number(athlete.sat) || 0;
  const toefl = Number(athlete.toefl) || 0;
  if (sat >= 1400 || toefl >= 100) score += 1;
  else if (sat >= 1200 || toefl >= 85) score += 0.5;
  
  if (score >= 6) return 7;
  if (score >= 5) return 6;
  if (score >= 4) return 5;
  if (score >= 3) return 4;
  if (score >= 2) return 3;
  if (score >= 1) return 2;
  return 1;
};

// Helper to get current user's role
const getCurrentUserRole = async (): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    
    return roleData?.role || null;
  } catch {
    return null;
  }
};

// Check if user has elevated access (admin or agent)
const hasElevatedAccess = async (): Promise<boolean> => {
  const role = await getCurrentUserRole();
  return role === 'admin' || role === 'agent';
};

// Map database athlete to Athlete type
// maskContactInfo: if true, hides email/phone (for coaches who haven't favorited the athlete)
// Parse a numeric DB value (number or numeric string) → number, else undefined.
const numOrUndef = (v: any): number | undefined => {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

export const mapDbAthleteToAthlete = (athlete: any, maskContactInfo: boolean = false): Athlete => {
  return {
    id: athlete.id,
    firstName: athlete.first_name || '',
    lastName: athlete.last_name || '',
    dateOfBirth: athlete.date_of_birth || undefined,
    // Mask contact info for coaches (they must use contact request form)
    email: maskContactInfo ? '' : (athlete.email || ''),
    phone: maskContactInfo ? undefined : (athlete.phone || undefined),
    gpa: Number(athlete.academic_gpa) || 3.5,
    intendedMajors: athlete.intended_majors || '',
    highSchoolYear: (athlete.high_school_year as 'Freshman' | 'Sophomore' | 'Junior' | 'Senior' | 'Gap Year' | 'Undergraduate in France' | 'In College - Freshman' | 'In College - Sophomore' | 'In College - Junior' | 'In College - Senior') || 'Senior',
    studentType: (athlete.student_type as 'first_year' | 'transfer') || 'first_year',
    duolingoScore: Number(athlete.duolingo) || undefined,
    satScore: Number(athlete.sat) || undefined,
    toeflScore: Number(athlete.toefl) || undefined,
    // NOTE: 'golf_club_team' stores country club names, not academic schools
    currentSchool: athlete.golf_club_team || '',
    scoringAverage: athlete.scoring_average ? Number(athlete.scoring_average) : undefined,
    bestRecentScoringAvg: athlete.best_recent_scoring_avg_raw ? Number(athlete.best_recent_scoring_avg_raw) : undefined,
    scoringAverageVsCourseRating: Number(athlete.scoring_average_vs_course_rating) || 0,
    
    // All scoring fallback fields
    scoring_avg_all_time_raw: athlete.scoring_avg_all_time_raw,
    scoring_avg_current_year_raw: athlete.scoring_avg_current_year_raw,
    scoring_avg_last_3_raw: athlete.scoring_avg_last_3_raw,
    scoring_avg_last_5_raw: athlete.scoring_avg_last_5_raw,
    scoring_avg_last_7_raw: athlete.scoring_avg_last_7_raw,
    scoring_avg_last_10_raw: athlete.scoring_avg_last_10_raw,
    
    scoring_avg_vs_par_all_time: athlete.scoring_avg_vs_par_all_time,
    scoring_avg_vs_par_current_year: athlete.scoring_avg_vs_par_current_year,
    scoring_avg_vs_par_last_3: athlete.scoring_avg_vs_par_last_3,
    scoring_avg_vs_par_last_5: athlete.scoring_avg_vs_par_last_5,
    scoring_avg_vs_par_last_7: athlete.scoring_avg_vs_par_last_7,
    scoring_avg_vs_par_last_10: athlete.scoring_avg_vs_par_last_10,
    
    scoring_avg_vs_cr_current_year: athlete.scoring_avg_vs_cr_current_year,
    scoring_avg_vs_cr_last_3: athlete.scoring_avg_vs_cr_last_3,
    scoring_avg_vs_cr_last_5: athlete.scoring_avg_vs_cr_last_5,
    scoring_avg_vs_cr_last_7: athlete.scoring_avg_vs_cr_last_7,
    scoring_avg_vs_cr_last_10: athlete.scoring_avg_vs_cr_last_10,
    
    best_recent_scoring_avg_raw: athlete.best_recent_scoring_avg_raw,
    best_recent_period_raw: athlete.best_recent_period_raw,
    best_recent_scoring_avg: athlete.best_recent_scoring_avg,
    best_recent_period: athlete.best_recent_period,
    
    nationalAdultRanking: parseInt(athlete.french_adult_ranking || '0') || 0,
    nationalRankingInClass: parseInt(athlete.french_ranking_in_their_class || '0') || 0,
    wagrRanking: athlete.wagr_ranking ? parseInt(athlete.wagr_ranking) : undefined,
    drivingAverageCarryDistance: Number(athlete.drive_distance_carry) || undefined,
    maxDriverClubHeadSpeed: Number(athlete.max_club_head_speed) || undefined,
    preferredDivisions: normalizeDivisionsWithDefault(athlete.preferences_division),
    instagramHandle: athlete.instagram_handle,
    swingCoach: athlete.swing_coach,
    sex: athlete.sex,
    starRating: athlete.star_rating || 3,
    // Level at the time the athlete committed (in_college social proof). NO fallback
    // to the live values — null means "hide the when-committed block" for this athlete.
    starRatingAtCommit:
      athlete.star_rating_at_commit != null && !Number.isNaN(Number(athlete.star_rating_at_commit))
        ? Number(athlete.star_rating_at_commit)
        : null,
    frenchAdultRankingAtCommit: (() => {
      const n = parseInt(String(athlete.french_adult_ranking_at_commit ?? ''), 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    })(),
    strengths: athlete.strengths || '',
    areasOfImprovement: athlete.areas_of_improvement || '',
    weatherZone: normalizeWeatherZones(athlete.preferences_region),
    budget: (() => {
      const numericBudget = Number(athlete.preferences_budget);
      return !isNaN(numericBudget) && numericBudget > 0 ? numericBudget : undefined;
    })(),
    preferences_budget: athlete.preferences_budget,
    recruitmentPitch: athlete.why_good_recruit || '',
    // NOTE: DB column 'country' maps to 'hometown' for historical reasons
    hometown: athlete.country || '',
    createdAt: new Date(athlete.created_at || Date.now()),
    updatedAt: new Date(athlete.updated_at || Date.now()),
    coverImage: athlete.cover_photo || undefined,
    featured: athlete.featured || false,
    preferredStates: athlete.preferred_states?.split(',').map((s: string) => s.trim()).filter((s: string) => s) || [],
    // Canonical status (legacy 'new'→available, 'archived'→in_college).
    // A legacy `committed` boolean still forces 'committed'.
    status: athlete.committed
      ? 'committed'
      : normalizeStatus(athlete.status),
    committedTo: athlete.committed_to || undefined,
    committedUniversityId: athlete.committed_university_id || undefined,
    // Division of the committed university, resolved via the committed_university_id
    // FK in the athletes_safe view (no fuzzy matching on committed_to).
    committedDivision: athlete.committed_division || undefined,
    statusExpiresAt: athlete.status_expires_at ? new Date(athlete.status_expires_at) : undefined,
    graduationYear: athlete.graduation_year || '2025', // Now supports comma-separated years
    preferredMajors: normalizeIntendedMajors(athlete.intended_majors),
    // NOTE: 'golf_club_team' stores country club names, not academic schools
    currentUniversity: athlete.golf_club_team || '',
    profileImage: athlete.profile_photo || undefined,
    // NOTE: DB column is plural 'video_links' but stores single URL
    videoLink: athlete.video_links || undefined,
    tournamentResultsLink: athlete.tournament_results_link || undefined,
    trackmanReportLink: athlete.trackman_report_link || undefined,
    golfDataLink: athlete.golf_data_link || undefined,
    defaultScoringPeriodType: (athlete.default_scoring_period_type as 'last_n' | 'year') || 'last_n',
    defaultScoringPeriodValue: athlete.default_scoring_period_value || '5',
    scoringAverageOverride: athlete.scoring_average_override || false,
    scoringAvgVsCROverride: athlete.scoring_avg_vs_cr_override || false,
    slug: athlete.slug || undefined,
    // Transfer-specific fields
    transferIndividualRanking: athlete.transfer_individual_ranking || undefined,
    transferFromSchool: athlete.transfer_from_school || undefined,
    transferFromDivision: athlete.transfer_from_division || undefined,

    // ===== Dual Rise — TENNIS =====
    utr: numOrUndef(athlete.utr),
    wtn: numOrUndef(athlete.wtn),
    nationalRanking: numOrUndef(athlete.national_ranking),
    nationalRankingCountry: athlete.national_ranking_country || undefined,
    itfJuniorRanking: numOrUndef(athlete.itf_junior_ranking),
    utrProfileLink: athlete.utr_profile_link || undefined,
    wtnProfileLink: athlete.wtn_profile_link || undefined,
    dominantHand: athlete.dominant_hand || undefined,
    backhandType: athlete.backhand_type || undefined,
    preferredSurface: athlete.preferred_surface || undefined,
    playStyle: athlete.play_style || undefined,
    heightCm: numOrUndef(athlete.height_cm),
    weightKg: numOrUndef(athlete.weight_kg),
    city: athlete.city || undefined,
    clubTeam: athlete.club_team || undefined,
    physFlexibility: numOrUndef(athlete.phys_flexibility),
    physStrength: numOrUndef(athlete.phys_strength),
    physEndurance: numOrUndef(athlete.phys_endurance),
    techServe: numOrUndef(athlete.tech_serve),
    techForehand: numOrUndef(athlete.tech_forehand),
    techBackhand: numOrUndef(athlete.tech_backhand),
    techVolley: numOrUndef(athlete.tech_volley),
    techSmash: numOrUndef(athlete.tech_smash),
    techBaseline: numOrUndef(athlete.tech_baseline),
    techNet: numOrUndef(athlete.tech_net),
    tacDecisionMaking: numOrUndef(athlete.tac_decision_making),
    tacAdaptability: numOrUndef(athlete.tac_adaptability),
    tacMentalResilience: numOrUndef(athlete.tac_mental_resilience),
    tacAnticipation: numOrUndef(athlete.tac_anticipation),
    weaknesses: athlete.weaknesses || undefined,
    objectives: athlete.objectives || undefined,
    bestResults: athlete.best_results || undefined,
    recentResults: athlete.recent_results || undefined,
    tennisIqComments: athlete.tennis_iq_comments || undefined,
    questionnaireNotes: athlete.questionnaire_notes || undefined,
    highSchool: athlete.high_school || undefined,
    eligibilityYears: athlete.eligibility_years || undefined,
  };
};

// List all athletes
// PII masking is handled by the athletes_safe view at the database level
export const listAthletes = async (): Promise<Athlete[]> => {
  const { data, error } = await supabase
    .from('athletes_safe' as any)
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching athletes:', error);
    throw error;
  }
  
  return (data || []).map(athlete => mapDbAthleteToAthlete(athlete));
};

// Helper to check if string is a valid UUID
const isUUID = (s: string) => 
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

// Get athlete by ID or slug
// PII masking is handled by the athletes_safe view at the database level
export const getAthleteById = async (idOrSlug: string): Promise<Athlete | null> => {
  try {
    // Try fetching by slug first (more user-friendly)
    const { data: slugData, error: slugError } = await supabase
      .from('athletes_safe' as any)
      .select('*')
      .eq('slug', idOrSlug)
      .maybeSingle();
    
    if (slugData) {
      return mapDbAthleteToAthlete(slugData);
    }
    
    // If not found by slug and it's a valid UUID, try by ID
    if (isUUID(idOrSlug)) {
      const { data: idData, error: idError } = await supabase
        .from('athletes_safe' as any)
        .select('*')
        .eq('id', idOrSlug)
        .single();
      
      if (idError) {
        console.error('Error fetching athlete by ID:', idError);
        return null;
      }
      
      return idData ? mapDbAthleteToAthlete(idData) : null;
    }
    
    // Neither slug nor UUID found
    return null;
  } catch (error) {
    console.error('Error fetching athlete:', error);
    return null;
  }
};

// Map camelCase Dual Rise tennis fields → snake_case DB columns.
// Only assigns keys that are present (`!== undefined`), so it is safe for both
// create (full object) and partial update.
const TENNIS_DB_MAP: Record<string, string> = {
  utr: 'utr', wtn: 'wtn', nationalRanking: 'national_ranking',
  nationalRankingCountry: 'national_ranking_country', itfJuniorRanking: 'itf_junior_ranking',
  utrProfileLink: 'utr_profile_link', wtnProfileLink: 'wtn_profile_link',
  dominantHand: 'dominant_hand', backhandType: 'backhand_type',
  preferredSurface: 'preferred_surface', playStyle: 'play_style',
  heightCm: 'height_cm', weightKg: 'weight_kg', city: 'city', clubTeam: 'club_team',
  physFlexibility: 'phys_flexibility', physStrength: 'phys_strength', physEndurance: 'phys_endurance',
  techServe: 'tech_serve', techForehand: 'tech_forehand', techBackhand: 'tech_backhand',
  techVolley: 'tech_volley', techSmash: 'tech_smash', techBaseline: 'tech_baseline', techNet: 'tech_net',
  tacDecisionMaking: 'tac_decision_making', tacAdaptability: 'tac_adaptability',
  tacMentalResilience: 'tac_mental_resilience', tacAnticipation: 'tac_anticipation',
  weaknesses: 'weaknesses', objectives: 'objectives', bestResults: 'best_results',
  recentResults: 'recent_results', tennisIqComments: 'tennis_iq_comments',
  questionnaireNotes: 'questionnaire_notes', highSchool: 'high_school', eligibilityYears: 'eligibility_years',
};
const assignTennisDbFields = (src: any, dbData: any): void => {
  for (const [key, col] of Object.entries(TENNIS_DB_MAP)) {
    if (src[key] !== undefined) dbData[col] = src[key];
  }
};

// Update athlete
export const updateAthlete = async (id: string, athleteData: Partial<Athlete>): Promise<void> => {
  // Map Athlete fields back to database columns
  const dbData: any = {};
  
  if (athleteData.firstName !== undefined) dbData.first_name = athleteData.firstName;
  if (athleteData.lastName !== undefined) dbData.last_name = athleteData.lastName;
  if (athleteData.gpa !== undefined) dbData.academic_gpa = athleteData.gpa;
  if (athleteData.satScore !== undefined) dbData.sat = athleteData.satScore;
  if (athleteData.duolingoScore !== undefined) dbData.duolingo = athleteData.duolingoScore;
  if (athleteData.toeflScore !== undefined) dbData.toefl = athleteData.toeflScore;
  if (athleteData.intendedMajors !== undefined) dbData.intended_majors = athleteData.intendedMajors;
  if (athleteData.currentSchool !== undefined) dbData.golf_club_team = athleteData.currentSchool;
  if (athleteData.scoringAverage !== undefined) dbData.scoring_average = athleteData.scoringAverage.toString();
  if (athleteData.scoringAverageVsCourseRating !== undefined) dbData.scoring_average_vs_course_rating = athleteData.scoringAverageVsCourseRating.toString();
  if (athleteData.nationalAdultRanking !== undefined) dbData.french_adult_ranking = athleteData.nationalAdultRanking.toString();
  if (athleteData.nationalRankingInClass !== undefined) dbData.french_ranking_in_their_class = athleteData.nationalRankingInClass.toString();
  if (athleteData.drivingAverageCarryDistance !== undefined) dbData.drive_distance_carry = athleteData.drivingAverageCarryDistance.toString();
  if (athleteData.maxDriverClubHeadSpeed !== undefined) dbData.max_club_head_speed = athleteData.maxDriverClubHeadSpeed.toString();
  if (athleteData.preferredDivisions !== undefined) dbData.preferences_division = athleteData.preferredDivisions.join(',');
  if (athleteData.strengths !== undefined) dbData.strengths = athleteData.strengths;
  if (athleteData.areasOfImprovement !== undefined) dbData.areas_of_improvement = athleteData.areasOfImprovement;
  if (athleteData.budget !== undefined) dbData.preferences_budget = athleteData.budget.toString();
  if (athleteData.recruitmentPitch !== undefined) dbData.why_good_recruit = athleteData.recruitmentPitch;
  if (athleteData.hometown !== undefined) dbData.country = athleteData.hometown;
  if (athleteData.graduationYear !== undefined) dbData.graduation_year = athleteData.graduationYear;
  if (athleteData.status !== undefined) {
    dbData.status = athleteData.status; // Store as-is: 'new', 'available', 'transfer', 'committed'
  }
  if (athleteData.statusExpiresAt !== undefined) {
    dbData.status_expires_at = athleteData.statusExpiresAt?.toISOString() || null;
  }
  if (athleteData.profileImage !== undefined) dbData.profile_photo = athleteData.profileImage;
  if (athleteData.videoLink !== undefined) dbData.video_links = athleteData.videoLink;
  if (athleteData.tournamentResultsLink !== undefined) dbData.tournament_results_link = athleteData.tournamentResultsLink;
  if (athleteData.trackmanReportLink !== undefined) dbData.trackman_report_link = athleteData.trackmanReportLink;
  if (athleteData.golfDataLink !== undefined) dbData.golf_data_link = athleteData.golfDataLink;
  if (athleteData.instagramHandle !== undefined) dbData.instagram_handle = athleteData.instagramHandle;
  if (athleteData.swingCoach !== undefined) dbData.swing_coach = athleteData.swingCoach;
  if (athleteData.wagrRanking !== undefined) dbData.wagr_ranking = athleteData.wagrRanking.toString();
  if (athleteData.defaultScoringPeriodType !== undefined) dbData.default_scoring_period_type = athleteData.defaultScoringPeriodType;
  if (athleteData.defaultScoringPeriodValue !== undefined) dbData.default_scoring_period_value = athleteData.defaultScoringPeriodValue;
  if (athleteData.scoringAverageOverride !== undefined) dbData.scoring_average_override = athleteData.scoringAverageOverride;
  if (athleteData.scoringAvgVsCROverride !== undefined) dbData.scoring_avg_vs_cr_override = athleteData.scoringAvgVsCROverride;
  if (athleteData.starRating !== undefined) dbData.star_rating = athleteData.starRating;
  if (athleteData.studentType !== undefined) dbData.student_type = athleteData.studentType;
  if (athleteData.highSchoolYear !== undefined) dbData.high_school_year = athleteData.highSchoolYear;
  if (athleteData.sex !== undefined) dbData.sex = athleteData.sex;
  if (athleteData.dateOfBirth !== undefined) dbData.date_of_birth = athleteData.dateOfBirth;
  if (athleteData.email !== undefined) dbData.email = athleteData.email;
  if (athleteData.phone !== undefined) dbData.phone = athleteData.phone;
  if (athleteData.coverImage !== undefined) dbData.cover_photo = athleteData.coverImage;
  if (athleteData.featured !== undefined) dbData.featured = athleteData.featured;
  if (athleteData.preferredStates !== undefined) dbData.preferred_states = athleteData.preferredStates?.join(', ') || null;
  if (athleteData.weatherZone !== undefined) {
    // Convert "Zone 1, Zone 2" to "1, 2" format for storage
    const zones = athleteData.weatherZone
      .split(',')
      .map(z => z.trim().replace('Zone ', ''))
      .filter(z => z && z !== 'Not specified')
      .join(', ');
    dbData.preferences_region = zones || null;
  }
  
  // Transfer-specific fields
  if (athleteData.transferIndividualRanking !== undefined) dbData.transfer_individual_ranking = athleteData.transferIndividualRanking;
  if (athleteData.transferFromSchool !== undefined) dbData.transfer_from_school = athleteData.transferFromSchool;
  if (athleteData.transferFromDivision !== undefined) dbData.transfer_from_division = athleteData.transferFromDivision;

  // Committed university: store the FK and keep committed_to as a display cache.
  // committed_division is derived from the FK in the view — never written here.
  if (athleteData.committedUniversityId !== undefined) dbData.committed_university_id = athleteData.committedUniversityId;
  if (athleteData.committedTo !== undefined) dbData.committed_to = athleteData.committedTo;

  // Dual Rise tennis fields
  assignTennisDbFields(athleteData, dbData);

  dbData.updated_at = new Date().toISOString();
  
  const { error } = await supabase
    .from('athletes')
    .update(dbData)
    .eq('id', id);
  
  if (error) {
    console.error('Error updating athlete:', error);
    throw error;
  }
};

// Create athlete
export const createAthlete = async (athleteData: Partial<Athlete>): Promise<string> => {
  const dbData: any = {
    first_name: athleteData.firstName || '',
    last_name: athleteData.lastName || '',
    sex: athleteData.sex,
    date_of_birth: athleteData.dateOfBirth,
    academic_gpa: athleteData.gpa,
    sat: athleteData.satScore,
    duolingo: athleteData.duolingoScore,
    toefl: athleteData.toeflScore,
    intended_majors: athleteData.intendedMajors,
    golf_club_team: athleteData.currentSchool,
    scoring_average: athleteData.scoringAverage?.toString(),
    scoring_average_vs_course_rating: athleteData.scoringAverageVsCourseRating?.toString(),
    french_adult_ranking: athleteData.nationalAdultRanking?.toString(),
    french_ranking_in_their_class: athleteData.nationalRankingInClass?.toString(),
    wagr_ranking: athleteData.wagrRanking?.toString(),
    drive_distance_carry: athleteData.drivingAverageCarryDistance?.toString(),
    max_club_head_speed: athleteData.maxDriverClubHeadSpeed?.toString(),
    preferences_division: athleteData.preferredDivisions?.join(','),
    strengths: athleteData.strengths,
    areas_of_improvement: athleteData.areasOfImprovement,
    preferences_budget: athleteData.budget?.toString(),
    why_good_recruit: athleteData.recruitmentPitch,
    country: athleteData.hometown,
    graduation_year: athleteData.graduationYear,
    status: athleteData.status || 'available', // Default to 'available' if not specified
    profile_photo: athleteData.profileImage,
    video_links: athleteData.videoLink,
    tournament_results_link: athleteData.tournamentResultsLink,
    trackman_report_link: athleteData.trackmanReportLink,
    golf_data_link: athleteData.golfDataLink,
    instagram_handle: athleteData.instagramHandle,
    swing_coach: athleteData.swingCoach,
    star_rating: athleteData.starRating || 3,
    student_type: athleteData.studentType || 'first_year',
    high_school_year: athleteData.highSchoolYear || 'Senior',
    preferences_region: athleteData.weatherZone 
      ? athleteData.weatherZone.split(',').map(z => z.trim().replace('Zone ', '')).filter(z => z && z !== 'Not specified').join(', ') || null
      : null,
    email: athleteData.email,
    phone: athleteData.phone,
    cover_photo: athleteData.coverImage,
    featured: athleteData.featured || false,
    preferred_states: athleteData.preferredStates?.join(', ') || null,
    // Transfer-specific fields
    transfer_individual_ranking: athleteData.transferIndividualRanking,
    transfer_from_school: athleteData.transferFromSchool,
    transfer_from_division: athleteData.transferFromDivision,
    // Committed university: FK + committed_to display cache.
    committed_university_id: athleteData.committedUniversityId,
    committed_to: athleteData.committedTo,
  };

  // Dual Rise tennis fields
  assignTennisDbFields(athleteData, dbData);

  const { data, error } = await supabase
    .from('athletes')
    .insert(dbData)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating athlete:', error);
    throw error;
  }
  
  return data.id;
};

// Delete athlete
export const deleteAthlete = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('athletes')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting athlete:', error);
    throw error;
  }
};

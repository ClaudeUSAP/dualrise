import type { AthleteStatus } from '@/lib/athleteStatus';

export interface Athlete {
  id: string;
  firstName: string;
  lastName: string;
  sex?: 'Men' | 'Women';
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  profileImage?: string;
  coverImage?: string;
  
  // Academic Data
  gpa: number; // decimal
  intendedMajors?: string; // text, multiple values separated by comma
  highSchoolYear: 'Freshman' | 'Sophomore' | 'Junior' | 'Senior' | 'Gap Year' | 'Undergraduate in France' | 'In College - Freshman' | 'In College - Sophomore' | 'In College - Junior' | 'In College - Senior';
  duolingoScore?: number; // nullable
  satScore?: number; // nullable
  currentSchool?: string; // NOTE: Maps to 'golf_club_team' DB column - stores country club/golf facility name, not academic school
  
  // Golf Performance Data
  scoringAverage?: number; // decimal - optional
  bestRecentScoringAvg?: number; // Best of last 5, 7, 10, or current year
  scoringAverageVsCourseRating: number; // decimal
  nationalAdultRanking: number;
  nationalRankingInClass: number;
  drivingAverageCarryDistance?: number;
  maxDriverClubHeadSpeed?: number;
  preferredDivisions: string[]; // Array of division preferences
  starRating: number; // 0-6
  // Level captured at the time the athlete committed (in_college social proof).
  // null when unknown — callers must NOT fall back to the live star_rating / ranking.
  starRatingAtCommit?: number | null;
  frenchAdultRankingAtCommit?: number | null;
  
  // External Links
  videoLink?: string; // URL unique - NOTE: Maps to 'video_links' (plural) in DB but stores single URL
  tournamentResultsLink?: string; // URL unique
  trackmanReportLink?: string; // URL unique
  golfDataLink?: string; // URL unique
  
  // Other Information
  strengths?: string; // text
  areasOfImprovement?: string; // text
  weatherZone: string; // Can contain multiple zones like "Zone 1, Zone 2, Zone 3, Zone 4"
  budget?: number; // decimal
  recruitmentPitch?: string; // "Why would be a good recruit"
  
  // Location Info (legacy/compatibility)
  hometown?: string; // NOTE: DB column is 'country' but maps to 'hometown' for historical reasons
  preferredStates?: string[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  featured?: boolean;
  // Canonical status model. Legacy raw values ('new'→available, 'archived'→
  // in_college) are normalized in mapDbAthleteToAthlete — see lib/athleteStatus.
  status: AthleteStatus;
  committedTo?: string; // University the athlete is committed to / attends (committed_to, display cache)
  committedUniversityId?: string; // FK → universities.id (committed_university_id)
  committedDivision?: string; // Division of the committed university, resolved via the FK (committed_division)
  statusExpiresAt?: Date; // Legacy: when 'new' status expired and became 'available'
  studentType?: 'first_year' | 'transfer'; // New field to track student type
  graduationYears?: string; // Comma-separated graduation years (e.g., "2026, 2027")

  // ===== Dual Rise — TENNIS =====
  // Rankings / ratings
  utr?: number;                       // Universal Tennis Rating
  wtn?: number;                       // World Tennis Number (lower = better)
  // nationalRanking reuses the existing legacy field declared below (national_ranking column)
  nationalRankingCountry?: string;    // country the national ranking is for
  itfJuniorRanking?: number;
  utrProfileLink?: string;
  wtnProfileLink?: string;
  // Play profile
  dominantHand?: string;              // 'Right' | 'Left'
  backhandType?: string;              // 'One-handed' | 'Two-handed'
  preferredSurface?: string;          // 'Hard' | 'Clay' | 'Grass' | ...
  playStyle?: string;                 // e.g. 'Aggressive baseliner'
  heightCm?: number;
  weightKg?: number;
  city?: string;
  clubTeam?: string;                  // club / academy (tennis analog of golf_club_team)
  // Physical (0–10)
  physFlexibility?: number;
  physStrength?: number;
  physEndurance?: number;
  // Technical (0–10)
  techServe?: number;
  techForehand?: number;
  techBackhand?: number;
  techVolley?: number;
  techSmash?: number;
  techBaseline?: number;
  techNet?: number;
  // Tactical (0–10)
  tacDecisionMaking?: number;
  tacAdaptability?: number;
  tacMentalResilience?: number;
  tacAnticipation?: number;
  // Narrative
  weaknesses?: string;
  objectives?: string;
  bestResults?: string;
  recentResults?: string;
  tennisIqComments?: string;
  questionnaireNotes?: string;
  highSchool?: string;
  eligibilityYears?: string;

  // Raw scoring data from database (for fallback)
  scoring_avg_all_time_raw?: string;
  scoring_avg_current_year_raw?: string;
  scoring_avg_last_3_raw?: string;
  scoring_avg_last_5_raw?: string;
  scoring_avg_last_7_raw?: string;
  scoring_avg_last_10_raw?: string;
  
  scoring_avg_vs_par_all_time?: string;
  scoring_avg_vs_par_current_year?: string;
  scoring_avg_vs_par_last_3?: string;
  scoring_avg_vs_par_last_5?: string;
  scoring_avg_vs_par_last_7?: string;
  scoring_avg_vs_par_last_10?: string;
  
  scoring_avg_vs_cr_current_year?: string;
  scoring_avg_vs_cr_last_3?: string;
  scoring_avg_vs_cr_last_5?: string;
  scoring_avg_vs_cr_last_7?: string;
  scoring_avg_vs_cr_last_10?: string;
  
  best_recent_scoring_avg_raw?: string;
  best_recent_period_raw?: string;
  best_recent_scoring_avg?: string; // vs CR for best period
  best_recent_period?: string; // e.g., "Last 5", "Last 7", etc.
  preferences_budget?: string; // Raw budget value (can be text like "Flexible")
  
  // Legacy fields for compatibility
  graduationYear?: string; // Changed to string to support comma-separated years
  handicap?: number;
  averageScore?: number;
  nationalRanking?: number;
  regionalRanking?: number;
  tournamentWins?: number;
  topFinishes?: number;
  height?: string;
  weight?: string;
  overallRating?: number;
  // NOTE: currentSchool maps to 'golf_club_team' - stores country club/golf facility name, not academic school
  athleticRating?: number;
  academicRating?: number;
  currentUniversity?: string; // legacy alias for currentSchool
  major?: string; // legacy alias for intendedMajors
  ncaaDivision?: 'I' | 'II' | 'III' | 'NAIA' | 'NJCAA 1' | 'NJCAA 2'; // legacy field
  preferredMajors?: string[]; // legacy field
  achievements?: string[]; // legacy field
  toeflScore?: number; // legacy field
  videos?: string[]; // legacy field
  
  // New fields
  instagramHandle?: string;
  swingCoach?: string;
  wagrRanking?: number; // World Amateur Golf Ranking
  slug?: string; // URL-friendly slug (e.g., 'john-smith')
  
  // Transfer-specific fields
  transferIndividualRanking?: string;
  transferFromSchool?: string;
  transferFromDivision?: string;
  
  // Default scoring period configuration
  defaultScoringPeriodType?: 'last_n' | 'year';
  defaultScoringPeriodValue?: string; // '3', '5', '7', '10' for last_n; '2025' etc for year
  scoringAverageOverride?: boolean;
  scoringAvgVsCROverride?: boolean;
}

export interface SearchFilters {
  gpaMin?: number;
  gpaMax?: number;
  budgetMin?: number;
  budgetMax?: number;
  preferredDivision?: string[];
  ncaaDivision?: string[]; // legacy field for compatibility
  graduationYear?: number[];
  handicapMax?: number;
  searchQuery?: string;
  state?: string;
  highSchoolYear?: string[];
  starRatingMin?: number;
  gender?: string; // Male, Female, or Both
  scoringAvgMin?: number;
  scoringAvgMax?: number;
  scoreVsCRMin?: number;
  scoreVsCRMax?: number;
}

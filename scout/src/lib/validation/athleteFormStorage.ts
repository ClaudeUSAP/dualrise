import { z } from 'zod';

// Define the form data type based on the athlete schema
export interface AthleteFormDraft {
  firstName?: string;
  lastName?: string;
  sex?: 'Men' | 'Women';
  dateOfBirth?: string;
  profileImage?: string;
  coverImage?: string;
  gpa?: number;
  intendedMajors?: string;
  graduationYear?: number[];
  duolingoScore?: number;
  satScore?: number;
  currentSchool?: string;
  scoringAverage?: number;
  scoringAverageVsCourseRating?: number;
  wagrRanking?: number;
  nationalAdultRanking?: number;
  nationalRankingInClass?: number;
  drivingAverageCarryDistance?: number;
  maxDriverClubHeadSpeed?: number;
  preferredDivision?: string[];
  starRating?: number;
  videoLink?: string;
  tournamentResultsLink?: string;
  trackmanReportLink?: string;
  instagramHandle?: string;
  country?: string;
  golfClub?: string;
  committed?: boolean;
  committedTo?: string;
  status?: string;
  featured?: boolean;
  strengths?: string;
  areasOfImprovement?: string;
  whyGoodRecruit?: string;
  somethingElseCoachesShouldKnow?: string;
  weatherZone?: string[];
  budgetRange?: string;
  budget?: number;
  importanceOfLargeCity?: string;
  preferredRegions?: string;
  otherInterests?: string;
}

export interface TournamentResultEntry {
  id: string;
  tournamentId: string;
  round1: string;
  round2: string;
  round3: string;
  round4: string;
  totalScore: number;
  avgScore: number;
  vspar: number;
  vsCourseRating: number;
  position: string;
  notes: string;
  yardage: string;
  par: string;
  slope: string;
  courseRating: string;
  resultsLink: string;
  isNewTournament?: boolean;
  newTournamentName?: string;
}

const STORAGE_KEY = 'athleteFormDraft';

/**
 * Secure form storage utilities for athlete form drafts
 * Uses sessionStorage to persist data only during the current browser session
 */
export const athleteFormStorage = {
  /**
   * Save athlete form draft to sessionStorage
   * @param formData - Partial form data to save
   * @param tournamentResults - Tournament results array
   */
  saveFormDraft(
    formData: Partial<AthleteFormDraft>,
    tournamentResults: TournamentResultEntry[]
  ): void {
    try {
      const draftData = {
        formData,
        tournamentResults,
        savedAt: new Date().toISOString(),
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draftData));
    } catch (error) {
      console.error('Error saving athlete form draft:', error);
    }
  },

  /**
   * Load athlete form draft from sessionStorage
   * @returns The saved draft data or null if no draft exists
   */
  loadFormDraft(): {
    formData: Partial<AthleteFormDraft>;
    tournamentResults: TournamentResultEntry[];
    savedAt: string;
  } | null {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      return parsed;
    } catch (error) {
      console.error('Error loading athlete form draft:', error);
      return null;
    }
  },

  /**
   * Clear athlete form draft from sessionStorage
   */
  clearFormDraft(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing athlete form draft:', error);
    }
  },
};

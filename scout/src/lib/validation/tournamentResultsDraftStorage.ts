/**
 * Session storage utilities for persisting unsaved tournament results
 * This prevents data loss when the user switches tabs or accidentally refreshes
 */

const STORAGE_KEY_PREFIX = 'tournament_results_draft_';

export interface UnsavedTournamentRow {
  id: string;
  tournamentId: string;
  round1: number;
  round2: number;
  round3: number;
  round4: number;
  position: string;
  notes: string;
}

interface StoredDraft {
  rows: UnsavedTournamentRow[];
  savedAt: string;
  athleteId: string;
}

/**
 * Save unsaved tournament result rows to sessionStorage
 */
export const saveDraft = (athleteId: string, rows: UnsavedTournamentRow[]): void => {
  if (!athleteId) return;
  
  try {
    const key = `${STORAGE_KEY_PREFIX}${athleteId}`;
    
    if (rows.length === 0) {
      // Clear storage if no unsaved rows
      sessionStorage.removeItem(key);
      return;
    }
    
    const draft: StoredDraft = {
      rows,
      savedAt: new Date().toISOString(),
      athleteId,
    };
    
    sessionStorage.setItem(key, JSON.stringify(draft));
  } catch (error) {
    console.error('Error saving tournament results draft:', error);
  }
};

/**
 * Load unsaved tournament result rows from sessionStorage
 */
export const loadDraft = (athleteId: string): UnsavedTournamentRow[] | null => {
  if (!athleteId) return null;
  
  try {
    const key = `${STORAGE_KEY_PREFIX}${athleteId}`;
    const stored = sessionStorage.getItem(key);
    
    if (!stored) return null;
    
    const draft: StoredDraft = JSON.parse(stored);
    
    // Verify the draft is for the correct athlete
    if (draft.athleteId !== athleteId) {
      return null;
    }
    
    return draft.rows;
  } catch (error) {
    console.error('Error loading tournament results draft:', error);
    return null;
  }
};

/**
 * Clear the draft for a specific athlete
 */
export const clearDraft = (athleteId: string): void => {
  if (!athleteId) return;
  
  try {
    const key = `${STORAGE_KEY_PREFIX}${athleteId}`;
    sessionStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing tournament results draft:', error);
  }
};

/**
 * Check if a draft exists for a specific athlete
 */
export const hasDraft = (athleteId: string): boolean => {
  if (!athleteId) return false;
  
  try {
    const key = `${STORAGE_KEY_PREFIX}${athleteId}`;
    const stored = sessionStorage.getItem(key);
    
    if (!stored) return false;
    
    const draft: StoredDraft = JSON.parse(stored);
    return draft.rows && draft.rows.length > 0;
  } catch (error) {
    return false;
  }
};

/**
 * Get info about the stored draft (for debugging/display)
 */
export const getDraftInfo = (athleteId: string): { count: number; savedAt: string | null } => {
  if (!athleteId) return { count: 0, savedAt: null };
  
  try {
    const key = `${STORAGE_KEY_PREFIX}${athleteId}`;
    const stored = sessionStorage.getItem(key);
    
    if (!stored) return { count: 0, savedAt: null };
    
    const draft: StoredDraft = JSON.parse(stored);
    return {
      count: draft.rows?.length || 0,
      savedAt: draft.savedAt,
    };
  } catch (error) {
    return { count: 0, savedAt: null };
  }
};

export const tournamentResultsDraftStorage = {
  saveDraft,
  loadDraft,
  clearDraft,
  hasDraft,
  getDraftInfo,
};

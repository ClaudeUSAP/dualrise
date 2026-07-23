import { supabase } from '@/integrations/supabase/client';
import { TournamentResult } from '@/types/tournament';
import { withAuthRetry, AuthSessionExpiredError } from './authRetry';
import { parseRoundsToObjects } from '@/lib/roundsParser';

export { AuthSessionExpiredError };

// Shared sorting utility for consistent tournament result ordering (most recent first)
export const sortTournamentResults = (results: any[]) => {
  return results.sort((a, b) => {
    const tourA = a.tournaments || a.tournament;
    const tourB = b.tournaments || b.tournament;
    
    // 1. Try end_date first (most recent first)
    const endDateA = tourA?.end_date ? new Date(tourA.end_date).getTime() : null;
    const endDateB = tourB?.end_date ? new Date(tourB.end_date).getTime() : null;
    if (endDateA && endDateB) return endDateB - endDateA;
    if (endDateA) return -1;
    if (endDateB) return 1;
    
    // 2. Try start_date (most recent first)
    const startDateA = tourA?.start_date ? new Date(tourA.start_date).getTime() : null;
    const startDateB = tourB?.start_date ? new Date(tourB.start_date).getTime() : null;
    if (startDateA && startDateB) return startDateB - startDateA;
    if (startDateA) return -1;
    if (startDateB) return 1;
    
    // 3. Use import_order (HIGHER = more recent)
    const importOrderA = a.import_order || 0;
    const importOrderB = b.import_order || 0;
    if (importOrderA !== importOrderB) return importOrderB - importOrderA;
    
    // 4. Fallback to year (most recent first)
    const yearA = parseInt(tourA?.year || '0');
    const yearB = parseInt(tourB?.year || '0');
    if (yearA !== yearB) return yearB - yearA;
    
    // 5. Final fallback to tournament name
    return (tourA?.name || '').localeCompare(tourB?.name || '');
  });
};

// Map database tournament result to TournamentResult type
export const mapDbTournamentResultToTournamentResult = (result: any, tournament?: any): TournamentResult => {
  // Use centralized rounds parsing utility
  const roundsArray = parseRoundsToObjects(result.rounds);
  
  // Calculate score vs course rating
  const numRounds = roundsArray.length || 4; // Default to 4 rounds if not specified
  const courseRating = tournament?.course_rating ? parseFloat(tournament.course_rating) : 72;
  // Guard against null total_score (team/match-play events with no individual stroke score)
  const scoreVsCR = result.total_score != null
    ? (result.total_score / numRounds) - courseRating
    : 0;
  
  return {
    id: result.id,
    tournamentId: result.tournament_id || '',
    athleteId: result.athlete_id || '',
    finalPosition: result.position || 0,
    positionText: result.position_text,
    // Prefer tournament-level field_size (source of truth) over deprecated result-level field_size
    fieldSize: tournament?.field_size ? Number(tournament.field_size) : result.field_size,
    totalScore: result.total_score ?? null,
    scoreVsCourseRating: Math.round(scoreVsCR * 10) / 10, // Round to 1 decimal place
    rounds: roundsArray,
    notes: result.notes || undefined,
    highlights: [],
    createdAt: new Date(result.created_at || Date.now()),
    updatedAt: new Date(result.created_at || Date.now()),
    importOrder: result.import_order || undefined,
    athlete: result.athlete ? {
      id: result.athlete.id,
      firstName: result.athlete.first_name,
      lastName: result.athlete.last_name
    } : undefined
  };
};

// Get results for a specific tournament.
//
// `includeAthlete` embeds athlete identity from the base `athletes` table — this
// is RLS-blocked for coaches (it silently returns null and is an RGPD leak of the
// raw table), so coach-facing callers MUST pass { includeAthlete: false } and read
// identity from `athletes_safe` instead. Admin/agent pages keep the embed (default).
export const getTournamentResults = async (
  tournamentId: string,
  opts?: { includeAthlete?: boolean }
): Promise<TournamentResult[]> => {
  const includeAthlete = opts?.includeAthlete !== false;
  const selectClause = includeAthlete
    ? `
      *,
      athlete:athletes(id, first_name, last_name),
      tournaments(course_rating, course_par, field_size)
    `
    : `
      *,
      tournaments(course_rating, course_par, field_size)
    `;
  const { data, error } = await supabase
    .from('tournament_results')
    .select(selectClause)
    .eq('tournament_id', tournamentId)
    .order('position', { ascending: true });
  
  if (error) {
    console.error('Error fetching tournament results:', error);
    throw error;
  }
  
  return ((data as any[]) || []).map(result => mapDbTournamentResultToTournamentResult(result, result.tournaments));
};

// Get results for a specific athlete
export const getAthleteResults = async (athleteId: string): Promise<TournamentResult[]> => {
  const { data, error } = await supabase
    .from('tournament_results')
    .select(`
      *,
      tournaments (
        id,
        name,
        series_name,
        year,
        location,
        country,
        sex,
        tournament_type,
        category,
        course_rating,
        course_par,
        results_link,
        start_date,
        end_date,
        field_size
      )
    `)
    .eq('athlete_id', athleteId);
  
  if (error) {
    console.error('Error fetching athlete results:', error);
    throw error;
  }
  
  // Sort by tournament dates (most recent first)
  const results = (data || []).map(result => ({
    ...mapDbTournamentResultToTournamentResult(result),
    tournament: result.tournaments ? {
      id: result.tournaments.id,
      name: result.tournaments.name,
      series_name: result.tournaments.series_name || result.tournaments.name,
      year: result.tournaments.year || '',
      location: result.tournaments.location || '',
      country: result.tournaments.country || '',
      sex: (result.tournaments.sex || 'Men') as 'Men' | 'Women',
      tournament_type: (result.tournaments.tournament_type || 'Adult') as 'Junior' | 'Adult',
      category: (result.tournaments.category || 'National') as 'National' | 'International' | 'National Team' | 'Club Competition',
      courseRating: Number(result.tournaments.course_rating) || 72,
      slopeRating: 130,
      par: Number(result.tournaments.course_par) || 72,
      participatingAthletes: Number(result.tournaments.field_size) || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      resultsLink: result.tournaments.results_link || undefined,
      startDate: result.tournaments.start_date ? new Date(result.tournaments.start_date) : undefined,
      endDate: result.tournaments.end_date ? new Date(result.tournaments.end_date) : undefined
    } : undefined
  }));

  // Sort using shared utility function (most recent first)
  return sortTournamentResults(results);
};

// Create tournament result with auth retry
// NOTE: fieldSize is deprecated at result level - use tournaments.field_size instead
export const createTournamentResult = async (resultData: {
  tournamentId: string;
  athleteId: string;
  position: number | null;
  positionText?: string;
  totalScore: number | null;
  rounds: string;
  notes?: string;
}): Promise<string> => {
  return withAuthRetry(async () => {
    const dbData = {
      tournament_id: resultData.tournamentId,
      athlete_id: resultData.athleteId,
      position: resultData.position,
      position_text: resultData.positionText,
      // field_size removed - use tournaments.field_size instead
      total_score: resultData.totalScore ?? null,
      rounds: resultData.rounds || null,
      notes: resultData.notes,
    };
    
    const { data, error } = await supabase
      .from('tournament_results')
      .insert(dbData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating tournament result:', error);
      throw error;
    }
    
    return data.id;
  });
};

// Update tournament result with auth retry
// NOTE: fieldSize is deprecated at result level - use updateTournament() for tournaments.field_size
export const updateTournamentResult = async (id: string, resultData: {
  tournamentId?: string;
  position?: number | null;
  positionText?: string;
  totalScore?: number | null;
  rounds?: string;
  notes?: string;
}): Promise<void> => {
  return withAuthRetry(async () => {
    const dbData: any = {};

    if (resultData.tournamentId !== undefined) dbData.tournament_id = resultData.tournamentId;
    if (resultData.position !== undefined) dbData.position = resultData.position;
    if (resultData.positionText !== undefined) dbData.position_text = resultData.positionText;
    // field_size update removed - use updateTournament() for tournaments.field_size
    if (resultData.totalScore !== undefined) dbData.total_score = resultData.totalScore;
    if (resultData.rounds !== undefined) dbData.rounds = resultData.rounds;
    if (resultData.notes !== undefined) dbData.notes = resultData.notes;
    
    const { error } = await supabase
      .from('tournament_results')
      .update(dbData)
      .eq('id', id);
    
    if (error) {
      console.error('Error updating tournament result:', error);
      throw error;
    }
  });
};

// Delete tournament result with auth retry
export const deleteTournamentResult = async (id: string): Promise<void> => {
  return withAuthRetry(async () => {
    const { error } = await supabase
      .from('tournament_results')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting tournament result:', error);
      throw error;
    }
  });
};

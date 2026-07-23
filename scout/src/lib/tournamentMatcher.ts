import { Tournament } from '@/types/tournament';
import { ParsedTournamentResult } from './csvTournamentResultsParser';

export interface TournamentMatch {
  parsedResult: ParsedTournamentResult;
  matchedTournament?: Tournament;
  matchConfidence: 'exact' | 'fuzzy' | 'none';
  canonicalName: string; // Simple name for display: "{series_name} {year}"
  newTournamentData?: Partial<Tournament>;
  isDuplicate?: boolean;
}

/**
 * Normalize text for matching (simple normalization, no translation)
 * - Removes diacritics
 * - Lowercases and trims
 */
export const normalizeForMatching = (text: string): string => {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Enhanced similarity calculation using token-based Jaccard similarity
 */
export const calculateSimilarity = (str1: string, str2: string): number => {
  const normalized1 = normalizeForMatching(str1);
  const normalized2 = normalizeForMatching(str2);
  
  if (normalized1 === normalized2) return 1.0;
  
  // Token-based Jaccard similarity - include ALL tokens (no length filter)
  const tokens1 = normalized1.split(/\s+/).filter(t => t.length > 0);
  const tokens2 = normalized2.split(/\s+/).filter(t => t.length > 0);
  
  if (tokens1.length === 0 || tokens2.length === 0) return 0;
  
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  if (union.size === 0) return 0;
  
  // Pure Jaccard similarity - NO substring boost
  return intersection.size / union.size;
};

/**
 * Find fuzzy match for a tournament using comprehensive similarity scoring
 * Returns tournament and confidence score if a strong match (≥88%) is found
 */
export const findFuzzyMatch = async (
  parsedResult: ParsedTournamentResult,
  candidateTournaments: any[]
): Promise<{ tournament: any; score: number } | null> => {
  let bestMatch: any = null;
  let bestScore = 0;

  for (const candidate of candidateTournaments) {
    // Calculate series name similarity
    const nameSimilarity = calculateSimilarity(
      parsedResult.seriesName,
      candidate.series_name
    );
    
    // Only consider if name similarity is strong (≥0.85)
    if (nameSimilarity < 0.85) continue;
    
    // Check par match (if both have par)
    const parsedPar = parseInt(parsedResult.par) || 72;
    const candidatePar = parseInt(candidate.course_par) || 72;
    const parDiff = Math.abs(parsedPar - candidatePar);
    const parMatch = parDiff <= 2; // Allow ±2 strokes
    
    // Check yardage match (if both have yardage)
    let yardageMatch = true;
    if (parsedResult.yardage && candidate.yardage) {
      const parsedYardage = parseInt(parsedResult.yardage);
      const candidateYardage = parseInt(candidate.yardage);
      const yardageDiff = Math.abs(parsedYardage - candidateYardage);
      yardageMatch = yardageDiff <= 200; // Allow ±200 yards
    }
    
    // Composite score: name is 70%, par is 15%, yardage is 15%
    const compositeScore = 
      (nameSimilarity * 0.70) +
      (parMatch ? 0.15 : 0) +
      (yardageMatch ? 0.15 : 0);
    
    if (compositeScore > bestScore) {
      bestScore = compositeScore;
      bestMatch = candidate;
    }
  }

  // Return match ONLY if composite score ≥ 0.88 (very high confidence)
  if (bestMatch && bestScore >= 0.88) {
    return { tournament: bestMatch, score: bestScore };
  }

  return null;
};

/**
 * Generate simple canonical name: "{series_name} {year}"
 */
const generateSimpleCanonicalName = (seriesName: string, year: string): string => {
  return `${seriesName} ${year}`;
};

/**
 * Check if dates match between parsed result and existing tournament
 * Returns true if dates match OR if either is missing (can't compare)
 */
const checkDatesMatch = (parsed: ParsedTournamentResult, tournament: any): boolean => {
  // If either has no dates, we can't use dates as tiebreaker - allow match
  if (!parsed.startDate && !parsed.endDate) return true;
  if (!tournament.start_date && !tournament.end_date) return true;
  
  // Compare start dates if both have them
  if (parsed.startDate && tournament.start_date) {
    const parsedStart = new Date(parsed.startDate).toISOString().split('T')[0];
    const tournamentStart = new Date(tournament.start_date).toISOString().split('T')[0];
    if (parsedStart !== tournamentStart) return false;
  }
  
  // Compare end dates if both have them
  if (parsed.endDate && tournament.end_date) {
    const parsedEnd = new Date(parsed.endDate).toISOString().split('T')[0];
    const tournamentEnd = new Date(tournament.end_date).toISOString().split('T')[0];
    if (parsedEnd !== tournamentEnd) return false;
  }
  
  return true;
};

/**
 * Check if locations match between parsed result and existing tournament
 * Returns true if locations match OR if either is missing
 */
const checkLocationsMatch = (parsedLocation: string | undefined, tournamentLocation: string | null | undefined): boolean => {
  // If either has no location, we can't use location as tiebreaker - allow match
  if (!parsedLocation || !tournamentLocation) return true;
  
  // Compare normalized locations
  const normalizedParsed = normalizeForMatching(parsedLocation);
  const normalizedTournament = normalizeForMatching(tournamentLocation);
  
  // Exact match or high similarity
  if (normalizedParsed === normalizedTournament) return true;
  
  // Check if one contains the other (e.g., "Limpachtal" vs "Golf Club Limpachtal")
  if (normalizedParsed.includes(normalizedTournament) || normalizedTournament.includes(normalizedParsed)) {
    return true;
  }
  
  // Different locations
  return false;
};

export const matchTournaments = async (
  parsedResults: ParsedTournamentResult[],
  existingTournaments: Tournament[]
): Promise<TournamentMatch[]> => {
  const { supabase } = await import('@/integrations/supabase/client');
  
  const matches: TournamentMatch[] = [];

  for (const parsed of parsedResults) {
    let bestMatch: Tournament | undefined;
    let bestScore = 0;
    let matchConfidence: 'exact' | 'fuzzy' | 'none' = 'none';

    // Generate simple canonical name
    const canonicalName = generateSimpleCanonicalName(parsed.seriesName, parsed.year);

    // Try to find matching tournament by comparing series names directly
    for (const tournament of existingTournaments) {
      // Must match year, sex, tournament_type, and category exactly
      if (tournament.year !== parsed.year) continue;
      if (tournament.sex !== parsed.gender) continue;
      if (tournament.tournament_type !== parsed.tournamentType) continue;
      if (tournament.category !== parsed.category) continue;

      // Compare series names directly
      const similarity = calculateSimilarity(parsed.seriesName, tournament.series_name);
      const score = similarity * 100;
      
      // Only consider high similarity matches for tiebreaker checks
      if (score >= 95) {
        // TIEBREAKER 1: Check dates if names match
        const datesMatch = checkDatesMatch(parsed, tournament);
        
        if (!datesMatch) {
          // Same name but different dates = different tournament event
          continue;
        }
        
        // TIEBREAKER 2: Check location if names and dates match
        const locationsMatch = checkLocationsMatch(parsed.location, tournament.location);
        
        if (!locationsMatch) {
          // Same name, same dates, but different location = different venue
          continue;
        }
        
        // All criteria match - this is the same tournament
        if (score > bestScore) {
          bestScore = score;
          bestMatch = tournament;
        }
      }
    }

    // Determine match confidence
    if (bestScore >= 98) {
      matchConfidence = 'exact';
    } else if (bestScore >= 95) {
      matchConfidence = 'fuzzy';
    } else {
      matchConfidence = 'none';
      bestMatch = undefined;
    }

    // If no match found, perform comprehensive fuzzy matching via Supabase
    if (matchConfidence === 'none') {
      const normalizedCountry = parsed.country?.trim() 
        ? parsed.country.trim().charAt(0).toUpperCase() + parsed.country.trim().slice(1).toLowerCase()
        : '';

      const { data: candidateTournaments } = await supabase
        .from('tournaments')
        .select('*')
        .eq('year', parsed.year)
        .eq('sex', parsed.gender)
        .eq('tournament_type', parsed.tournamentType)
        .eq('category', parsed.category)
        .eq('country', normalizedCountry);

      if (candidateTournaments && candidateTournaments.length > 0) {
        const fuzzyResult = await findFuzzyMatch(parsed, candidateTournaments);
        
        if (fuzzyResult) {
          bestMatch = fuzzyResult.tournament;
          matchConfidence = 'fuzzy';
          console.log(`🎯 Fuzzy matched "${parsed.seriesName}" to existing "${fuzzyResult.tournament.series_name}" (${Math.round(fuzzyResult.score * 100)}% match)`);
        }
      }
    }

    // Prepare new tournament data if no match found
    let newTournamentData: Partial<Tournament> | undefined;
    if (matchConfidence === 'none') {
      newTournamentData = {
        name: canonicalName, // Simple name: "{series_name} {year}"
        series_name: parsed.seriesName, // Raw series name from CSV
        series_type: parsed.seriesType,
        location: parsed.location,
        year: parsed.year,
        country: parsed.country,
        sex: parsed.gender as 'Men' | 'Women',
        tournament_type: parsed.tournamentType as 'Junior' | 'Adult',
        category: parsed.category as 'National' | 'International' | 'National Team' | 'Club Competition' | 'PRO' | 'Collegiate',
        courseRating: parseFloat(parsed.courseRating) || 72,
        slopeRating: parseInt(parsed.slope) || 130,
        par: parseInt(parsed.par) || 72,
        yardage: parsed.yardage ? parseInt(parsed.yardage) : undefined,
        participatingAthletes: parsed.fieldSize || 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        resultsLink: parsed.resultsLink,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
        status: 'completed' as const,
      };
    }

    matches.push({
      parsedResult: parsed,
      matchedTournament: bestMatch,
      matchConfidence,
      canonicalName,
      newTournamentData
    });
  }

  return matches;
};
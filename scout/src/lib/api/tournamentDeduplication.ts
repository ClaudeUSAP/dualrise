import { supabase } from '@/integrations/supabase/client';
import { Tournament } from '@/types/tournament';
import { normalizeForMatching } from '@/lib/tournamentMatcher';

export interface DuplicateGroup {
  key: string;
  year: string;
  sex: string;
  country: string;
  courseRating: string;
  courseSlope: string;
  coursePar: string;
  yardage: string;
  similarityScore: number; // 0-100 percentage
  tournaments: Array<{
    id: string;
    name: string;
    seriesName: string;
    seriesType: string | null;
    location: string;
    resultsCount: number;
    courseRating: string | null;
    courseSlope: string | null;
    coursePar: string | null;
    startDate: string | null;
    endDate: string | null;
    createdAt: string;
  }>;
}

/**
 * Normalize country name for comparison
 */
const normalizeCountry = (country: string | null | undefined): string => {
  if (!country) return '';
  const trimmed = country.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

/**
 * Calculate similarity between two strings using Jaccard similarity
 */
const calculateSimilarity = (str1: string, str2: string): number => {
  const normalize = (s: string) => s.toLowerCase().trim().split(/\s+/);
  
  const tokens1 = new Set(normalize(str1));
  const tokens2 = new Set(normalize(str2));
  
  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);
  
  if (union.size === 0) return 0;
  return (intersection.size / union.size) * 100;
};

export const findDuplicateTournaments = async (): Promise<DuplicateGroup[]> => {
  // Get all tournaments with their result counts (using DB types directly)
  const { data: tournaments, error } = await supabase
    .from('tournaments')
    .select(`
      id,
      name,
      series_name,
      series_type,
      year,
      sex,
      country,
      tournament_type,
      category,
      course_rating,
      course_slope,
      course_par,
      yardage,
      location,
      start_date,
      end_date,
      created_at
    `);

  if (error) throw error;

  // Get result counts for each tournament
  const { data: resultCounts, error: countError } = await supabase
    .from('tournament_results')
    .select('tournament_id');

  if (countError) throw countError;

  // Count results per tournament
  const countsMap = new Map<string, number>();
  resultCounts?.forEach(result => {
    countsMap.set(result.tournament_id, (countsMap.get(result.tournament_id) || 0) + 1);
  });

  // Group tournaments loosely (without series_name for fuzzy matching)
  // Use 'any' type because data comes directly from DB with snake_case
  const looseGroups = new Map<string, any[]>();

  tournaments?.forEach(tournament => {
    // Normalize country for grouping
    const normalizedCountry = normalizeCountry(tournament.country);
    
    // Create a loose key WITHOUT series_name to catch name variations
    const key = [
      tournament.year || '',
      tournament.sex || '',
      tournament.tournament_type || '',
      tournament.category || '',
      normalizedCountry
    ].join('|');

    if (!looseGroups.has(key)) {
      looseGroups.set(key, []);
    }

    looseGroups.get(key)!.push(tournament);
  });

  // Now apply fuzzy name matching within each loose group
  const groups = new Map<string, DuplicateGroup>();

  looseGroups.forEach((tournamentList, looseKey) => {
    const visited = new Set<string>();

    tournamentList.forEach((tournament, index) => {
      if (visited.has(tournament.id)) return;

      // Find all similar tournaments (substring match or 75% similarity threshold)
      const similarTournaments = [tournament];
      visited.add(tournament.id);

      const normalizedName1 = normalizeForMatching(tournament.series_name || tournament.name);

      for (let j = index + 1; j < tournamentList.length; j++) {
        const other = tournamentList[j];
        if (visited.has(other.id)) continue;

        const normalizedName2 = normalizeForMatching(other.series_name || other.name);
        
        // Check if one name is a substring of the other
        const isSubstring = normalizedName1.includes(normalizedName2) || normalizedName2.includes(normalizedName1);
        
        // Calculate similarity
        const similarity = calculateSimilarity(normalizedName1, normalizedName2);

        if (isSubstring || similarity >= 75) {
          similarTournaments.push(other);
          visited.add(other.id);
        }
      }

      // Only create a group if we found duplicates
      if (similarTournaments.length > 1) {
        const normalizedCountry = normalizeCountry(tournament.country);
        const groupKey = `${looseKey}|${tournament.id}`;

        groups.set(groupKey, {
          key: groupKey,
          year: tournament.year || '',
          sex: tournament.sex || '',
          country: normalizedCountry,
          courseRating: '',
          courseSlope: '',
          coursePar: '',
          yardage: '',
          similarityScore: 100, // Will be calculated below
          tournaments: similarTournaments.map(t => ({
            id: t.id,
            name: t.name,
            seriesName: t.series_name,
            seriesType: t.series_type || null,
            location: t.location || '',
            resultsCount: countsMap.get(t.id) || 0,
            courseRating: t.course_rating || null,
            courseSlope: t.course_slope || null,
            coursePar: t.course_par || null,
            startDate: t.start_date || null,
            endDate: t.end_date || null,
            createdAt: t.created_at
          }))
        });
      }
    });
  });

  // Filter to only groups with duplicates and calculate similarity scores
  const duplicateGroups = Array.from(groups.values())
    .filter(group => group.tournaments.length > 1)
    .map(group => {
      // Calculate average similarity between all tournaments in the group
      let totalSimilarity = 0;
      let comparisons = 0;
      
      for (let i = 0; i < group.tournaments.length; i++) {
        for (let j = i + 1; j < group.tournaments.length; j++) {
          const sim = calculateSimilarity(
            group.tournaments[i].name,
            group.tournaments[j].name
          );
          totalSimilarity += sim;
          comparisons++;
        }
      }
      
      const averageSimilarity = comparisons > 0 ? totalSimilarity / comparisons : 100;
      
      return {
        ...group,
        similarityScore: Math.round(averageSimilarity),
        // Sort tournaments by: 1) result count, 2) completeness, 3) most recent
        tournaments: group.tournaments.sort((a, b) => {
          // Primary: result count
          if (b.resultsCount !== a.resultsCount) {
            return b.resultsCount - a.resultsCount;
          }
          // Secondary: data completeness
          const aComplete = [a.courseRating, a.courseSlope, a.coursePar, a.startDate].filter(Boolean).length;
          const bComplete = [b.courseRating, b.courseSlope, b.coursePar, b.startDate].filter(Boolean).length;
          if (bComplete !== aComplete) {
            return bComplete - aComplete;
          }
          // Tertiary: most recent
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })
      };
    })
    // Sort groups by similarity score (lowest first - needs most attention)
    .sort((a, b) => a.similarityScore - b.similarityScore);

  return duplicateGroups;
};

export const mergeTournaments = async (
  keepTournamentId: string,
  removeTournamentIds: string[]
): Promise<void> => {
  // Reassign all results from tournaments to be deleted to the kept tournament
  for (const tournamentId of removeTournamentIds) {
    const { error: updateError } = await supabase
      .from('tournament_results')
      .update({ tournament_id: keepTournamentId })
      .eq('tournament_id', tournamentId);

    if (updateError) throw updateError;
  }

  // Delete the duplicate tournaments
  const { error: deleteError } = await supabase
    .from('tournaments')
    .delete()
    .in('id', removeTournamentIds);

  if (deleteError) throw deleteError;
};

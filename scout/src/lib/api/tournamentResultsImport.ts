import { supabase } from '@/integrations/supabase/client';
import { TournamentMatch, findFuzzyMatch } from '@/lib/tournamentMatcher';
import { createTournament, updateTournament } from './tournaments';
import { createTournamentResult, updateTournamentResult } from './tournamentResults';

/**
 * Normalize country name for consistency
 */
const normalizeCountry = (country: string | null | undefined): string => {
  if (!country) return '';
  const trimmed = country.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

/**
 * Generate simple canonical name: "{series_name} {year}"
 */
const generateSimpleCanonicalName = (seriesName: string, year: string): string => {
  return `${seriesName} ${year}`;
};

export interface ImportResult {
  successCount: number;
  errorCount: number;
  tournamentsCreated: number;
  resultsUpdated: number;
  errors: { row: number; message: string }[];
}

export const importTournamentResults = async (
  athleteId: string,
  matches: TournamentMatch[]
): Promise<ImportResult> => {
  const result: ImportResult = {
    successCount: 0,
    errorCount: 0,
    tournamentsCreated: 0,
    resultsUpdated: 0,
    errors: [],
  };

  // Create a map to track newly created tournaments by name+year
  const createdTournaments = new Map<string, string>();

  for (const match of matches) {
    try {
      let tournamentId: string;

      // Determine tournament ID
      if (match.matchedTournament) {
        // Use existing tournament
        tournamentId = match.matchedTournament.id;
        
        // Update tournament details if needed
        const updates: Partial<any> = {};

        // Update series_type if provided in CSV and different/missing
        if (match.parsedResult.seriesType) {
          const currentSeriesType = (match.matchedTournament as any).series_type;
          if (!currentSeriesType || currentSeriesType !== match.parsedResult.seriesType) {
            updates.series_type = match.parsedResult.seriesType;
          }
        }
        
        // Update sex field if missing (backfill for existing tournaments)
        const currentSex = (match.matchedTournament as any).sex;
        if (!currentSex && match.parsedResult.gender) {
          updates.sex = match.parsedResult.gender;
        }
        
        // Backfill series_name if missing
        if (!match.matchedTournament.series_name && match.parsedResult.seriesName) {
          updates.series_name = match.parsedResult.seriesName;
        }
        
        // Store raw date string for reference
        if (match.parsedResult.rawDateString) {
          updates.raw_date_string = match.parsedResult.rawDateString;
        }
        
        // Update resultsLink if CSV has one and tournament doesn't, or if different
        if (match.parsedResult.resultsLink) {
          const currentLink = match.matchedTournament.resultsLink;
          if (!currentLink || currentLink !== match.parsedResult.resultsLink) {
            updates.resultsLink = match.parsedResult.resultsLink;
          }
        }

        // Update yardage if provided in CSV and missing/different on tournament
        if (match.parsedResult.yardage) {
          const parsedYardage = parseInt(match.parsedResult.yardage);
          const existingYardage = match.matchedTournament.yardage;
          if (!isNaN(parsedYardage) && (!existingYardage || existingYardage !== parsedYardage)) {
            updates.yardage = parsedYardage;
          }
        }

        // Update start/end dates if provided in CSV and missing on tournament
        if (match.parsedResult.startDate) {
          const startDateStr = match.parsedResult.startDate.toISOString().split('T')[0];
          if (!match.matchedTournament.startDate || match.matchedTournament.startDate.toString() !== startDateStr) {
            updates.startDate = new Date(startDateStr);
          }
        }
        if (match.parsedResult.endDate) {
          const endDateStr = match.parsedResult.endDate.toISOString().split('T')[0];
          if (!match.matchedTournament.endDate || match.matchedTournament.endDate.toString() !== endDateStr) {
            updates.endDate = new Date(endDateStr);
          }
        }

        // Set status to completed since we're importing results
        if (match.matchedTournament.status === 'planned' || match.matchedTournament.status === 'in_progress') {
          updates.status = 'completed';
        }

        // Apply updates if any
        if (Object.keys(updates).length > 0) {
          await updateTournament(tournamentId, updates);
        }
      } else if (match.newTournamentData) {
        // Normalize country in new tournament data
        const normalizedCountry = normalizeCountry(match.parsedResult.country);
        const tournamentKey = `${match.canonicalName.trim()}_${match.parsedResult.year}`;
        
        if (createdTournaments.has(tournamentKey)) {
          // Already created this tournament in this batch
          tournamentId = createdTournaments.get(tournamentKey)!;
        } else {
          // First check if tournament already exists using series name
          const { data: existingTournament } = await supabase
            .from('tournaments')
            .select('id')
            .ilike('series_name', match.parsedResult.seriesName.trim())
            .eq('year', match.parsedResult.year)
            .eq('sex', match.parsedResult.gender)
            .limit(1)
            .maybeSingle();
          
          if (existingTournament) {
            // Found existing tournament
            tournamentId = existingTournament.id;
            createdTournaments.set(tournamentKey, tournamentId);
          } else {
            // BEFORE creating new tournament, do comprehensive fuzzy check
            const { data: candidateTournaments } = await supabase
              .from('tournaments')
              .select('*')
              .eq('year', match.parsedResult.year)
              .eq('sex', match.parsedResult.gender)
              .eq('tournament_type', match.parsedResult.tournamentType)
              .eq('category', match.parsedResult.category)
              .eq('country', normalizedCountry);
            
            const fuzzyResult = candidateTournaments && candidateTournaments.length > 0
              ? await findFuzzyMatch(match.parsedResult, candidateTournaments)
              : null;
            
            // Use fuzzy match if found (≥88% confidence)
            if (fuzzyResult) {
              console.log(`🎯 Fuzzy matched "${match.parsedResult.seriesName}" to existing "${fuzzyResult.tournament.series_name}" (${Math.round(fuzzyResult.score * 100)}% match)`);
              tournamentId = fuzzyResult.tournament.id;
              createdTournaments.set(tournamentKey, tournamentId);
              
              // Backfill any missing data from the CSV
              const updates: any = {};
              if (!fuzzyResult.tournament.results_link && match.parsedResult.resultsLink) {
                updates.resultsLink = match.parsedResult.resultsLink;
              }
              if (!fuzzyResult.tournament.yardage && match.parsedResult.yardage) {
                updates.yardage = parseInt(match.parsedResult.yardage);
              }
              // Store raw date string
              if (match.parsedResult.rawDateString) {
                updates.raw_date_string = match.parsedResult.rawDateString;
              }
              if (Object.keys(updates).length > 0) {
                await updateTournament(tournamentId, updates);
              }
            } else {
              // Safe to create new tournament - use raw series name directly
              const tournamentDataWithNormalizedCountry = {
                ...match.newTournamentData,
                name: generateSimpleCanonicalName(match.parsedResult.seriesName, match.parsedResult.year),
                series_name: match.parsedResult.seriesName, // Raw series name
                raw_date_string: match.parsedResult.rawDateString, // Store raw date
                country: normalizedCountry,
                series_type: match.parsedResult.seriesType,
                ...(match.parsedResult.startDate && { 
                  startDate: new Date(match.parsedResult.startDate.toISOString().split('T')[0]) 
                }),
                ...(match.parsedResult.endDate && { 
                  endDate: new Date(match.parsedResult.endDate.toISOString().split('T')[0]) 
                }),
              };
              
              try {
                tournamentId = await createTournament(tournamentDataWithNormalizedCountry);
                createdTournaments.set(tournamentKey, tournamentId);
                result.tournamentsCreated++;
              } catch (createError: any) {
                // If duplicate constraint violation, try to find it again
                if (createError?.code === '23505') {
                  const { data: retryTournament } = await supabase
                    .from('tournaments')
                    .select('id')
                    .ilike('series_name', match.parsedResult.seriesName.trim())
                    .eq('year', match.parsedResult.year)
                    .limit(1)
                    .maybeSingle();
                  
                  if (retryTournament) {
                    tournamentId = retryTournament.id;
                    createdTournaments.set(tournamentKey, tournamentId);
                  } else {
                    throw createError;
                  }
                } else {
                  throw createError;
                }
              }
            }
          }
        }
      } else {
        throw new Error('No tournament match or new tournament data');
      }

      // Validate total score before proceeding
      if (!match.parsedResult.totalScore || match.parsedResult.totalScore <= 0) {
        result.errors.push({
          row: match.parsedResult.rowNumber,
          message: `Skipped: Total score is ${match.parsedResult.totalScore || 'missing'} (must be > 0)`,
        });
        result.errorCount++;
        continue;
      }

      // Check if this result already exists (athlete + tournament combination)
      const { data: existingResult } = await supabase
        .from('tournament_results')
        .select('id')
        .eq('athlete_id', athleteId)
        .eq('tournament_id', tournamentId)
        .maybeSingle();

      if (existingResult) {
        // Update existing result instead of skipping
        // NOTE: fieldSize removed - use updateTournament() for tournaments.field_size
        await updateTournamentResult(existingResult.id, {
          position: match.parsedResult.position || 0,
          positionText: match.parsedResult.positionText,
          totalScore: match.parsedResult.totalScore,
          rounds: match.parsedResult.rounds,
          notes: match.parsedResult.notes,
        });
        result.resultsUpdated++;
        continue;
      }

      // Create tournament result
      // NOTE: fieldSize removed - use updateTournament() for tournaments.field_size
      await createTournamentResult({
        tournamentId,
        athleteId,
        position: match.parsedResult.position || 0,
        positionText: match.parsedResult.positionText,
        totalScore: match.parsedResult.totalScore,
        rounds: match.parsedResult.rounds,
        notes: match.parsedResult.notes,
      });

      result.successCount++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Import error on row ${match.parsedResult.rowNumber}:`, {
        error: errorMessage,
        seriesName: match.parsedResult.seriesName,
        year: match.parsedResult.year,
        athleteId,
      });
      result.errorCount++;
      result.errors.push({
        row: match.parsedResult.rowNumber,
        message: `${match.parsedResult.seriesName} (${match.parsedResult.year}): ${errorMessage}`,
      });
    }
  }

  return result;
};
import { supabase } from '@/integrations/supabase/client';
import { getAthleteById } from '@/lib/api/athletes';
import { generateAthleteOnePager } from '@/lib/athleteOnePagerPdf';
import { Athlete } from '@/types/athlete';

// Single source of truth for the coach recruiting one-pager download.
//
// Everything is (re)fetched LIVE from the DB on each call — fresh athlete, live
// per-year scoring (RPC) and live tournament results — so the PDF is never cached
// or frozen. Both the coach profile (AthleteDetail) and the admin surfaces call
// this, guaranteeing the exact same design, data and file name.
//
// File name is produced inside generateAthleteOnePager as {FirstName}_{LastName}_DualRise.pdf.
export async function downloadAthleteOnePagerLive(
  athleteId: string,
  fallbackAthlete?: Athlete | null
): Promise<void> {
  const [fresh, resultsRes] = await Promise.all([
    getAthleteById(athleteId),
    supabase.from('tournament_results').select('*, tournaments(*)').eq('athlete_id', athleteId),
  ]);

  const athlete = fresh ?? fallbackAthlete ?? null;
  if (!athlete) throw new Error('Athlete not found');

  // Tennis one-pager doesn't use the golf per-year scoring RPC.
  const liveResults = ((resultsRes.data ?? []) as any[]).map((r) => ({ ...r, tournament: r.tournaments }));
  await generateAthleteOnePager(athlete, liveResults, []);
}

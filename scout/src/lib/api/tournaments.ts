import { supabase } from '@/integrations/supabase/client';
import { Tournament } from '@/types/tournament';
import { format } from 'date-fns';

/**
 * Parse a date-only string (YYYY-MM-DD) as local midnight,
 * avoiding the UTC-shift bug where new Date('2025-01-15')
 * shows as Jan 14 in US timezones.
 */
const parseLocalDate = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

// Map database tournament to Tournament type
export const mapDbTournamentToTournament = (tournament: any): Tournament => {
  return {
    id: tournament.id,
    name: tournament.name || '',
    series_name: tournament.series_name || '',
    year: tournament.year || '',
    location: tournament.location || '',
    country: tournament.country || '',
    sex: tournament.sex || 'Men',
    tournament_type: tournament.tournament_type || 'Adult',
    category: tournament.category || 'National',
    courseRating: Number(tournament.course_rating) || 72,
    slopeRating: Number(tournament.course_slope) || 130,
    par: Number(tournament.course_par) || 72,
    yardage: tournament.yardage ? Number(tournament.yardage) : undefined,
    participatingAthletes: Number(tournament.field_size) || 0,
    createdAt: new Date(tournament.created_at),
    updatedAt: new Date(tournament.created_at),
    resultsLink: tournament.results_link || undefined,
    startDate: tournament.start_date ? parseLocalDate(tournament.start_date) : undefined,
    endDate: tournament.end_date ? parseLocalDate(tournament.end_date) : undefined,
    status: tournament.status || undefined,
  };
};

// List all tournaments
export const listTournaments = async (): Promise<Tournament[]> => {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .order('start_date', { ascending: false, nullsFirst: false })
    .order('end_date', { ascending: false, nullsFirst: false })
    .order('year', { ascending: false })
    .order('name', { ascending: true });
  
  if (error) {
    console.error('Error fetching tournaments:', error);
    throw error;
  }
  
  return (data || []).map(mapDbTournamentToTournament);
};

// =============================================================================
// searchTournaments — server-side filtered + paginated tournament search.
// Dual-path:
//   - Status === 'needs_results' → admin_search_tournaments_needs_results RPC
//     (returns rows as snake_case jsonb + total_count)
//   - All other statuses → PostgREST query against `tournaments` (snake_case rows)
// Both paths run their rows through mapDbTournamentToTournament so callers
// always receive a Tournament[] with consistent camelCase field names.
// =============================================================================
export interface SearchTournamentsParams {
  search?: string;
  type?: string;        // category filter, 'all' = no filter
  country?: string;     // 'all' = no filter
  year?: string;        // 'all' = no filter
  gender?: string;      // 'Men' | 'Women' | 'all'
  status?: string;      // 'all' | 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'archived' | 'needs_results'
  dateFrom?: string;    // YYYY-MM-DD
  dateTo?: string;      // YYYY-MM-DD
  sortKey?: 'name' | 'year' | 'location' | 'startDate' | 'dateAdded';
  sortDir?: 'asc' | 'desc';
  page?: number;        // 1-based
  pageSize?: number;
}

export interface SearchTournamentsResult {
  rows: Tournament[];
  totalCount: number;
}

export const searchTournaments = async (
  params: SearchTournamentsParams
): Promise<SearchTournamentsResult> => {
  const {
    search = '',
    type = 'all',
    country = 'all',
    year = 'all',
    gender = 'all',
    status = 'all',
    dateFrom,
    dateTo,
    sortKey = 'startDate',
    sortDir = 'desc',
    page = 1,
    pageSize = 25,
  } = params;

  // ---------- Path A: needs_results → RPC ----------
  if (status === 'needs_results') {
    const { data, error } = await supabase.rpc('admin_search_tournaments_needs_results', {
      p_search: search || null,
      p_type: type,
      p_country: country,
      p_gender: gender,
      p_date_from: dateFrom || null,
      p_date_to: dateTo || null,
      p_sort_key: sortKey,
      p_sort_dir: sortDir,
      p_page: page,
      p_page_size: pageSize,
    });

    if (error) {
      console.error('Error in admin_search_tournaments_needs_results RPC:', error);
      throw error;
    }

    const payload = (data as any)?.[0];
    const rawRows: any[] = Array.isArray(payload?.rows) ? payload.rows : [];
    const totalCount: number = Number(payload?.total_count) || 0;

    return {
      rows: rawRows.map(mapDbTournamentToTournament),
      totalCount,
    };
  }

  // ---------- Path B: PostgREST ----------
  const from = (Math.max(page, 1) - 1) * pageSize;
  const to = from + pageSize - 1;

  // The "athletes in database" count shown on each card must reflect only the
  // athletes a coach can actually see on the leaderboard (available / committed /
  // in_college) — NOT every tournament_result (which includes in_creation /
  // archived). We therefore drop the embedded tournament_results(count) aggregate
  // here and fill resultCount from the tournament_visible_counts RPC below.
  let query = supabase
    .from('tournaments')
    .select('*', { count: 'exact' });

  if (search && search.trim() !== '') {
    const s = search.trim();
    // PostgREST .or() requires comma-separated, no spaces in operator args
    query = query.or(
      `name.ilike.%${s}%,location.ilike.%${s}%,country.ilike.%${s}%`
    );
  }
  if (type && type !== 'all') query = query.eq('category', type);
  if (country && country !== 'all') query = query.eq('country', country);
  if (year && year !== 'all') query = query.eq('year', year);
  if (gender && gender !== 'all') query = query.eq('sex', gender);
  if (status && status !== 'all') query = query.eq('status', status);
  if (dateFrom) query = query.or(`end_date.is.null,end_date.gte.${dateFrom}`);
  if (dateTo) query = query.or(`start_date.is.null,start_date.lte.${dateTo}`);

  const asc = sortDir === 'asc';
  if (sortKey === 'dateAdded') {
    // Date ADDED first (created_at), then event date (start_date), then name.
    query = query
      .order('created_at', { ascending: asc, nullsFirst: false })
      .order('start_date', { ascending: asc, nullsFirst: false })
      .order('name', { ascending: true })
      .range(from, to);
  } else {
    // Map sortKey → DB column
    const sortColumn =
      sortKey === 'name' ? 'name' :
      sortKey === 'year' ? 'year' :
      sortKey === 'location' ? 'location' :
      'start_date';

    query = query
      .order(sortColumn, { ascending: asc, nullsFirst: false })
      .order('name', { ascending: true })
      .range(from, to);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error in searchTournaments PostgREST path:', error);
    throw error;
  }

  // Count-neutral: the per-card athlete count is role-dependent and fetched by the
  // caller — coaches use getPageVisibleCounts (visible-only), admin/agent use
  // getPageResultCounts (all statuses).
  return {
    rows: (data || []).map((row: any) => mapDbTournamentToTournament(row)),
    totalCount: count || 0,
  };
};

// =============================================================================
// Coach-visible athlete counts for a page of tournament IDs. Wraps the
// tournament_visible_counts RPC (available / committed / in_college only —
// in_creation and archived are excluded). Returns a Map keyed by tournament id;
// a tournament absent from the RPC result means 0 visible athletes.
// =============================================================================
export const getPageVisibleCounts = async (
  tournamentIds: string[]
): Promise<Map<string, number>> => {
  const result = new Map<string, number>();
  if (!tournamentIds || tournamentIds.length === 0) return result;

  const { data, error } = await (supabase.rpc as any)('tournament_visible_counts', {
    p_ids: tournamentIds,
  });

  if (error) {
    console.error('Error in tournament_visible_counts RPC:', error);
    return result;
  }

  (data || []).forEach((row: any) => {
    result.set(row.tournament_id, Number(row.visible_count) || 0);
  });

  return result;
};

// =============================================================================
// Page-level result counts (athletes + total results) for a list of tournament IDs.
// Wraps admin_tournament_page_result_counts RPC. Returns a Map keyed by tournament id.
// =============================================================================
export const getPageResultCounts = async (
  tournamentIds: string[]
): Promise<Map<string, { athleteCount: number; resultCount: number }>> => {
  const result = new Map<string, { athleteCount: number; resultCount: number }>();
  if (!tournamentIds || tournamentIds.length === 0) return result;

  const { data, error } = await supabase.rpc('admin_tournament_page_result_counts', {
    p_ids: tournamentIds,
  });

  if (error) {
    console.error('Error in admin_tournament_page_result_counts RPC:', error);
    return result;
  }

  (data || []).forEach((row: any) => {
    result.set(row.tournament_id, {
      athleteCount: Number(row.athlete_count) || 0,
      resultCount: Number(row.result_count) || 0,
    });
  });

  return result;
};

// =============================================================================
// Aggregate dashboard stats. Wraps admin_tournament_stats RPC.
// =============================================================================
export interface TournamentStats {
  total: number;
  planned: number;
  in_progress: number;
  completed: number;
  archived: number;
  cancelled: number;
  needs_results: number;
  distinct_countries: number;
  avg_field_size: number;
  total_athletes: number;
  completion_rate: number;
  top_venues: Array<{ venue: string; count: number }>;
}

export const getTournamentStats = async (): Promise<TournamentStats | null> => {
  const { data, error } = await supabase.rpc('admin_tournament_stats');
  if (error) {
    console.error('Error in admin_tournament_stats RPC:', error);
    return null;
  }
  return (data as unknown as TournamentStats) || null;
};

// =============================================================================
// Distinct countries for the filter dropdown. Wraps admin_tournament_distinct_countries.
// =============================================================================
export const getDistinctCountries = async (): Promise<string[]> => {
  const { data, error } = await supabase.rpc('admin_tournament_distinct_countries');
  if (error) {
    console.error('Error in admin_tournament_distinct_countries RPC:', error);
    return [];
  }
  return (data as string[]) || [];
};

// Distinct tournament years for the filter dropdown, most recent first. Ordered
// by year DESC so the recent years (the ones coaches care about) are always
// present even if the row cap trims the very oldest.
export const getDistinctYears = async (): Promise<string[]> => {
  const { data, error } = await supabase
    .from('tournaments')
    .select('year')
    .not('year', 'is', null)
    .order('year', { ascending: false });
  if (error) {
    console.error('Error fetching distinct tournament years:', error);
    return [];
  }
  const seen = new Set<string>();
  for (const row of (data as { year: string | number | null }[]) || []) {
    if (row.year != null && String(row.year).trim() !== '') seen.add(String(row.year));
  }
  return Array.from(seen).sort((a, b) => parseInt(b) - parseInt(a));
};


// Get tournament by ID
export const getTournamentById = async (id: string): Promise<Tournament | null> => {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching tournament:', error);
    return null;
  }
  
  return data ? mapDbTournamentToTournament(data) : null;
};

// Update tournament
export const updateTournament = async (id: string, tournamentData: Partial<Tournament> & {
  series_type?: string;
  raw_date_string?: string;
}): Promise<void> => {
  const dbData: any = {};
  
  if (tournamentData.name !== undefined) dbData.name = tournamentData.name;
  if (tournamentData.series_name !== undefined) dbData.series_name = tournamentData.series_name;
  if (tournamentData.year !== undefined) dbData.year = tournamentData.year;
  if (tournamentData.sex !== undefined) dbData.sex = tournamentData.sex;
  if (tournamentData.location !== undefined) dbData.location = tournamentData.location;
  if (tournamentData.country !== undefined) dbData.country = tournamentData.country;
  if (tournamentData.courseRating !== undefined) dbData.course_rating = tournamentData.courseRating.toString();
  if (tournamentData.slopeRating !== undefined) dbData.course_slope = tournamentData.slopeRating.toString();
  if (tournamentData.par !== undefined) dbData.course_par = tournamentData.par.toString();
  if (tournamentData.yardage !== undefined) dbData.yardage = tournamentData.yardage.toString();
  if (tournamentData.tournament_type !== undefined) dbData.tournament_type = tournamentData.tournament_type;
  if (tournamentData.category !== undefined) dbData.category = tournamentData.category;
  if (tournamentData.participatingAthletes !== undefined) dbData.field_size = tournamentData.participatingAthletes.toString();
  if (tournamentData.resultsLink !== undefined) dbData.results_link = tournamentData.resultsLink;
  if (tournamentData.startDate !== undefined) dbData.start_date = tournamentData.startDate ? format(tournamentData.startDate, 'yyyy-MM-dd') : null;
  if (tournamentData.endDate !== undefined) dbData.end_date = tournamentData.endDate ? format(tournamentData.endDate, 'yyyy-MM-dd') : null;
  if (tournamentData.status !== undefined) dbData.status = tournamentData.status;
  if (tournamentData.series_type !== undefined) dbData.series_type = tournamentData.series_type;
  if (tournamentData.raw_date_string !== undefined) dbData.raw_date_string = tournamentData.raw_date_string;
  
  const { error } = await supabase
    .from('tournaments')
    .update(dbData)
    .eq('id', id);
  
  if (error) {
    console.error('Error updating tournament:', error);
    throw error;
  }
};

// Create tournament
export const createTournament = async (tournamentData: Partial<Tournament> & {
  series_type?: string;
  raw_date_string?: string;
}): Promise<string> => {
  const dbData: any = {
    name: tournamentData.name || '',
    series_name: tournamentData.series_name || tournamentData.name || '',
    year: tournamentData.year || new Date().getFullYear().toString(),
    sex: tournamentData.sex || 'Women',
    location: tournamentData.location || '',
    country: tournamentData.country || '',
    course_rating: tournamentData.courseRating?.toString() || null,
    course_slope: tournamentData.slopeRating?.toString() || null,
    course_par: tournamentData.par?.toString() || null,
    yardage: tournamentData.yardage?.toString() || null,
    tournament_type: tournamentData.tournament_type || 'Adult',
    category: tournamentData.category || 'National',
    field_size: tournamentData.participatingAthletes?.toString() || null,
    results_link: tournamentData.resultsLink || null,
    start_date: tournamentData.startDate ? format(tournamentData.startDate, 'yyyy-MM-dd') : null,
    end_date: tournamentData.endDate ? format(tournamentData.endDate, 'yyyy-MM-dd') : null,
    status: tournamentData.status || 'planned',
    series_type: tournamentData.series_type || null,
    raw_date_string: tournamentData.raw_date_string || null,
  };
  
  const { data, error } = await supabase
    .from('tournaments')
    .insert(dbData)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating tournament:', error);
    throw error;
  }
  
  return data.id;
};

// Delete tournament
export const deleteTournament = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('tournaments')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting tournament:', error);
    throw error;
  }
};

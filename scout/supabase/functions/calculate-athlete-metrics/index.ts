import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase client with the user's auth token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Parse request body
    const { 
      athleteId, 
      filterType = 'all', 
      filterValue = null, 
      metricType = 'scoring_avg_vs_cr',
      refreshAll = false 
    } = await req.json();
    
    if (!athleteId) {
      throw new Error('athleteId is required');
    }

    console.log(`Calculating metrics for athlete ${athleteId} with filter ${filterType}:${filterValue}, refreshAll: ${refreshAll}`);

    // Handle full refresh of all cached statistics
    if (refreshAll) {
      console.log('Refreshing all cached statistics for athlete:', athleteId);
      
      // Call the database function to update all cached statistics
      const { error: cacheError } = await supabase.rpc(
        'update_athlete_statistics_cache',
        { 
          p_athlete_id: athleteId,
          p_metric_type: 'scoring_avg_vs_cr'
        }
      );

      if (cacheError) {
        console.error('Error updating statistics cache:', cacheError);
        throw cacheError;
      }

      // Fetch the updated athlete data
      const { data: athleteData, error: athleteError } = await supabase
        .from('athletes')
        .select('*')
        .eq('id', athleteId)
        .single();

      if (athleteError) {
        console.error('Error fetching updated athlete:', athleteError);
        throw athleteError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'All statistics refreshed successfully',
          athleteData
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Call the database function to calculate the metric (vs CR)
    const { data: metricValue, error: calcError } = await supabase.rpc(
      'calculate_scoring_avg_vs_cr_dynamic',
      { 
        athlete_uuid: athleteId,
        filter_type: filterType,
        filter_value: filterValue
      }
    );

    if (calcError) {
      console.error('Error calculating metric:', calcError);
      throw calcError;
    }

    // Calculate simple scoring average (not vs CR)
    let avgScoreQuery = supabase
      .from('tournament_results')
      .select('total_score, rounds, import_order, tournaments!inner(end_date, start_date, year, name, id)')
      .eq('athlete_id', athleteId)
      .not('total_score', 'is', null);

    // Apply filters
    if (filterType === 'year' && filterValue) {
      avgScoreQuery = avgScoreQuery.eq('tournaments.year', filterValue);
    } else if (filterType === 'last_n' && filterValue) {
      // Get all results first, then filter client-side for last N
      const { data: allResults } = await avgScoreQuery;
      
      const sortedResults = (allResults || [])
        .filter(r => r.total_score && r.total_score > 0)
        .sort((a, b) => {
        const endA = a.tournaments.end_date ? new Date(a.tournaments.end_date).getTime() : null;
        const endB = b.tournaments.end_date ? new Date(b.tournaments.end_date).getTime() : null;
        const startA = a.tournaments.start_date ? new Date(a.tournaments.start_date).getTime() : null;
        const startB = b.tournaments.start_date ? new Date(b.tournaments.start_date).getTime() : null;
        
        const dateA = endA || startA;
        const dateB = endB || startB;
        
        if (dateA && dateB) return dateB - dateA;
        if (dateA) return -1;
        if (dateB) return 1;
        
        // Use import_order (HIGHER = more recent)
        const importOrderA = a.import_order || 0;
        const importOrderB = b.import_order || 0;
        if (importOrderA !== importOrderB) return importOrderB - importOrderA;
        
        const yearA = parseInt(a.tournaments.year || '0');
        const yearB = parseInt(b.tournaments.year || '0');
        if (yearA !== yearB) return yearB - yearA;
        
        return (a.tournaments.name || '').localeCompare(b.tournaments.name || '');
      }).slice(0, parseInt(filterValue));

      // Round-weighted: SUM(total_score) / SUM(rounds)
      let totalScoreSum = 0;
      let totalRoundsSum = 0;
      sortedResults.forEach(r => {
        const rounds = r.rounds ? r.rounds.split(',').length : 4;
        totalScoreSum += r.total_score;
        totalRoundsSum += rounds;
      });
      const avgScore = totalRoundsSum > 0
        ? Number((totalScoreSum / totalRoundsSum).toFixed(2))
        : 0;

      avgScoreQuery = null; // Skip the query below
      
      const response = {
        athleteId,
        filterType,
        filterValue,
        metricValue: metricValue || 0,
        avgScore,
        tournamentsIncluded: sortedResults.length,
        calculatedAt: new Date().toISOString()
      };

      return new Response(
        JSON.stringify(response),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    let avgScore = 0;
    if (avgScoreQuery) {
      const { data: scoreResults } = await avgScoreQuery;
      
      if (scoreResults && scoreResults.length > 0) {
      const validResults = scoreResults.filter(r => r.total_score && r.total_score > 0);
        // Round-weighted: SUM(total_score) / SUM(rounds)
        let totalScoreSum2 = 0;
        let totalRoundsSum2 = 0;
        validResults.forEach(r => {
          const rounds = r.rounds ? r.rounds.split(',').length : 4;
          totalScoreSum2 += r.total_score;
          totalRoundsSum2 += rounds;
        });
        avgScore = totalRoundsSum2 > 0
          ? Number((totalScoreSum2 / totalRoundsSum2).toFixed(2))
          : 0;
      }
    }

    // Get tournament count for context
    let tournamentQuery = supabase
      .from('tournament_results')
      .select('id', { count: 'exact' })
      .eq('athlete_id', athleteId)
      .not('total_score', 'is', null);

    // Apply filters based on type
    if (filterType === 'year' && filterValue) {
      const { data: tournaments } = await supabase
        .from('tournaments')
        .select('id')
        .eq('year', filterValue);
      
      if (tournaments) {
        tournamentQuery = tournamentQuery.in('tournament_id', tournaments.map(t => t.id));
      }
    } else if (filterType === 'last_n' && filterValue) {
      // For last N, get the most recent tournaments by priority-based sorting
      const { data: allResults } = await supabase
        .from('tournament_results')
        .select('tournament_id, import_order, tournaments!inner(end_date, start_date, year, name)')
        .eq('athlete_id', athleteId)
        .not('total_score', 'is', null);
      
      // Sort by priority: dates → import_order → year → name
      const sortedResults = (allResults || []).sort((a, b) => {
        // Priority 1: Sort by dates if available
        const endA = a.tournaments.end_date ? new Date(a.tournaments.end_date).getTime() : null;
        const endB = b.tournaments.end_date ? new Date(b.tournaments.end_date).getTime() : null;
        const startA = a.tournaments.start_date ? new Date(a.tournaments.start_date).getTime() : null;
        const startB = b.tournaments.start_date ? new Date(b.tournaments.start_date).getTime() : null;
        
        const dateA = endA || startA;
        const dateB = endB || startB;
        
        if (dateA && dateB) return dateB - dateA;
        if (dateA) return -1;
        if (dateB) return 1;
        
        // Priority 2: Use import_order (HIGHER = more recent)
        const importOrderA = a.import_order || 0;
        const importOrderB = b.import_order || 0;
        if (importOrderA !== importOrderB) return importOrderB - importOrderA;
        
        // Priority 3: Sort by year (most recent first)
        const yearA = parseInt(a.tournaments.year || '0');
        const yearB = parseInt(b.tournaments.year || '0');
        if (yearA !== yearB) return yearB - yearA;
        
        // Priority 4: Sort by tournament name alphabetically
        const nameA = a.tournaments.name || '';
        const nameB = b.tournaments.name || '';
        return nameA.localeCompare(nameB);
      }).slice(0, parseInt(filterValue));
      
      if (sortedResults && sortedResults.length > 0) {
        tournamentQuery = supabase
          .from('tournament_results')
          .select('id', { count: 'exact' })
          .eq('athlete_id', athleteId)
          .in('tournament_id', sortedResults.map(r => r.tournament_id));
      }
    }

    const { count: tournamentCount } = await tournamentQuery;

    // Update cache if this is a common query
    if (filterType === 'all' || filterType === 'year' || (filterType === 'last_n' && ['5', '10'].includes(filterValue))) {
      const { error: cacheError } = await supabase.rpc(
        'update_athlete_statistics_cache',
        { 
          p_athlete_id: athleteId,
          p_metric_type: 'scoring_avg_vs_cr'
        }
      );

      if (cacheError) {
        console.warn('Failed to update cache:', cacheError);
        // Don't throw, cache update is not critical
      }
    }

    const response = {
      athleteId,
      filterType,
      filterValue,
      metricValue: metricValue || 0,
      avgScore,
      tournamentsIncluded: tournamentCount || 0,
      calculatedAt: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error in calculate-athlete-metrics:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred calculating metrics' 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
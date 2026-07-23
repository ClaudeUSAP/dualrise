import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BackfillRequest {
  batchSize?: number;
  athleteIds?: string[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: isAdmin, error: roleError } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { batchSize = 50, athleteIds }: BackfillRequest = await req.json().catch(() => ({}));

    let query = supabaseClient.from('athletes').select('id');
    
    if (athleteIds && athleteIds.length > 0) {
      query = query.in('id', athleteIds);
    }

    const { data: athletes, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    console.log(`Starting backfill for ${athletes?.length || 0} athletes`);

    let processed = 0;
    let errors = 0;

    for (const athlete of athletes || []) {
      try {
        const { error: updateError } = await supabaseClient.rpc('update_athlete_statistics_cache', {
          p_athlete_id: athlete.id,
          p_metric_type: 'scoring_avg_vs_cr'
        });

        if (updateError) {
          console.error(`Error updating athlete ${athlete.id}:`, updateError);
          errors++;
        } else {
          processed++;
        }

        if (processed % batchSize === 0) {
          console.log(`Processed ${processed} athletes so far...`);
        }
      } catch (err) {
        console.error(`Exception updating athlete ${athlete.id}:`, err);
        errors++;
      }
    }

    console.log(`Backfill complete: ${processed} athletes processed, ${errors} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed, 
        errors,
        total: athletes?.length || 0 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Backfill error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);

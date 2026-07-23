import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Check if user is admin using anon key client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: role, error: roleError } = await supabaseClient.rpc('get_current_user_role');
    
    if (roleError) {
      console.error('Error checking user role:', roleError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to verify user role' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (role !== 'admin') {
      console.error('Non-admin user attempted to call expire-athlete-status:', role);
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden - Admin access required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    console.log('Admin user verified, proceeding with athlete status expiry');

    // Use service role key to bypass RLS for the actual operation
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting athlete status expiry check...');

    // Call the auto-expire function
    const { error } = await supabase.rpc('auto_expire_athlete_status');

    if (error) {
      console.error('Error expiring athlete statuses:', error);
      throw error;
    }

    console.log('Successfully expired athlete statuses');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Athlete statuses updated successfully' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in expire-athlete-status function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

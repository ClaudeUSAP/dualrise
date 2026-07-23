import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { Resend } from "npm:resend@2.0.0";
import React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { AthleteInfoEmail } from './_templates/athlete-info.tsx';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AthleteInfoRequest {
  coachEmail: string;
  coachName: string;
  athleteData: {
    firstName: string;
    lastName: string;
    graduationYear?: number;
    country?: string;
    rating?: number;
    scoringAvg?: string;
    bestRecentScoring?: string;
    committedTo?: string;
    videoLinks?: string;
    gpa?: string;
    sat?: string;
  };
}

// Validation helper functions
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && emailRegex.test(email) && email.length <= 255;
};

const validateString = (str: string | undefined | null, maxLength: number): boolean => {
  if (str === undefined || str === null) return true; // Optional fields
  return typeof str === 'string' && str.length <= maxLength;
};

const validateRequiredString = (str: string, maxLength: number): boolean => {
  return typeof str === 'string' && str.trim().length > 0 && str.length <= maxLength;
};

const sanitizeString = (str: string | undefined | null): string => {
  if (!str) return '';
  // Remove any control characters and trim
  return str.replace(/[\x00-\x1F\x7F]/g, '').trim();
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT and check admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !roleData || roleData.role !== 'admin') {
      console.error('Unauthorized access attempt by user:', user.id);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { coachEmail, coachName, athleteData }: AthleteInfoRequest = await req.json();

    // Input validation
    if (!validateEmail(coachEmail)) {
      console.error('Invalid coachEmail format:', coachEmail);
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!validateRequiredString(coachName, 200)) {
      return new Response(
        JSON.stringify({ error: 'Invalid coachName: must be 1-200 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!validateRequiredString(athleteData.firstName, 100)) {
      return new Response(
        JSON.stringify({ error: 'Invalid athlete firstName: must be 1-100 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!validateRequiredString(athleteData.lastName, 100)) {
      return new Response(
        JSON.stringify({ error: 'Invalid athlete lastName: must be 1-100 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate optional fields
    if (!validateString(athleteData.country, 100) ||
        !validateString(athleteData.scoringAvg, 50) ||
        !validateString(athleteData.bestRecentScoring, 50) ||
        !validateString(athleteData.committedTo, 200) ||
        !validateString(athleteData.videoLinks, 2000) ||
        !validateString(athleteData.gpa, 20) ||
        !validateString(athleteData.sat, 20)) {
      return new Response(
        JSON.stringify({ error: 'One or more athlete data fields exceed maximum length' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize all inputs
    const safeCoachEmail = sanitizeString(coachEmail);
    const safeCoachName = sanitizeString(coachName);
    const safeAthleteData = {
      firstName: sanitizeString(athleteData.firstName),
      lastName: sanitizeString(athleteData.lastName),
      graduationYear: athleteData.graduationYear,
      country: sanitizeString(athleteData.country),
      rating: athleteData.rating,
      scoringAvg: sanitizeString(athleteData.scoringAvg),
      bestRecentScoring: sanitizeString(athleteData.bestRecentScoring),
      committedTo: sanitizeString(athleteData.committedTo),
      videoLinks: sanitizeString(athleteData.videoLinks),
      gpa: sanitizeString(athleteData.gpa),
      sat: sanitizeString(athleteData.sat),
    };

    console.log(`Sending athlete info to ${safeCoachEmail} for ${safeAthleteData.firstName} ${safeAthleteData.lastName}`);

    // Render the React email template with sanitized inputs
    const html = await renderAsync(
      React.createElement(AthleteInfoEmail, {
        coachName: safeCoachName,
        athleteData: safeAthleteData
      })
    );

    const emailResponse = await resend.emails.send({
      from: "Scout by Dual Rise <scout@notifications.usathleticperformance.com>",
      to: [safeCoachEmail],
      subject: `Athlete Information: ${safeAthleteData.firstName} ${safeAthleteData.lastName}`,
      html,
    });

    console.log("Athlete info email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-athlete-info function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

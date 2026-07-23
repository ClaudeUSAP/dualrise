import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import React from "npm:react@18.3.1";
import { RegistrationConfirmationEmail } from "./_templates/registration-confirmation.tsx";

// Input validation helpers
const validateEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

const validateString = (str: string, maxLength: number): boolean => {
  return typeof str === 'string' && str.trim().length > 0 && str.length <= maxLength;
};

const sanitizeString = (str: string): string => {
  return str.trim().replace(/[<>]/g, '');
};

interface RegistrationConfirmationRequest {
  firstName: string;
  lastName: string;
  university?: string;
  universityId?: string;
  email: string;
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};


const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.3');
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    const { firstName, lastName, university, universityId, email }: RegistrationConfirmationRequest = await req.json();

    // Input validation
    if (!validateEmail(email)) {
      console.error('Invalid email format:', email);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!validateString(firstName, 100)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid firstName: must be 1-100 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!validateString(lastName, 100)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid lastName: must be 1-100 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve the real school name: prefer universities.name from the id, then the
    // provided university string, then a neutral fallback (never the legacy
    // "University" placeholder).
    let resolvedUniversity =
      university && university.trim() && university.trim() !== 'University'
        ? university.trim()
        : '';
    if (universityId) {
      try {
        const { data: uni } = await supabaseAdmin
          .from('universities')
          .select('name')
          .eq('id', universityId)
          .maybeSingle();
        if (uni?.name) resolvedUniversity = uni.name as string;
      } catch (e) {
        console.error('Failed to resolve university name from id:', e);
      }
    }
    if (!resolvedUniversity) resolvedUniversity = 'your university';

    // Sanitize inputs before use
    const safeFirstName = sanitizeString(firstName);
    const safeLastName = sanitizeString(lastName);
    const safeUniversity = sanitizeString(resolvedUniversity);
    const safeEmail = sanitizeString(email);

    console.log(`Sending registration confirmation to ${safeEmail} (${safeFirstName} ${safeLastName} - ${safeUniversity})`);

    // Render the React Email template with sanitized inputs
    const html = await renderAsync(
      React.createElement(RegistrationConfirmationEmail, {
        firstName: safeFirstName,
        lastName: safeLastName,
        university: safeUniversity,
        email: safeEmail,
      })
    );

    // Log email attempt
    const { error: logError } = await supabaseAdmin
      .from('email_logs')
      .insert({
        email_type: 'coach_registration_confirmation',
        recipient_email: safeEmail,
        subject: 'Scout by Dual Rise - Registration Confirmed',
        status: 'pending',
        metadata: { firstName: safeFirstName, lastName: safeLastName, university: safeUniversity }
      });

    if (logError) {
      console.error('Failed to log email attempt:', logError);
    }

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Scout by Dual Rise <scout@notifications.usathleticperformance.com>",
      to: [safeEmail],
      subject: "Scout by Dual Rise - Registration Confirmed - Awaiting Approval",
      html,
    });

    // Update log with success
    if (emailResponse.data?.id) {
      await supabaseAdmin
        .from('email_logs')
        .update({ 
          status: 'sent',
          metadata: { 
            firstName: safeFirstName, 
            lastName: safeLastName, 
            university: safeUniversity,
            resend_id: emailResponse.data.id 
          }
        })
        .eq('recipient_email', safeEmail)
        .eq('email_type', 'coach_registration_confirmation')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);
    }

    console.log("Registration confirmation email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Registration confirmation sent",
        emailId: emailResponse.data?.id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-coach-registration-confirmation function:", error);

    // Log failure
    try {
      await supabaseAdmin
        .from('email_logs')
        .update({ 
          status: 'failed',
          error_message: error.message
        })
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);

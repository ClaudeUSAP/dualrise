import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { Resend } from "npm:resend@2.0.0";
import React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { CoachApprovalEmail } from './_templates/coach-approval.tsx';

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

interface ApprovalEmailRequest {
  email: string;
  first_name: string;
  last_name: string;
  school_name: string;
}

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

    // Check the caller is an admin or agent. A user can have MULTIPLE user_roles
    // rows, so .single() would error for them — fetch all rows and check membership.
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAuthorized = (roles ?? []).some(
      (r: { role: string }) => r.role === 'admin' || r.role === 'agent'
    );

    if (!isAuthorized) {
      console.error('Unauthorized access attempt by user:', user.id);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, first_name, last_name, school_name }: ApprovalEmailRequest = await req.json();

    console.log(`Sending approval email to ${email} for ${first_name} ${last_name}`);

    const subject = "Your Scout by Dual Rise Account Has Been Approved!";

    // Render the React email template
    const html = await renderAsync(
      React.createElement(CoachApprovalEmail, {
        firstName: first_name,
        lastName: last_name,
        university: school_name,
        loginUrl: 'https://scout.usathleticperformance.com/login'
      })
    );

    const emailResponse = await resend.emails.send({
      from: "Scout by Dual Rise <scout@notifications.usathleticperformance.com>",
      to: [email],
      subject,
      html,
    });

    console.log("Approval email result:", JSON.stringify(emailResponse));

    // Log to email_logs (coach_approval)
    await supabase.from('email_logs').insert({
      email_type: 'coach_approval',
      recipient_email: email,
      subject,
      status: emailResponse.error ? 'failed' : 'sent',
      error_message: emailResponse.error?.message ?? null,
      metadata: {
        first_name,
        last_name,
        school_name,
        resend_id: emailResponse.data?.id ?? null,
      },
    });

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-coach-approval-email function:", error);
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

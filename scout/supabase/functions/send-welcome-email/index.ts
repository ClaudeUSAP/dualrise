import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import React from "npm:react@18.3.1";
import { AdminWelcomeEmail } from "./_templates/admin-welcome-email.tsx";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  full_name: string;
  role: string;
  password?: string; // Optional - only used in fallback mode
  resetLink?: string; // Preferred - secure password reset link
  useResetLink?: boolean;
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

const validateRole = (role: string): boolean => {
  const validRoles = ['admin', 'agent', 'coach'];
  return validRoles.includes(role);
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
    // Extract and verify JWT to ensure authenticated admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.3');
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    });

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CRITICAL: Verify the user has admin role using the has_role function
    const { data: isAdmin, error: roleError } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      console.error('Admin verification failed:', { userId: user.id, roleError });
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin role required to send welcome emails' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Admin verified:', user.id);

    const { email, full_name, role, password, resetLink, useResetLink }: WelcomeEmailRequest = await req.json();

    // Input validation
    if (!validateEmail(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!validateRequiredString(full_name, 200)) {
      return new Response(
        JSON.stringify({ error: 'full_name is required and must be 1-200 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!validateRole(role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role. Must be admin, agent, or coach' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate reset link if provided
    if (useResetLink && resetLink && !validateString(resetLink, 2000)) {
      return new Response(
        JSON.stringify({ error: 'Invalid reset link format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize inputs
    const safeEmail = sanitizeString(email);
    const safeFullName = sanitizeString(full_name);
    const safeRole = sanitizeString(role);

    console.log(`Sending welcome email to ${safeEmail} (${safeRole}) - useResetLink: ${useResetLink}`);

    const loginUrl = 'https://scout.usathleticperformance.com/login';

    // Render the React Email template with sanitized inputs
    const html = await renderAsync(
      React.createElement(AdminWelcomeEmail, {
        fullName: safeFullName,
        email: safeEmail,
        password: useResetLink ? undefined : password, // Only include password in fallback mode
        resetLink: useResetLink ? resetLink : undefined,
        role: safeRole,
        loginUrl,
        useResetLink: useResetLink || false,
      })
    );

    // Log email attempt using service role
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const { createClient: createServiceClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.3');
    const supabaseAdmin = createServiceClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { error: logError } = await supabaseAdmin
      .from('email_logs')
      .insert({
        email_type: 'admin_welcome',
        recipient_email: safeEmail,
        subject: 'Welcome to Scout by Dual Rise',
        status: 'pending',
        metadata: { full_name: safeFullName, role: safeRole, useResetLink: useResetLink || false }
      });

    if (logError) {
      console.error('Failed to log email attempt:', logError);
    }

    const emailResponse = await resend.emails.send({
      from: "Scout by Dual Rise <scout@notifications.usathleticperformance.com>",
      to: [safeEmail],
      subject: `Welcome to Scout by Dual Rise - Your ${safeRole} Account`,
      html,
    });

    // Update log with success
    if (emailResponse.data?.id) {
      await supabaseAdmin
        .from('email_logs')
        .update({ 
          status: 'sent',
          metadata: { 
            full_name: safeFullName, 
            role: safeRole,
            useResetLink: useResetLink || false,
            resend_id: emailResponse.data.id 
          }
        })
        .eq('recipient_email', safeEmail)
        .eq('email_type', 'admin_welcome')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);
    }

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);

    // Log failure
    try {
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const { createClient: createServiceClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.3');
      const supabaseAdmin = createServiceClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      await supabaseAdmin
        .from('email_logs')
        .update({ 
          status: 'failed',
          error_message: error.message
        })
        .eq('status', 'pending')
        .eq('email_type', 'admin_welcome')
        .order('created_at', { ascending: false })
        .limit(1);
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

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

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { Resend } from 'npm:resend@4.0.0';
import React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { PasswordResetLinkEmail } from './_templates/password-reset-link.tsx';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

interface PasswordResetRequest {
  userEmail: string;
  frontendUrl: string;
  mode?: 'link';
}

const PRODUCTION_URL = 'https://scout.usathleticperformance.com';

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has admin role
    const { data: hasAdminRole } = await supabaseAdmin.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!hasAdminRole) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { userEmail, frontendUrl }: PasswordResetRequest = await req.json();

    if (!userEmail || !frontendUrl) {
      throw new Error('Missing required fields: userEmail, frontendUrl');
    }

    // Generate password reset link using service role
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: userEmail,
      options: {
        redirectTo: `${PRODUCTION_URL}/password-reset/new-password`
      }
    });

    if (linkError || !linkData) {
      console.error('Error generating reset link:', linkError);
      throw new Error(`Failed to generate reset link: ${linkError?.message || 'Unknown error'}`);
    }

    const actionLink = linkData.properties?.action_link;
    if (!actionLink) {
      throw new Error('No action link generated');
    }

    // Extract token_hash from the Supabase-generated action link
    const actionUrl = new URL(actionLink);
    const tokenHash = actionUrl.searchParams.get('token_hash') || actionUrl.searchParams.get('token');
    const tokenType = actionUrl.searchParams.get('type') || 'recovery';

    if (!tokenHash) {
      // Fallback: if we can't extract token_hash, use the hashed_token from linkData
      console.warn('Could not extract token_hash from action_link, falling back to hashed_token');
    }

    const extractedHash = tokenHash || linkData.properties?.hashed_token;

    if (!extractedHash) {
      throw new Error('Could not extract token hash from generated link');
    }

    // Build app-direct URLs that bypass Supabase's /auth/v1/verify endpoint
    const appResetLink = `${PRODUCTION_URL}/password-reset/new-password?token_hash=${encodeURIComponent(extractedHash)}&type=${encodeURIComponent(tokenType)}`;
    const fallbackResetLink = appResetLink;

    console.log('Built app-direct reset link (scanner-proof):', appResetLink);

    // Render email template
    const html = await renderAsync(
      React.createElement(PasswordResetLinkEmail, {
        userEmail,
        actionLink: appResetLink,
        fallbackLink: fallbackResetLink,
      })
    );

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: "Scout by Dual Rise <scout@notifications.usathleticperformance.com>",
      to: [userEmail],
      subject: 'Reset Your Password',
      html,
    });

    if (error) {
      console.error('Error sending email:', error);
      throw error;
    }

    console.log('Password reset email sent successfully:', data);

    return new Response(
      JSON.stringify({ success: true, messageId: data?.id }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in send-password-reset-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);

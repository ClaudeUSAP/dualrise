import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin using has_role function (handles multiple roles)
    const { data: isAdmin, error: roleError } = await supabaseAdmin
      .rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });

    if (roleError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Only admins can create admin users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, password, full_name, first_name, last_name, role, phone, status } = await req.json();

    // Input validation
    if (!validateEmail(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Password must be provided by client (never generate server-side to avoid logging)
    if (!password || typeof password !== 'string' || password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Password is required and must be at least 8 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!validateRequiredString(full_name, 200)) {
      return new Response(
        JSON.stringify({ error: 'full_name is required and must be 1-200 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!validateString(first_name, 100) || !validateString(last_name, 100)) {
      return new Response(
        JSON.stringify({ error: 'first_name and last_name must be under 100 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (role && !validateRole(role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role. Must be admin, agent, or coach' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!validateString(phone, 50)) {
      return new Response(
        JSON.stringify({ error: 'phone must be under 50 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize inputs
    const safeEmail = sanitizeString(email);
    const safeFullName = sanitizeString(full_name);
    const safeFirstName = sanitizeString(first_name);
    const safeLastName = sanitizeString(last_name);
    const safeRole = role || 'admin';
    const safePhone = sanitizeString(phone);
    const safeStatus = status || 'active';

    // Create auth user with service role (using sanitized inputs)
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: safeEmail,
      password: password, // Keep raw password for auth
      email_confirm: true,
      user_metadata: {
        full_name: safeFullName,
        first_name: safeFirstName,
        last_name: safeLastName,
        role: safeRole,
      }
    });

    if (createError) {
      console.error('Error creating auth user:', createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: 'Failed to create user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update additional fields if provided (using sanitized inputs)
    if (safePhone || safeStatus) {
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          phone: safePhone || null,
          status: safeStatus
        })
        .eq('id', authData.user.id);

      if (updateError) {
        console.error('Error updating user details:', updateError);
      }
    }

    // Generate password reset link instead of sending plaintext password
    const frontendUrl = 'https://scout.usathleticperformance.com';
    const { data: resetLinkData, error: resetLinkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: safeEmail,
      options: {
        redirectTo: `${frontendUrl}/password-reset/new-password`
      }
    });

    let emailSent = false;
    try {
      if (resetLinkError) {
        console.error('Failed to generate reset link:', resetLinkError);
        // Fall back to password in email (less secure but functional)
        const { error: emailError } = await supabaseAdmin.functions.invoke('send-welcome-email', {
          body: {
            email: safeEmail,
            full_name: safeFullName,
            role: safeRole,
            password: password,
            useResetLink: false
          },
          headers: {
            Authorization: authHeader
          }
        });
        emailSent = !emailError;
      } else {
        // Send welcome email with secure reset link
        const { error: emailError } = await supabaseAdmin.functions.invoke('send-welcome-email', {
          body: {
            email: safeEmail,
            full_name: safeFullName,
            role: safeRole,
            resetLink: resetLinkData.properties.action_link,
            useResetLink: true
          },
          headers: {
            Authorization: authHeader
          }
        });
        emailSent = !emailError;
      }
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }

    // ✅ SECURITY: Never return password in response to prevent logging
    return new Response(
      JSON.stringify({ 
        success: true,
        emailSent 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-admin-user function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});


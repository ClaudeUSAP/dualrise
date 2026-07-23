import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "npm:resend@2.0.0";

// DEPLOYMENT VERSION - Used to verify new code is running
const DEPLOYMENT_VERSION = "v2.7.0-otp-fallback";

// Always notify this address even if no active admins resolve from the DB.
const FALLBACK_ADMIN_EMAIL = "nicolas@usathleticperformance.com";

// Helper to add delay between API calls to respect rate limits
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Input validation helpers
const validateUUID = (uuid: string): boolean => {
  if (!uuid || typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

const validateEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

const validateString = (str: string, maxLength: number): boolean => {
  return typeof str === 'string' && str.trim().length > 0 && str.length <= maxLength;
};

const sanitizeString = (str: string): string => {
  return String(str ?? '').trim().replace(/[<>]/g, '').slice(0, 300);
};

interface NotifyAdminsRequest {
  coachId: string;
  firstName: string;
  lastName?: string;
  university?: string;
  email: string;
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};


const handler = async (req: Request): Promise<Response> => {
  // Log version immediately on every request
  console.log(`🚀 notify-admins-new-coach ${DEPLOYMENT_VERSION} - Request received`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // JWT validation gate
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    console.error('Missing or invalid Authorization header');
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseAuth = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: userData } = await supabaseAuth.auth.getUser();
  const callerUserId = userData?.user?.id ?? null;
  // A null caller (no user JWT) is allowed ONLY for internal service calls made by
  // the signup trigger (pg_net + anon key); those are authorized below once the
  // coachId is confirmed to be a real user row.
  console.log(`Caller user: ${callerUserId ?? '(none — internal/service call)'}`);

  try {
    const { coachId, firstName, lastName, university, email }: NotifyAdminsRequest = await req.json();

    console.log(`📋 ${DEPLOYMENT_VERSION} - Notification request:`, { coachId, firstName, lastName, university, email });

    // Input validation — firstName + email are required; lastName/university are optional
    // (the OTP bootstrap flow has no name/university yet, but we still want the email to fire).
    if (!validateUUID(coachId)) {
      console.error('Invalid coachId format:', coachId);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid coachId format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!validateString(firstName, 100)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid firstName: must be 1-100 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!validateEmail(email)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize inputs (lastName/university optional)
    const sanitizedFirstName = sanitizeString(firstName);
    const sanitizedLastName = lastName ? sanitizeString(lastName) : '';
    const sanitizedUniversity = university ? sanitizeString(university) : 'N/A';
    const sanitizedEmail = sanitizeString(email);
    const displayName = `${sanitizedFirstName}${sanitizedLastName ? ' ' + sanitizedLastName : ''}`;

    console.log('Processing new coach notification:', { coachId, firstName: sanitizedFirstName, lastName: sanitizedLastName, university: sanitizedUniversity, email: sanitizedEmail });

    // Create Supabase client with service role to bypass RLS
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

    // Authorization: a signed-in user (client path) is always allowed. A call
    // with no user JWT is only allowed if it is an internal service call for a
    // coachId that actually exists (the signup trigger via pg_net + anon key).
    if (!callerUserId) {
      const { data: coachRow } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', coachId)
        .maybeSingle();
      if (!coachRow) {
        console.error('Unauthorized: no user JWT and coachId is not a real user', coachId);
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log(`🔐 Internal service call authorized for existing coach ${coachId}`);
    }

    // Idempotency: if this coach was already notified successfully, skip. This
    // prevents duplicate emails when both the Register flow and the OTP
    // ensureUserBootstrap path invoke this function for the same coach.
    const { data: priorLog } = await supabaseAdmin
      .from('email_logs')
      .select('id')
      .eq('email_type', 'admin_new_coach_notification')
      .eq('status', 'sent')
      .eq('metadata->>coachId', coachId)
      .limit(1)
      .maybeSingle();

    if (priorLog) {
      console.log(`↩️ ${DEPLOYMENT_VERSION} - Coach ${coachId} already notified — skipping duplicate`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, message: 'Already notified' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Get admin user IDs from user_roles
    const { data: adminRoles, error: adminRolesError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (adminRolesError) {
      console.error('Error fetching admin roles:', adminRolesError);
    }

    const adminUserIds = (adminRoles ?? []).map(r => r.user_id);
    console.log(`📍 ${DEPLOYMENT_VERSION} - Found ${adminUserIds.length} admin user IDs:`, adminUserIds);

    // Step 2: Get email addresses from users table - ONLY active admins
    let activeAdminUsers: Array<{ id: string; email: string | null; status: string }> = [];
    if (adminUserIds.length > 0) {
      const { data: adminUsers, error: adminUsersError } = await supabaseAdmin
        .from('users')
        .select('id, email, status')
        .in('id', adminUserIds)
        .eq('status', 'active');

      if (adminUsersError) {
        console.error('Error fetching admin user emails:', adminUsersError);
      }
      activeAdminUsers = adminUsers ?? [];
    }

    console.log(`📧 ${DEPLOYMENT_VERSION} - Active admins resolved: ${activeAdminUsers.length}`);

    // Create in-app notifications for resolved active admins (if any)
    let notificationsCreated = 0;
    if (activeAdminUsers.length > 0) {
      const notifications = activeAdminUsers.map(admin => ({
        user_id: admin.id,
        title: 'Scout by Dual Rise - New Coach Registration',
        message: `${displayName} from ${sanitizedUniversity} has registered and is awaiting approval.`,
        notification_type: 'admin_action',
        category: 'registration',
        is_priority: true,
        is_read: false,
        related_athlete_id: null,
        metadata: {
          coachId,
          firstName: sanitizedFirstName,
          lastName: sanitizedLastName,
          university: sanitizedUniversity,
          email: sanitizedEmail,
          timestamp: new Date().toISOString()
        }
      }));

      const { data: insertedNotifications, error: notificationError } = await supabaseAdmin
        .from('notifications')
        .insert(notifications)
        .select();

      if (notificationError) {
        console.error('Error creating notifications:', notificationError);
      } else {
        notificationsCreated = insertedNotifications?.length || 0;
        console.log(`Successfully created ${notificationsCreated} in-app notifications`);
      }
    }

    // Build the email recipient list, ALWAYS including the fallback admin email.
    const adminEmails = activeAdminUsers
      .map(admin => admin.email)
      .filter((e): e is string => !!e);
    if (!adminEmails.includes(FALLBACK_ADMIN_EMAIL)) {
      adminEmails.push(FALLBACK_ADMIN_EMAIL);
    }

    console.log(`📤 ${DEPLOYMENT_VERSION} - Sending email to ${adminEmails.length} admin(s):`, adminEmails);

    const loginUrl = 'https://scout.usathleticperformance.com/admin/coaches';

    let emailsSent = 0;
    try {
      for (const adminEmail of adminEmails) {
        console.log(`📨 ${DEPLOYMENT_VERSION} - Sending email to: ${adminEmail}`);
        const emailResult = await resend.emails.send({
          from: "Scout by Dual Rise <scout@notifications.usathleticperformance.com>",
          to: [adminEmail],
          subject: `Scout by Dual Rise - New Coach Registration: ${displayName}`,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; background: #f6f9fc; margin: 0; padding: 0; }
                  .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; }
                  .header { background: linear-gradient(135deg, #dc2626 0%, #e11d2a 100%); color: white; padding: 30px; }
                  .content { padding: 30px; }
                  .info-box { background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0; border-radius: 4px; }
                  .detail { margin: 12px 0; color: #374151; }
                  .label { font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase; }
                  .value { margin-top: 4px; color: #1f2937; }
                  .button { display: inline-block; background: #dc2626; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
                  .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1 style="margin: 0; font-size: 24px;">🔔 New Coach Registration</h1>
                    <p style="margin: 10px 0 0; opacity: 0.9;">Action Required: Review & Approve</p>
                  </div>
                  <div class="content">
                    <div class="info-box">
                      <p style="margin: 0; font-weight: bold; color: #991b1b;">⚠️ Pending Approval</p>
                      <p style="margin: 8px 0 0; color: #7f1d1d;">A new coach has registered and is waiting for approval to access the platform.</p>
                    </div>

                    <h2 style="color: #1f2937; font-size: 18px; margin: 24px 0 16px;">Coach Details</h2>

                    <div class="detail">
                      <div class="label">Name</div>
                      <div class="value">${displayName}</div>
                    </div>

                    <div class="detail">
                      <div class="label">University</div>
                      <div class="value">${sanitizedUniversity}</div>
                    </div>

                    <div class="detail">
                      <div class="label">Email</div>
                      <div class="value">${sanitizedEmail}</div>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${loginUrl}" class="button">Review Registration →</a>
                    </div>

                    <p style="color: #6b7280; font-size: 14px; text-align: center;">
                      Or copy this link: ${loginUrl}
                    </p>

                    <p style="color: #6b7280; font-size: 14px; margin: 20px 0 0;">
                      Please review this registration and approve or reject the account within 24-48 hours.
                    </p>
                  </div>
                  <div class="footer">
                    French Golf Connect - Dual Rise
                  </div>
                </div>
              </body>
            </html>
          `,
        });

        console.log(`✅ ${DEPLOYMENT_VERSION} - Email result for ${adminEmail}:`, JSON.stringify(emailResult));

        if (emailResult.error) {
          console.error(`❌ Failed to send email to ${adminEmail}:`, emailResult.error);
          await supabaseAdmin
            .from('email_logs')
            .insert({
              email_type: 'admin_new_coach_notification',
              recipient_email: adminEmail,
              subject: `New Coach Registration: ${displayName}`,
              status: 'failed',
              error_message: emailResult.error.message || 'Rate limit or API error',
              metadata: { coachId, firstName: sanitizedFirstName, lastName: sanitizedLastName, university: sanitizedUniversity, email: sanitizedEmail }
            });
        } else {
          await supabaseAdmin
            .from('email_logs')
            .insert({
              email_type: 'admin_new_coach_notification',
              recipient_email: adminEmail,
              subject: `New Coach Registration: ${displayName}`,
              status: 'sent',
              metadata: { coachId, firstName: sanitizedFirstName, lastName: sanitizedLastName, university: sanitizedUniversity, email: sanitizedEmail }
            });

          emailsSent++;
          console.log(`✓ Email sent successfully to ${adminEmail}`);
        }

        // 600ms delay between emails to respect Resend's 2 req/s rate limit
        if (adminEmails.indexOf(adminEmail) < adminEmails.length - 1) {
          await delay(600);
        }
      }

      console.log(`✅ ${DEPLOYMENT_VERSION} - Successfully sent ${emailsSent} email(s)`);
    } catch (emailError: any) {
      console.error(`❌ ${DEPLOYMENT_VERSION} - Error sending admin emails:`, emailError);
      for (const adminEmail of adminEmails) {
        await supabaseAdmin
          .from('email_logs')
          .insert({
            email_type: 'admin_new_coach_notification',
            recipient_email: adminEmail,
            subject: `New Coach Registration: ${displayName}`,
            status: 'failed',
            error_message: emailError.message || 'Unknown error',
            metadata: { coachId, firstName: sanitizedFirstName, lastName: sanitizedLastName, university: sanitizedUniversity, email: sanitizedEmail }
          });
      }
      console.log('Email sending failed but in-app notifications may have been created');
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationsCreated,
        emailsSent,
        message: 'Admin notifications and emails processed'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in notify-admins-new-coach function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);

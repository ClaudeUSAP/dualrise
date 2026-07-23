import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get('RESEND_API_KEY') ?? '');
const ALERT_FROM = "Scout by Dual Rise <scout@notifications.usathleticperformance.com>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailLog {
  id: string;
  email_type: string;
  recipient_email: string;
  subject: string;
  retry_count: number;
  metadata: any;
}

// Exponential backoff: 5min, 15min, 1hr, 4hr, 12hr
const RETRY_DELAYS = [5, 15, 60, 240, 720]; // minutes
const MAX_RETRIES = 5;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // =========== AUTHENTICATION CHECK ===========
  // This function should only be called by admins or cron jobs
  const authHeader = req.headers.get('Authorization');
  
  // Allow cron jobs with a secret key
  const cronSecret = Deno.env.get('CRON_SECRET');
  const providedCronSecret = req.headers.get('X-Cron-Secret');
  
  if (cronSecret && providedCronSecret === cronSecret) {
    console.log("Request authenticated via cron secret");
  } else if (authHeader) {
    // Validate JWT and check for admin role
    const jwt = authHeader.replace('Bearer ', '');
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt);
    
    if (authError || !user) {
      console.error("Authentication failed:", authError?.message || "No user found");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Check if user is admin
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    if (roleError || userRole?.role !== 'admin') {
      console.error("Authorization failed: User is not admin");
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    console.log(`Request authenticated for admin user: ${user.id}`);
  } else {
    console.error("No authentication provided");
    return new Response(
      JSON.stringify({ error: "Unauthorized: Authentication required" }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
  // =========== END AUTHENTICATION CHECK ===========

  try {
    console.log("Starting failed email retry job...");

    // Get failed emails that are ready for retry
    const { data: failedEmails, error: fetchError } = await supabaseAdmin
      .from('email_logs')
      .select('*')
      .eq('status', 'failed')
      .lt('retry_count', MAX_RETRIES)
      .or(`next_retry_at.is.null,next_retry_at.lte.${new Date().toISOString()}`)
      .order('created_at', { ascending: true })
      .limit(50); // Process max 50 emails per run

    if (fetchError) {
      console.error('Error fetching failed emails:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${failedEmails?.length || 0} emails to retry`);

    if (!failedEmails || failedEmails.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No emails to retry",
          processed: 0
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let successCount = 0;
    let failCount = 0;
    const results = [];

    for (const email of failedEmails as EmailLog[]) {
      try {
        console.log(`Retrying email ${email.id} (type: ${email.email_type}, attempt ${email.retry_count + 1})`);

        // Alert emails (favorite result / generic) are sent directly via Resend
        // from the stored rendered HTML — there is no per-email send function to
        // invoke. Resend right here, then mark sent and move on.
        if (email.email_type === 'favorite_result_alert') {
          const html = email.metadata?.html;
          if (!html) {
            console.log(`No stored html for ${email.id}, skipping`);
            continue;
          }
          const { error: sendError } = await resend.emails.send({
            from: ALERT_FROM,
            to: [email.recipient_email],
            subject: email.subject,
            html,
          });
          if (sendError) throw new Error(JSON.stringify(sendError));

          await supabaseAdmin
            .from('email_logs')
            .update({
              status: 'sent',
              retry_count: email.retry_count + 1,
              last_retry_at: new Date().toISOString(),
              next_retry_at: null,
              error_message: null,
            })
            .eq('id', email.id);

          successCount++;
          results.push({ id: email.id, status: 'success' });
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }

        // Call the appropriate email function based on email_type
        let functionName = '';
        let payload: any = {};

        switch (email.email_type) {
          case 'coach_registration_confirmation':
            functionName = 'send-coach-registration-confirmation';
            payload = {
              firstName: email.metadata?.firstName,
              lastName: email.metadata?.lastName,
              university: email.metadata?.university,
              email: email.recipient_email,
            };
            break;
          
          case 'admin_welcome':
            functionName = 'send-welcome-email';
            // SECURITY: Never include passwords in retry payload
            // Use password reset link flow instead
            payload = {
              email: email.recipient_email,
              full_name: email.metadata?.full_name,
              role: email.metadata?.role,
              useResetLink: true, // Force reset link flow on retry
              resetLink: email.metadata?.resetLink, // Use stored reset link if available
            };
            break;
          
          case 'coach_approval':
            functionName = 'send-coach-approval-email';
            payload = {
              firstName: email.metadata?.firstName,
              lastName: email.metadata?.lastName,
              email: email.recipient_email,
            };
            break;
          
          case 'admin_notification_new_coach':
            functionName = 'notify-admins-new-coach';
            payload = email.metadata;
            break;
          
          default:
            console.log(`Unknown email type: ${email.email_type}, skipping...`);
            continue;
        }

        // Invoke the email function
        const { data: emailData, error: emailError } = await supabaseAdmin.functions.invoke(
          functionName,
          {
            body: payload,
          }
        );

        if (emailError) {
          throw emailError;
        }

        // Success - mark as sent and clear retry fields
        await supabaseAdmin
          .from('email_logs')
          .update({
            status: 'sent',
            retry_count: email.retry_count + 1,
            last_retry_at: new Date().toISOString(),
            next_retry_at: null,
            error_message: null,
          })
          .eq('id', email.id);

        successCount++;
        results.push({ id: email.id, status: 'success' });
        console.log(`Successfully retried email ${email.id}`);

      } catch (error: any) {
        console.error(`Failed to retry email ${email.id}:`, error);

        const newRetryCount = email.retry_count + 1;
        const nextRetryDelay = RETRY_DELAYS[Math.min(newRetryCount, RETRY_DELAYS.length - 1)];
        const nextRetryAt = new Date(Date.now() + nextRetryDelay * 60 * 1000);

        // Update with new retry info
        await supabaseAdmin
          .from('email_logs')
          .update({
            retry_count: newRetryCount,
            last_retry_at: new Date().toISOString(),
            next_retry_at: newRetryCount < MAX_RETRIES ? nextRetryAt.toISOString() : null,
            error_message: `Retry ${newRetryCount} failed: ${error.message}`,
          })
          .eq('id', email.id);

        failCount++;
        results.push({ 
          id: email.id, 
          status: 'failed', 
          error: error.message,
          nextRetry: newRetryCount < MAX_RETRIES ? nextRetryAt.toISOString() : 'max_retries_reached'
        });
      }

      // Small delay between retries to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`Retry job complete: ${successCount} succeeded, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: failedEmails.length,
        succeeded: successCount,
        failed: failCount,
        results,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in retry-failed-emails function:", error);
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

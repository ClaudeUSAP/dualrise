import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "npm:resend@2.0.0";

const DEPLOYMENT_VERSION = "v1.0.0";

// Fixed recipient for contact-request notifications
const ADMIN_EMAIL = "nicolas@usathleticperformance.com";

const validateUUID = (uuid: string): boolean => {
  if (!uuid || typeof uuid !== "string") return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

const sanitizeString = (str: string): string => {
  return String(str ?? "").trim().replace(/[<>]/g, "");
};

const escapeHtml = (str: string): string =>
  String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const INTEREST_LABELS: Record<string, string> = {
  strong: "Strong Interest",
  "very-strong": "Very Strong Interest",
  immediate: "Immediate Priority",
};

interface NotifyContactRequest {
  coachId: string;
  athleteId: string;
  interestLevel: string;
  message: string;
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  console.log(`🚀 notify-admin-contact-request ${DEPLOYMENT_VERSION} - Request received`);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // JWT validation gate (any authenticated user — the requesting coach)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseAuth = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: userData, error: authError } = await supabaseAuth.auth.getUser();
  if (authError || !userData?.user) {
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { coachId, athleteId, interestLevel, message }: NotifyContactRequest = await req.json();

    if (!validateUUID(coachId)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid coachId format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!validateUUID(athleteId)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid athleteId format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Resolve coach (name + school + email)
    const { data: coach } = await supabaseAdmin
      .from("users")
      .select("first_name, last_name, full_name, email, school_name")
      .eq("id", coachId)
      .maybeSingle();

    // Resolve athlete (name)
    const { data: athlete } = await supabaseAdmin
      .from("athletes")
      .select("first_name, last_name")
      .eq("id", athleteId)
      .maybeSingle();

    const coachName = sanitizeString(
      [coach?.first_name, coach?.last_name].filter(Boolean).join(" ") ||
        coach?.full_name ||
        coach?.email ||
        "Unknown coach"
    );
    const coachSchool = sanitizeString(coach?.school_name || "N/A");
    const coachEmail = sanitizeString(coach?.email || "N/A");
    const athleteName = sanitizeString(
      [athlete?.first_name, athlete?.last_name].filter(Boolean).join(" ") || "Unknown athlete"
    );
    const interestLabel = INTEREST_LABELS[interestLevel] || sanitizeString(interestLevel || "N/A");
    const cleanMessage = sanitizeString(message || "");

    const adminUrl = "https://scout.usathleticperformance.com/admin/contact-requests";

    const subject = `Scout by Dual Rise - New Contact Request: ${coachName} → ${athleteName}`;

    let emailStatus: "sent" | "failed" = "sent";
    let errorMessage: string | null = null;

    try {
      const emailResult = await resend.emails.send({
        from: "Scout by Dual Rise <scout@notifications.usathleticperformance.com>",
        to: [ADMIN_EMAIL],
        subject,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; background: #f6f9fc; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; }
                .header { background: linear-gradient(135deg, #1e3a8a 0%, #e11d2a 100%); color: white; padding: 30px; }
                .content { padding: 30px; }
                .info-box { background: #eff6ff; border-left: 4px solid #1e3a8a; padding: 20px; margin: 20px 0; border-radius: 4px; }
                .detail { margin: 12px 0; color: #374151; }
                .label { font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase; }
                .value { margin-top: 4px; color: #1f2937; }
                .message-box { background: #f9fafb; border: 1px solid #e5e7eb; padding: 16px; margin: 16px 0; border-radius: 6px; white-space: pre-wrap; color: #1f2937; }
                .button { display: inline-block; background: #1e3a8a; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
                .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0; font-size: 24px;">📬 New Contact Request</h1>
                  <p style="margin: 10px 0 0; opacity: 0.9;">A coach wants to be introduced to an athlete</p>
                </div>
                <div class="content">
                  <div class="info-box">
                    <p style="margin: 0; font-weight: bold; color: #1e3a8a;">${escapeHtml(coachName)} → ${escapeHtml(athleteName)}</p>
                    <p style="margin: 8px 0 0; color: #1e40af;">Interest level: <strong>${escapeHtml(interestLabel)}</strong></p>
                  </div>

                  <h2 style="color: #1f2937; font-size: 18px; margin: 24px 0 16px;">Coach</h2>
                  <div class="detail"><div class="label">Name</div><div class="value">${escapeHtml(coachName)}</div></div>
                  <div class="detail"><div class="label">School</div><div class="value">${escapeHtml(coachSchool)}</div></div>
                  <div class="detail"><div class="label">Email</div><div class="value">${escapeHtml(coachEmail)}</div></div>

                  <h2 style="color: #1f2937; font-size: 18px; margin: 24px 0 16px;">Athlete</h2>
                  <div class="detail"><div class="label">Requested athlete</div><div class="value">${escapeHtml(athleteName)}</div></div>

                  <h2 style="color: #1f2937; font-size: 18px; margin: 24px 0 16px;">Message</h2>
                  <div class="message-box">${escapeHtml(cleanMessage) || "<em>(no message)</em>"}</div>

                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${adminUrl}" class="button">Review Contact Request →</a>
                  </div>
                  <p style="color: #6b7280; font-size: 14px; text-align: center;">Or copy this link: ${adminUrl}</p>
                </div>
                <div class="footer">Scout by Dual Rise</div>
              </div>
            </body>
          </html>
        `,
      });

      if (emailResult.error) {
        emailStatus = "failed";
        errorMessage = emailResult.error.message || "Resend API error";
        console.error("❌ Failed to send contact-request email:", emailResult.error);
      } else {
        console.log(`✅ Contact-request email sent to ${ADMIN_EMAIL}`);
      }
    } catch (err: any) {
      emailStatus = "failed";
      errorMessage = err?.message || "Unknown error";
      console.error("❌ Exception sending contact-request email:", err);
    }

    // Log to email_logs
    await supabaseAdmin.from("email_logs").insert({
      email_type: "contact_request",
      recipient_email: ADMIN_EMAIL,
      subject,
      status: emailStatus,
      error_message: errorMessage,
      metadata: {
        coachId,
        athleteId,
        coachName,
        coachSchool,
        athleteName,
        interestLevel,
        timestamp: new Date().toISOString(),
      },
    });

    return new Response(
      JSON.stringify({ success: emailStatus === "sent", emailStatus }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in notify-admin-contact-request function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);

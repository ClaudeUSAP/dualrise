import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { Resend } from 'npm:resend@4.0.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(resendApiKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const JOB_NAME = 'favorite_result_alerts';
const FROM = "Scout by Dual Rise <scout@notifications.usathleticperformance.com>";

// English ordinal: 1→1st, 2→2nd, 3→3rd, 4→4th, 21→21st, 11→11th…
function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

// Numeric positions → English ordinal; non-numeric position_text (MC, WD, DNF…)
// is shown as-is.
function formatPlacing(positionText: string | null | undefined, position: number | null | undefined): string {
  const pt = positionText != null ? String(positionText).trim() : '';
  if (pt !== '') return /^\d+$/.test(pt) ? ordinal(parseInt(pt, 10)) : pt;
  if (position != null && Number.isFinite(Number(position))) return ordinal(Number(position));
  return '—';
}

function escapeHtml(s: string): string {
  return (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderEmail(greeting: string, lines: string[]): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="background:#FBF7EF;margin:0;padding:24px;font-family:Arial,sans-serif;color:#0F2A4A;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #eee;">
    <div style="background:#0F2A4A;color:#fff;padding:24px 28px;">
      <h1 style="margin:0;font-size:20px;">New results for your favorite athletes</h1>
    </div>
    <div style="padding:24px 28px;">
      <p style="margin:0 0 16px;">Hi ${escapeHtml(greeting)},</p>
      <p style="margin:0 0 16px;">${lines.length === 1 ? 'A player you favorited has' : 'Players you favorited have'} a new tournament result:</p>
      <ul style="margin:0 0 20px;padding-left:20px;line-height:1.7;">
        ${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}
      </ul>
      <a href="https://scout.usathleticperformance.com/favorites"
         style="display:inline-block;background:#E11D2A;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
        View my favorites
      </a>
    </div>
    <div style="background:#0F2A4A;color:#9ca3af;padding:16px 28px;font-size:12px;">
      Dual Rise · You're receiving this because you favorited these athletes.
    </div>
  </div>
</body></html>`;
}

async function logEmail(
  recipient: string,
  subject: string,
  status: 'sent' | 'failed',
  errorMessage: string | null,
  metadata: Record<string, unknown>
) {
  await supabase.from('email_logs').insert({
    email_type: 'favorite_result_alert',
    recipient_email: recipient,
    subject,
    status,
    error_message: errorMessage,
    metadata,
    retry_count: 0,
  });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // 1. Resolve the window. Default to the last 24h on the very first run.
    const { data: stateRow } = await supabase
      .from('alert_job_state')
      .select('last_run')
      .eq('job_name', JOB_NAME)
      .maybeSingle();
    const lastRun =
      stateRow?.last_run ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    // Capture the upper bound up front so results created mid-run aren't skipped
    // NOR double-sent: we process (lastRun, runStart] and advance last_run to
    // runStart. Anything created after runStart is picked up next time.
    const runStart = new Date().toISOString();

    // 2. New tournament results in the window (+ tournament name/year).
    const { data: results, error: resErr } = await supabase
      .from('tournament_results')
      .select('athlete_id, position, position_text, rounds, created_at, tournaments(name, year, course_par)')
      .gt('created_at', lastRun)
      .lte('created_at', runStart)
      .order('created_at', { ascending: true });
    if (resErr) throw resErr;
    const rows = results ?? [];

    const finish = async (extra: Record<string, unknown>) => {
      await supabase
        .from('alert_job_state')
        .upsert({ job_name: JOB_NAME, last_run: runStart }, { onConflict: 'job_name' });
      return json({ success: true, window_start: lastRun, window_end: runStart, ...extra });
    };

    if (rows.length === 0) return finish({ new_results: 0, emails_sent: 0 });

    // 3. Keep only results for AVAILABLE athletes (coaches must not be alerted
    //    about committed / in_college / in_creation / archived athletes).
    const athleteIds = [...new Set(rows.map((r) => r.athlete_id).filter(Boolean))];
    const { data: athletes, error: athErr } = await supabase
      .from('athletes')
      .select('id, first_name, last_name, status')
      .in('id', athleteIds)
      .eq('status', 'available');
    if (athErr) throw athErr;
    const athleteById = new Map((athletes ?? []).map((a) => [a.id, a]));
    if (athleteById.size === 0) return finish({ new_results: rows.length, emails_sent: 0 });

    // 4. Coaches who favorited those (available) athletes.
    const { data: favs, error: favErr } = await supabase
      .from('favorites')
      .select('coach_id, athlete_id')
      .in('athlete_id', [...athleteById.keys()]);
    if (favErr) throw favErr;
    const coachesByAthlete = new Map<string, Set<string>>();
    for (const f of favs ?? []) {
      if (!f.coach_id || !f.athlete_id) continue;
      if (!coachesByAthlete.has(f.athlete_id)) coachesByAthlete.set(f.athlete_id, new Set());
      coachesByAthlete.get(f.athlete_id)!.add(f.coach_id);
    }
    if (coachesByAthlete.size === 0) return finish({ new_results: rows.length, emails_sent: 0 });

    // 5. Build the per-coach line list.
    const linesByCoach = new Map<string, string[]>();
    for (const r of rows) {
      const ath = athleteById.get(r.athlete_id);
      if (!ath) continue;
      const coaches = coachesByAthlete.get(r.athlete_id);
      if (!coaches?.size) continue;
      const t = Array.isArray(r.tournaments) ? r.tournaments[0] : r.tournaments;
      const tournamentName = t?.name ?? 'Tournament';
      // Avoid the doubled year: many names already embed it (e.g. "… 2026").
      const year = (t?.year && !tournamentName.includes(String(t.year))) ? ` ${t.year}` : '';
      const placingLabel = formatPlacing(r.position_text, r.position);
      const athleteName = `${ath.first_name ?? ''} ${ath.last_name ?? ''}`.trim();

      // Per-round score vs par: "66,70,72,67" @ par 70 → "(-4, E, +2, -3)".
      // Omitted entirely when rounds or course_par are missing.
      const coursePar = t?.course_par != null ? Number(t.course_par) : null;
      let vsPar = '';
      if (r.rounds != null && String(r.rounds).trim() !== '' && coursePar != null && Number.isFinite(coursePar)) {
        const parts = String(r.rounds)
          .split(',')
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => Number.isFinite(n))
          .map((score) => {
            const diff = score - coursePar;
            return diff > 0 ? `+${diff}` : diff === 0 ? 'E' : `${diff}`;
          });
        if (parts.length) vsPar = ` (${parts.join(', ')})`;
      }

      const line = `${athleteName} — ${placingLabel} at ${tournamentName}${year}${vsPar}`;
      for (const coachId of coaches) {
        if (!linesByCoach.has(coachId)) linesByCoach.set(coachId, []);
        linesByCoach.get(coachId)!.push(line);
      }
    }
    if (linesByCoach.size === 0) return finish({ new_results: rows.length, emails_sent: 0 });

    // 6. Coach emails.
    const { data: coaches } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, full_name')
      .in('id', [...linesByCoach.keys()]);
    const coachById = new Map((coaches ?? []).map((c) => [c.id, c]));

    let emailsSent = 0;
    let emailsFailed = 0;
    for (const [coachId, lines] of linesByCoach) {
      const coach = coachById.get(coachId);
      if (!coach?.email) continue;
      const greeting =
        [coach.first_name, coach.last_name].filter(Boolean).join(' ') ||
        coach.full_name ||
        'Coach';
      const subject =
        lines.length === 1
          ? 'New result for a favorite athlete'
          : `${lines.length} new results for your favorite athletes`;
      const html = renderEmail(greeting, lines);
      const metadata = { coach_id: coachId, lines, html };
      try {
        const sendRes = await resend.emails.send({ from: FROM, to: [coach.email], subject, html });
        if ((sendRes as { error?: unknown })?.error) {
          throw new Error(JSON.stringify((sendRes as { error?: unknown }).error));
        }
        await logEmail(coach.email, subject, 'sent', null, metadata);
        emailsSent++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await logEmail(coach.email, subject, 'failed', msg, metadata);
        emailsFailed++;
      }
    }

    // 7. Advance the window so re-runs never re-send the same results.
    return await finish({
      new_results: rows.length,
      available_athletes: athleteById.size,
      coaches_notified: linesByCoach.size,
      emails_sent: emailsSent,
      emails_failed: emailsFailed,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('run-favorite-result-alerts error:', msg);
    return json({ error: msg }, 500);
  }
});

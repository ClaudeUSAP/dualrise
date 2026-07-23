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

interface SearchFilters {
  graduationYear?: number[];
  budgetMax?: number;
  divisions?: string[];
  gpaMin?: number;
  gpaMax?: number;
  handicapMin?: number;
  handicapMax?: number;
  search?: string;
  state?: string;
  highSchoolYear?: string;
  starRating?: number[];
  gender?: string[];
  scoringAverage?: string;
  weatherZones?: string[];
}

interface AthleteSignature {
  id: string;
  signature: string;
}

interface Athlete {
  id: string;
  first_name: string;
  last_name: string;
  star_rating?: number;
  graduation_year?: number;
  country?: string;
  best_recent_scoring_avg_raw?: string;
  best_recent_period_raw?: string;
  scoring_avg_last_3_raw?: string;
  scoring_avg_last_5_raw?: string;
  scoring_avg_last_7_raw?: string;
  scoring_avg_last_10_raw?: string;
  scoring_avg_current_year_raw?: string;
  academic_gpa?: number;
  profile_photo?: string;
  preferences_budget?: string;
  best_recent_scoring_avg?: string;
  scoring_average_vs_course_rating?: string;
  preferences_division?: string;
  sex?: string;
  preferences_region?: string;
  created_at?: string;
  updated_at?: string;
}

// True when `ts` is strictly more recent than `ref` (parses tz-formatted ISO so
// differing offsets compare correctly).
function tsNewer(ts?: string | null, ref?: string | null): boolean {
  if (!ts || !ref) return false;
  return new Date(ts).getTime() > new Date(ref).getTime();
}

// Helper function to get best scoring average with fallback (matches app logic in BestRecentScoreDisplay.tsx)
function getBestScoringAvg(athlete: Athlete): { value: string | null; period: string | null } {
  // Try cached value first (same as app)
  const cached = athlete.best_recent_scoring_avg_raw;
  if (cached && parseFloat(cached) > 0) {
    return { value: parseFloat(cached).toFixed(1), period: athlete.best_recent_period_raw || null };
  }
  
  // Fall back to individual periods (same as app)
  const periods = [
    { name: 'Last 3', value: athlete.scoring_avg_last_3_raw },
    { name: 'Last 5', value: athlete.scoring_avg_last_5_raw },
    { name: 'Last 7', value: athlete.scoring_avg_last_7_raw },
    { name: 'Last 10', value: athlete.scoring_avg_last_10_raw },
    { name: 'Current Year', value: athlete.scoring_avg_current_year_raw },
  ];
  
  // Filter valid non-zero values and pick lowest (best)
  const valid = periods
    .filter(p => p.value && parseFloat(p.value) > 0)
    .map(p => ({ name: p.name, num: parseFloat(p.value!) }));
  
  if (valid.length === 0) return { value: null, period: null };
  
  const best = valid.reduce((min, p) => p.num < min.num ? p : min);
  return { value: best.num.toFixed(1), period: best.name };
}

// Generate a signature hash for an athlete based on filtered criteria
function getAthleteDataSignature(athlete: Athlete, filters: SearchFilters): string {
  const relevantData = {
    id: athlete.id,
    budget: filters.budgetMax ? athlete.preferences_budget : null,
    gpa: (filters.gpaMin || filters.gpaMax) ? athlete.academic_gpa : null,
    scoring_avg: athlete.best_recent_scoring_avg_raw || athlete.best_recent_scoring_avg,
    score_vs_cr: athlete.best_recent_scoring_avg || athlete.scoring_average_vs_course_rating,
    star_rating: athlete.star_rating,
    graduation_year: athlete.graduation_year,
    divisions: athlete.preferences_division,
  };
  return JSON.stringify(relevantData);
}

function num(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Mirror the live Athletes search (searchAthletes) EXACTLY, reading the saved
// search_criteria field names (with fallbacks for older shapes). Undefined/empty
// athlete values are INCLUDED (no restriction) — same as the live search — so the
// announced count/list matches what the coach sees live. Only available athletes
// are passed in.
function matchesCriteria(a: any, c: any): boolean {
  // Free-text: name / intended majors / hometown (country)
  const search = (c.searchQuery ?? c.search ?? '').toString().toLowerCase().trim();
  if (search) {
    const hay = [a.first_name, a.last_name, a.intended_majors, a.country]
      .map((x) => (x ?? '').toString().toLowerCase());
    if (!hay.some((h) => h.includes(search))) return false;
  }

  // Division: athlete's preferences_division contains any selected division
  const divisions = c.preferredDivisions ?? c.divisions ?? [];
  if (Array.isArray(divisions) && divisions.length) {
    const ad = (a.preferences_division ?? '').toString();
    if (!divisions.some((d: string) => ad.includes(d))) return false;
  }

  // Gender (optional)
  const gender = c.gender;
  if (gender && gender !== 'all') {
    const s = (a.sex ?? '').toString().toLowerCase();
    const g = gender.toString().toLowerCase();
    const ok =
      s === g ||
      ((g === 'male' || g === 'men') && (s === 'men' || s === 'm')) ||
      ((g === 'female' || g === 'women') && (s === 'women' || s === 'f'));
    if (!ok) return false;
  }

  // Graduation year (saved as highSchoolYear = selected years; also supports Transfer)
  const years = c.highSchoolYear ?? c.graduationYear ?? c.selectedYears ?? [];
  if (Array.isArray(years) && years.length) {
    const wanted = years.map((y: any) => String(y).trim());
    const isTransfer = wanted.includes('Transfer') && a.student_type === 'transfer';
    const gy = (a.graduation_year ?? '').toString();
    const gyMatch = gy
      ? gy.split(',').map((y: string) => y.trim()).some((y: string) => wanted.includes(y))
      : false;
    if (!isTransfer && !gyMatch) return false;
  }

  // GPA range (undefined GPA → included)
  const gpaMin = num(c.gpaMin);
  const gpaMax = num(c.gpaMax);
  const gpa = num(a.academic_gpa);
  if (gpa != null) {
    if (gpaMin != null && gpa < gpaMin) return false;
    if (gpaMax != null && gpa > gpaMax) return false;
  }

  // Budget range (undefined/0 budget → included). preferences_budget is text.
  const budgetMin = num(c.budgetMin);
  const budgetMax = num(c.budgetMax);
  const budget = num(a.preferences_budget);
  if (budget != null && budget > 0) {
    if (budgetMin != null && budget < budgetMin) return false;
    if (budgetMax != null && budget > budgetMax) return false;
  }

  // Star rating minimum
  const starMin = num(c.starRatingMin ?? c.starRating);
  if (starMin != null && starMin > 0) {
    const star = num(a.star_rating) ?? 0;
    if (star < starMin) return false;
  }

  // Scoring average — compares the SAME stored column the live search uses
  // (best_recent_scoring_avg_raw). Applied ONLY when the slider is off its default
  // [65, 85], exactly like the live search (otherwise every saved search would
  // filter on scoring). When the value is absent for an athlete AND a scoring
  // filter is active, the athlete is excluded.
  const scoringMin = num(c.scoringAvgMin);
  const scoringMax = num(c.scoringAvgMax);
  if (scoringMin != null && scoringMax != null && (scoringMin !== 65 || scoringMax !== 85)) {
    const v = num(a.best_recent_scoring_avg_raw);
    if (v == null || v <= 0) return false;
    if (v < scoringMin || v > scoringMax) return false;
  }

  // Score vs course rating — same stored column as the live search
  // (scoring_average_vs_course_rating). Applied ONLY when off its default
  // [-4, 15]. Absent value + active filter → excluded.
  const vsMin = num(c.scoreVsCRMin);
  const vsMax = num(c.scoreVsCRMax);
  if (vsMin != null && vsMax != null && (vsMin !== -4 || vsMax !== 15)) {
    const v = num(a.scoring_average_vs_course_rating);
    if (v == null) return false;
    if (v < vsMin || v > vsMax) return false;
  }

  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { frequency, searchId, force } = await req.json().catch(() => ({ frequency: 'daily' }));
    const targetFrequency = frequency || 'immediate';

    console.log(`Running saved search alerts for frequency: ${targetFrequency}${searchId ? ` (specific search: ${searchId})` : ''}`);

    // Calculate time threshold for different frequencies
    let timeThreshold: string | null = null;
    if (!force) {
      if (targetFrequency === 'immediate') {
        timeThreshold = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours
      } else if (targetFrequency === 'daily') {
        timeThreshold = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(); // 12 hours
      } else if (targetFrequency === 'weekly') {
        timeThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
      }
    }

    // Build query for saved searches
    let searchQuery = supabase
      .from('saved_searches')
      .select('*')
      .eq('is_alert_enabled', true);

    if (searchId) {
      // Run specific search
      searchQuery = searchQuery.eq('id', searchId);
    } else {
      // Run searches by frequency
      searchQuery = searchQuery.eq('alert_frequency', targetFrequency);
      
      if (timeThreshold) {
        searchQuery = searchQuery.or(`last_notification_sent.is.null,last_notification_sent.lt.${timeThreshold}`);
      }
    }

    const { data: searches, error: searchError } = await searchQuery;

    if (searchError) {
      console.error('Error fetching saved searches:', searchError);
      throw searchError;
    }

    console.log(`Found ${searches?.length || 0} searches to process`);

    let notificationsSent = 0;
    let errorsCount = 0;

    for (const search of searches || []) {
      try {
        const filters: SearchFilters = search.search_criteria || {};

        // Fetch coach info
        const { data: coach, error: coachError } = await supabase
          .from('users')
          .select('id, email, first_name, last_name, full_name')
          .eq('id', search.coach_id)
          .single();

        if (coachError || !coach) {
          console.error(`Coach not found for search ${search.id}`);
          continue;
        }

        // Build athlete query based on filters
        let athleteQuery = supabase
          .from('athletes')
          .select('*')
          .eq('status', 'available');

        // NB: filters are applied in JS below via matchesCriteria (mirroring the
        // live search), NOT here — the previous DB-level filters read the wrong
        // criteria field names, so they were no-ops and every athlete matched.

        // Optimization: on incremental runs only consider athletes created or
        // updated since this search's last run. First run (no last_run) → full
        // scan once to seed the signature baseline.
        const sinceTs = (search.last_run as string | null) ?? null;
        if (sinceTs) {
          athleteQuery = athleteQuery.or(
            `created_at.gt.${sinceTs},updated_at.gt.${sinceTs}`
          );
        }

        const { data: currentMatches, error: athleteError } = await athleteQuery;

        if (athleteError) {
          console.error(`Error fetching athletes for search ${search.id}:`, athleteError);
          errorsCount++;
          continue;
        }

        // Apply the SAME filters as the live search (budget min/max, division,
        // gender, graduation year, GPA, star rating, free text). Only available
        // athletes were fetched, so the count/list matches the live coach search.
        const filteredMatches = (currentMatches || []).filter((athlete: any) =>
          matchesCriteria(athlete, filters)
        );

        // Get previous run history
        const { data: lastRun } = await supabase
          .from('search_run_history')
          .select('*')
          .eq('saved_search_id', search.id)
          .order('run_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const isFirstRun = !lastRun || !sinceTs;

        // Previous signatures (the baseline) from the last run.
        const previousSignatures = new Map<string, string>();
        if (lastRun?.athlete_signatures) {
          const signatures: AthleteSignature[] = lastRun.athlete_signatures as unknown as AthleteSignature[];
          signatures.forEach(sig => previousSignatures.set(sig.id, sig.signature));
        }

        // Signatures of the athletes fetched this run (matching +, on incremental
        // runs, changed since last_run).
        const currentSignatures = new Map<string, string>();
        filteredMatches.forEach((athlete: Athlete) => {
          currentSignatures.set(athlete.id, getAthleteDataSignature(athlete, filters));
        });

        // New = exact via created_at (no whole-catalogue ID diff).
        const trulyNewAthletes = isFirstRun
          ? filteredMatches
          : filteredMatches.filter((a: Athlete) => tsNewer(a.created_at, sinceTs));

        // Modified = updated since last_run, NOT brand-new, AND a relevant field
        // changed (signature differs) — an updated_at bump on an irrelevant field
        // (e.g. an internal note) does not notify.
        const improvedAthletes = isFirstRun
          ? []
          : filteredMatches.filter((a: Athlete) => {
              if (tsNewer(a.created_at, sinceTs)) return false; // already counted as new
              if (!tsNewer(a.updated_at, sinceTs)) return false;
              return previousSignatures.get(a.id) !== currentSignatures.get(a.id);
            });

        const newMatchesCount = trulyNewAthletes.length + improvedAthletes.length;
        const shouldNotify = isFirstRun ? filteredMatches.length > 0 : newMatchesCount > 0;

        // Merge so unchanged athletes keep their baseline signature across runs
        // (we only fetched the changed ones this time). Bounded by matching
        // athletes — never the whole catalogue.
        const mergedSignatures = new Map(previousSignatures);
        currentSignatures.forEach((sig, id) => mergedSignatures.set(id, sig));
        const totalMatchCount = mergedSignatures.size;

        console.log(`Search "${search.name}": ${trulyNewAthletes.length} new, ${improvedAthletes.length} improved (fetched ${filteredMatches.length}, baseline ${totalMatchCount})`);

        // Store current run in history (signatures for matching athletes only).
        const signatureArray: AthleteSignature[] = Array.from(mergedSignatures.entries()).map(([id, signature]) => ({ id, signature }));

        await supabase.from('search_run_history').insert({
          saved_search_id: search.id,
          matches_found: totalMatchCount,
          new_matches: newMatchesCount,
          notification_sent: shouldNotify,
          athlete_signatures: signatureArray as any,
          new_athletes_count: trulyNewAthletes.length,
          improved_athletes_count: improvedAthletes.length,
          removed_athletes_count: 0,
        });

        // Update saved search
        await supabase
          .from('saved_searches')
          .update({
            match_count: totalMatchCount,
            new_matches_count: isFirstRun ? 0 : newMatchesCount,
            last_run: new Date().toISOString(),
            last_notification_sent: shouldNotify ? new Date().toISOString() : search.last_notification_sent,
          })
          .eq('id', search.id);

        // Send notification if needed
        if (shouldNotify) {
          const athletesToShow = isFirstRun 
            ? filteredMatches.slice(0, 10) 
            : [...trulyNewAthletes, ...improvedAthletes].slice(0, 10);

          const emailHtml = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #0F2A4A; background: #FBF7EF; margin: 0; }
                  .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #eee; }
                  .header { background: #0F2A4A; color: #ffffff; padding: 28px 30px; }
                  .content { background: #FBF7EF; padding: 30px; }
                  .stats { display: flex; gap: 16px; margin: 20px 0; }
                  .stat-box { flex: 1; background: #ffffff; padding: 16px; border-radius: 8px; text-align: center; border: 1px solid #eee; }
                  .stat-number { font-size: 30px; font-weight: bold; color: #0F2A4A; }
                  .stat-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
                  .section { margin: 28px 0; }
                  .section-title { font-size: 17px; font-weight: bold; color: #0F2A4A; margin-bottom: 14px; }
                  .athlete-card { background: #ffffff; padding: 16px 18px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #E11D2A; }
                  .athlete-name { font-weight: bold; font-size: 16px; color: #0F2A4A; margin-bottom: 4px; }
                  .athlete-details { font-size: 14px; color: #6b7280; }
                  .cta-button { display: inline-block; background: #E11D2A; color: #ffffff; padding: 13px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 12px 0; }
                  .footer { background: #0F2A4A; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1 style="margin: 0; font-size: 20px;">New matches for your saved search</h1>
                    <p style="margin: 8px 0 0 0; opacity: 0.85;">"${search.name}"</p>
                  </div>

                  <div class="content">
                    <p>Hi ${[coach.first_name, coach.last_name].filter(Boolean).join(' ') || coach.full_name || 'Coach'},</p>
                    
                    <div class="stats">
                      ${isFirstRun ? `
                        <div class="stat-box">
                          <div class="stat-number">${totalMatchCount}</div>
                          <div class="stat-label">Total Matches</div>
                        </div>
                      ` : `
                        <div class="stat-box">
                          <div class="stat-number">${trulyNewAthletes.length}</div>
                          <div class="stat-label">New Athletes</div>
                        </div>
                        <div class="stat-box">
                          <div class="stat-number">${improvedAthletes.length}</div>
                          <div class="stat-label">Improved Profiles</div>
                        </div>
                        <div class="stat-box">
                          <div class="stat-number">${totalMatchCount}</div>
                          <div class="stat-label">Total Matches</div>
                        </div>
                      `}
                    </div>

                    ${!isFirstRun && trulyNewAthletes.length > 0 ? `
                      <div class="section">
                        <div class="section-title">New Athletes Added</div>
                        ${trulyNewAthletes.slice(0, 5).map((athlete: Athlete) => `
                          <div class="athlete-card">
                            <div class="athlete-name">${athlete.first_name} ${athlete.last_name}</div>
                            <div class="athlete-details">
                              ${athlete.star_rating ? `${athlete.star_rating}/7 Stars • ` : ''}
                              ${athlete.graduation_year ? `Class of ${athlete.graduation_year} • ` : ''}
                              ${athlete.country || ''}
                              ${(() => {
                                const scoring = getBestScoringAvg(athlete);
                                return scoring.value ? `<br>Scoring Avg: ${scoring.value}${scoring.period ? ` (${scoring.period})` : ''}` : '';
                              })()}
                              ${athlete.academic_gpa ? ` • GPA: ${athlete.academic_gpa}` : ''}
                            </div>
                          </div>
                        `).join('')}
                      </div>
                    ` : ''}

                    ${!isFirstRun && improvedAthletes.length > 0 ? `
                      <div class="section">
                        <div class="section-title">Improved Athletes</div>
                        ${improvedAthletes.slice(0, 5).map((athlete: Athlete) => `
                          <div class="athlete-card">
                            <div class="athlete-name">${athlete.first_name} ${athlete.last_name}</div>
                            <div class="athlete-details">
                              Profile updated - now matches your criteria
                              ${(() => {
                                const scoring = getBestScoringAvg(athlete);
                                return scoring.value ? `<br>Scoring Avg: ${scoring.value}${scoring.period ? ` (${scoring.period})` : ''}` : '';
                              })()}
                              ${athlete.academic_gpa ? ` • GPA: ${athlete.academic_gpa}` : ''}
                            </div>
                          </div>
                        `).join('')}
                      </div>
                    ` : ''}

                    ${isFirstRun ? `
                      <div class="section">
                        <div class="section-title">Top Matches</div>
                        ${athletesToShow.map((athlete: Athlete) => `
                          <div class="athlete-card">
                            <div class="athlete-name">${athlete.first_name} ${athlete.last_name}</div>
                            <div class="athlete-details">
                              ${athlete.star_rating ? `${athlete.star_rating}/7 Stars • ` : ''}
                              ${athlete.graduation_year ? `Class of ${athlete.graduation_year} • ` : ''}
                              ${athlete.country || ''}
                              ${(() => {
                                const scoring = getBestScoringAvg(athlete);
                                return scoring.value ? `<br>Scoring Avg: ${scoring.value}${scoring.period ? ` (${scoring.period})` : ''}` : '';
                              })()}
                              ${athlete.academic_gpa ? ` • GPA: ${athlete.academic_gpa}` : ''}
                            </div>
                          </div>
                        `).join('')}
                      </div>
                    ` : ''}

                    <center>
                      <a href="https://scout.usathleticperformance.com/athletes" class="cta-button">
                        View matches
                      </a>
                    </center>
                  </div>
                  
                  <div class="footer">
                    <p style="margin: 0;">Dual Rise</p>
                    <p style="margin: 5px 0; font-size: 12px;">You're receiving this because you enabled alerts for this saved search</p>
                  </div>
                </div>
              </body>
            </html>
          `;

          const emailResult = await resend.emails.send({
            from: "Scout by Dual Rise <scout@notifications.usathleticperformance.com>",
            to: [coach.email],
            subject: isFirstRun 
              ? `Your saved search "${search.name}" found ${filteredMatches.length} matching athletes`
              : `${newMatchesCount} new ${newMatchesCount === 1 ? 'match' : 'matches'} for "${search.name}"`,
            html: emailHtml,
          });

          console.log(`Email sent to ${coach.email}:`, emailResult);

          // Create in-app notification
          await supabase.from('notifications').insert({
            user_id: coach.id,
            notification_type: 'saved_search_match',
            title: isFirstRun 
              ? `${filteredMatches.length} matches found for "${search.name}"`
              : `${newMatchesCount} new ${newMatchesCount === 1 ? 'match' : 'matches'} for "${search.name}"`,
            message: isFirstRun
              ? `Your saved search found ${filteredMatches.length} matching athletes`
              : `${trulyNewAthletes.length} new athletes and ${improvedAthletes.length} improved profiles`,
            metadata: {
              saved_search_id: search.id,
              search_name: search.name,
              new_athlete_ids: trulyNewAthletes.map((a: Athlete) => a.id),
              improved_athlete_ids: improvedAthletes.map((a: Athlete) => a.id),
            },
            action_url: '/athletes',
            is_read: false,
          });

          notificationsSent++;
        }
      } catch (error) {
        console.error(`Error processing search ${search.id}:`, error);
        errorsCount++;
      }
    }

    const result = {
      success: true,
      frequency: targetFrequency,
      processed: searches?.length || 0,
      notifications_sent: notificationsSent,
      errors: errorsCount,
      timestamp: new Date().toISOString(),
    };

    console.log('Processing complete:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in run-saved-search-alerts:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

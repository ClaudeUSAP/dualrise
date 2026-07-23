import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart, Mail, Printer, Share2, Loader2, ExternalLink, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getAthleteById } from "@/lib/api/athletes";
import NotFound from "@/pages/NotFound";
import { sortTournamentResults } from "@/lib/api/tournamentResults";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import ContactRequestModal from "@/components/ContactRequestModal";
import ShareProfileModal from "@/components/ShareProfileModal";
import { downloadAthleteOnePagerLive } from "@/lib/athleteOnePagerLive";
import type { Athlete } from "@/types/athlete";

// Dual Rise palette (matches docs/matiej-reiter-mockup.html)
const NAVY = "#0B1D58";
const RED = "#E11D2A";
const MUTED = "#6B7280";
const LINE = "#E5E2D9";

type TabKey = "personal" | "tennis" | "academics" | "tournaments" | "media";

// ---- small presentational helpers ----
const initials = (a: Athlete) =>
  `${(a.firstName || "?")[0] ?? ""}${(a.lastName || "")[0] ?? ""}`.toUpperCase();

const Row = ({ label, value }: { label: string; value?: React.ReactNode }) => {
  if (value == null || value === "" ) return null;
  return (
    <div className="flex justify-between py-1.5 text-sm" style={{ borderBottom: `1px dashed ${LINE}` }}>
      <span style={{ color: MUTED }}>{label}</span>
      <span className="font-bold text-right">{value}</span>
    </div>
  );
};

// 0–10 rating bar; red fill when 9+ (matches mockup)
const Bar = ({ label, v }: { label: string; v?: number }) => {
  if (v == null || !Number.isFinite(v)) return null;
  const pct = Math.max(0, Math.min(100, (v / 10) * 100));
  return (
    <div className="my-2">
      <div className="flex justify-between text-[13px] mb-1">
        <span>{label}</span>
        <span className="font-extrabold" style={{ color: NAVY }}>{v}</span>
      </div>
      <div className="h-2 rounded-md overflow-hidden" style={{ background: "#F4F2EC" }}>
        <div className="h-full rounded-md" style={{ width: `${pct}%`, background: v >= 9 ? RED : NAVY }} />
      </div>
    </div>
  );
};

const Card = ({ title, accent, full, children }: { title: string; accent?: string; full?: boolean; children: React.ReactNode }) => (
  <div className={`bg-white rounded-2xl p-5 ${full ? "md:col-span-2" : ""}`} style={{ border: `1px solid ${LINE}` }}>
    <h2 className="text-[15px] font-bold uppercase tracking-wide mb-3" style={{ color: NAVY }}>
      {title} {accent && <span style={{ color: RED }}>{accent}</span>}
    </h2>
    {children}
  </div>
);

const Tags = ({ items, variant }: { items: string[]; variant?: "navy" | "red" | "plain" }) => (
  <div className="flex flex-wrap gap-2">
    {items.filter(Boolean).map((t, i) => (
      <span
        key={i}
        className="rounded-full px-3 py-1 text-[13px]"
        style={
          variant === "navy"
            ? { background: "#eaf0ff", border: "1px solid #c9d6f5", color: NAVY }
            : variant === "red"
            ? { background: "#FDE7E9", border: "1px solid #f6c6ca", color: "#8f1119" }
            : { background: "#F4F2EC", border: `1px solid ${LINE}` }
        }
      >
        {t}
      </span>
    ))}
  </div>
);

// split a comma/newline/semicolon list into trimmed items
const splitList = (s?: string): string[] =>
  (s || "")
    .split(/[\n;,]+/)
    .map((x) => x.trim())
    .filter(Boolean);

const AthleteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const isCoachOrAdmin = hasRole("coach") || hasRole("admin") || hasRole("agent");

  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [tournamentResults, setTournamentResults] = useState<any[]>([]);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("personal");

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const athleteData = await getAthleteById(id);
        // Coaches (not admin/agent) may only open AVAILABLE athletes.
        const canSeeAllStatuses = hasRole("admin") || hasRole("agent");
        if (!athleteData || (!canSeeAllStatuses && athleteData.status !== "available")) {
          setNotFound(true);
          setIsLoading(false);
          return;
        }
        setAthlete(athleteData);

        if (user) {
          const { data: favoriteData } = await supabase
            .from("favorites")
            .select("id")
            .eq("coach_id", user.id)
            .eq("athlete_id", athleteData.id)
            .maybeSingle();
          setIsFavorited(!!favoriteData);
        }

        const { data: resultsData } = await supabase
          .from("tournament_results")
          .select("*, tournaments(*)")
          .eq("athlete_id", athleteData.id);
        if (resultsData) {
          const transformed = resultsData.map((r) => ({ ...r, tournament: r.tournaments }));
          setTournamentResults(sortTournamentResults(transformed));
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id, user]);

  const handleContact = () => setShowContactModal(true);

  const handleFavorite = async () => {
    if (!user) {
      toast({ title: "Authentication Required", description: "Please log in to add favorites", variant: "destructive" });
      return;
    }
    if (!athlete) return;
    if (isFavorited) {
      const { error } = await supabase.from("favorites").delete().eq("coach_id", user.id).eq("athlete_id", athlete.id);
      if (error) { toast({ title: "Error", description: "Failed to remove from favorites", variant: "destructive" }); return; }
      setIsFavorited(false);
      toast({ title: "Removed from Favorites", description: `${athlete.firstName} has been removed from your favorites.` });
    } else {
      const { error } = await supabase.from("favorites").insert({ coach_id: user.id, athlete_id: athlete.id, status: "interested" });
      if (error) { toast({ title: "Error", description: "Failed to add to favorites", variant: "destructive" }); return; }
      setIsFavorited(true);
      toast({ title: "Added to Favorites", description: `${athlete.firstName} has been added to your favorites.` });
    }
  };

  // Live one-pager (re-fetched fresh on each click).
  const handleExportPDF = async () => {
    if (!athlete?.id) return;
    setIsGeneratingPdf(true);
    try {
      await downloadAthleteOnePagerLive(athlete.id, athlete);
      toast({ title: "PDF generated", description: "The one-pager has been downloaded." });
    } catch (e) {
      console.error("Error generating one-pager PDF:", e);
      toast({ title: "Error", description: "Failed to generate PDF. Please try again.", variant: "destructive" });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#FAFAF7" }}>
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: NAVY }} />
      </div>
    );
  }
  if (notFound) return <NotFound />;
  if (!athlete) return <NotFound />;

  const a = athlete;
  const stars = Math.max(0, Math.min(7, Math.round(a.starRating || 0)));
  const money = (n?: number) => (n != null && n > 0 ? `$${Number(n).toLocaleString()}` : undefined);
  const subLine = [
    a.dominantHand ? `${a.dominantHand}-handed` : null,
    a.backhandType ? `${a.backhandType} backhand` : null,
    a.playStyle,
    a.preferredSurface ? `${a.preferredSurface} court` : null,
  ].filter(Boolean).join(" · ");
  const clubLine = [a.clubTeam, a.city || a.hometown].filter(Boolean).join(" — ");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "personal", label: "Personal" },
    { key: "tennis", label: "Tennis" },
    { key: "academics", label: "Academics & Preferences" },
    { key: "tournaments", label: "Tournaments" },
    { key: "media", label: "Media" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#FAFAF7", color: NAVY }}>
      <div className="max-w-[1080px] mx-auto px-4 py-6">
        {/* Back */}
        <div className="mb-4">
          <Button variant="ghost" onClick={() => navigate("/athletes")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Search
          </Button>
        </div>

        {/* HERO */}
        <div
          className="rounded-2xl p-6 sm:p-7 flex flex-wrap gap-6 items-center text-white"
          style={{ background: `linear-gradient(180deg, ${NAVY} 0%, #132F88 100%)` }}
        >
          <div
            className="w-[120px] h-[120px] rounded-2xl bg-white flex items-center justify-center text-4xl font-black flex-none overflow-hidden"
            style={{ color: NAVY, border: `3px solid ${RED}` }}
          >
            {a.profileImage && !avatarError ? (
              <img src={a.profileImage} alt="" className="w-full h-full object-cover" onError={() => setAvatarError(true)} />
            ) : (
              initials(a)
            )}
          </div>
          <div className="flex-1 min-w-[240px]">
            <h1 className="text-3xl font-black italic uppercase tracking-tight m-0">{a.firstName} {a.lastName}</h1>
            {subLine && <div className="text-sm mt-1" style={{ color: "#cdd7f0" }}>{subLine}{clubLine ? `  |  ${clubLine}` : ""}</div>}
            <div className="mt-2 text-xl tracking-widest" style={{ color: RED }}>
              {"★".repeat(stars)}<span style={{ color: "#3a4c86" }}>{"★".repeat(7 - stars)}</span>
              <span className="text-[13px] ml-2" style={{ color: "#cdd7f0" }}>{stars}/7</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Button onClick={handleExportPDF} disabled={isGeneratingPdf} className="text-white" style={{ background: RED }}>
              {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
              {isGeneratingPdf ? "Generating…" : "Download PDF"}
            </Button>
            <Button variant="ghost" onClick={handleFavorite} className="bg-white/15 hover:bg-white/25 text-white">
              <Heart className={`mr-2 h-4 w-4 ${isFavorited ? "fill-current" : ""}`} /> {isFavorited ? "Favorited" : "Favorite"}
            </Button>
            <Button variant="ghost" onClick={handleContact} className="bg-white/15 hover:bg-white/25 text-white">
              <Mail className="mr-2 h-4 w-4" /> Request contact
            </Button>
            <ShareProfileModal
              athleteName={`${a.firstName} ${a.lastName}`}
              athleteId={a.slug || a.id}
              trigger={
                <Button variant="ghost" size="icon" className="bg-white/15 hover:bg-white/25 text-white">
                  <Share2 className="h-4 w-4" />
                </Button>
              }
            />
          </div>
        </div>

        {/* BADGES */}
        <div className="grid gap-3 my-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(112px, 1fr))" }}>
          {[
            { k: "UTR", v: a.utr != null ? String(a.utr) : "—", red: true },
            { k: "WTN", v: a.wtn != null ? String(a.wtn) : "—", red: true },
            { k: `Nat.${a.nationalRankingCountry ? " " + a.nationalRankingCountry : ""}`, v: a.nationalRanking ? `#${a.nationalRanking}` : "—" },
            { k: "ITF Junior", v: a.itfJuniorRanking != null ? String(a.itfJuniorRanking) : "—" },
            { k: "GPA", v: a.gpa != null ? Number(a.gpa).toFixed(2) : "—" },
            { k: "Budget / yr", v: money(a.budget) ?? "—" },
            { k: "Class", v: a.graduationYear || "—" },
            { k: "Major", v: a.intendedMajors || "—" },
          ].map((b, i) => (
            <div key={i} className="bg-white rounded-xl px-3.5 py-3 text-center" style={{ border: `1px solid ${LINE}` }}>
              <div className="text-[11px] uppercase tracking-wide" style={{ color: MUTED }}>{b.k}</div>
              <div className="text-[22px] font-extrabold mt-0.5" style={{ color: b.red ? RED : NAVY }}>{b.v}</div>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div className="flex flex-wrap gap-1 mb-5" style={{ borderBottom: `2px solid ${LINE}` }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className="px-4 py-2.5 text-sm font-bold uppercase tracking-wide -mb-0.5"
              style={{
                color: activeTab === t.key ? NAVY : MUTED,
                borderBottom: `3px solid ${activeTab === t.key ? RED : "transparent"}`,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* PERSONAL */}
        {activeTab === "personal" && (
          <div className="grid md:grid-cols-2 gap-4">
            <Card title="Player" accent="identity">
              <Row label="Date of birth" value={a.dateOfBirth} />
              <Row label="Nationality" value={a.hometown} />
              <Row label="Height / Weight" value={[a.heightCm ? `${a.heightCm} cm` : null, a.weightKg ? `${a.weightKg} kg` : null].filter(Boolean).join(" · ") || undefined} />
              <Row label="Dominant hand" value={a.dominantHand} />
              <Row label="Backhand" value={a.backhandType} />
              <Row label="Club" value={a.clubTeam} />
              <Row label="City" value={a.city} />
            </Card>
            <Card title="Contact" accent="& notes">
              <Row label="Contact details" value="Via Dual Rise 🔒" />
              {a.questionnaireNotes && <p className="text-sm mt-2 whitespace-pre-line">{a.questionnaireNotes}</p>}
              <p className="text-xs mt-2" style={{ color: MUTED }}>
                Contact info is unlocked through the contact-request flow — Dual Rise is the sole intermediary.
              </p>
            </Card>
          </div>
        )}

        {/* TENNIS */}
        {activeTab === "tennis" && (
          <div className="grid md:grid-cols-2 gap-4">
            <Card title="Ratings &" accent="rankings">
              <Row label="UTR" value={a.utr != null ? String(a.utr) : undefined} />
              <Row label="WTN" value={a.wtn != null ? String(a.wtn) : undefined} />
              <Row label="National ranking" value={a.nationalRanking ? `#${a.nationalRanking}${a.nationalRankingCountry ? ` (${a.nationalRankingCountry})` : ""}` : undefined} />
              <Row label="ITF Junior" value={a.itfJuniorRanking != null ? String(a.itfJuniorRanking) : undefined} />
              <Row label="Preferred surface" value={a.preferredSurface} />
              <Row label="Play style" value={a.playStyle} />
            </Card>
            <Card title="Physical" accent="attributes">
              <Bar label="Flexibility" v={a.physFlexibility} />
              <Bar label="Strength" v={a.physStrength} />
              <Bar label="Endurance" v={a.physEndurance} />
            </Card>
            <Card title="Technical" accent="skills" full>
              <div className="grid sm:grid-cols-2 gap-x-7">
                <Bar label="Serve" v={a.techServe} />
                <Bar label="Forehand" v={a.techForehand} />
                <Bar label="Backhand" v={a.techBackhand} />
                <Bar label="Volley" v={a.techVolley} />
                <Bar label="Smash" v={a.techSmash} />
                <Bar label="Baseline game" v={a.techBaseline} />
                <Bar label="Net game" v={a.techNet} />
              </div>
            </Card>
            <Card title="Tactical" accent="skills">
              <Bar label="Decision-making" v={a.tacDecisionMaking} />
              <Bar label="Adaptability" v={a.tacAdaptability} />
              <Bar label="Mental resilience" v={a.tacMentalResilience} />
              <Bar label="Anticipation" v={a.tacAnticipation} />
            </Card>
            {(a.strengths || a.weaknesses) && (
              <Card title="Strengths &" accent="weaknesses">
                {a.strengths && (
                  <>
                    <div className="text-xs uppercase mb-1.5" style={{ color: MUTED }}>Strengths</div>
                    <div className="mb-3"><Tags items={splitList(a.strengths)} variant="navy" /></div>
                  </>
                )}
                {a.weaknesses && (
                  <>
                    <div className="text-xs uppercase mb-1.5" style={{ color: MUTED }}>Weaknesses</div>
                    <Tags items={splitList(a.weaknesses)} variant="red" />
                  </>
                )}
              </Card>
            )}
            {(a.areasOfImprovement || a.objectives) && (
              <Card title="Development" accent="& goals">
                {a.areasOfImprovement && (
                  <>
                    <div className="text-xs uppercase mb-1.5" style={{ color: MUTED }}>Areas of improvement</div>
                    <ul className="list-disc pl-5 mb-2.5 text-sm">{splitList(a.areasOfImprovement).map((x, i) => <li key={i} className="my-1">{x}</li>)}</ul>
                  </>
                )}
                {a.objectives && (
                  <>
                    <div className="text-xs uppercase mb-1.5" style={{ color: MUTED }}>Goals</div>
                    <Tags items={splitList(a.objectives)} variant="plain" />
                  </>
                )}
              </Card>
            )}
          </div>
        )}

        {/* ACADEMICS */}
        {activeTab === "academics" && (
          <div className="grid md:grid-cols-2 gap-4">
            <Card title="Academic" accent="profile">
              <Row label="High school" value={a.highSchool} />
              <Row label="GPA" value={a.gpa != null ? Number(a.gpa).toFixed(2) : undefined} />
              <Row label="Intended major" value={a.intendedMajors} />
              <Row label="Duolingo" value={a.duolingoScore != null ? String(a.duolingoScore) : undefined} />
              <Row label="SAT" value={a.satScore != null ? String(a.satScore) : undefined} />
              <Row label="TOEFL" value={a.toeflScore != null ? String(a.toeflScore) : undefined} />
              <Row label="Eligibility left" value={a.eligibilityYears} />
              <Row label="Annual budget" value={money(a.budget)} />
              <Row label="Class" value={a.graduationYear} />
            </Card>
            <Card title="University" accent="preferences">
              <Row label="Target divisions" value={a.preferredDivisions?.length ? a.preferredDivisions.join(", ") : undefined} />
              <Row label="Preferred states" value={a.preferredStates?.length ? a.preferredStates.join(", ") : undefined} />
              <Row label="Climate / zones" value={a.weatherZone && a.weatherZone !== "Not specified" ? a.weatherZone : undefined} />
              {a.recruitmentPitch && (
                <div className="mt-3">
                  <div className="text-xs uppercase mb-1.5" style={{ color: MUTED }}>Why a good recruit</div>
                  <p className="text-sm whitespace-pre-line">{a.recruitmentPitch}</p>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* TOURNAMENTS */}
        {activeTab === "tournaments" && (
          <div className="space-y-4">
            {a.bestResults && (
              <Card title="Best" accent="results" full>
                <Tags items={splitList(a.bestResults)} variant="plain" />
              </Card>
            )}
            <Card title="Latest" accent="results" full>
              {tournamentResults.length === 0 ? (
                <p className="text-sm" style={{ color: MUTED }}>No match results yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[13.5px]" style={{ borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["Tournament", "Location", "Round", "Opponent", "Opp. UTR", "Score", "Result"].map((h) => (
                          <th key={h} className="text-left px-3 py-2.5 text-[11px] uppercase tracking-wide font-bold" style={{ color: MUTED, borderBottom: `1px solid ${LINE}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tournamentResults.map((r) => {
                        const t = r.tournament || r.tournaments || {};
                        const loc = [t.location, t.country].filter(Boolean).join(", ");
                        const win = (r.match_result || "").toUpperCase() === "W";
                        return (
                          <tr key={r.id}>
                            <td className="px-3 py-2.5" style={{ borderBottom: `1px solid ${LINE}` }}>{t.name || "—"}</td>
                            <td className="px-3 py-2.5" style={{ borderBottom: `1px solid ${LINE}` }}>{loc || "—"}</td>
                            <td className="px-3 py-2.5" style={{ borderBottom: `1px solid ${LINE}` }}>{r.round_reached || "—"}</td>
                            <td className="px-3 py-2.5" style={{ borderBottom: `1px solid ${LINE}` }}>{r.opponent_name || "—"}</td>
                            <td className="px-3 py-2.5" style={{ borderBottom: `1px solid ${LINE}` }}>
                              {r.opponent_utr != null ? <span className="inline-block rounded px-1.5 py-0.5 text-xs font-bold" style={{ background: "#F4F2EC", border: `1px solid ${LINE}` }}>{r.opponent_utr}</span> : "—"}
                            </td>
                            <td className="px-3 py-2.5 font-bold" style={{ borderBottom: `1px solid ${LINE}`, color: r.match_result ? (win ? "#0a7d3c" : RED) : NAVY }}>{r.match_score || "—"}</td>
                            <td className="px-3 py-2.5" style={{ borderBottom: `1px solid ${LINE}`, color: r.match_result ? (win ? "#0a7d3c" : RED) : MUTED }}>{r.match_result || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* MEDIA */}
        {activeTab === "media" && (
          <div className="space-y-4">
            <Card title="Match" accent="video" full>
              {a.videoLink ? (
                <div className="rounded-xl overflow-hidden" style={{ aspectRatio: "16/9", background: "#000" }}>
                  <iframe src={a.videoLink} title="Match video" className="w-full h-full" allowFullScreen />
                </div>
              ) : (
                <p className="text-sm flex items-center gap-2" style={{ color: MUTED }}><Play className="h-4 w-4" /> No match video linked yet.</p>
              )}
            </Card>
            <Card title="External" accent="links" full>
              <div className="flex flex-wrap gap-3">
                {a.utrProfileLink && <a className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-bold" style={{ border: `1px solid ${LINE}`, color: NAVY }} href={a.utrProfileLink} target="_blank" rel="noopener noreferrer">🎾 UTR profile <ExternalLink className="h-3.5 w-3.5" /></a>}
                {a.wtnProfileLink && <a className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-bold" style={{ border: `1px solid ${LINE}`, color: NAVY }} href={a.wtnProfileLink} target="_blank" rel="noopener noreferrer">🌐 WTN profile <ExternalLink className="h-3.5 w-3.5" /></a>}
                {a.tournamentResultsLink && <a className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-bold" style={{ border: `1px solid ${LINE}`, color: NAVY }} href={a.tournamentResultsLink} target="_blank" rel="noopener noreferrer">📋 Results <ExternalLink className="h-3.5 w-3.5" /></a>}
                {!a.utrProfileLink && !a.wtnProfileLink && !a.tournamentResultsLink && <p className="text-sm" style={{ color: MUTED }}>No external links yet.</p>}
              </div>
            </Card>
          </div>
        )}
      </div>

      <ContactRequestModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        athlete={{
          id: a.id,
          firstName: a.firstName,
          lastName: a.lastName,
          profileImage: a.profileImage,
          starRating: a.starRating || 0,
          gpa: a.gpa,
          preferredDivision: a.preferredDivisions?.join(", ") || "N/A",
          highSchoolYear: a.highSchoolYear,
          hometown: a.hometown,
          currentSchool: a.clubTeam,
          scoringAverage: undefined,
          nationalRanking: a.nationalRanking,
        }}
        isFavorited={isFavorited}
        hasNotes={false}
      />
    </div>
  );
};

export default AthleteDetail;

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Athlete } from '@/types/athlete';
import { parseRoundsToNumbers } from '@/lib/roundsParser';

// USAP one-pager v2.1 — a single self-contained recruiting sheet, generated LIVE
// from the current DB on each download (never cached). This REPLACES the old
// section-based ProfessionalPDFGenerator layout for the coach-facing profile.

export interface ScoringByYearRow {
  year: number;
  scoring_avg: number;
  n_rounds: number;
}

// USAP palette
const NAVY = '#0F2A4A';
const ORANGE = '#E11D2A';
const ORANGE_LIGHT = '#F4C9A8';
const CREAM = '#FBF7EF';
const WHITE = '#FFFFFF';
const TEXT = '#1F2937';
const MUTED = '#6B7280';
const LIGHT = '#CBD5E1';
const BORDER = '#E5E7EB';

async function loadImageAsDataUrl(url?: string, timeoutMs = 3000): Promise<string | null> {
  if (!url) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal, mode: 'cors' });
    clearTimeout(timer);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) return null;
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function drawRoundedImage(pdf: jsPDF, dataUrl: string, x: number, y: number, size: number): void {
  const match = /^data:image\/(\w+);/.exec(dataUrl);
  const fmt = match ? match[1].toUpperCase() : 'JPEG';
  try {
    const anyPdf = pdf as any;
    pdf.saveGraphicsState();
    anyPdf.roundedRect(x, y, size, size, 3, 3, null);
    anyPdf.clip();
    anyPdf.discardPath();
    pdf.addImage(dataUrl, fmt, x, y, size, size);
    pdf.restoreGraphicsState();
  } catch {
    try { pdf.restoreGraphicsState(); } catch { /* noop */ }
    try { pdf.addImage(dataUrl, fmt, x, y, size, size); } catch { /* skip */ }
  }
}

// Draw a filled/outline 5-point star (vector — no font glyphs required).
function drawStar(pdf: jsPDF, cx: number, cy: number, R: number, filled: boolean): void {
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? R : R * 0.45;
    pts.push([cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)]);
  }
  const deltas: [number, number][] = [];
  for (let i = 1; i < pts.length; i++) deltas.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]);
  deltas.push([pts[0][0] - pts[9][0], pts[0][1] - pts[9][1]]);
  if (filled) { pdf.setFillColor(ORANGE); pdf.setDrawColor(ORANGE); }
  else { pdf.setFillColor(WHITE); pdf.setDrawColor(ORANGE_LIGHT); }
  pdf.setLineWidth(0.3);
  pdf.lines(deltas, pts[0][0], pts[0][1], [1, 1], filled ? 'F' : 'S', true);
}

const pInt = (v: any): number | null => {
  const n = parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : null;
};
const pFloat = (v: any): number | null => {
  const n = parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : null;
};

// A row of value boxes; the "best" one is outlined in orange with an orange value.
function drawValueBoxes(
  pdf: jsPDF,
  x0: number,
  y: number,
  boxW: number,
  boxH: number,
  gap: number,
  items: { label: string; value: string; sub?: string; best?: boolean }[]
): number {
  let x = x0;
  for (const item of items) {
    pdf.setFillColor(WHITE);
    if (item.best) { pdf.setDrawColor(ORANGE); pdf.setLineWidth(1.1); }
    else { pdf.setDrawColor(BORDER); pdf.setLineWidth(0.4); }
    pdf.roundedRect(x, y, boxW, boxH, 1.6, 1.6, 'FD');

    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(MUTED);
    pdf.text(item.label, x + boxW / 2, y + 4.5, { align: 'center' });

    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12);
    pdf.setTextColor(item.best ? ORANGE : TEXT);
    pdf.text(item.value, x + boxW / 2, y + (item.sub ? 10.5 : 12), { align: 'center' });

    if (item.sub) {
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6); pdf.setTextColor(MUTED);
      pdf.text(item.sub, x + boxW / 2, y + 14.5, { align: 'center' });
    }
    x += boxW + gap;
  }
  pdf.setLineWidth(0.5);
  return y + boxH;
}

// Rounded "chip" tags, wrapping within [x0, xMax].
function drawChips(pdf: jsPDF, x0: number, y: number, xMax: number, labels: string[]): number {
  let x = x0;
  let cy = y;
  const h = 6;
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  for (const raw of labels) {
    const label = raw.trim();
    if (!label) continue;
    const w = pdf.getTextWidth(label) + 6;
    if (x + w > xMax) { x = x0; cy += h + 2; }
    pdf.setFillColor(CREAM); pdf.setDrawColor(ORANGE_LIGHT); pdf.setLineWidth(0.3);
    pdf.roundedRect(x, cy, w, h, 3, 3, 'FD');
    pdf.setTextColor(NAVY);
    pdf.text(label, x + w / 2, cy + 4, { align: 'center' });
    x += w + 3;
  }
  return cy + h;
}

function sectionTitle(pdf: jsPDF, x: number, y: number, title: string, note?: string): number {
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.setTextColor(NAVY);
  pdf.text(title, x, y);
  // Measure the title width with the SAME font that drew it (bold 10) — BEFORE
  // switching to the italic note font — otherwise the width is under-measured and
  // the note overlaps the title.
  const titleW = pdf.getTextWidth(title);
  if (note) {
    pdf.setFont('helvetica', 'italic'); pdf.setFontSize(7.5); pdf.setTextColor(MUTED);
    pdf.text(note, x + titleW + 4, y);
  }
  return y + 2;
}

export async function generateAthleteOnePager(
  athlete: Athlete,
  results: any[],
  scoringByYear: ScoringByYearRow[]
): Promise<void> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = pdf.internal.pageSize.width;
  const M = 12;
  const contentW = W - 2 * M;

  // ---------------- HEADER (navy band) ----------------
  const headerH = 46;
  pdf.setFillColor(NAVY);
  pdf.rect(0, 0, W, headerH, 'F');

  const ps = 30, px = M, py = 8;
  const photo = await loadImageAsDataUrl(athlete.profileImage);
  if (photo) {
    drawRoundedImage(pdf, photo, px, py, ps);
  } else {
    pdf.setFillColor(ORANGE);
    pdf.roundedRect(px, py, ps, ps, 3, 3, 'F');
    const initials = `${(athlete.firstName || '').charAt(0)}${(athlete.lastName || '').charAt(0)}`.toUpperCase();
    pdf.setTextColor(WHITE); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(16);
    pdf.text(initials || '?', px + ps / 2, py + ps / 2 + 2, { align: 'center' });
  }

  const tx = px + ps + 6;
  pdf.setTextColor(WHITE); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(19);
  pdf.text(`${athlete.firstName ?? ''} ${athlete.lastName ?? ''}`.trim(), tx, 15);

  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9.5); pdf.setTextColor(LIGHT);
  if (athlete.graduationYear) pdf.text(`Class: Fall of ${athlete.graduationYear}`, tx, 21);

  const meta = [
    athlete.dominantHand ? `${athlete.dominantHand}-handed` : null,
    athlete.backhandType ? `${athlete.backhandType} backhand` : null,
    athlete.playStyle,
    athlete.preferredSurface ? `${athlete.preferredSurface} court` : null,
  ].filter(Boolean).join('  ·  ');
  if (meta) pdf.text(meta, tx, 26.5);

  // Stars (vector) + /7
  const stars = Math.max(0, Math.min(7, Math.round(athlete.starRating ?? 0)));
  let sx = tx + 2;
  for (let i = 0; i < 7; i++) { drawStar(pdf, sx, 32, 2, i < stars); sx += 5; }
  pdf.setTextColor(WHITE); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9);
  pdf.text(`${stars}/7`, sx + 1, 33, { align: 'left' });

  const rk: string[] = [];
  const club = [athlete.clubTeam, athlete.city || athlete.hometown].filter(Boolean).join(' — ');
  if (club) rk.push(club);
  if (pInt(athlete.nationalRanking)) rk.push(`Nat. #${athlete.nationalRanking}${athlete.nationalRankingCountry ? ' ' + athlete.nationalRankingCountry : ''}`);
  if (pInt((athlete as any).itfJuniorRanking)) rk.push(`ITF Junior ${(athlete as any).itfJuniorRanking}`);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(WHITE);
  if (rk.length) pdf.text(rk.join('    |    '), tx, 39.5);

  let y = headerH + 7;

  // ---------------- FACTS ROW ----------------
  const facts = [
    { label: 'TARGET', value: (athlete.preferredDivisions && athlete.preferredDivisions.length ? athlete.preferredDivisions.join(', ') : 'N/A') },
    { label: 'GPA', value: athlete.gpa != null ? Number(athlete.gpa).toFixed(2) : 'N/A' },
    { label: 'BUDGET / YR', value: athlete.budget != null ? `$${Number(athlete.budget).toLocaleString('en-US')}` : 'N/A' },
    { label: 'STATUS', value: athlete.status ? String(athlete.status).replace(/_/g, ' ') : 'N/A' },
  ];
  const fGap = 4;
  const fW = (contentW - fGap * 3) / 4;
  const fH = 14;
  let fx = M;
  for (const f of facts) {
    pdf.setFillColor(CREAM); pdf.setDrawColor(BORDER); pdf.setLineWidth(0.4);
    pdf.roundedRect(fx, y, fW, fH, 1.6, 1.6, 'FD');
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(6.5); pdf.setTextColor(ORANGE);
    pdf.text(f.label, fx + fW / 2, y + 4.5, { align: 'center' });
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9.5); pdf.setTextColor(NAVY);
    pdf.text(pdf.splitTextToSize(f.value, fW - 4)[0], fx + fW / 2, y + 10.5, { align: 'center' });
    fx += fW + fGap;
  }
  y += fH + 8;

  // ---------------- HEADLINE RATINGS (UTR / WTN) ----------------
  const utr = pFloat(athlete.utr);
  const wtn = pFloat(athlete.wtn);
  const power: { label: string; value: string }[] = [];
  if (utr != null) power.push({ label: 'UTR', value: `${utr}` });
  if (wtn != null) power.push({ label: 'WTN (lower is better)', value: `${wtn}` });
  if (power.length > 0) {
    const pGap = 4;
    const boxW = power.length === 1 ? contentW / 2 : (contentW - pGap) / 2;
    const ph = 13;
    let ppx = M;
    for (const p of power) {
      pdf.setFillColor(CREAM); pdf.setDrawColor(BORDER); pdf.setLineWidth(0.4);
      pdf.roundedRect(ppx, y, boxW, ph, 1.6, 1.6, 'FD');
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(6.5); pdf.setTextColor(ORANGE);
      pdf.text(p.label, ppx + boxW / 2, y + 4.5, { align: 'center' });
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.setTextColor(NAVY);
      pdf.text(p.value, ppx + boxW / 2, y + 10, { align: 'center' });
      ppx += boxW + pGap;
    }
    y += ph + 8;
  }

  // ---------------- GAME RATINGS (physical / technical / tactical, 0–10) ----------------
  const A = athlete as any;
  const ratingRow = (title: string, items: { label: string; v: any }[]) => {
    const present = items
      .map((it) => ({ label: it.label, v: pFloat(it.v) }))
      .filter((it): it is { label: string; v: number } => it.v != null);
    if (present.length === 0) return;
    y = sectionTitle(pdf, M, y, title) + 3;
    const gap = 4;
    const n = present.length;
    const boxW = Math.min(30, (contentW - gap * (n - 1)) / n);
    y = drawValueBoxes(pdf, M, y, boxW, 15, gap,
      present.map((it) => ({ label: it.label, value: `${it.v}` }))
    ) + 6;
  };
  ratingRow('Technical  (0–10)', [
    { label: 'Serve', v: A.techServe }, { label: 'Forehand', v: A.techForehand },
    { label: 'Backhand', v: A.techBackhand }, { label: 'Volley', v: A.techVolley },
    { label: 'Smash', v: A.techSmash }, { label: 'Baseline', v: A.techBaseline },
    { label: 'Net', v: A.techNet },
  ]);
  ratingRow('Physical  (0–10)', [
    { label: 'Flexibility', v: A.physFlexibility }, { label: 'Strength', v: A.physStrength },
    { label: 'Endurance', v: A.physEndurance },
  ]);
  ratingRow('Tactical  (0–10)', [
    { label: 'Decision', v: A.tacDecisionMaking }, { label: 'Adaptability', v: A.tacAdaptability },
    { label: 'Resilience', v: A.tacMentalResilience }, { label: 'Anticipation', v: A.tacAnticipation },
  ]);

  // ---------------- STRENGTHS / WEAKNESSES / GOALS / BEST RESULTS ----------------
  const splitChips = (s: any) => String(s ?? '').split(/[,\n;]/).map((x) => x.trim()).filter(Boolean);
  const strengths = splitChips(athlete.strengths);
  const weaknesses = splitChips(A.weaknesses);
  const areas = splitChips(athlete.areasOfImprovement);
  const objectives = splitChips(A.objectives);
  const bestResults = splitChips(A.bestResults);
  if (strengths.length) {
    y = sectionTitle(pdf, M, y, 'Strengths') + 3;
    y = drawChips(pdf, M, y, W - M, strengths) + 6;
  }
  if (weaknesses.length) {
    y = sectionTitle(pdf, M, y, 'Weaknesses') + 3;
    y = drawChips(pdf, M, y, W - M, weaknesses) + 6;
  }
  if (areas.length) {
    y = sectionTitle(pdf, M, y, 'Areas of Improvement') + 3;
    y = drawChips(pdf, M, y, W - M, areas) + 6;
  }
  if (objectives.length) {
    y = sectionTitle(pdf, M, y, 'Goals') + 3;
    y = drawChips(pdf, M, y, W - M, objectives) + 6;
  }
  if (bestResults.length) {
    y = sectionTitle(pdf, M, y, 'Best Results') + 3;
    y = drawChips(pdf, M, y, W - M, bestResults) + 6;
  }

  // ---------------- WHY I'D BE A GREAT RECRUIT ----------------
  const pitch = String(athlete.recruitmentPitch ?? '').trim();
  if (pitch) {
    y = sectionTitle(pdf, M, y, "Why I'd be a great recruit") + 3;
    const lines = pdf.splitTextToSize(`"${pitch}"`, contentW - 8);
    const boxH = lines.length * 4.4 + 6;
    pdf.setFillColor(CREAM); pdf.setDrawColor(ORANGE_LIGHT); pdf.setLineWidth(0.4);
    pdf.roundedRect(M, y, contentW, boxH, 2, 2, 'FD');
    pdf.setFont('helvetica', 'italic'); pdf.setFontSize(9); pdf.setTextColor(TEXT);
    pdf.text(lines, M + 4, y + 5);
    y += boxH + 7;
  }

  // ---------------- SWING VIDEO LINK (above tournaments) ----------------
  // Pure ASCII, orange + underline, clickable (no play-triangle / non-latin glyphs).
  if (athlete.videoLink) {
    if (y > 285) { pdf.addPage(); y = M; }
    const label = 'Watch match video';
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor(ORANGE);
    pdf.textWithLink(label, M, y, { url: athlete.videoLink });
    pdf.setDrawColor(ORANGE); pdf.setLineWidth(0.4);
    pdf.line(M, y + 1, M + pdf.getTextWidth(label), y + 1);
    y += 8;
  }

  // ---------------- RECENT TOURNAMENTS (all of them) ----------------
  const NA = '-';
  const sorted = [...(results || [])].sort((r1, r2) => {
    const t1 = r1.tournament || r1.tournaments || {};
    const t2 = r2.tournament || r2.tournaments || {};
    const d1 = new Date(t1.start_date || t1.end_date || `${t1.year || 0}-01-01`).getTime() || 0;
    const d2 = new Date(t2.start_date || t2.end_date || `${t2.year || 0}-01-01`).getTime() || 0;
    return d2 - d1;
  });
  const tournamentRows = sorted.map((r) => {
    const t = r.tournament || r.tournaments || {};
    const date = t.start_date || t.end_date;
    const dateStr = date
      ? new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      : String(t.year ?? NA);
    const loc = [t.location, t.country].filter(Boolean).join(', ') || NA;
    const round = r.round_reached || NA;
    const opp = r.opponent_name || NA;
    const oppUtr = r.opponent_utr != null ? String(r.opponent_utr) : NA;
    const score = r.match_score || NA;
    const result = r.match_result ? (String(r.match_result).toUpperCase() === 'W' ? 'Win' : 'Loss') : NA;
    return [dateStr, t.name || NA, loc, round, opp, oppUtr, score, result];
  });

  if (tournamentRows.length > 0) {
    // Start the table on a fresh page only if there's too little room left for the
    // header + a couple of rows; otherwise autoTable flows cleanly onto extra pages
    // as needed (header repeated on each), so long lists spill neatly across pages.
    if (y > 250) { pdf.addPage(); y = M; }
    y = sectionTitle(pdf, M, y, 'Latest Match Results') + 3;
    autoTable(pdf, {
      startY: y,
      head: [['Date', 'Tournament', 'Location', 'Round', 'Opponent', 'Opp. UTR', 'Score', 'Result']],
      body: tournamentRows,
      theme: 'grid',
      margin: { left: M, right: M, top: M, bottom: M },
      pageBreak: 'auto',
      rowPageBreak: 'avoid',
      showHead: 'everyPage',
      headStyles: { fillColor: NAVY as any, textColor: 255, fontSize: 7, fontStyle: 'bold' },
      styles: { fontSize: 7, cellPadding: 1.6, overflow: 'linebreak', textColor: TEXT as any },
      alternateRowStyles: { fillColor: CREAM as any },
      columnStyles: {
        1: { cellWidth: 36 },
        2: { cellWidth: 28 },
        3: { fontStyle: 'bold', textColor: NAVY as any },
        7: { fontStyle: 'bold' },
      },
    });
    // @ts-ignore autoTable adds lastAutoTable
    y = (pdf.lastAutoTable?.finalY ?? y) + 6;
  }

  const fileName = `${(athlete.firstName || 'athlete')}_${(athlete.lastName || '')}_DualRise.pdf`.replace(/\s+/g, '_');
  pdf.save(fileName);
}

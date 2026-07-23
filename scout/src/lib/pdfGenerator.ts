import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Athlete } from '@/types/athlete';
import { TournamentResult } from '@/types/tournament';

// Define custom fonts and colors
const colors = {
  primary: '#FF6B35',      // USAP Orange
  secondary: '#1E3A8A',    // Deep Blue
  accent: '#10B981',       // Success Green
  text: '#1F2937',         // Dark Gray
  textLight: '#6B7280',    // Light Gray
  background: '#F9FAFB',   // Light Background
  border: '#E5E7EB',       // Border Gray
  white: '#FFFFFF'
};

interface PDFConfig {
  includePersonal: boolean;
  includeAcademic: boolean;
  includeGolf: boolean;
  includeTournaments: boolean;
  includeMedia: boolean;
  quality: string;
  orientation: string;
}

// One row of the athlete_scoring_by_year RPC (live per-year scoring averages).
export interface ScoringByYear {
  year: number;
  scoring_avg: number;
  n_rounds: number;
}

export class ProfessionalPDFGenerator {
  private pdf: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number = 20;
  private currentY: number = 20;
  private lineHeight: number = 7;

  constructor(orientation: 'portrait' | 'landscape' = 'portrait') {
    this.pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4'
    });
    
    this.pageWidth = this.pdf.internal.pageSize.width;
    this.pageHeight = this.pdf.internal.pageSize.height;
    
    // Set default font
    this.pdf.setFont('helvetica');
  }

  private addNewPageIfNeeded(requiredSpace: number = 30): void {
    if (this.currentY + requiredSpace > this.pageHeight - this.margin) {
      this.pdf.addPage();
      this.currentY = this.margin;
    }
  }

  private drawHeader(): void {
    // Draw header background
    this.pdf.setFillColor(colors.primary);
    this.pdf.rect(0, 0, this.pageWidth, 25, 'F');
    
    // Add header text
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.setFontSize(10);
    this.pdf.text('Athlete Profile Report', this.margin, 10);
    
    // Add date
    this.pdf.setFontSize(9);
    const dateStr = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    this.pdf.text(dateStr, this.pageWidth - this.margin, 10, { align: 'right' });
    
    this.currentY = 35;
  }

  private drawFooter(pageNum: number, totalPages: number): void {
    const footerY = this.pageHeight - 15;
    
    // Draw footer line
    this.pdf.setDrawColor(colors.border);
    this.pdf.setLineWidth(0.5);
    this.pdf.line(this.margin, footerY - 5, this.pageWidth - this.margin, footerY - 5);
    
    // Footer text
    this.pdf.setTextColor(colors.textLight);
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'normal');
    
    // Left side - generated date
    this.pdf.text(`Generated: ${new Date().toLocaleDateString()}`, this.margin, footerY);
    
    // Center - page numbers
    this.pdf.text(`Page ${pageNum} of ${totalPages}`, this.pageWidth / 2, footerY, { align: 'center' });
  }

  private drawSectionHeader(title: string, icon?: string): void {
    this.addNewPageIfNeeded(20);
    
    // Draw section background
    this.pdf.setFillColor(colors.background);
    this.pdf.roundedRect(this.margin - 5, this.currentY - 5, this.pageWidth - (2 * this.margin) + 10, 12, 2, 2, 'F');
    
    // Draw accent line
    this.pdf.setFillColor(colors.primary);
    this.pdf.rect(this.margin - 5, this.currentY - 5, 3, 12, 'F');
    
    // Section title
    this.pdf.setTextColor(colors.secondary);
    this.pdf.setFontSize(14);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(title, this.margin + 5, this.currentY + 2);
    
    this.currentY += 15;
  }

  private drawInfoRow(label: string, value: string | number, indent: number = 0): void {
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(11);
    
    // Label
    this.pdf.setTextColor(colors.textLight);
    this.pdf.text(label + ':', this.margin + indent, this.currentY);
    
    // Value
    this.pdf.setTextColor(colors.text);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(String(value), this.margin + indent + 50, this.currentY);
    
    this.currentY += this.lineHeight;
  }

  private drawStatCard(x: number, y: number, width: number, height: number, label: string, value: string | number, color: string = colors.primary): void {
    // Card background
    this.pdf.setFillColor(255, 255, 255);
    this.pdf.setDrawColor(colors.border);
    this.pdf.setLineWidth(0.5);
    this.pdf.roundedRect(x, y, width, height, 3, 3, 'FD');
    
    // Accent top border
    this.pdf.setFillColor(color);
    this.pdf.rect(x, y, width, 2, 'F');
    
    // Label
    this.pdf.setTextColor(colors.textLight);
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(label, x + width/2, y + 8, { align: 'center' });
    
    // Value
    this.pdf.setTextColor(colors.text);
    this.pdf.setFontSize(20);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(String(value), x + width/2, y + 20, { align: 'center' });
  }

  // Draw a wrapping row of small stat boxes. The "best" one is outlined in orange
  // and its value coloured orange (used to highlight the lowest scoring average).
  private drawStatBoxes(items: { label: string; value: string; sub?: string; best?: boolean }[]): void {
    const boxW = 40;
    const boxH = 22;
    const gap = 6;
    let x = this.margin;
    let y = this.currentY;

    for (const item of items) {
      if (x + boxW > this.pageWidth - this.margin) {
        x = this.margin;
        y += boxH + gap;
      }
      if (y + boxH > this.pageHeight - this.margin) {
        this.pdf.addPage();
        this.currentY = this.margin;
        y = this.currentY;
        x = this.margin;
      }

      this.pdf.setFillColor(colors.white);
      if (item.best) {
        this.pdf.setDrawColor(colors.primary);
        this.pdf.setLineWidth(1.2);
      } else {
        this.pdf.setDrawColor(colors.border);
        this.pdf.setLineWidth(0.4);
      }
      this.pdf.roundedRect(x, y, boxW, boxH, 2, 2, 'FD');

      // Label
      this.pdf.setFontSize(8);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setTextColor(colors.textLight);
      this.pdf.text(item.label, x + boxW / 2, y + 6, { align: 'center' });

      // Value (orange when best)
      this.pdf.setFontSize(14);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setTextColor(item.best ? colors.primary : colors.text);
      this.pdf.text(item.value, x + boxW / 2, y + (item.sub ? 13 : 15), { align: 'center' });

      // Optional sub-label (e.g. rounds count)
      if (item.sub) {
        this.pdf.setFontSize(7);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(colors.textLight);
        this.pdf.text(item.sub, x + boxW / 2, y + 18.5, { align: 'center' });
      }

      x += boxW + gap;
    }

    this.pdf.setLineWidth(0.5);
    this.currentY = y + boxH + 10;
  }

  // Scoring average by year (LIVE from the athlete_scoring_by_year RPC) and recent
  // form (LIVE from scoring_avg_last_{3,5,7,10}_raw). Only periods actually present
  // are shown; the lowest (best) value in each group is boxed in orange.
  private drawScoringAverages(athlete: Athlete, scoringByYear: ScoringByYear[]): void {
    // --- By year (only years returned by the RPC) ---
    const yearRows = (scoringByYear || [])
      .map((r) => ({ year: r.year, avg: Number(r.scoring_avg), n: Number(r.n_rounds) }))
      .filter((r) => Number.isFinite(r.avg) && r.avg > 0);

    if (yearRows.length > 0) {
      this.addNewPageIfNeeded(40);
      this.drawSectionHeader('Scoring Average by Year');
      const best = Math.min(...yearRows.map((r) => r.avg));
      this.drawStatBoxes(
        yearRows.map((r) => ({
          label: String(r.year),
          value: r.avg.toFixed(1),
          sub: `${r.n} round${r.n === 1 ? '' : 's'}`,
          best: r.avg === best,
        }))
      );
    }

    // --- Recent form: Last 3 / 5 / 7 / 10 (only those present) ---
    const a = athlete as any;
    const recent = [
      { label: 'Last 3', raw: a.scoring_avg_last_3_raw },
      { label: 'Last 5', raw: a.scoring_avg_last_5_raw },
      { label: 'Last 7', raw: a.scoring_avg_last_7_raw },
      { label: 'Last 10', raw: a.scoring_avg_last_10_raw },
    ]
      .map((p) => ({ label: p.label, avg: parseFloat(String(p.raw ?? '')) }))
      .filter((p) => Number.isFinite(p.avg) && p.avg > 0);

    if (recent.length > 0) {
      this.addNewPageIfNeeded(40);
      this.drawSectionHeader('Recent Scoring Form');
      const best = Math.min(...recent.map((r) => r.avg));
      this.drawStatBoxes(
        recent.map((r) => ({ label: r.label, value: r.avg.toFixed(1), best: r.avg === best }))
      );
    }
  }

  private addWatermark(text: string): void {
    const pageCount = this.pdf.internal.pages.length - 1;
    
    for (let i = 1; i <= pageCount; i++) {
      this.pdf.setPage(i);
      
      // Set watermark style
      this.pdf.setTextColor(230, 230, 230);
      this.pdf.setFontSize(50);
      this.pdf.setFont('helvetica', 'bold');
      
      // Calculate center position and draw diagonally
      const x = this.pageWidth / 2;
      const y = this.pageHeight / 2;
      
      // Save graphics state and draw with transparency
      this.pdf.saveGraphicsState();
      
      // Set transparency (alpha)
      this.pdf.setGState(this.pdf.GState({ opacity: 0.2 }));
      
      // Draw the watermark text at 45-degree angle
      this.pdf.text(text, x, y, { 
        align: 'center',
        angle: 45
      });
      
      this.pdf.restoreGraphicsState();
    }
  }

  // Helper to robustly parse rounds from various formats
  private parseRounds(rounds: any): number[] {
    if (!rounds) return [];
    if (typeof rounds === 'string') {
      if (rounds.includes(',')) {
        return rounds.split(',').map((s) => parseFloat(s.trim())).filter((n) => !isNaN(n));
      }
      try {
        const parsed = JSON.parse(rounds);
        if (Array.isArray(parsed)) {
          return parsed.map((r: any) => (typeof r === 'object' ? r.score : r)).filter((s: any) => !isNaN(parseFloat(s)));
        }
      } catch {}
      return [];
    }
    if (Array.isArray(rounds)) {
      return rounds.map((r: any) => (typeof r === 'object' ? r.score : r)).filter((s: any) => !isNaN(parseFloat(s)));
    }
    return [];
  }

  // Normalize tournament result objects from camelCase or snake_case
  private normalizeResult(result: any) {
    const tournament = result.tournament || result.tournaments || {};
    const parRaw = tournament.par ?? tournament.course_par;
    const crRaw = tournament.courseRating ?? tournament.course_rating;
    const par = parRaw != null && parRaw !== '' ? parseInt(String(parRaw)) : null;
    const courseRating = crRaw != null && crRaw !== '' ? parseFloat(String(crRaw)) : null;

    const roundsArr = this.parseRounds(result.rounds);
    const totalScore = result.totalScore ?? result.total_score ?? null;
    const roundsCount = roundsArr.length || null;
    const avgScore = roundsCount ? roundsArr.reduce((a: number, b: number) => a + Number(b), 0) / roundsCount : (totalScore && roundsCount ? Number(totalScore) / roundsCount : null);

    const positionText: string | null = result.positionText ?? result.position_text ?? (result.finalPosition != null ? String(result.finalPosition) : (result.position != null ? String(result.position) : null));
    const finalPositionNum = positionText ? parseInt(positionText.replace(/[^0-9]/g, '')) : (result.finalPosition ?? result.position ?? null);

    const createdAt = result.createdAt ?? result.created_at ?? tournament.end_date ?? tournament.start_date ?? (tournament.year ? new Date(Number(tournament.year), 0, 1) : new Date());

    const vsCR = (avgScore != null && courseRating != null) ? Number((avgScore - courseRating).toFixed(1)) : null;

    return {
      tournament: {
        name: tournament.name || 'Tournament',
        year: tournament.year || '',
        location: tournament.location || '',
        country: tournament.country || '',
      },
      par,
      courseRating,
      rounds: roundsArr,
      avgScore: avgScore != null ? Number(avgScore.toFixed(1)) : null,
      vsCR,
      totalScore: totalScore != null ? Number(totalScore) : null,
      positionText,
      finalPositionNum: finalPositionNum != null ? Number(finalPositionNum) : null,
      createdAt: createdAt ? new Date(createdAt) : new Date(),
    };
  }

  // Load an image URL into a base64 data URL. Never throws: returns null on
  // CORS failure, timeout, missing URL, or any read error.
  private async loadImageAsDataUrl(
    url: string | undefined,
    timeoutMs: number = 3000
  ): Promise<string | null> {
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
        reader.onloadend = () =>
          resolve(typeof reader.result === 'string' ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  // Draw a square image with rounded corners. Never throws: falls back to a
  // plain square, and silently skips if the image data is unusable.
  private drawRoundedImage(
    dataUrl: string,
    x: number,
    y: number,
    size: number
  ): void {
    const match = /^data:image\/(\w+);/.exec(dataUrl);
    const fmt = match ? match[1].toUpperCase() : 'JPEG';
    let drawn = false;
    try {
      const anyPdf = this.pdf as any;
      this.pdf.saveGraphicsState();
      anyPdf.roundedRect(x, y, size, size, 3, 3, null);
      anyPdf.clip();
      anyPdf.discardPath();
      this.pdf.addImage(dataUrl, fmt, x, y, size, size);
      this.pdf.restoreGraphicsState();
      drawn = true;
    } catch {
      try { this.pdf.restoreGraphicsState(); } catch { /* noop */ }
    }
    if (!drawn) {
      try {
        this.pdf.addImage(dataUrl, fmt, x, y, size, size);
      } catch {
        return; // unusable image (e.g. unsupported format) — skip entirely
      }
    }
    // Clean white rounded frame around the photo
    try {
      this.pdf.setDrawColor(255, 255, 255);
      this.pdf.setLineWidth(0.8);
      this.pdf.roundedRect(x, y, size, size, 3, 3, 'S');
    } catch { /* noop */ }
  }

  public async generateAthletePDF(
    athlete: Athlete,
    tournamentResults: TournamentResult[],
    config: PDFConfig,
    scoringByYear: ScoringByYear[] = []
  ): Promise<void> {
    // Preload the athlete photo (never throws; null on CORS/timeout/absence)
    const photoDataUrl = await this.loadImageAsDataUrl(athlete.profileImage);

    // Draw header
    this.drawHeader();

    // Title Section with athlete name
    this.pdf.setFillColor(colors.secondary);
    this.pdf.rect(0, this.currentY, this.pageWidth, 30, 'F');

    // Athlete photo (top-left of header) — optional, drawn over the title bar
    if (photoDataUrl) {
      this.drawRoundedImage(photoDataUrl, this.margin, this.currentY, 30);
    }

    // Athlete Name
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.setFontSize(24);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(`${athlete.firstName} ${athlete.lastName}`, this.pageWidth / 2, this.currentY + 12, { align: 'center' });
    
    // Star rating
    this.pdf.setFontSize(11);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(`${athlete.starRating ?? 0}/7 Stars`, this.pageWidth / 2, this.currentY + 19, { align: 'center' });

    // Location · club · class
    const classLabel = athlete.graduationYear
      ? `Class of ${athlete.graduationYear}`
      : (athlete.highSchoolYear || '');
    const headerSubParts = [athlete.hometown, athlete.currentSchool, classLabel].filter(Boolean);
    this.pdf.setFontSize(10);
    this.pdf.text(headerSubParts.join('  ·  '), this.pageWidth / 2, this.currentY + 25, { align: 'center' });

    this.currentY += 40;

    // Header metric cards (always shown)
    {
      const cardWidth = (this.pageWidth - (2 * this.margin) - 30) / 4;
      const cardHeight = 30;
      const cardY = this.currentY;

      this.drawStatCard(
        this.margin,
        cardY,
        cardWidth,
        cardHeight,
        'GPA',
        athlete.gpa != null ? athlete.gpa.toFixed(2) : 'N/A',
        colors.primary
      );

      this.drawStatCard(
        this.margin + cardWidth + 10,
        cardY,
        cardWidth,
        cardHeight,
        'Best Recent Avg',
        athlete.bestRecentScoringAvg != null ? String(athlete.bestRecentScoringAvg) : 'N/A',
        colors.accent
      );

      this.drawStatCard(
        this.margin + (cardWidth + 10) * 2,
        cardY,
        cardWidth,
        cardHeight,
        'Avg vs CR',
        athlete.scoringAverageVsCourseRating != null ? String(athlete.scoringAverageVsCourseRating) : 'N/A',
        colors.secondary
      );

      this.drawStatCard(
        this.margin + (cardWidth + 10) * 3,
        cardY,
        cardWidth,
        cardHeight,
        'Budget',
        athlete.budget != null ? `$${athlete.budget}` : 'N/A',
        colors.primary
      );

      this.currentY += cardHeight + 12;
    }

    // Targeted divisions
    {
      const divs = athlete.preferredDivisions && athlete.preferredDivisions.length
        ? athlete.preferredDivisions.join(', ')
        : 'N/A';
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setFontSize(11);
      this.pdf.setTextColor(colors.textLight);
      this.pdf.text('Targeted Divisions:', this.margin, this.currentY);
      this.pdf.setTextColor(colors.text);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text(divs, this.margin + 45, this.currentY);
      this.currentY += this.lineHeight * 2;
    }

    // Golf Performance Section
    if (config.includeGolf) {
      this.drawSectionHeader('Golf Performance Metrics');

      // Performance table
      const tableData = [
        ['Metric', 'Value', 'Details'],
        ['Scoring Average', String(athlete.scoringAverage), 'Strokes per round'],
        ['Score vs Course Rating', String(athlete.scoringAverageVsCourseRating), 'Differential'],
        ['National Adult Ranking', `#${athlete.nationalAdultRanking}`, 'Current position'],
        ['Class Ranking', `#${athlete.nationalRankingInClass}`, athlete.highSchoolYear],
        ['Average Carry Driving Distance', `${athlete.drivingAverageCarryDistance} yards`, ''],
        ['Max Club Head Speed', `${athlete.maxDriverClubHeadSpeed} mph`, 'Max driver speed'],
        ['Preferred Division', athlete.preferredDivisions?.join(', ') || 'N/A', 'Target competition']
      ];

      autoTable(this.pdf, {
        startY: this.currentY,
        head: [tableData[0]],
        body: tableData.slice(1),
        theme: 'grid',
        headStyles: {
          fillColor: [30, 58, 138], // colors.secondary in RGB
          textColor: 255,
          fontSize: 11,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251] // colors.background in RGB
        },
        styles: {
          fontSize: 10,
          cellPadding: 5
        },
        columnStyles: {
          0: { fontStyle: 'bold', textColor: [107, 114, 128] }, // Label column
          1: { fontStyle: 'bold', textColor: [31, 41, 55] }, // Value column
          2: { textColor: [107, 114, 128] } // Details column
        }
      });

      // @ts-ignore - autoTable adds finalY property
      this.currentY = this.pdf.lastAutoTable.finalY + 15;

      // Scoring averages by year (live RPC) + recent form (live raw fields).
      this.drawScoringAverages(athlete, scoringByYear);
    }

    // Academic Information Section (skip when empty)
    if (config.includeAcademic && (athlete.gpa || athlete.intendedMajors || athlete.satScore || athlete.duolingoScore)) {
      this.drawSectionHeader('Academic Profile');

      // Create info box
      this.pdf.setFillColor(255, 255, 255);
      this.pdf.setDrawColor(colors.border);
      this.pdf.setLineWidth(0.5);
      const boxY = this.currentY;
      const boxHeight = 40;
      this.pdf.roundedRect(this.margin, boxY, this.pageWidth - (2 * this.margin), boxHeight, 3, 3, 'FD');

      // GPA highlight
      this.pdf.setFillColor(colors.accent);
      this.pdf.circle(this.margin + 20, boxY + 20, 15, 'F');
      this.pdf.setTextColor(255, 255, 255);
      this.pdf.setFontSize(16);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text(athlete.gpa.toFixed(2), this.margin + 20, boxY + 23, { align: 'center' });
      this.pdf.setFontSize(8);
      this.pdf.text('GPA', this.margin + 20, boxY + 28, { align: 'center' });

      // Academic details
      const academicX = this.margin + 45;
      this.pdf.setTextColor(colors.text);
      this.pdf.setFontSize(11);
      this.pdf.setFont('helvetica', 'normal');

      let academicY = boxY + 10;
      this.pdf.text(`Intended Major: ${athlete.intendedMajors || 'Not specified'}`, academicX, academicY);
      academicY += 8;

      if (athlete.satScore) {
        this.pdf.text(`SAT Score: ${athlete.satScore}`, academicX, academicY);
        academicY += 8;
      }

      if (athlete.duolingoScore) {
        this.pdf.text(`Duolingo Score: ${athlete.duolingoScore}`, academicX, academicY);
      }

      this.currentY = boxY + boxHeight + 15;
    }

    // Tournament History Section — always included when results exist
    if (tournamentResults.length > 0) {
      this.addNewPageIfNeeded(60);
      this.drawSectionHeader('Tournament Performance History');
      
      // Normalize results to handle snake_case and varied rounds formats
      const normalized = tournamentResults.map((r: any) => this.normalizeResult(r));

      // Best Performance Highlight (lowest numeric position)
      const ranked = normalized.filter(n => n.finalPositionNum != null);
      if (ranked.length > 0) {
        const best = ranked.reduce((acc, cur) => (cur.finalPositionNum! < acc.finalPositionNum! ? cur : acc));
        // Highlight box
        this.pdf.setFillColor(colors.accent);
        this.pdf.setTextColor(255, 255, 255);
        const highlightY = this.currentY;
        this.pdf.roundedRect(this.margin, highlightY, this.pageWidth - (2 * this.margin), 20, 3, 3, 'F');
        this.pdf.setFontSize(12);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text(
          `🏆 Best Finish: ${best.tournament?.name || 'Tournament'} - Position ${best.finalPositionNum}`,
          this.pageWidth / 2,
          highlightY + 12,
          { align: 'center' }
        );
        this.currentY += 30;
      }
      
      // Tournament results table
      const tournamentTableData = normalized.slice(0, 10).map(n => [
        n.tournament?.name || 'Tournament',
        n.createdAt ? new Date(n.createdAt).toLocaleDateString() : '',
        n.positionText ?? (n.finalPositionNum != null ? String(n.finalPositionNum) : 'N/A'),
        n.totalScore != null ? String(n.totalScore) : 'N/A',
        n.vsCR != null ? `${n.vsCR > 0 ? '+' : ''}${n.vsCR}` : 'N/A',
        n.rounds && n.rounds.length ? n.rounds.join('-') : '-'
      ]);

      autoTable(this.pdf, {
        startY: this.currentY,
        head: [['Tournament', 'Date', 'Position', 'Total', 'vs CR', 'Rounds']],
        body: tournamentTableData,
        theme: 'striped',
        headStyles: {
          fillColor: [255, 107, 53], // colors.primary in RGB
          textColor: 255,
          fontSize: 11,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 10,
          cellPadding: 4
        },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 25 },
          2: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 20, halign: 'center' },
          5: { cellWidth: 30, halign: 'center' }
        }
      });

      // @ts-ignore
      this.currentY = this.pdf.lastAutoTable.finalY + 15;
    }

    // Strengths and Areas of Improvement
    if (athlete.strengths || athlete.areasOfImprovement) {
      this.addNewPageIfNeeded(50);
      this.drawSectionHeader('Player Development Profile');
      
      const boxY = this.currentY;
      const halfWidth = (this.pageWidth - (2 * this.margin) - 10) / 2;
      
      // Strengths box
      if (athlete.strengths) {
        this.pdf.setFillColor(colors.accent);
        this.pdf.setTextColor(255, 255, 255);
        this.pdf.roundedRect(this.margin, boxY, halfWidth, 10, 2, 2, 'F');
        this.pdf.setFontSize(11);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text('Strengths', this.margin + halfWidth/2, boxY + 6, { align: 'center' });
        
        this.pdf.setFillColor(255, 255, 255);
        this.pdf.setDrawColor(colors.accent);
        this.pdf.setLineWidth(1);
        this.pdf.roundedRect(this.margin, boxY + 10, halfWidth, 35, 2, 2, 'FD');
        
        this.pdf.setTextColor(colors.text);
        this.pdf.setFontSize(10);
        this.pdf.setFont('helvetica', 'normal');
        const strengthsLines = this.pdf.splitTextToSize(athlete.strengths, halfWidth - 10);
        this.pdf.text(strengthsLines, this.margin + 5, boxY + 18);
      }
      
      // Areas of Improvement box
      if (athlete.areasOfImprovement) {
        const improvementX = this.margin + halfWidth + 10;
        
        this.pdf.setFillColor(colors.primary);
        this.pdf.setTextColor(255, 255, 255);
        this.pdf.roundedRect(improvementX, boxY, halfWidth, 10, 2, 2, 'F');
        this.pdf.setFontSize(11);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text('Areas of Improvement', improvementX + halfWidth/2, boxY + 6, { align: 'center' });
        
        this.pdf.setFillColor(255, 255, 255);
        this.pdf.setDrawColor(colors.primary);
        this.pdf.setLineWidth(1);
        this.pdf.roundedRect(improvementX, boxY + 10, halfWidth, 35, 2, 2, 'FD');
        
        this.pdf.setTextColor(colors.text);
        this.pdf.setFontSize(10);
        this.pdf.setFont('helvetica', 'normal');
        const improvementLines = this.pdf.splitTextToSize(athlete.areasOfImprovement, halfWidth - 10);
        this.pdf.text(improvementLines, improvementX + 5, boxY + 18);
      }
      
      this.currentY = boxY + 55;
    }

    // Add footers to all pages
    const pageCount = this.pdf.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      this.pdf.setPage(i);
      this.drawFooter(i, pageCount);
    }

    // Save the PDF
    const filename = `${athlete.firstName}_${athlete.lastName}_Profile_${new Date().toISOString().split('T')[0]}.pdf`;
    this.pdf.save(filename);
  }
}
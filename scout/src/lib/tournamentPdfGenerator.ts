import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Athlete } from '@/types/athlete';
import { TournamentResult } from '@/types/tournament';

const colors = {
  primary: '#FF6B35',
  secondary: '#1E3A8A',
  accent: '#10B981',
  text: '#1F2937',
  textLight: '#6B7280',
  background: '#F9FAFB',
  border: '#E5E7EB',
  white: '#FFFFFF'
};

export class TournamentPDFGenerator {
  private pdf: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number = 20;
  private currentY: number = 20;

  constructor() {
    this.pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    this.pageWidth = this.pdf.internal.pageSize.width;
    this.pageHeight = this.pdf.internal.pageSize.height;
    this.pdf.setFont('helvetica');
  }

  private parseRounds(rounds: any): number[] {
    if (!rounds) return [];
    
    if (typeof rounds === 'string') {
      // Try comma-separated format first (e.g., "72,71,74")
      if (rounds.includes(',')) {
        return rounds.split(',').map((s: string) => parseFloat(s.trim())).filter((n: number) => !isNaN(n));
      }
      
      // Try JSON format
      try {
        const parsed = JSON.parse(rounds);
        if (Array.isArray(parsed)) {
          return parsed.map(r => typeof r === 'object' ? r.score : r).filter(s => !isNaN(s));
        }
      } catch {
        return [];
      }
    }
    
    if (Array.isArray(rounds)) {
      return rounds.map(r => typeof r === 'object' ? r.score : r).filter(s => !isNaN(s));
    }
    
    return [];
  }

  private calculateAverageScore(rounds: number[]): number {
    if (rounds.length === 0) return 0;
    const sum = rounds.reduce((acc, score) => acc + score, 0);
    return Math.round((sum / rounds.length) * 10) / 10;
  }

  public async generateTournamentPDF(
    athlete: Athlete,
    tournamentResults: TournamentResult[]
  ): Promise<void> {
    // Header Section
    this.pdf.setFillColor(colors.secondary);
    this.pdf.rect(0, 0, this.pageWidth, 35, 'F');
    
    // Title
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.setFontSize(22);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('TOURNAMENT RESULTS REPORT', this.pageWidth / 2, 15, { align: 'center' });
    
    // Athlete Name
    this.pdf.setFontSize(16);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(`${athlete.firstName} ${athlete.lastName}`, this.pageWidth / 2, 25, { align: 'center' });
    
    this.currentY = 45;
    
    // Athlete Info Summary
    this.pdf.setTextColor(colors.text);
    this.pdf.setFontSize(11);
    this.pdf.setFont('helvetica', 'normal');
    
    const infoY = this.currentY;
    const leftCol = this.margin;
    const midCol = this.margin + 70;
    const rightCol = this.margin + 140;
    
    // Left column
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Golf Team:', leftCol, infoY);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(athlete.currentSchool || 'N/A', leftCol, infoY + 6);
    
    // Middle column
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Graduation Year:', midCol, infoY);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(String(athlete.graduationYear || 'N/A'), midCol, infoY + 6);
    
    // Right columns
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('GPA:', rightCol, infoY);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(athlete.gpa?.toFixed(2) || 'N/A', rightCol, infoY + 6);
    
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Scoring Average:', rightCol + 40, infoY);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(String(athlete.scoringAverage || 'N/A'), rightCol + 40, infoY + 6);
    
    this.currentY = infoY + 18;
    
    // Tournament Results Table
    if (tournamentResults.length === 0) {
      this.pdf.setFontSize(12);
      this.pdf.setTextColor(colors.textLight);
      this.pdf.text('No tournament results available', this.pageWidth / 2, this.currentY + 20, { align: 'center' });
    } else {
      const tableData = tournamentResults.map(result => {
        const rounds = this.parseRounds(result.rounds);
        const avgScore = this.calculateAverageScore(rounds);
        
        // Handle both camelCase (typed) and snake_case (from DB)
        const tournament = (result as any).tournaments || result.tournament;
        const par = tournament?.par ?? (tournament?.course_par ? parseInt(String(tournament.course_par)) : null);
        const courseRating = tournament?.courseRating ?? (tournament?.course_rating ? parseFloat(String(tournament.course_rating)) : null);
        const yardage = tournament?.yardage ?? 'N/A';
        
        const avgVsPar = par && avgScore ? (avgScore - par).toFixed(1) : 'N/A';
        const avgVsCR = courseRating && avgScore ? (avgScore - courseRating).toFixed(1) : 'N/A';
        
        // Handle position from both formats
        const position = (result as any).position_text || result.positionText || String(result.finalPosition || 'N/A');
        
        // Format location: only show country if location is empty or identical to country
        const location = tournament?.location || '';
        const country = tournament?.country || '';
        const displayLocation = (!location || location === country) ? country : `${location}, ${country}`;
        
        return [
          tournament?.name || 'N/A',
          tournament?.year || 'N/A',
          displayLocation || 'N/A',
          yardage,
          par !== null ? String(par) : 'N/A',
          courseRating !== null ? String(courseRating) : 'N/A',
          rounds[0] || '-',
          rounds[1] || '-',
          rounds[2] || '-',
          rounds[3] || '-',
          avgScore > 0 ? String(avgScore) : 'N/A',
          avgVsPar !== 'N/A' ? (parseFloat(avgVsPar) > 0 ? `+${avgVsPar}` : avgVsPar) : 'N/A',
          avgVsCR !== 'N/A' ? (parseFloat(avgVsCR) > 0 ? `+${avgVsCR}` : avgVsCR) : 'N/A',
          position
        ];
      });

      autoTable(this.pdf, {
        startY: this.currentY,
        head: [[
          'Tournament',
          'Year',
          'Location',
          'Yardage',
          'Par',
          'C.Rating',
          'R1',
          'R2',
          'R3',
          'R4',
          'Avg',
          'vs Par',
          'vs CR',
          'Rank'
        ]],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: 255,
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'center'
        },
        styles: {
          fontSize: 8,
          cellPadding: 2,
          overflow: 'linebreak',
          halign: 'center'
        },
        columnStyles: {
          0: { cellWidth: 45, halign: 'left' }, // Tournament name
          1: { cellWidth: 12 }, // Year
          2: { cellWidth: 22, halign: 'left' }, // Location (now includes country)
          3: { cellWidth: 18 }, // Yardage
          4: { cellWidth: 10 }, // Par
          5: { cellWidth: 14 }, // Course Rating
          6: { cellWidth: 10 }, // R1
          7: { cellWidth: 10 }, // R2
          8: { cellWidth: 10 }, // R3
          9: { cellWidth: 10 }, // R4
          10: { cellWidth: 12, fontStyle: 'bold' }, // Avg
          11: { cellWidth: 12 }, // vs Par
          12: { cellWidth: 12 }, // vs CR
          13: { cellWidth: 12, fontStyle: 'bold' } // Rank
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251]
        },
        margin: { left: this.margin, right: this.margin }
      });
    }
    
    // Footer
    const footerY = this.pageHeight - 10;
    this.pdf.setFontSize(9);
    this.pdf.setTextColor(colors.textLight);
    this.pdf.text(
      `Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      this.pageWidth / 2,
      footerY,
      { align: 'center' }
    );
    
    // Save the PDF
    const fileName = `${athlete.firstName}_${athlete.lastName}_Tournament_Results.pdf`;
    this.pdf.save(fileName);
  }
}

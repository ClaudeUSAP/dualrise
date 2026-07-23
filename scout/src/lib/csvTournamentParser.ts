import { Tournament } from '@/types/tournament';
import { cleanAndCategorizeSeriesName } from './seriesNameCleaner';

export interface ParsedTournamentCSV {
  row: number;
  rawData: Record<string, string>;
  tournamentData: Partial<Tournament>;
  inferredData: {
    sex?: 'Men' | 'Women';
    tournamentType?: 'Junior' | 'Adult';
    category?: 'National' | 'International' | 'National Team' | 'Club Competition';
  };
}

export interface TournamentValidationError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

// Infer sex from tournament name
const inferSex = (name: string): 'Men' | 'Women' | undefined => {
  const lowerName = name.toLowerCase();
  
  // Women indicators
  if (
    lowerName.includes('dames') ||
    lowerName.includes('filles') ||
    lowerName.includes('ladies') ||
    lowerName.includes('women') ||
    lowerName.includes('girls')
  ) {
    return 'Women';
  }
  
  // Men indicators (default if not women)
  if (
    lowerName.includes('messieurs') ||
    lowerName.includes('garçons') ||
    lowerName.includes('men') ||
    lowerName.includes('boys')
  ) {
    return 'Men';
  }
  
  // Default to Men for mixed/unspecified
  return 'Men';
};

// Infer tournament type from name
const inferTournamentType = (name: string): 'Junior' | 'Adult' => {
  const lowerName = name.toLowerCase();
  
  // Junior indicators
  if (
    lowerName.includes('u8') ||
    lowerName.includes('u10') ||
    lowerName.includes('u12') ||
    lowerName.includes('u14') ||
    lowerName.includes('u16') ||
    lowerName.includes('u18') ||
    lowerName.includes('jeunes') ||
    lowerName.includes('junior') ||
    lowerName.includes('benjamins') ||
    lowerName.includes('minimes') ||
    lowerName.includes('poussins') ||
    lowerName.includes('kids')
  ) {
    return 'Junior';
  }
  
  return 'Adult';
};

// Parse date in DD/MM/YYYY format
const parseFFGolfDate = (dateStr: string): Date | undefined => {
  if (!dateStr || dateStr.trim() === '') return undefined;
  
  const parts = dateStr.trim().split('/');
  if (parts.length !== 3) return undefined;
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
  const year = parseInt(parts[2], 10);
  
  if (isNaN(day) || isNaN(month) || isNaN(year)) return undefined;
  
  return new Date(year, month, day);
};

// Check if a value is a placeholder for missing date
const isPlaceholderDate = (s?: string): boolean => {
  const v = (s || '').trim().toUpperCase();
  return v === '' || ['N/A', 'NA', '—', '-', 'TBD', 'UNKNOWN', 'NULL', '0', '0000-00-00'].includes(v);
};

// Parse date in YYYY-MM-DD or YYYY/MM/DD format (for exported CSV)
// Also handles ISO strings with time and compact YYYYMMDD format
const parseExportedDate = (dateStr: string): Date | undefined => {
  if (!dateStr || isPlaceholderDate(dateStr)) return undefined;
  
  const cleaned = dateStr.trim().replace(/^"|"$/g, '');
  
  // Match: 2025-09-06, 2025/9/6, 20250906, 2025-09-06T00:00:00Z, 2025-09-06 00:00:00
  const m = cleaned.match(/^(\d{4})(?:[-\/]?)(\d{1,2})(?:[-\/]?)(\d{1,2})(?:[ T].*)?$/);
  if (!m) return undefined;
  
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) return undefined;
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  
  const d = new Date(year, month - 1, day);
  
  // Validate that JS didn't rollover invalid dates (e.g., 2025-02-30 -> Mar 2)
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return undefined;
  }
  
  return d;
};

// Extract year from date
const extractYear = (date: Date | undefined): string => {
  if (!date) return new Date().getFullYear().toString();
  return date.getFullYear().toString();
};

// Parse FFGolf CSV format
export const parseFFGolfTournamentCSV = (csvText: string): {
  tournaments: ParsedTournamentCSV[];
  errors: TournamentValidationError[];
} => {
  const tournaments: ParsedTournamentCSV[] = [];
  const errors: TournamentValidationError[] = [];
  
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) {
    errors.push({ row: 0, field: 'file', message: 'Empty CSV file' });
    return { tournaments, errors };
  }
  
  // Parse header
  const headerLine = lines[0].replace(/^\uFEFF/, ''); // Remove BOM
  const headers = headerLine.split(';').map(h => h.trim());
  
  // Detect format based on headers
  const hasNom2 = headers.includes('Nom 2');
  const hasNbTours = headers.includes('Nb Tours');
  
  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(';').map(v => v.trim());
    const rowData: Record<string, string> = {};
    
    headers.forEach((header, idx) => {
      rowData[header] = values[idx] || '';
    });
    
    // Extract tournament name (combine Nom 1 and Nom 2 if present)
    const nom1 = rowData['Nom 1'] || '';
    const nom2 = rowData['Nom 2'] || '';
    const fullName = nom2 ? `${nom1} - ${nom2}` : nom1;
    
    if (!fullName) {
      errors.push({ row: i + 1, field: 'name', message: 'Tournament name is required' });
      continue;
    }
    
    // Parse dates
    const startDate = parseFFGolfDate(rowData['Date debut']);
    const endDate = parseFFGolfDate(rowData['Date fin']);
    const year = extractYear(startDate);
    
    // Extract location and country
    const location = rowData['Golf'] || '';
    const country = rowData['Pays'] || 'France';
    
    // Parse number of rounds (if available)
    const nbTours = rowData['Nb Tours'] ? parseInt(rowData['Nb Tours'], 10) : undefined;
    
    // Infer sex and tournament type
    const inferredSex = inferSex(fullName);
    const inferredType = inferTournamentType(fullName);
    
    // Clean and categorize series name
    const cleanedSeries = cleanAndCategorizeSeriesName(fullName);
    
    // Generate simple name: "{series_name} {year}"
    const tournamentName = `${cleanedSeries.cleanedName} ${year}`;
    
    const tournamentData: Partial<Tournament> = {
      name: tournamentName,
      series_name: cleanedSeries.cleanedName,
      series_type: cleanedSeries.seriesType,
      year,
      location,
      country,
      sex: inferredSex,
      tournament_type: inferredType,
      category: cleanedSeries.category,
      startDate,
      endDate,
      status: 'planned',
      // Estimate par based on number of rounds (if available)
      par: nbTours ? nbTours * 18 : 72,
      courseRating: 72,
      slopeRating: 130,
      participatingAthletes: 0,
    };
    
    tournaments.push({
      row: i + 1,
      rawData: rowData,
      tournamentData,
      inferredData: {
        sex: inferredSex,
        tournamentType: inferredType,
        category: cleanedSeries.category,
      },
    });
  }
  
  return { tournaments, errors };
};

// Parse exported tournament CSV format
export const parseExportedTournamentCSV = (csvText: string): {
  tournaments: ParsedTournamentCSV[];
  errors: TournamentValidationError[];
} => {
  const tournaments: ParsedTournamentCSV[] = [];
  const errors: TournamentValidationError[] = [];
  
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) {
    errors.push({ row: 0, field: 'file', message: 'Empty CSV file' });
    return { tournaments, errors };
  }
  
  // Parse header
  const headerLine = lines[0].replace(/^\uFEFF/, '');
  const headers = headerLine.split(',').map(h => h.trim());
  
  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Simple CSV parsing (doesn't handle quoted commas)
    const values = line.split(',').map(v => v.trim());
    const rowData: Record<string, string> = {};
    
    headers.forEach((header, idx) => {
      rowData[header] = values[idx] || '';
    });
    
    const name = rowData['Name'];
    if (!name) {
      errors.push({ row: i + 1, field: 'name', message: 'Tournament name is required' });
      continue;
    }
    
    const year = rowData['Year'] || new Date().getFullYear().toString();
    const sex = (rowData['Sex'] as 'Men' | 'Women') || 'Men';
    const tournamentType = (rowData['Tournament Type'] as 'Junior' | 'Adult') || 'Adult';
    const category = (rowData['Category (France)'] as any) || 'National';
    
    const startDate = rowData['Start Date'] ? parseExportedDate(rowData['Start Date']) : undefined;
    const endDate = rowData['End Date'] ? parseExportedDate(rowData['End Date']) : undefined;
    
    // Validate dates (only if not a placeholder)
    if (rowData['Start Date'] && !isPlaceholderDate(rowData['Start Date']) && !startDate) {
      errors.push({ 
        row: i + 1, 
        field: 'Start Date', 
        message: 'Invalid date format. Expected YYYY-MM-DD or YYYY/MM/DD', 
        value: rowData['Start Date'] 
      });
    }
    if (rowData['End Date'] && !isPlaceholderDate(rowData['End Date']) && !endDate) {
      errors.push({ 
        row: i + 1, 
        field: 'End Date', 
        message: 'Invalid date format. Expected YYYY-MM-DD or YYYY/MM/DD', 
        value: rowData['End Date'] 
      });
    }
    
    const tournamentData: Partial<Tournament> = {
      name,
      series_name: name, // For exported data, use name as-is
      year,
      location: rowData['Location'] || '',
      country: rowData['Country'] || '',
      sex,
      tournament_type: tournamentType,
      category,
      startDate,
      endDate,
      par: parseInt(rowData['Course Par']) || 72,
      courseRating: parseFloat(rowData['Course Rating']) || 72,
      yardage: parseInt(rowData['Yardage']) || undefined,
      participatingAthletes: parseInt(rowData['Field Size']) || 0,
      status: (rowData['Status'] as any) || 'planned',
      resultsLink: rowData['Results Link'] || undefined,
    };
    
    tournaments.push({
      row: i + 1,
      rawData: rowData,
      tournamentData,
      inferredData: {},
    });
  }
  
  return { tournaments, errors };
};

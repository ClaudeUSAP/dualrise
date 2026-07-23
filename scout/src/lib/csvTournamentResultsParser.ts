export interface RowError {
  field: string;
  message: string;
  severity: 'critical' | 'warning';
}

export interface ParsedTournamentResult {
  seriesName: string; // Raw series name from CSV (no transformation)
  location: string;
  year: string;
  gender: string; // Will be normalized to 'Men'/'Women'
  tournamentType: string; // 'Junior' or 'Adult'
  category: string; // 'National', 'International', 'National Team', 'Club Competition'
  seriesType?: string; // Championship, Trophy, Cup, etc.
  country: string;
  yardage: string;
  par: string;
  slope: string;
  courseRating: string;
  round1?: number;
  round2?: number;
  round3?: number;
  round4?: number;
  rounds: string; // comma-separated
  totalScore: number | null;
  position?: number;
  positionText?: string;
  fieldSize?: number;
  resultsLink?: string;
  notes?: string;
  startDate?: Date;
  endDate?: Date;
  rawDateString?: string; // Preserve original date string from CSV
  rowNumber: number;
  errors: RowError[];
}

export interface ParseResult {
  results: ParsedTournamentResult[];
  errors: { row: number; message: string }[];
  totalRows: number;
  validRows: number;
}

import { parseTournamentDate } from './dateParser';

const REQUIRED_COLUMNS = [
  'Series Name', 'Year', 'Gender', 
  'Country', 
  'Rank'
];

// Column variations to check (first match wins)
const COLUMN_VARIATIONS: Record<string, string[]> = {
  'course par': ['course par', 'par'],
  'slope rating': ['slope rating', 'slope'],
  'date': ['date', 'start date', 'tournament date', 'dates'],
};

// Normalization functions
const normalizeGender = (value: string): string => {
  const upper = value.toUpperCase().trim();
  // Male variations (including French)
  if (['MALE', 'M', 'MEN', 'HOMME', 'HOMMES', 'MÂLE', 'GARCON', 'GARCONS', 'GARÇON', 'GARÇONS'].includes(upper)) {
    return 'Men';
  }
  // Female variations (including French)
  if (['FEMALE', 'F', 'WOMEN', 'FEMELLE', 'FEMME', 'FEMMES', 'FILLE', 'FILLES'].includes(upper)) {
    return 'Women';
  }
  // Graceful fallback instead of throwing error
  console.warn(`Unknown gender value: ${value}, defaulting to Men`);
  return 'Men';
};

const normalizeTournamentType = (value: string): string => {
  const upper = value.toUpperCase().trim();
  if (upper === 'JUNIOR') return 'Junior';
  if (upper === 'ADULT' || upper === 'ADULTE') return 'Adult';
  throw new Error(`Invalid type value: ${value}`);
};

const normalizeCategory = (value: string): string => {
  const lower = value.toLowerCase().trim();
  if (lower === 'national') return 'National';
  if (lower === 'international') return 'International';
  if (lower === 'national team') return 'National Team';
  if (lower === 'club competition' || lower === 'club') return 'Club Competition';
  throw new Error(`Invalid category value: ${value}`);
};

const normalizeCountry = (value: string): string => {
  const trimmed = value.trim();
  
  // Country adjective to country name mapping
  const countryMap: Record<string, string> = {
    'spanish': 'Spain',
    'french': 'France',
    'italian': 'Italy',
    'english': 'England',
    'welsh': 'Wales',
    'scottish': 'Scotland',
  };
  
  const lower = trimmed.toLowerCase();
  if (countryMap[lower]) {
    return countryMap[lower];
  }
  
  // Default: capitalize first letter, lowercase rest
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

// Detect tournament type from series name (for auto-detection when CSV Type is empty)
const detectTournamentType = (seriesName: string): 'Junior' | 'Adult' => {
  if (/U\d{2}|Under \d{2}/i.test(seriesName)) {
    return 'Junior';
  }
  return 'Adult';
};

// Detect category from series name
const detectCategory = (seriesName: string): 'National' | 'International' | 'National Team' | 'Club Competition' => {
  const lower = seriesName.toLowerCase();
  
  // Check for Club Competition first
  if (/(club championship|club ranking|club trophy|club cup|club competition|golf club championship)/i.test(seriesName)) {
    return 'Club Competition';
  }
  
  // Check for National Team
  if (/Team\s+(National\s+)?Championship|Team\s+National/i.test(seriesName)) {
    return 'National Team';
  }
  
  // Check for International
  if (/^International\s+/i.test(seriesName)) {
    return 'International';
  }
  
  return 'National';
};

// Detect series type from series name
const detectSeriesType = (seriesName: string): string | undefined => {
  if (/\bChampionships?\b/i.test(seriesName)) return 'Championship';
  if (/\bGrand\s+Prix\b/i.test(seriesName)) return 'Grand Prix';
  if (/\bTrophies|Trophy\b/i.test(seriesName)) return 'Trophy';
  if (/\bCups?\b/i.test(seriesName)) return 'Cup';
  if (/\bOpens?\b/i.test(seriesName)) return 'Open';
  if (/\bStroke\s*play\b/i.test(seriesName)) return 'Stroke Play';
  if (/\bMatch\s*play\b/i.test(seriesName)) return 'Match Play';
  return undefined;
};

// RFC 4180 compliant CSV parser - handles quoted fields with commas and newlines
const parseCSVLine = (text: string): string[][] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (!inQuotes && char === ',') {
      // Field separator (only outside quotes)
      currentRow.push(currentField.trim());
      currentField = '';
      i++;
    } else if (!inQuotes && (char === '\n' || (char === '\r' && nextChar === '\n'))) {
      // Row separator (only outside quotes)
      if (currentField || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        if (currentRow.some(field => field !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      }
      // Skip \r\n combination
      if (char === '\r' && nextChar === '\n') {
        i += 2;
      } else {
        i++;
      }
    } else {
      // Regular character (keep newlines inside quotes)
      currentField += char;
      i++;
    }
  }

  // Handle last field and row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(field => field !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
};

export const parseCSVTournamentResults = (csvText: string): ParseResult => {
  const rows = parseCSVLine(csvText);
  
  if (rows.length === 0) {
    return { results: [], errors: [{ row: 0, message: 'CSV file is empty' }], totalRows: 0, validRows: 0 };
  }

  // Parse header
  const header = rows[0];
  
  // Map column names (handle variations)
  const columnMap: Record<string, number> = {};
  header.forEach((col, index) => {
    const normalizedCol = col.toLowerCase().replace(/\s+/g, ' ');
    columnMap[normalizedCol] = index;
  });

  // Check for required columns (with flexible matching for variations)
  const missingColumns = REQUIRED_COLUMNS.filter(reqCol => {
    const normalized = reqCol.toLowerCase().replace(/\s+/g, ' ');
    if (columnMap[normalized] !== undefined) return false;
    
    // Check variations
    const variations = COLUMN_VARIATIONS[normalized];
    if (variations) {
      return !variations.some(variant => columnMap[variant] !== undefined);
    }
    return true;
  });

  if (missingColumns.length > 0) {
    return {
      results: [],
      errors: [{ row: 0, message: `Missing required columns: ${missingColumns.join(', ')}. Found: ${header.join(', ')}` }],
      totalRows: rows.length - 1,
      validRows: 0
    };
  }

  const results: ParsedTournamentResult[] = [];
  const errors: { row: number; message: string }[] = [];

  // Parse data rows
  for (let i = 1; i < rows.length; i++) {
    const columns = rows[i];
    if (columns.length === 0 || columns.every(col => !col)) continue;

    const rowNumber = i + 1;
    const rowErrors: RowError[] = [];

    // Helper to get column value with flexible matching
    const getCol = (name: string): string => {
      const normalized = name.toLowerCase().replace(/\s+/g, ' ');
      let index = columnMap[normalized];
      
      // Try variations if not found
      if (index === undefined) {
        const variations = COLUMN_VARIATIONS[normalized];
        if (variations) {
          for (const variant of variations) {
            if (columnMap[variant] !== undefined) {
              index = columnMap[variant];
              break;
            }
          }
        }
      }
      
      return index !== undefined ? columns[index] : '';
    };

    // Parse tournament details - USE RAW VALUES FROM CSV
    const seriesName = getCol('series name').trim(); // Raw series name, no transformation
    const location = getCol('location') || '';
    const year = getCol('year');
    const rawGender = getCol('gender');
    const rawType = getCol('type');
    const rawCategory = getCol('category');
    const country = normalizeCountry(getCol('country'));

    // Auto-detect type/category from series name when CSV columns are empty
    const autoType = detectTournamentType(seriesName);
    const autoCategory = detectCategory(seriesName);
    const seriesType = getCol('series type') || detectSeriesType(seriesName);

    const yardage = getCol('yardage');
    const par = getCol('course par');
    const slope = getCol('slope rating');
    const courseRating = getCol('course rating');

    // Validate and normalize required fields
    let normalizedGender = '';
    let normalizedType = '';
    let normalizedCategory = '';

    // Critical validation errors (will skip row)
    if (!seriesName) {
      rowErrors.push({ field: 'Series Name', message: 'Series Name is required', severity: 'critical' });
    }
    if (!year || !/^\d{4}$/.test(year)) {
      rowErrors.push({ field: 'Year', message: 'Valid year (YYYY) is required', severity: 'critical' });
    }
    if (!country) {
      rowErrors.push({ field: 'Country', message: 'Country is required', severity: 'critical' });
    }

    try {
      if (!rawGender) throw new Error('Gender is required');
      normalizedGender = normalizeGender(rawGender);
    } catch (error: any) {
      rowErrors.push({ field: 'Gender', message: error.message, severity: 'critical' });
    }

    try {
      // Use auto-detected type when CSV Type is empty
      if (!rawType || rawType.trim() === '') {
        normalizedType = autoType;
      } else {
        normalizedType = normalizeTournamentType(rawType);
      }
    } catch (error: any) {
      rowErrors.push({ field: 'Type', message: error.message, severity: 'critical' });
    }

    try {
      // Priority: Auto-detected "National Team" > CSV Category > Auto-detected other
      if (autoCategory === 'National Team') {
        normalizedCategory = 'National Team';
      } else if (rawCategory) {
        normalizedCategory = normalizeCategory(rawCategory);
      } else {
        normalizedCategory = autoCategory;
      }
    } catch (error: any) {
      rowErrors.push({ field: 'Category', message: error.message, severity: 'critical' });
    }

    // Parse rounds
    const r1Str = getCol('r1');
    const r2Str = getCol('r2');
    const r3Str = getCol('r3');
    const r4Str = getCol('r4');

    const parseScore = (str: string): number | undefined => {
      if (!str) return undefined;
      const trimmed = str.trim();
      const upperStr = trimmed.toUpperCase();
      // Skip match play results, withdrawals, missed cuts, disqualifications
      if (upperStr === 'MC' || upperStr === 'WD' || upperStr === 'DQ' || 
          upperStr.includes('LOST') || upperStr.includes('WON') ||
          upperStr.includes('W/D') || upperStr.includes('CUT')) {
        return undefined;
      }
      const num = parseInt(trimmed);
      return isNaN(num) ? undefined : num;
    };

    const round1 = parseScore(r1Str);
    const round2 = parseScore(r2Str);
    const round3 = parseScore(r3Str);
    const round4 = parseScore(r4Str);

    // Build rounds string and calculate total
    const roundsArray: number[] = [];
    if (round1 !== undefined) roundsArray.push(round1);
    if (round2 !== undefined) roundsArray.push(round2);
    if (round3 !== undefined) roundsArray.push(round3);
    if (round4 !== undefined) roundsArray.push(round4);
    
    const rounds = roundsArray.join(',');
    const totalScore = roundsArray.length > 0 ? roundsArray.reduce((sum, score) => sum + score, 0) : null;

    // Parse rank (handles "23/96", "MC", "Not Ranked", "T5", etc.)
    const rankStr = getCol('rank');
    
    // Warning for missing optional fields
    if (!location || location.trim() === '') {
      rowErrors.push({ field: 'Location', message: 'Location is missing', severity: 'warning' });
    }
    if (roundsArray.length === 0) {
      rowErrors.push({ field: 'Scores', message: 'No round scores found', severity: 'warning' });
    }
    if (!rankStr || rankStr.trim() === '') {
      rowErrors.push({ field: 'Rank', message: 'Rank is missing', severity: 'warning' });
    }
    let position: number | undefined;
    let positionText: string | undefined;
    let fieldSize: number | undefined;

    if (rankStr) {
      const upperRank = rankStr.toUpperCase();
      
      if (upperRank === 'MC' || upperRank === 'WD') {
        positionText = upperRank;
      } else if (upperRank.includes('NOT RANKED')) {
        positionText = 'Not Ranked';
      } else {
        // Try to parse position/fieldSize format "23/96" (normalize double slashes first)
        const normalizedRank = rankStr.replace(/\/+/g, '/');
        const slashMatch = normalizedRank.match(/^(\d+)\/(\d+)$/);
        if (slashMatch) {
          position = parseInt(slashMatch[1]);
          fieldSize = parseInt(slashMatch[2]);
          positionText = rankStr;
        } else {
          // Try to extract just a number (handles "T5" → 5, "12" → 12)
          const numMatch = rankStr.match(/\d+/);
          if (numMatch) {
            position = parseInt(numMatch[0]);
            positionText = rankStr;
          } else {
            positionText = rankStr;
          }
        }
      }
    }

    const resultsLink = getCol('results link') || getCol('resultslink') || getCol('results');
    const notes = getCol('notes');

    // Parse tournament date - preserve raw string
    const rawDateString = getCol('date') || getCol('tournament date') || getCol('dates') || '';
    const { startDate, endDate } = parseTournamentDate(rawDateString, year);

    // Check for year mismatch between parsed date and Year column
    if (startDate && startDate.getFullYear().toString() !== year) {
      rowErrors.push({ 
        field: 'Date', 
        message: `Parsed date year (${startDate.getFullYear()}) doesn't match Year column (${year})`, 
        severity: 'warning' 
      });
    }

    // Separate critical errors from warnings
    const criticalErrors = rowErrors.filter(e => e.severity === 'critical');
    const warnings = rowErrors.filter(e => e.severity === 'warning');

    if (criticalErrors.length > 0) {
      // Skip row if there are critical errors
      errors.push({ 
        row: rowNumber, 
        message: criticalErrors.map(e => `${e.field}: ${e.message}`).join('; ')
      });
    } else {
      // Add to results even with warnings
      results.push({
        seriesName, // Raw series name from CSV
        location,
        year,
        gender: normalizedGender,
        tournamentType: normalizedType,
        category: normalizedCategory,
        seriesType,
        country,
        yardage,
        par,
        slope,
        courseRating,
        round1,
        round2,
        round3,
        round4,
        rounds,
        totalScore,
        position,
        positionText,
        fieldSize,
        resultsLink,
        notes,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        rawDateString, // Preserve original date string
        rowNumber,
        errors: warnings
      });
    }
  }

  return {
    results,
    errors,
    totalRows: rows.length - 1,
    validRows: results.length
  };
};

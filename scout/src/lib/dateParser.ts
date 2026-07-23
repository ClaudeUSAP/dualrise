/**
 * Smart date parser for tournament dates
 * Handles various formats including French/English month names,
 * single dates, date ranges, and mixed formats
 */

interface ParsedDate {
  startDate: Date | null;
  endDate: Date | null;
}

// Month name mappings
const MONTHS_FR_FULL = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];

const MONTHS_FR_ABBR = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'
];

const MONTHS_EN_FULL = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

const MONTHS_EN_ABBR = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
];

// Day names to remove
const DAY_NAMES = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche',
  'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun',
  'lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'
];

/**
 * Get month number (0-11) from month name
 */
const getMonthFromName = (monthStr: string): number => {
  const month = monthStr.toLowerCase().trim();
  
  // Try French full names
  let index = MONTHS_FR_FULL.indexOf(month);
  if (index !== -1) return index;
  
  // Try French abbreviated
  index = MONTHS_FR_ABBR.indexOf(month);
  if (index !== -1) return index;
  
  // Try English full names
  index = MONTHS_EN_FULL.indexOf(month);
  if (index !== -1) return index;
  
  // Try English abbreviated (with or without period)
  const monthNoPeriod = month.replace('.', '');
  index = MONTHS_EN_ABBR.findIndex(m => m === monthNoPeriod || m === month);
  if (index !== -1) return index;
  
  return -1;
};

/**
 * Clean input string by removing day names and extra spaces
 */
const cleanDateString = (dateStr: string): string => {
  let cleaned = dateStr.trim();
  
  // Remove day names (case insensitive)
  DAY_NAMES.forEach(day => {
    const regex = new RegExp(`\\b${day}[,.]?\\s*`, 'gi');
    cleaned = cleaned.replace(regex, '');
  });
  
  // Normalize separators
  cleaned = cleaned.replace(/\s*–\s*/g, ' - ');
  cleaned = cleaned.replace(/\s+to\s+/gi, ' - ');
  
  // Clean up multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
};

/**
 * Try to parse a single date part
 */
const parseDatePart = (datePart: string, defaultYear?: string): Date | null => {
  // Normalize common typos: double slashes, double dots
  const part = datePart.trim().replace(/\/+/g, '/').replace(/\.+/g, '.');
  
  // Try slash-separated dates with smart format detection (MM/DD/YYYY or DD/MM/YYYY)
  const slashMatch = part.match(/^(\d{1,2})[\/](\d{1,2})[\/](\d{2,4})$/);
  if (slashMatch) {
    const num1 = parseInt(slashMatch[1]);
    const num2 = parseInt(slashMatch[2]);
    let year = parseInt(slashMatch[3]);
    if (year < 100) year += 2000;
    
    let month: number;
    let day: number;
    
    // Smart detection: determine if format is MM/DD or DD/MM
    if (num1 > 12 && num2 <= 12) {
      // First number > 12 means it MUST be DD/MM/YYYY (European format)
      day = num1;
      month = num2 - 1; // 0-indexed
    } else if (num2 > 12 && num1 <= 12) {
      // Second number > 12 means it MUST be MM/DD/YYYY (US format)
      month = num1 - 1; // 0-indexed
      day = num2;
    } else {
      // Both <= 12: Ambiguous - default to US format MM/DD/YYYY
      month = num1 - 1;
      day = num2;
    }
    
    const date = new Date(year, month, day);
    // Validate the resulting date
    if (date.getMonth() === month && date.getDate() === day) {
      return date;
    }
    return null;
  }
  
  // Try dot-separated dates with smart format detection
  const dotMatch = part.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (dotMatch) {
    const num1 = parseInt(dotMatch[1]);
    const num2 = parseInt(dotMatch[2]);
    let year = parseInt(dotMatch[3]);
    if (year < 100) year += 2000;
    
    let month: number;
    let day: number;
    
    if (num1 > 12 && num2 <= 12) {
      day = num1;
      month = num2 - 1;
    } else if (num2 > 12 && num1 <= 12) {
      month = num1 - 1;
      day = num2;
    } else {
      month = num1 - 1;
      day = num2;
    }
    
    const date = new Date(year, month, day);
    if (date.getMonth() === month && date.getDate() === day) {
      return date;
    }
    return null;
  }
  
  // Try D MMMM YYYY or D MMM YYYY or D MMMM YY
  const textMonthMatch = part.match(/^(\d{1,2})\s+([a-zéû\.]+)\s*(\d{2,4})?$/i);
  if (textMonthMatch) {
    const day = parseInt(textMonthMatch[1]);
    const monthStr = textMonthMatch[2];
    const month = getMonthFromName(monthStr);
    
    if (month !== -1) {
      let year = textMonthMatch[3] ? parseInt(textMonthMatch[3]) : undefined;
      if (year && year < 100) year += 2000;
      if (!year && defaultYear) year = parseInt(defaultYear);
      
      if (year) {
        return new Date(year, month, day);
      }
    }
  }
  
  // Try just D MMMM or D MMM (no year)
  const textMonthNoYearMatch = part.match(/^(\d{1,2})\s+([a-zéû\.]+)$/i);
  if (textMonthNoYearMatch && defaultYear) {
    const day = parseInt(textMonthNoYearMatch[1]);
    const monthStr = textMonthNoYearMatch[2];
    const month = getMonthFromName(monthStr);
    
    if (month !== -1) {
      const year = parseInt(defaultYear);
      return new Date(year, month, day);
    }
  }
  
  return null;
};

/**
 * Main date parsing function
 * @param dateStr - Date string from CSV (can be single date or range)
 * @param contextYear - Year from the Year column as fallback
 * @returns Parsed start and end dates
 */
export const parseTournamentDate = (dateStr: string, contextYear?: string): ParsedDate => {
  if (!dateStr) {
    return { startDate: null, endDate: null };
  }
  
  const cleaned = cleanDateString(dateStr);
  
  // Check if it's a range (contains " - ")
  const rangeParts = cleaned.split(/\s+-\s+/);
  
  if (rangeParts.length === 2) {
    // It's a range
    const startPart = rangeParts[0].trim();
    const endPart = rangeParts[1].trim();
    
    // Parse start date
    const startDate = parseDatePart(startPart, contextYear);
    
    // Parse end date - might need to inherit year and/or month from start
    let endDate = parseDatePart(endPart, contextYear);
    
    // If end date parsing failed, try inheriting year/month from start
    if (!endDate && startDate) {
      // Check if end part is just a day number (cross-month range like "31 juil. - 3 août 2025")
      const endDayMatch = endPart.match(/^(\d{1,2})\s+([a-zéû\.]+)\s*(\d{2,4})?$/i);
      if (endDayMatch) {
        const day = parseInt(endDayMatch[1]);
        const monthStr = endDayMatch[2];
        const month = getMonthFromName(monthStr);
        
        if (month !== -1) {
          let year = endDayMatch[3] ? parseInt(endDayMatch[3]) : startDate.getFullYear();
          if (year < 100) year += 2000;
          endDate = new Date(year, month, day);
        }
      }
    }
    
    return {
      startDate: startDate,
      endDate: endDate || startDate
    };
  } else {
    // Single date
    const date = parseDatePart(cleaned, contextYear);
    return {
      startDate: date,
      endDate: date
    };
  }
};

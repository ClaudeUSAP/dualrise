export interface CleanedSeriesResult {
  cleanedName: string;
  type: 'Junior' | 'Adult';
  category: 'National' | 'International' | 'National Team' | 'Club Competition';
  seriesType?: 'Championship' | 'Trophy' | 'Cup' | 'Grand Prix' | 'Open' | 'Stroke Play' | 'Match Play';
}

/**
 * Analyzes a tournament series name and extracts type and category information
 * DOES NOT modify the series name - returns it as-is
 * 
 * Rules:
 * 1. Detects age markers (U18, U21, U16, U14) → type = 'Junior', otherwise 'Adult'
 * 2. Contains "Team Championship" or "Team National" → category = 'National Team'
 * 3. If starts with "International" → category = 'International'
 * 4. Otherwise → category = 'National'
 * 
 * @param seriesName - Raw series name from CSV
 * @returns Original series name and extracted metadata
 */
export const cleanAndCategorizeSeriesName = (seriesName: string): CleanedSeriesResult => {
  const cleaned = seriesName.trim();
  let type: 'Junior' | 'Adult' = 'Adult';
  let category: 'National' | 'International' | 'National Team' | 'Club Competition' = 'National';
  let seriesType: 'Championship' | 'Trophy' | 'Cup' | 'Grand Prix' | 'Open' | 'Stroke Play' | 'Match Play' | undefined;

  // Detect type based on age markers
  if (/U\d{2}|Under \d{2}/i.test(cleaned)) {
    type = 'Junior';
  }

  // Check for Club Competition first (highest priority for specific keywords)
  if (/(club championship|club ranking|club trophy|club cup|club competition|golf club championship)/i.test(cleaned)) {
    category = 'Club Competition';
  }
  
  // Check for "International" prefix
  if (category !== 'Club Competition' && /^International\s+/i.test(cleaned)) {
    category = 'International';
  }

  // Check for "Team Championship" or "Team National"
  if (category !== 'Club Competition' && /Team\s+(National\s+)?Championship|Team\s+National/i.test(cleaned)) {
    category = 'National Team';
  }

  // Detect series type (priority order)
  if (/\bChampionships?\b/i.test(cleaned)) {
    seriesType = 'Championship';
  } else if (/\bGrand\s+Prix\b/i.test(cleaned)) {
    seriesType = 'Grand Prix';
  } else if (/\bTrophies|Trophy\b/i.test(cleaned)) {
    seriesType = 'Trophy';
  } else if (/\bCups?\b/i.test(cleaned)) {
    seriesType = 'Cup';
  } else if (/\bOpens?\b/i.test(cleaned)) {
    seriesType = 'Open';
  } else if (/\bStroke\s*play\b/i.test(cleaned)) {
    seriesType = 'Stroke Play';
  } else if (/\bMatch\s*play\b/i.test(cleaned)) {
    seriesType = 'Match Play';
  }

  return {
    cleanedName: cleaned, // Return original name unchanged
    type,
    category,
    seriesType
  };
};
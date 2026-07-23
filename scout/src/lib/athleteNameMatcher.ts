import { supabase } from '@/integrations/supabase/client';

export interface AthleteMatch {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  confidence: 'exact' | 'high' | 'low';
}

// Calculate Levenshtein distance between two strings
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len1][len2];
}

// Normalize string by removing diacritics (accents)
function removeDiacritics(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Calculate similarity percentage (0-100) - accent-insensitive
function calculateSimilarity(str1: string, str2: string): number {
  const norm1 = removeDiacritics(str1.toLowerCase());
  const norm2 = removeDiacritics(str2.toLowerCase());
  const distance = levenshteinDistance(norm1, norm2);
  const maxLength = Math.max(norm1.length, norm2.length);
  return maxLength === 0 ? 100 : ((maxLength - distance) / maxLength) * 100;
}

// Extract athlete name from filename - supports Unicode letters and hyphens
export function extractNameFromFilename(filename: string): { firstName: string; lastName: string } | null {
  // Remove .csv extension
  const nameWithoutExt = filename.replace(/\.csv$/i, '');
  
  // Try different patterns - using Unicode property escapes for international names
  const patterns = [
    // FirstName_LastName or FirstName-LastName (supports accented chars and hyphenated names)
    /^([\p{L}]+)[_]([\p{L}\-]+)/u,
    // FirstName-LastName (dash separator, supports hyphens in last name)
    /^([\p{L}]+)-([\p{L}\-]+)/u,
    // FirstName LastName (space separator, supports hyphens)
    /^([\p{L}]+)\s+([\p{L}\-]+)/u,
  ];

  for (const pattern of patterns) {
    const match = nameWithoutExt.match(pattern);
    if (match) {
      return {
        firstName: match[1],
        lastName: match[2],
      };
    }
  }

  return null;
}

// Match athlete by name from database
export async function matchAthleteByName(
  firstName: string,
  lastName: string
): Promise<AthleteMatch | null> {
  const { data: athletes, error } = await supabase
    .from('athletes_safe' as any)
    .select('id, first_name, last_name')
    .not('status', 'ilike', 'committed')
    .not('status', 'ilike', 'archived')
    .order('first_name') as { data: any[] | null; error: any };

  if (error || !athletes) {
    console.error('Error fetching athletes:', error);
    return null;
  }

  // Normalize search inputs (remove accents for comparison)
  const searchFirstName = removeDiacritics(firstName.toLowerCase().trim());
  const searchLastName = removeDiacritics(lastName.toLowerCase().trim());
  const searchFullName = `${searchFirstName} ${searchLastName}`;

  let bestMatch: AthleteMatch | null = null;
  let bestScore = 0;

  for (const athlete of athletes) {
    const athleteFirstName = removeDiacritics((athlete.first_name || '').toLowerCase().trim());
    const athleteLastName = removeDiacritics((athlete.last_name || '').toLowerCase().trim());
    const athleteFullName = `${athleteFirstName} ${athleteLastName}`;

    // Check exact match first (accent-insensitive)
    if (athleteFirstName === searchFirstName && athleteLastName === searchLastName) {
      return {
        id: athlete.id,
        firstName: athlete.first_name,
        lastName: athlete.last_name,
        fullName: `${athlete.first_name} ${athlete.last_name}`,
        confidence: 'exact',
      };
    }

    // Calculate similarity scores
    const firstNameSimilarity = calculateSimilarity(searchFirstName, athleteFirstName);
    const lastNameSimilarity = calculateSimilarity(searchLastName, athleteLastName);
    const fullNameSimilarity = calculateSimilarity(searchFullName, athleteFullName);

    // Weighted score (last name is more important)
    const score = (firstNameSimilarity * 0.3) + (lastNameSimilarity * 0.5) + (fullNameSimilarity * 0.2);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        id: athlete.id,
        firstName: athlete.first_name,
        lastName: athlete.last_name,
        fullName: `${athlete.first_name} ${athlete.last_name}`,
        confidence: score >= 95 ? 'exact' : score >= 80 ? 'high' : 'low',
      };
    }
  }

  // Only return matches with reasonable confidence
  if (bestScore >= 70) {
    return bestMatch;
  }

  return null;
}

// Get all athletes for manual selection
export async function getAllAthletes(): Promise<AthleteMatch[]> {
  const { data: athletes, error } = await supabase
    .from('athletes_safe' as any)
    .select('id, first_name, last_name')
    .not('status', 'ilike', 'committed')
    .not('status', 'ilike', 'archived')
    .order('last_name, first_name') as { data: any[] | null; error: any };

  if (error || !athletes) {
    console.error('Error fetching athletes:', error);
    return [];
  }

  return athletes.map(athlete => ({
    id: athlete.id,
    firstName: athlete.first_name,
    lastName: athlete.last_name,
    fullName: `${athlete.first_name} ${athlete.last_name}`,
    confidence: 'exact' as const,
  }));
}

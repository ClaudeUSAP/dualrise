export type StandardGender = 'Men' | 'Women';

/**
 * Normalize various gender input formats to the standard 'Men' or 'Women'
 * Handles: male, man, men, m, Male, MEN, etc. → 'Men'
 *          female, woman, women, f, Female, WOMEN, etc. → 'Women'
 */
export function normalizeGender(value: string | null | undefined): StandardGender | null {
  if (!value) return null;
  
  const normalized = value.toLowerCase().trim();
  
  // Match all male variations (including French)
  if (['male', 'man', 'men', 'm', 'homme', 'hommes', 'mâle', 'garcon', 'garcons', 'garçon', 'garçons'].includes(normalized)) {
    return 'Men';
  }
  
  // Match all female variations (including French)
  if (['female', 'woman', 'women', 'f', 'femelle', 'femme', 'femmes', 'fille', 'filles'].includes(normalized)) {
    return 'Women';
  }
  
  // If already correct, return as-is
  if (value === 'Men' || value === 'Women') {
    return value;
  }
  
  console.warn(`Unknown gender value: "${value}"`);
  return null;
}

/**
 * Check if a gender value matches a filter
 * Handles flexible comparisons between various formats
 */
export function genderMatches(
  dataValue: string | null | undefined,
  filterValue: string | null | undefined
): boolean {
  if (!filterValue || filterValue === 'all' || filterValue === 'Both') return true;
  if (!dataValue) return false;
  
  const normalizedData = normalizeGender(dataValue);
  const normalizedFilter = normalizeGender(filterValue);
  
  return normalizedData === normalizedFilter;
}

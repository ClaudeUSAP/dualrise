/**
 * Centralizes division normalization logic for consistent display across the app.
 * Handles comma-separated values from database and legacy naming conventions.
 */

/**
 * Normalizes division values from database format to UI display format.
 * Converts legacy variants (NCAA1, NJCAA, etc.) to standard names.
 * Returns empty array if no value provided (caller decides default behavior).
 */
export const normalizeDivisions = (dbValue: string | null | undefined): string[] => {
  if (!dbValue) return [];
  return dbValue
    .split(',')
    .map(d => d.trim())
    .filter(d => d.length > 0)
    .map(d => {
      // NCAA Division I variants
      if (d === 'NCAA1' || d === 'NCAA 1' || d === 'NCAA D1' || d === 'D1' || d === 'DI') return 'NCAA D1';
      // NCAA Division II variants
      if (d === 'NCAA2' || d === 'NCAA 2' || d === 'NCAA D2' || d === 'D2' || d === 'DII') return 'NCAA D2';
      // NCAA Division III variants
      if (d === 'NCAA3' || d === 'NCAA 3' || d === 'NCAA D3' || d === 'D3' || d === 'DIII') return 'NCAA D3';
      // NJCAA variants
      if (d === 'NJCAA1' || d === 'NJCAA 1') return 'NJCAA 1';
      if (d === 'NJCAA2' || d === 'NJCAA 2') return 'NJCAA 2';
      if (d === 'NJCAA') return 'NJCAA 1';
      // NAIA
      if (d === 'NAIA') return 'NAIA';
      return d;
    })
    .filter((v, i, arr) => arr.indexOf(v) === i); // Remove duplicates
};

/**
 * Normalizes division values with a default fallback.
 * Use this when you need at least one value returned.
 */
export const normalizeDivisionsWithDefault = (
  dbValue: string | null | undefined, 
  defaultDivisions: string[] = ['NCAA D1']
): string[] => {
  const normalized = normalizeDivisions(dbValue);
  return normalized.length > 0 ? normalized : defaultDivisions;
};

/**
 * Normalizes weather zone values from database format to UI display format.
 * Converts "1,2,3" to "Zone 1, Zone 2, Zone 3"
 * Handles edge cases: null, undefined, empty string, whitespace, malformed data.
 */
export const normalizeWeatherZones = (dbValue: string | null | undefined): string => {
  if (!dbValue) return 'Not specified';
  const zones = dbValue
    .split(',')
    .map(z => z.trim())
    .filter(z => z.length > 0)
    .map(z => `Zone ${z}`);
  return zones.length > 0 ? zones.join(', ') : 'Not specified';
};

/**
 * Normalizes intended majors from database format to array.
 * Handles comma-separated values.
 */
export const normalizeIntendedMajors = (dbValue: string | null | undefined): string[] => {
  if (!dbValue) return [];
  return dbValue
    .split(',')
    .map(m => m.trim())
    .filter(m => m.length > 0);
};

/**
 * Centralized weather zone labels — single source of truth.
 * Zone numbering: Zone 1 = Southern US, Zone 4 = Northern US.
 */
export const WEATHER_ZONE_LABELS: Record<string, string> = {
  'Zone 1': 'Southern US (Warm Climate)',
  'Zone 2': 'Central-South US',
  'Zone 3': 'Central-North US',
  'Zone 4': 'Northern US (Cold Climate)',
};

/**
 * Formats a zone key like "Zone 1" into its descriptive label.
 */
export const formatWeatherZoneLabel = (zone: string): string => {
  return WEATHER_ZONE_LABELS[zone] || zone;
};

/**
 * Denormalizes weather zones from display format back to raw zone numbers.
 * Converts "Zone 1, Zone 2, Zone 3" back to ["1", "2", "3"] for form population.
 * Handles edge cases: "Not specified", empty strings, malformed data.
 */
export const denormalizeWeatherZones = (displayValue: string | null | undefined): string[] => {
  if (!displayValue || displayValue === 'Not specified') return [];
  return displayValue
    .split(',')
    .map(z => z.trim().replace(/^Zone\s*/i, ''))
    .filter(z => z.length > 0 && /^\d+$/.test(z));
};

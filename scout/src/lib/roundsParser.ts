/**
 * Centralized rounds parsing utility for tournament results.
 * Handles three database formats:
 * 1. Comma-separated string: "72,74,71"
 * 2. Number array: [72, 74, 71]
 * 3. Object array: [{round: 1, score: 72}, {round: 2, score: 74}]
 */

export interface RoundScore {
  round: number;
  score: number;
}

/**
 * Parses rounds data into a standardized array of numbers.
 * Use this when you only need the score values.
 */
export const parseRoundsToNumbers = (rounds: unknown): number[] => {
  if (!rounds) return [];
  
  if (typeof rounds === 'string') {
    return rounds
      .split(',')
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n) && n > 0);
  }
  
  if (Array.isArray(rounds)) {
    return rounds
      .map((r: unknown) => typeof r === 'object' && r !== null && 'score' in r ? (r as RoundScore).score : parseInt(String(r)))
      .filter(n => !isNaN(n) && n > 0);
  }
  
  return [];
};

/**
 * Parses rounds data into a standardized array of RoundScore objects.
 * Use this when you need both round number and score.
 */
export const parseRoundsToObjects = (rounds: unknown): RoundScore[] => {
  if (!rounds) return [];
  
  if (typeof rounds === 'string') {
    return rounds
      .split(',')
      .map((s, i) => ({
        round: i + 1,
        score: parseInt(s.trim())
      }))
      .filter(r => !isNaN(r.score) && r.score > 0);
  }
  
  if (Array.isArray(rounds)) {
    return rounds.map((r: unknown, i: number) => {
      if (typeof r === 'object' && r !== null && 'score' in r) {
        const roundObj = r as { round?: number; score: number };
        return {
          round: roundObj.round ?? i + 1,
          score: roundObj.score
        };
      }
      return {
        round: i + 1,
        score: parseInt(String(r))
      };
    }).filter(r => !isNaN(r.score) && r.score > 0);
  }
  
  return [];
};

/**
 * Returns the count of rounds.
 */
export const getRoundCount = (rounds: unknown): number => {
  return parseRoundsToNumbers(rounds).length;
};

/**
 * Formats rounds data as a display string (e.g., "72, 74, 71")
 */
export const formatRoundsDisplay = (rounds: unknown): string => {
  const numbers = parseRoundsToNumbers(rounds);
  return numbers.length > 0 ? numbers.join(', ') : '';
};

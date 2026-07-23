import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { parseRoundsToNumbers } from '@/lib/roundsParser';

interface TournamentResult {
  id: string;
  tournament?: {
    name: string;
    year: string;
    par: number;
    courseRating: number;
  };
  finalPosition: number;
  positionText?: string;
  totalScore: number;
  rounds?: {
    round: number;
    score: number;
  }[] | string;
}

interface TournamentResultsTableSimplifiedProps {
  results: TournamentResult[];
  athleteName?: string;
}

const TournamentResultsTableSimplified: React.FC<TournamentResultsTableSimplifiedProps> = ({
  results
}) => {
  // Helper to safely get tournament data from either 'tournament' or 'tournaments' field
  const getTournament = (result: any) => {
    return result.tournament || result.tournaments || {};
  };

  // Helper to safely get position from either 'finalPosition' or 'position' field
  const getPosition = (result: any) => {
    return result.finalPosition ?? result.position ?? 0;
  };

  // Helper to safely get total score
  const getTotalScore = (result: any) => {
    return result.totalScore ?? result.total_score ?? null;
  };

  // Use centralized rounds parsing utility (imported from @/lib/roundsParser)
  const parseRounds = parseRoundsToNumbers;

  const formatPosition = (position: number, positionText?: string) => {
    // Detect and ignore corrupted timestamp strings from Excel date conversion
    if (positionText && (
      positionText.includes('GMT') || 
      positionText.includes(':00:00') ||
      positionText.match(/^\w{3}\s\w{3}\s\d{1,2}\s\d{4}/) ||
      positionText.length > 50
    )) {
      positionText = undefined; // Ignore corrupted data and fall back to position number
    }
    
    if (positionText) return positionText;
    if (!position || position === 0) return 'N/A';
    
    const suffix = position === 1 ? 'st' : position === 2 ? 'nd' : position === 3 ? 'rd' : 'th';
    return `${position}${suffix}`;
  };

  // Helper to safely parse numeric values
  const parseNumeric = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 72 : parsed;
    }
    return 72;
  };

  const calculateAverageScore = (rounds?: any) => {
    const parsedRounds = parseRounds(rounds);
    if (parsedRounds.length === 0) return null;
    const total = parsedRounds.reduce((sum, score) => sum + score, 0);
    return (total / parsedRounds.length).toFixed(1);
  };

  const calculateAvgVsPar = (totalScore: number, par: number, numRounds: number) => {
    if (!totalScore || !par || !numRounds) return null;
    const avgVsPar = (totalScore - (par * numRounds)) / numRounds;
    return avgVsPar > 0 ? `+${avgVsPar.toFixed(1)}` : avgVsPar.toFixed(1);
  };

  const calculateAvgVsCR = (totalScore: number, courseRating: number, numRounds: number) => {
    if (!totalScore || !courseRating || !numRounds) return null;
    const avgVsCR = (totalScore - (courseRating * numRounds)) / numRounds;
    return avgVsCR > 0 ? `+${avgVsCR.toFixed(1)}` : avgVsCR.toFixed(1);
  };

  if (!results || results.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No tournament results available
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Tournament</TableHead>
            <TableHead className="font-semibold text-center">Year</TableHead>
            <TableHead className="font-semibold text-center">R1</TableHead>
            <TableHead className="font-semibold text-center">R2</TableHead>
            <TableHead className="font-semibold text-center">R3</TableHead>
            <TableHead className="font-semibold text-center">R4</TableHead>
            <TableHead className="font-semibold text-center">Rank</TableHead>
            <TableHead className="font-semibold text-center">Avg Score</TableHead>
            <TableHead className="font-semibold text-center">Avg vs Par</TableHead>
            <TableHead className="font-semibold text-center">Avg vs CR</TableHead>
            <TableHead className="font-semibold">Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((result) => {
            const tour = getTournament(result);
            const roundScores = parseRounds(result.rounds);
            const par = parseNumeric(tour.par || tour.course_par);
            const courseRating = parseNumeric(tour.courseRating || tour.course_rating);
            const totalScore = getTotalScore(result);
            const position = getPosition(result);
            const numRounds = roundScores.length;
            
            return (
              <TableRow key={result.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">
                  {tour.name || 'Unknown Tournament'}
                </TableCell>
                <TableCell className="text-center">
                  {tour.year || 'N/A'}
                </TableCell>
                <TableCell className="text-center">{roundScores[0] || '-'}</TableCell>
                <TableCell className="text-center">{roundScores[1] || '-'}</TableCell>
                <TableCell className="text-center">{roundScores[2] || '-'}</TableCell>
                <TableCell className="text-center">{roundScores[3] || '-'}</TableCell>
                <TableCell className="text-center font-semibold">
                  {formatPosition(position, result.positionText || (result as any).position_text)}
                </TableCell>
                <TableCell className="text-center">
                  {totalScore != null ? (calculateAverageScore(result.rounds) || '—') : '—'}
                </TableCell>
                <TableCell className="text-center">
                  {totalScore != null ? (calculateAvgVsPar(totalScore, par, numRounds) || '—') : '—'}
                </TableCell>
                <TableCell className="text-center">
                  {totalScore != null ? (calculateAvgVsCR(totalScore, courseRating, numRounds) || '—') : '—'}
                </TableCell>
                <TableCell>
                  {(result as any).notes || '-'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default TournamentResultsTableSimplified;

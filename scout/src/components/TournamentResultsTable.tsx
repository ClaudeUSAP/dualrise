import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { format } from 'date-fns';
import { parseRoundsToNumbers } from '@/lib/roundsParser';

interface TournamentResult {
  id: string;
  tournament_id?: string;
  athlete_id?: string;
  position?: number | string;
  position_text?: string;
  total_score?: number | string;
  rounds?: string | Array<{round: number; score: number}>;
  notes?: string;
  field_size?: number | string;  // Deprecated - prefer tournament.field_size
  tournament?: {
    id?: string;
    name?: string;
    location?: string;
    country?: string;
    start_date?: string;
    end_date?: string;
    year?: string;
    yardage?: string;
    course_par?: string;
    course_slope?: string;
    course_rating?: string;
    results_link?: string;
    field_size?: string;  // Source of truth for field size
  };
}

interface TournamentResultsTableProps {
  results: TournamentResult[];
  showAthleteColumn?: boolean;
  athleteName?: string;
  /** When provided, tournament names become clickable (e.g. to open the leaderboard). */
  onTournamentClick?: (tournamentId: string) => void;
}

export function TournamentResultsTable({
  results,
  showAthleteColumn = false,
  athleteName,
  onTournamentClick
}: TournamentResultsTableProps) {
  // Use centralized rounds parsing utility

  const calculateAverageScore = (rounds: number[]): number | null => {
    if (rounds.length === 0) return null;
    const sum = rounds.reduce((acc, score) => acc + score, 0);
    return sum / rounds.length;
  };

  const formatScore = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-';
    return value.toFixed(1);
  };

  const formatScoreVsPar = (avgScore: number | null, par: string | undefined): string => {
    if (!avgScore || !par) return '-';
    const parNum = parseInt(par);
    if (isNaN(parNum)) return '-';
    const diff = avgScore - parNum;
    return diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
  };

  const formatScoreVsCR = (avgScore: number | null, courseRating: string | undefined): string => {
    if (!avgScore || !courseRating) return '-';
    const crNum = parseFloat(courseRating);
    if (isNaN(crNum)) return '-';
    const diff = avgScore - crNum;
    return diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
  };

  const formatPosition = (position: number | string | undefined, positionText: string | undefined): string => {
    if (positionText) return positionText;
    if (position) return position.toString();
    return '-';
  };

  const formatYear = (year: string | undefined, startDate: string | undefined): string => {
    // Prefer the year field if available
    if (year) return year;
    
    // Fall back to extracting year from start_date
    if (!startDate) return '-';
    try {
      const start = new Date(startDate);
      return format(start, 'yyyy');
    } catch {
      return '-';
    }
  };

  const getScoreColor = (score: number | undefined, par: string | undefined): string => {
    if (!score || !par) return '';
    const parNum = parseInt(par);
    if (isNaN(parNum)) return '';
    
    if (score === parNum) return 'text-green-600 dark:text-green-400';
    if (score < parNum) return 'text-red-600 dark:text-red-400';
    return '';
  };

  if (results.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No tournament results available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <p className="text-xs text-muted-foreground px-3 pt-2 pb-3 italic">
        From most recent to oldest
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            {showAthleteColumn && <TableHead className="py-2 px-3 text-xs font-medium bg-muted/30 whitespace-nowrap">Athlete</TableHead>}
            <TableHead className="py-2 px-3 text-xs font-medium bg-muted/30 whitespace-nowrap">Tournament Name</TableHead>
            <TableHead className="py-2 px-3 text-xs font-medium bg-muted/30 whitespace-nowrap">Year</TableHead>
            <TableHead className="py-2 px-3 text-xs font-medium bg-muted/30">Location</TableHead>
            <TableHead className="text-center py-2 px-3 text-xs font-medium bg-muted/30 whitespace-nowrap">Yardage</TableHead>
            <TableHead className="text-center py-2 px-3 text-xs font-medium bg-muted/30 whitespace-nowrap">Par</TableHead>
            <TableHead className="text-center py-2 px-3 text-xs font-medium bg-muted/30 whitespace-nowrap">CR</TableHead>
            <TableHead className="text-center py-2 px-3 text-xs font-medium bg-muted/30 whitespace-nowrap">R1</TableHead>
            <TableHead className="text-center py-2 px-3 text-xs font-medium bg-muted/30 whitespace-nowrap">R2</TableHead>
            <TableHead className="text-center py-2 px-3 text-xs font-medium bg-muted/30 whitespace-nowrap">R3</TableHead>
            <TableHead className="text-center py-2 px-3 text-xs font-medium bg-muted/30 whitespace-nowrap">R4</TableHead>
            <TableHead className="text-center py-2 px-3 text-xs font-medium bg-muted/30 whitespace-nowrap">Avg Score</TableHead>
            <TableHead className="text-center py-2 px-3 text-xs font-medium bg-muted/30 whitespace-nowrap">Avg vs Par</TableHead>
            <TableHead className="text-center py-2 px-3 text-xs font-medium bg-muted/30 whitespace-nowrap">Avg vs CR</TableHead>
            <TableHead className="text-center py-2 px-3 text-xs font-medium bg-muted/30 whitespace-nowrap">Rank</TableHead>
            <TableHead className="text-center py-2 px-3 text-xs font-medium bg-muted/30 whitespace-nowrap">Field</TableHead>
            <TableHead className="text-center py-2 px-3 text-xs font-medium bg-muted/30 whitespace-nowrap">Results</TableHead>
            <TableHead className="py-2 px-3 text-xs font-medium bg-muted/30 whitespace-nowrap">Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((result) => {
            const rounds = parseRoundsToNumbers(result.rounds);
            const avgScore = calculateAverageScore(rounds);
            
            return (
              <TableRow key={result.id}>
                {showAthleteColumn && (
                  <TableCell className="py-1.5 px-2 text-xs font-medium">{athleteName || '-'}</TableCell>
                )}
                <TableCell className="py-1.5 px-2 text-xs font-medium">
                  {(() => {
                    const tid = result.tournament?.id || result.tournament_id;
                    const name = result.tournament?.name || '-';
                    return onTournamentClick && tid ? (
                      <button
                        type="button"
                        className="text-left text-primary hover:underline cursor-pointer"
                        onClick={() => onTournamentClick(tid)}
                      >
                        {name}
                      </button>
                    ) : (
                      name
                    );
                  })()}
                </TableCell>
                <TableCell className="py-1.5 px-2 text-xs whitespace-nowrap">
                  {formatYear(result.tournament?.year, result.tournament?.start_date)}
                </TableCell>
                <TableCell className="py-1.5 px-2 text-xs">
                  {(() => {
                    const location = result.tournament?.location;
                    const country = result.tournament?.country;
                    
                    // Only show country if location is empty or identical to country
                    if (!location || location === country) {
                      return country || '-';
                    }
                    // Show location with country if they're different
                    return `${location}, ${country}`;
                  })()}
                </TableCell>
                <TableCell className="text-center py-1.5 px-2 text-xs font-mono tabular-nums">
                  {result.tournament?.yardage || '-'}
                </TableCell>
                <TableCell className="text-center py-1.5 px-2 text-xs font-mono tabular-nums">
                  {result.tournament?.course_par || '-'}
                </TableCell>
                <TableCell className="text-center py-1.5 px-2 text-xs font-mono tabular-nums">
                  {result.tournament?.course_rating || '-'}
                </TableCell>
                <TableCell className={`text-center py-1.5 px-2 text-xs font-mono tabular-nums font-semibold ${getScoreColor(rounds[0], result.tournament?.course_par)}`}>
                  {rounds[0] || '-'}
                </TableCell>
                <TableCell className={`text-center py-1.5 px-2 text-xs font-mono tabular-nums font-semibold ${getScoreColor(rounds[1], result.tournament?.course_par)}`}>
                  {rounds[1] || '-'}
                </TableCell>
                <TableCell className={`text-center py-1.5 px-2 text-xs font-mono tabular-nums font-semibold ${getScoreColor(rounds[2], result.tournament?.course_par)}`}>
                  {rounds[2] || '-'}
                </TableCell>
                <TableCell className={`text-center py-1.5 px-2 text-xs font-mono tabular-nums font-semibold ${getScoreColor(rounds[3], result.tournament?.course_par)}`}>
                  {rounds[3] || '-'}
                </TableCell>
                <TableCell className="text-center py-1.5 px-2 text-xs font-medium font-mono tabular-nums">
                  {formatScore(avgScore)}
                </TableCell>
                <TableCell className="text-center py-1.5 px-2 text-xs font-mono tabular-nums">
                  {formatScoreVsPar(avgScore, result.tournament?.course_par)}
                </TableCell>
                <TableCell className="text-center py-1.5 px-2 text-xs font-mono tabular-nums">
                  {formatScoreVsCR(avgScore, result.tournament?.course_rating)}
                </TableCell>
                <TableCell className="text-center py-1.5 px-2 text-xs font-medium">
                  {formatPosition(result.position, result.position_text)}
                </TableCell>
                <TableCell className="text-center py-1.5 px-2 text-xs text-muted-foreground font-mono tabular-nums">
                  {result.tournament?.field_size || result.field_size || '-'}
                </TableCell>
                <TableCell className="text-center py-1.5 px-2 text-xs">
                  {result.tournament?.results_link ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(result.tournament?.results_link, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell className="py-1.5 px-2 text-xs">
                  {result.notes || '-'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
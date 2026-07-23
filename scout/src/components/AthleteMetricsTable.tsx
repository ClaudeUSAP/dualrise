import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getRoundCount } from '@/lib/roundsParser';

interface AthleteMetricsTableProps {
  athleteId: string;
  tournamentResults: any[];
}

interface MetricRowData {
  avgScore: number | null;
  avgVsPar: number | null;
  avgVsCR: number | null;
  tournamentsIncluded: number;
  loading: boolean;
}

export function AthleteMetricsTable({ athleteId, tournamentResults }: AthleteMetricsTableProps) {
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedLastN, setSelectedLastN] = useState<string>('5');
  const [athlete, setAthlete] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Fetch athlete data with all cached metrics
  useEffect(() => {
    const fetchAthleteMetrics = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('athletes_safe' as any)
        .select('*')
        .eq('id', athleteId)
        .single() as { data: any; error: any };
      
      if (!error && data) {
        setAthlete(data);
      }
      setLoading(false);
    };
    
    fetchAthleteMetrics();
  }, [athleteId]);

  // Extract available years from tournament results
  useEffect(() => {
    const years = new Set<string>();
    tournamentResults.forEach(tr => {
      let year = tr.tournaments?.year;
      
      if (!year) {
        const startDate = tr.tournaments?.start_date;
        const endDate = tr.tournaments?.end_date;
        if (startDate) {
          year = new Date(startDate).getFullYear().toString();
        } else if (endDate) {
          year = new Date(endDate).getFullYear().toString();
        }
      }
      
      if (year) {
        years.add(year);
      }
    });
    const sortedYears = Array.from(years).sort().reverse();
    setAvailableYears(sortedYears);
    if (sortedYears.length > 0) {
      setSelectedYear(sortedYears[0]);
    }
  }, [tournamentResults]);

  const formatMetric = (value: string | null | undefined, prefix: string = '') => {
    if (!value || value === '0' || value === '0.00') return '-';
    const numValue = parseFloat(value);
    const formatted = numValue.toFixed(2);
    if (prefix === '+' && numValue > 0) return `+${formatted}`;
    return formatted;
  };

  const calculateMetricsForYear = (year: string) => {
    const yearResults = tournamentResults.filter(tr => {
      let trYear = tr.tournaments?.year;
      if (!trYear) {
        const startDate = tr.tournaments?.start_date;
        if (startDate) {
          trYear = new Date(startDate).getFullYear().toString();
        }
      }
      return trYear === year;
    });

    if (yearResults.length === 0) {
      return { avgScore: null, avgVsPar: null, avgVsCR: null };
    }

    // Round-weighted: SUM(score) / SUM(rounds), SUM(differential) / SUM(rounds)
    let totalScore = 0;
    let totalRounds = 0;
    let totalVsPar = 0;
    let validParRounds = 0;
    let totalVsCR = 0;
    let validCRRounds = 0;

    yearResults.forEach(result => {
      if (result.total_score && result.total_score > 0 && result.rounds) {
        const roundCount = getRoundCount(result.rounds);
        if (roundCount <= 0) return;

        totalScore += result.total_score;
        totalRounds += roundCount;

        const tournament = result.tournaments;
        if (tournament?.course_par) {
          const par = parseFloat(tournament.course_par);
          totalVsPar += (result.total_score - par * roundCount);
          validParRounds += roundCount;
        }

        if (tournament?.course_rating) {
          const cr = parseFloat(tournament.course_rating);
          totalVsCR += (result.total_score - cr * roundCount);
          validCRRounds += roundCount;
        }
      }
    });

    return {
      avgScore: totalRounds > 0
        ? (totalScore / totalRounds).toFixed(2)
        : null,
      avgVsPar: validParRounds > 0
        ? (totalVsPar / validParRounds).toFixed(2)
        : null,
      avgVsCR: validCRRounds > 0
        ? (totalVsCR / validCRRounds).toFixed(2)
        : null,
    };
  };

  const getMetricsForPeriod = (period: 'year' | 'last_n' | 'all_time') => {
    if (!athlete) return { avgScore: null, avgVsPar: null, avgVsCR: null };
    
    if (period === 'year') {
      // Calculate dynamically for selected year
      return calculateMetricsForYear(selectedYear);
    } else if (period === 'last_n') {
      // Based on selectedLastN
      const suffix = selectedLastN;
      return {
        avgScore: athlete[`scoring_avg_last_${suffix}_raw`],
        avgVsPar: athlete[`scoring_avg_vs_par_last_${suffix}`],
        avgVsCR: athlete[`scoring_avg_vs_cr_last_${suffix}`]
      };
    } else {
      // All-time
      return {
        avgScore: athlete.scoring_avg_all_time_raw,
        avgVsPar: athlete.scoring_avg_vs_par_all_time,
        avgVsCR: athlete.scoring_average_vs_course_rating
      };
    }
  };

  const countTournaments = (period: 'year' | 'last_n' | 'all_time') => {
    if (period === 'year') {
      return tournamentResults.filter(tr => {
        let year = tr.tournaments?.year;
        if (!year) {
          const startDate = tr.tournaments?.start_date;
          const endDate = tr.tournaments?.end_date;
          if (startDate) {
            year = new Date(startDate).getFullYear().toString();
          } else if (endDate) {
            year = new Date(endDate).getFullYear().toString();
          }
        }
        return year === selectedYear;
      }).length;
    } else if (period === 'last_n') {
      const n = parseInt(selectedLastN);
      return Math.min(n, tournamentResults.length);
    } else {
      return tournamentResults.length;
    }
  };

  const yearMetrics = getMetricsForPeriod('year');
  const lastNMetrics = getMetricsForPeriod('last_n');
  const allTimeMetrics = getMetricsForPeriod('all_time');

  return (
    <Card className="mb-6">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4 font-medium text-sm text-muted-foreground">Period</th>
                <th className="text-center p-4 font-medium text-sm text-muted-foreground">Average Score</th>
                <th className="text-center p-4 font-medium text-sm text-muted-foreground">Average Score vs Par</th>
                <th className="text-center p-4 font-medium text-sm text-muted-foreground">Average Score vs Course Rating</th>
                <th className="text-center p-4 font-medium text-sm text-muted-foreground">Tournaments</th>
              </tr>
            </thead>
            <tbody>
              {/* Year Row */}
              <tr className="border-b hover:bg-muted/50 transition-colors">
                <td className="p-4">
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.map(year => (
                        <SelectItem key={year} value={year}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="text-center p-4">
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    formatMetric(yearMetrics.avgScore)
                  )}
                </td>
                <td className="text-center p-4">
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    <span className={yearMetrics.avgVsPar && parseFloat(yearMetrics.avgVsPar) > 0 ? 'text-destructive' : 'text-green-600'}>
                      {formatMetric(yearMetrics.avgVsPar, '+')}
                    </span>
                  )}
                </td>
                <td className="text-center p-4">
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    <span className={yearMetrics.avgVsCR && parseFloat(yearMetrics.avgVsCR) > 0 ? 'text-destructive' : 'text-green-600'}>
                      {formatMetric(yearMetrics.avgVsCR, '+')}
                    </span>
                  )}
                </td>
                <td className="text-center p-4 text-muted-foreground">
                  {countTournaments('year')}
                </td>
              </tr>

              {/* Last N Row */}
              <tr className="border-b hover:bg-muted/50 transition-colors">
                <td className="p-4">
                  <Select value={selectedLastN} onValueChange={setSelectedLastN}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">Last 3</SelectItem>
                      <SelectItem value="5">Last 5</SelectItem>
                      <SelectItem value="7">Last 7</SelectItem>
                      <SelectItem value="10">Last 10</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="text-center p-4">
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    formatMetric(lastNMetrics.avgScore)
                  )}
                </td>
                <td className="text-center p-4">
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    <span className={lastNMetrics.avgVsPar && parseFloat(lastNMetrics.avgVsPar) > 0 ? 'text-destructive' : 'text-green-600'}>
                      {formatMetric(lastNMetrics.avgVsPar, '+')}
                    </span>
                  )}
                </td>
                <td className="text-center p-4">
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    <span className={lastNMetrics.avgVsCR && parseFloat(lastNMetrics.avgVsCR) > 0 ? 'text-destructive' : 'text-green-600'}>
                      {formatMetric(lastNMetrics.avgVsCR, '+')}
                    </span>
                  )}
                </td>
                <td className="text-center p-4 text-muted-foreground">
                  {countTournaments('last_n')}
                </td>
              </tr>

              {/* All-time Row */}
              <tr className="hover:bg-muted/50 transition-colors">
                <td className="p-4 font-medium">All-time</td>
                <td className="text-center p-4">
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    formatMetric(allTimeMetrics.avgScore)
                  )}
                </td>
                <td className="text-center p-4">
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    <span className={allTimeMetrics.avgVsPar && parseFloat(allTimeMetrics.avgVsPar) > 0 ? 'text-destructive' : 'text-green-600'}>
                      {formatMetric(allTimeMetrics.avgVsPar, '+')}
                    </span>
                  )}
                </td>
                <td className="text-center p-4">
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    <span className={allTimeMetrics.avgVsCR && parseFloat(allTimeMetrics.avgVsCR) > 0 ? 'text-destructive' : 'text-green-600'}>
                      {formatMetric(allTimeMetrics.avgVsCR, '+')}
                    </span>
                  )}
                </td>
                <td className="text-center p-4 text-muted-foreground">
                  {countTournaments('all_time')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { parseRoundsToNumbers } from '@/lib/roundsParser';

interface AverageScoreDisplayProps {
  athleteId: string;
  compact?: boolean;
}

type PeriodType = 'all_time' | 'current_year' | 'last_5' | 'last_7' | 'last_10';

export function AverageScoreDisplay({ athleteId, compact = false }: AverageScoreDisplayProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('all_time');
  const [loading, setLoading] = useState(true);
  const [averageScore, setAverageScore] = useState<number | null>(null);

  useEffect(() => {
    fetchAndCalculateAverage();
  }, [athleteId, selectedPeriod]);

  const fetchAndCalculateAverage = async () => {
    setLoading(true);
    
    try {
      let query = supabase
        .from('tournament_results')
        .select('rounds, tournaments!inner(year, start_date, end_date)')
        .eq('athlete_id', athleteId)
        .not('rounds', 'is', null);

      // Apply filters based on period
      if (selectedPeriod === 'current_year') {
        const currentYear = new Date().getFullYear().toString();
        query = query.eq('tournaments.year', currentYear);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching tournament results:', error);
        throw error;
      }

      let results = data || [];
      
      // Sort results by end_date in JavaScript (most recent first)
      results.sort((a: any, b: any) => {
        const dateA = a.tournaments?.end_date ? new Date(a.tournaments.end_date).getTime() : 0;
        const dateB = b.tournaments?.end_date ? new Date(b.tournaments.end_date).getTime() : 0;
        return dateB - dateA;
      });
      
      // Limit to last N tournaments if needed
      if (selectedPeriod === 'last_5') {
        results = results.slice(0, 5);
      } else if (selectedPeriod === 'last_10') {
        results = results.slice(0, 10);
      }

      // Round-weighted: collect all individual round scores, then average
      const allRoundScores = results.flatMap((r: any) => parseRoundsToNumbers(r.rounds));

      if (allRoundScores.length > 0) {
        const avg = allRoundScores.reduce((s: number, v: number) => s + v, 0) / allRoundScores.length;
        setAverageScore(avg);
      } else {
        setAverageScore(null);
      }
    } catch (error) {
      console.error('Error calculating average score:', error);
      setAverageScore(null);
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Select value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as PeriodType)}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_time">All Time</SelectItem>
            <SelectItem value="current_year">{new Date().getFullYear()}</SelectItem>
            <SelectItem value="last_5">Last 5</SelectItem>
            <SelectItem value="last_7">Last 7</SelectItem>
            <SelectItem value="last_10">Last 10</SelectItem>
          </SelectContent>
        </Select>
        
        {loading ? (
          <Skeleton className="h-6 w-12" />
        ) : (
          <span className="font-semibold text-sm">
            {averageScore !== null ? averageScore.toFixed(2) : 'N/A'}
          </span>
        )}
      </div>
    );
  }

  return null;
}

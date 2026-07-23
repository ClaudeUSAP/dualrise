import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

interface BestRecentScoreDisplayProps {
  athleteId: string;
  showTooltip?: boolean;
  className?: string;
}

interface ScoreData {
  bestValue: string | null;
  bestPeriod: string | null;
  last3: string | null;
  last5: string | null;
  last7: string | null;
  last10: string | null;
  currentYear: string | null;
}

export function BestRecentScoreDisplay({ 
  athleteId, 
  showTooltip = true,
  className = "" 
}: BestRecentScoreDisplayProps) {
  const [loading, setLoading] = useState(true);
  const [scoreData, setScoreData] = useState<ScoreData>({
    bestValue: null,
    bestPeriod: null,
    last3: null,
    last5: null,
    last7: null,
    last10: null,
    currentYear: null,
  });

  useEffect(() => {
    fetchScoreData();
  }, [athleteId]);

  const fetchScoreData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('athletes_safe' as any)
        .select('best_recent_scoring_avg_raw, best_recent_period_raw, scoring_avg_last_3_raw, scoring_avg_last_5_raw, scoring_avg_last_7_raw, scoring_avg_last_10_raw, scoring_avg_current_year_raw')
        .eq('id', athleteId)
        .maybeSingle() as { data: any; error: any };

      if (error) throw error;

      // If cache is missing or zero, compute all periods and pick the best
      let bestValue = data.best_recent_scoring_avg_raw;
      let bestPeriod = data.best_recent_period_raw;
      
      if (!bestValue || parseFloat(bestValue) === 0) {
        const periods = [
          { name: 'Last 3', filter_type: 'last_n', filter_value: '3' },
          { name: 'Last 5', filter_type: 'last_n', filter_value: '5' },
          { name: 'Last 7', filter_type: 'last_n', filter_value: '7' },
          { name: 'Last 10', filter_type: 'last_n', filter_value: '10' },
          { name: 'Current Year', filter_type: 'year', filter_value: new Date().getFullYear().toString() }
        ];

        const computedPeriods = await Promise.all(
          periods.map(async (period) => {
            const { data: computed, error: rpcError } = await supabase.rpc('calculate_scoring_avg_dynamic', {
              athlete_uuid: athleteId,
              filter_type: period.filter_type,
              filter_value: period.filter_value
            });
            return {
              name: period.name,
              value: (!rpcError && computed) ? parseFloat(computed.toString()) : null
            };
          })
        );

        // Find the best (lowest) score among all periods
        const validPeriods = computedPeriods.filter(p => p.value !== null && p.value > 0);
        if (validPeriods.length > 0) {
          const best = validPeriods.reduce((min, p) => p.value! < min.value! ? p : min);
          bestValue = best.value!.toString();
          bestPeriod = best.name;
        }
      }

      setScoreData({
        bestValue,
        bestPeriod,
        last3: data?.scoring_avg_last_3_raw ?? null,
        last5: data?.scoring_avg_last_5_raw ?? null,
        last7: data?.scoring_avg_last_7_raw ?? null,
        last10: data?.scoring_avg_last_10_raw ?? null,
        currentYear: data?.scoring_avg_current_year_raw ?? null,
      });
    } catch (error) {
      console.error('Error fetching best recent score:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value: string | null) => {
    if (!value) return 'N/A';
    const num = parseFloat(value);
    return (isNaN(num) || num === 0) ? 'N/A' : num.toFixed(2);
  };

  if (loading) {
    return <Skeleton className="h-6 w-24" />;
  }

  const displayValue = formatValue(scoreData.bestValue);
  const displayPeriod = scoreData.bestPeriod || '';

  const tooltipContent = (
    <div className="space-y-1 text-xs">
      <div className="font-semibold mb-2">Period Breakdown:</div>
      <div className="flex justify-between gap-4">
        <span>Last 3:</span>
        <span className={scoreData.bestPeriod === 'Last 3' ? 'font-bold text-primary' : ''}>
          {formatValue(scoreData.last3)}
          {scoreData.bestPeriod === 'Last 3' && ' ⭐'}
        </span>
      </div>
      <div className="flex justify-between gap-4">
        <span>Last 5:</span>
        <span className={scoreData.bestPeriod === 'Last 5' ? 'font-bold text-primary' : ''}>
          {formatValue(scoreData.last5)}
          {scoreData.bestPeriod === 'Last 5' && ' ⭐'}
        </span>
      </div>
      <div className="flex justify-between gap-4">
        <span>Last 7:</span>
        <span className={scoreData.bestPeriod === 'Last 7' ? 'font-bold text-primary' : ''}>
          {formatValue(scoreData.last7)}
          {scoreData.bestPeriod === 'Last 7' && ' ⭐'}
        </span>
      </div>
      <div className="flex justify-between gap-4">
        <span>Last 10:</span>
        <span className={scoreData.bestPeriod === 'Last 10' ? 'font-bold text-primary' : ''}>
          {formatValue(scoreData.last10)}
          {scoreData.bestPeriod === 'Last 10' && ' ⭐'}
        </span>
      </div>
      <div className="flex justify-between gap-4">
        <span>Current Year:</span>
        <span className={scoreData.bestPeriod === 'Current Year' ? 'font-bold text-primary' : ''}>
          {formatValue(scoreData.currentYear)}
          {scoreData.bestPeriod === 'Current Year' && ' ⭐'}
        </span>
      </div>
    </div>
  );

  if (!showTooltip) {
    return (
      <span className={className}>
        {displayValue} {displayPeriod && displayValue !== 'N/A' && `(${displayPeriod})`}
      </span>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center gap-1 cursor-help ${className}`}>
            {displayValue}
            {displayPeriod && displayValue !== 'N/A' && (
              <span className="text-xs text-muted-foreground">({displayPeriod})</span>
            )}
            <Info className="h-3 w-3 text-muted-foreground" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

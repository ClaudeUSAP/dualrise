import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

interface BestRecentVsParDisplayProps {
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

export function BestRecentVsParDisplay({ 
  athleteId, 
  showTooltip = true,
  className = "" 
}: BestRecentVsParDisplayProps) {
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
        .select('best_recent_period_raw, scoring_avg_vs_par_last_3, scoring_avg_vs_par_last_5, scoring_avg_vs_par_last_7, scoring_avg_vs_par_last_10, scoring_avg_vs_par_current_year')
        .eq('id', athleteId)
        .maybeSingle() as { data: any; error: any };

      if (error) throw error;

      let period = data?.best_recent_period_raw || null;
      let bestValue: string | null = null;

      // Use best_recent_period_raw to select vs Par for the same period as avg score
      if (period) {
        const periodMap: Record<string, string | null | undefined> = {
          'Last 3': data?.scoring_avg_vs_par_last_3,
          'Last 5': data?.scoring_avg_vs_par_last_5,
          'Last 7': data?.scoring_avg_vs_par_last_7,
          'Last 10': data?.scoring_avg_vs_par_last_10,
          'Current Year': data?.scoring_avg_vs_par_current_year,
        };
        bestValue = periodMap[period] ?? null;

        // If cached value missing, compute dynamically for this specific period
        if (!bestValue || isNaN(parseFloat(bestValue))) {
          const filterConfig = period === 'Current Year'
            ? { filter_type: 'year', filter_value: new Date().getFullYear().toString() }
            : { filter_type: 'last_n', filter_value: period.replace('Last ', '') };

          const { data: computed, error: rpcError } = await supabase.rpc('calculate_scoring_avg_vs_par_dynamic', {
            athlete_uuid: athleteId,
            ...filterConfig
          });

          if (!rpcError && computed !== null && computed !== undefined) {
            bestValue = computed.toString();
          }
        }
      }

      // Fallback: if no best_recent_period_raw, find the best independently
      if (!period) {
        const cachedPeriods = [
          { name: 'Last 3', value: data?.scoring_avg_vs_par_last_3 },
          { name: 'Last 5', value: data?.scoring_avg_vs_par_last_5 },
          { name: 'Last 7', value: data?.scoring_avg_vs_par_last_7 },
          { name: 'Last 10', value: data?.scoring_avg_vs_par_last_10 },
          { name: 'Current Year', value: data?.scoring_avg_vs_par_current_year }
        ];

        const validCachedPeriods = cachedPeriods.filter(p =>
          p.value && !isNaN(parseFloat(p.value))
        );

        if (validCachedPeriods.length > 0) {
          const best = validCachedPeriods.reduce((min, p) =>
            parseFloat(p.value!) < parseFloat(min.value!) ? p : min
          );
          bestValue = best.value!;
          period = best.name;
        }
      }

      setScoreData({
        bestValue,
        bestPeriod: period,
        last3: data?.scoring_avg_vs_par_last_3 ?? null,
        last5: data?.scoring_avg_vs_par_last_5 ?? null,
        last7: data?.scoring_avg_vs_par_last_7 ?? null,
        last10: data?.scoring_avg_vs_par_last_10 ?? null,
        currentYear: data?.scoring_avg_vs_par_current_year ?? null,
      });
    } catch (error) {
      console.error('Error fetching best recent vs Par:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value: string | null) => {
    if (!value) return 'N/A';
    const num = parseFloat(value);
    if (isNaN(num)) return 'N/A';
    if (num === 0) return '0.00';
    return (num > 0 ? '+' : '') + num.toFixed(2);
  };

  if (loading) {
    return <Skeleton className="h-6 w-24" />;
  }

  const displayValue = formatValue(scoreData.bestValue);
  const displayPeriod = scoreData.bestPeriod || '';

  const tooltipContent = (
    <div className="space-y-1 text-xs">
      <div className="font-semibold mb-2">Period Breakdown (vs Par):</div>
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

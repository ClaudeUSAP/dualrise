import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type MetricPeriod = 'all_time' | 'current_year' | 'last_5' | 'last_10' | 'custom';

interface MetricData {
  value: number | null;
  tournamentsIncluded: number;
  lastCalculated: string | null;
  loading: boolean;
  error: string | null;
}

interface AthleteStatistics {
  metric_type: string;
  period_type: string;
  period_value: string | null;
  calculated_value: number;
  tournaments_included: number;
  last_calculated: string;
}

export function useAthleteMetrics(athleteId: string | undefined) {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<Record<MetricPeriod, MetricData>>({
    all_time: { value: null, tournamentsIncluded: 0, lastCalculated: null, loading: false, error: null },
    current_year: { value: null, tournamentsIncluded: 0, lastCalculated: null, loading: false, error: null },
    last_5: { value: null, tournamentsIncluded: 0, lastCalculated: null, loading: false, error: null },
    last_10: { value: null, tournamentsIncluded: 0, lastCalculated: null, loading: false, error: null },
    custom: { value: null, tournamentsIncluded: 0, lastCalculated: null, loading: false, error: null },
  });

  // Fetch cached metrics from athletes table (single source of truth)
  useEffect(() => {
    if (!athleteId) return;

    const fetchCachedMetrics = async () => {
      try {
        const { data, error } = await supabase
          .from('athletes_safe' as any)
          .select(`
            scoring_avg_vs_cr_last_3,
            scoring_avg_vs_cr_last_5,
            scoring_avg_vs_cr_last_7,
            scoring_avg_vs_cr_last_10,
            scoring_avg_vs_cr_current_year,
            scoring_average_vs_course_rating,
            scoring_avg_vs_cr_last_update
          `)
          .eq('id', athleteId)
          .maybeSingle() as { data: any; error: any };

        if (error) throw error;

        if (data) {
          const parseValue = (val: string | null): number | null => {
            if (!val) return null;
            const num = parseFloat(val);
            return isNaN(num) ? null : num;
          };

          const lastCalculated = data.scoring_avg_vs_cr_last_update || null;

          setMetrics({
            all_time: {
              value: parseValue(data.scoring_average_vs_course_rating),
              tournamentsIncluded: 0, // Not tracked in athletes table
              lastCalculated,
              loading: false,
              error: null
            },
            current_year: {
              value: parseValue(data.scoring_avg_vs_cr_current_year),
              tournamentsIncluded: 0,
              lastCalculated,
              loading: false,
              error: null
            },
            last_5: {
              value: parseValue(data.scoring_avg_vs_cr_last_5),
              tournamentsIncluded: 0,
              lastCalculated,
              loading: false,
              error: null
            },
            last_10: {
              value: parseValue(data.scoring_avg_vs_cr_last_10),
              tournamentsIncluded: 0,
              lastCalculated,
              loading: false,
              error: null
            },
            custom: {
              value: null,
              tournamentsIncluded: 0,
              lastCalculated: null,
              loading: false,
              error: null
            }
          });
        }
      } catch (error) {
        console.error('Error fetching cached metrics:', error);
      }
    };

    fetchCachedMetrics();
  }, [athleteId]);

  // Function to calculate metric for a specific period
  const calculateMetric = async (period: MetricPeriod, customYear?: string, customLastN?: number) => {
    if (!athleteId) return;

    setMetrics(prev => ({
      ...prev,
      [period]: { ...prev[period], loading: true, error: null }
    }));

    try {
      let filterType = 'all';
      let filterValue = null;

      if (period === 'current_year') {
        filterType = 'year';
        filterValue = new Date().getFullYear().toString();
      } else if (period === 'last_5') {
        filterType = 'last_n';
        filterValue = '5';
      } else if (period === 'last_10') {
        filterType = 'last_n';
        filterValue = '10';
      } else if (period === 'custom') {
        if (customYear) {
          filterType = 'year';
          filterValue = customYear;
        } else if (customLastN) {
          filterType = 'last_n';
          filterValue = customLastN.toString();
        }
      }

      const { data, error } = await supabase.functions.invoke('calculate-athlete-metrics', {
        body: {
          athleteId,
          filterType,
          filterValue
        }
      });

      if (error) throw error;

      setMetrics(prev => ({
        ...prev,
        [period]: {
          value: data.metricValue,
          tournamentsIncluded: data.tournamentsIncluded,
          lastCalculated: data.calculatedAt,
          loading: false,
          error: null
        }
      }));
    } catch (error: any) {
      console.error('Error calculating metric:', error);
      setMetrics(prev => ({
        ...prev,
        [period]: {
          ...prev[period],
          loading: false,
          error: error.message || 'Failed to calculate metric'
        }
      }));
      
      toast({
        title: "Error",
        description: "Failed to calculate metric. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Function to refresh all metrics
  const refreshAllMetrics = async () => {
    if (!athleteId) return;

    const periods: MetricPeriod[] = ['all_time', 'current_year', 'last_5', 'last_10'];
    
    for (const period of periods) {
      await calculateMetric(period);
    }
  };

  return {
    metrics,
    calculateMetric,
    refreshAllMetrics
  };
}
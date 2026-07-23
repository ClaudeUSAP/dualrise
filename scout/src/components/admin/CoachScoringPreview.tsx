import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Eye, Star, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';

interface PeriodData {
  period: string;
  label: string;
  avgScore: number | null;
  vsCR: number | null;
  vsPar: number | null;
}

interface CoachScoringPreviewProps {
  athleteId: string;
  currentBestPeriod?: string;
  currentBestAvg?: string;
  currentBestVsCR?: string;
  currentBestVsPar?: string;
  scoringOverrideEnabled?: boolean;
  selectedOverridePeriod?: string;
  onOverrideChange?: (enabled: boolean) => void;
  onPeriodChange?: (period: string) => void;
  onRefresh?: () => void | Promise<void>;
}

const formatScore = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value) || value === 0) return 'N/A';
  return value.toFixed(2);
};

const formatVsScore = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  if (value === 0) return '0.00';
  return value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
};

export const CoachScoringPreview: React.FC<CoachScoringPreviewProps> = ({
  athleteId,
  currentBestPeriod,
  currentBestAvg,
  currentBestVsCR,
  currentBestVsPar,
  scoringOverrideEnabled = false,
  selectedOverridePeriod,
  onOverrideChange,
  onPeriodChange,
  onRefresh
}) => {
  const [periodData, setPeriodData] = useState<PeriodData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setPeriodData([]);
    setIsLoading(true);
    fetchAllPeriodData();
  }, [athleteId]);

  const fetchAllPeriodData = async () => {
    setIsLoading(true);
    setPeriodData([]);
    try {
      const periods = [
        { period: 'last_3', label: 'Last 3', filterType: 'last_n', filterValue: '3' },
        { period: 'last_5', label: 'Last 5', filterType: 'last_n', filterValue: '5' },
        { period: 'last_7', label: 'Last 7', filterType: 'last_n', filterValue: '7' },
        { period: 'last_10', label: 'Last 10', filterType: 'last_n', filterValue: '10' },
        { period: 'current_year', label: 'Current Year', filterType: 'year', filterValue: new Date().getFullYear().toString() },
      ];

      const results = await Promise.all(
        periods.map(async (p) => {
          const [avgScoreResult, vsCRResult, vsParResult] = await Promise.all([
            supabase.rpc('calculate_scoring_avg_dynamic', {
              athlete_uuid: athleteId,
              filter_type: p.filterType,
              filter_value: p.filterValue
            }),
            supabase.rpc('calculate_scoring_avg_vs_cr_dynamic', {
              athlete_uuid: athleteId,
              filter_type: p.filterType,
              filter_value: p.filterValue
            }),
            supabase.rpc('calculate_scoring_avg_vs_par_dynamic', {
              athlete_uuid: athleteId,
              filter_type: p.filterType,
              filter_value: p.filterValue
            })
          ]);

          return {
            period: p.period,
            label: p.label,
            avgScore: avgScoreResult.data || null,
            vsCR: vsCRResult.data || null,
            vsPar: vsParResult.data || null
          };
        })
      );

      setPeriodData(results);
    } catch (error) {
      console.error('Error fetching period data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchAllPeriodData();
      const { error } = await supabase.functions.invoke('calculate-athlete-metrics', {
        body: { athleteId, refreshAll: true },
      });
      if (error) throw error;
      await onRefresh?.();
    } catch (error: any) {
      console.error('Error refreshing coach scoring preview:', error);
      toast({
        title: 'Refresh failed',
        description: error?.message || 'Could not refresh athlete cached scoring metrics.',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const getBestPeriod = (): PeriodData | null => {
    const validPeriods = periodData.filter(p => p.avgScore && p.avgScore > 0);
    if (validPeriods.length === 0) return null;
    return validPeriods.reduce((best, current) => 
      (current.avgScore! < best.avgScore!) ? current : best
    );
  };

  const bestPeriod = getBestPeriod();

  const periodToValue = (label: string): string => {
    const map: Record<string, string> = {
      'Last 3': 'last_3',
      'Last 5': 'last_5',
      'Last 7': 'last_7',
      'Last 10': 'last_10',
      'Current Year': 'current_year'
    };
    return map[label] || label;
  };

  const valueToLabel = (value: string): string => {
    const map: Record<string, string> = {
      'last_3': 'Last 3',
      'last_5': 'Last 5',
      'last_7': 'Last 7',
      'last_10': 'Last 10',
      'current_year': 'Current Year'
    };
    return map[value] || value;
  };

  const normalizeToLabel = (valueOrLabel: string | undefined): string => {
    if (!valueOrLabel) return '';
    return valueToLabel(periodToValue(valueOrLabel));
  };

  const displayedPeriod = scoringOverrideEnabled && selectedOverridePeriod 
    ? valueToLabel(selectedOverridePeriod) 
    : normalizeToLabel(currentBestPeriod) || bestPeriod?.label || 'N/A';

  return (
    <Card className="border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Eye className="h-4 w-4 text-green-600" />
            Coach View Preview
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          This shows exactly what coaches see for this athlete's scoring metrics
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Display Summary */}
        <div className="bg-background rounded-lg p-3 border">
          <p className="text-sm font-medium mb-2">Currently Displayed to Coaches:</p>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Best Avg:</span>
              <p className="font-semibold">
                {currentBestAvg && parseFloat(currentBestAvg) > 0 
                  ? parseFloat(currentBestAvg).toFixed(2) 
                  : 'N/A'}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">vs CR:</span>
              <p className="font-semibold">
                {currentBestVsCR != null
                  ? formatVsScore(parseFloat(currentBestVsCR)) 
                  : 'N/A'}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">vs Par:</span>
              <p className="font-semibold">
                {currentBestVsPar != null
                  ? formatVsScore(parseFloat(currentBestVsPar)) 
                  : 'N/A'}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Period:</span>
              <p className="font-semibold">{displayedPeriod}</p>
            </div>
          </div>
        </div>

        {/* Period Comparison Table */}
        <div>
          <p className="text-sm font-medium mb-2">Period Comparison:</p>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Period</TableHead>
                  <TableHead className="text-right">Avg Score</TableHead>
                  <TableHead className="text-right">vs CR</TableHead>
                  <TableHead className="text-right">vs Par</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periodData.map((p) => {
                  const isBest = bestPeriod?.period === p.period;
                  const isSelected = scoringOverrideEnabled && selectedOverridePeriod === p.period;
                  return (
                    <TableRow 
                      key={p.period}
                      className={isBest && !scoringOverrideEnabled ? 'bg-green-100/50 dark:bg-green-900/20' : 
                                isSelected ? 'bg-blue-100/50 dark:bg-blue-900/20' : ''}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1">
                          {p.label}
                          {isBest && !scoringOverrideEnabled && (
                            <Star className="h-3 w-3 fill-green-500 text-green-500" />
                          )}
                          {isSelected && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              Selected
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatScore(p.avgScore)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatVsScore(p.vsCR)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatVsScore(p.vsPar)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            <Star className="h-3 w-3 inline fill-green-500 text-green-500" /> = Auto-selected best (lowest avg score)
          </p>
        </div>

        {/* Manual Override Section */}
        <div className="border-t pt-4">
          <div className="flex items-start space-x-2">
            <Checkbox
              id="scoring-override"
              checked={scoringOverrideEnabled}
              onCheckedChange={(checked) => onOverrideChange?.(checked as boolean)}
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="scoring-override"
                className="text-sm font-medium cursor-pointer"
              >
                Override automatic "best" selection
              </Label>
              <p className="text-xs text-muted-foreground">
                Manually choose which period to display to coaches instead of the automatic best selection
              </p>
            </div>
          </div>

          {scoringOverrideEnabled && (
            <div className="mt-3 ml-6">
              <Label className="text-sm">Display period to coaches:</Label>
              <Select
                value={selectedOverridePeriod || 'last_5'}
                onValueChange={(value) => onPeriodChange?.(value)}
              >
                <SelectTrigger className="w-[200px] mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_3">Last 3</SelectItem>
                  <SelectItem value="last_5">Last 5</SelectItem>
                  <SelectItem value="last_7">Last 7</SelectItem>
                  <SelectItem value="last_10">Last 10</SelectItem>
                  <SelectItem value="current_year">Current Year</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                This will update the displayed values when you save the Golf Performance section
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, RefreshCw, Info } from 'lucide-react';
import { useAthleteMetrics, MetricPeriod } from '@/hooks/useAthleteMetrics';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';

interface AthleteMetricsDisplayProps {
  athleteId: string;
  showTitle?: boolean;
  compact?: boolean;
  defaultPeriod?: MetricPeriod;
}

export function AthleteMetricsDisplay({ 
  athleteId, 
  showTitle = true, 
  compact = false,
  defaultPeriod = 'all_time'
}: AthleteMetricsDisplayProps) {
  const { metrics, calculateMetric, refreshAllMetrics } = useAthleteMetrics(athleteId);
  const [selectedPeriod, setSelectedPeriod] = React.useState<MetricPeriod>(defaultPeriod);
  const [customYear, setCustomYear] = React.useState<string>(new Date().getFullYear().toString());
  const [customLastN, setCustomLastN] = React.useState<number>(3);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const currentMetric = metrics[selectedPeriod];
  const allTimeMetric = metrics.all_time;

  const handlePeriodChange = (value: string) => {
    const period = value as MetricPeriod;
    setSelectedPeriod(period);
    
    // Fetch metric if not already loaded
    if (!metrics[period].value && !metrics[period].loading) {
      calculateMetric(period, period === 'custom' ? customYear : undefined, period === 'custom' ? customLastN : undefined);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await calculateMetric(selectedPeriod, selectedPeriod === 'custom' ? customYear : undefined, selectedPeriod === 'custom' ? customLastN : undefined);
    setIsRefreshing(false);
  };

  const formatValue = (value: number | null) => {
    if (value === null) return '-';
    const formatted = value.toFixed(2);
    return value > 0 ? `+${formatted}` : formatted;
  };

  const getTrend = () => {
    if (!currentMetric.value || !allTimeMetric.value || selectedPeriod === 'all_time') return null;
    
    const diff = currentMetric.value - allTimeMetric.value;
    if (Math.abs(diff) < 0.1) return null;
    
    return diff < 0 ? 'improving' : 'declining';
  };

  const trend = getTrend();

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_time">All Time</SelectItem>
            <SelectItem value="current_year">{new Date().getFullYear()}</SelectItem>
            <SelectItem value="last_5">Last 5</SelectItem>
            <SelectItem value="last_10">Last 10</SelectItem>
          </SelectContent>
        </Select>
        
        {currentMetric.loading ? (
          <Skeleton className="h-6 w-12" />
        ) : (
          <div className="flex items-center gap-1">
            <span className="font-semibold text-sm">
              {formatValue(currentMetric.value)}
            </span>
            {trend === 'improving' && <TrendingUp className="h-3 w-3 text-green-500" />}
            {trend === 'declining' && <TrendingDown className="h-3 w-3 text-red-500" />}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      {showTitle && (
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Scoring Average vs Course Rating</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || currentMetric.loading}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
      )}
      
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_time">All Time</SelectItem>
                <SelectItem value="current_year">{new Date().getFullYear()}</SelectItem>
                <SelectItem value="last_5">Last 5 Tournaments</SelectItem>
                <SelectItem value="last_10">Last 10 Tournaments</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>

            {selectedPeriod === 'custom' && (
              <div className="flex gap-2">
                <Select value={customYear} onValueChange={setCustomYear}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => calculateMetric('custom', customYear)}
                >
                  Calculate
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentMetric.loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <span className="text-2xl font-bold">
                    {formatValue(currentMetric.value)}
                  </span>
                  {trend === 'improving' && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Improving
                    </Badge>
                  )}
                  {trend === 'declining' && (
                    <Badge variant="secondary" className="bg-red-100 text-red-800">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      Declining
                    </Badge>
                  )}
                </>
              )}
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground cursor-help">
                    <Info className="h-3 w-3" />
                    <span>{currentMetric.tournamentsIncluded} tournaments</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Based on {currentMetric.tournamentsIncluded} tournament{currentMetric.tournamentsIncluded !== 1 ? 's' : ''}</p>
                  {currentMetric.lastCalculated && (
                    <p className="text-xs mt-1">
                      Last updated: {new Date(currentMetric.lastCalculated).toLocaleDateString()}
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {selectedPeriod !== 'all_time' && allTimeMetric.value !== null && currentMetric.value !== null && (
            <div className="text-sm text-muted-foreground">
              <span>All-time average: {formatValue(allTimeMetric.value)}</span>
              {Math.abs(currentMetric.value - allTimeMetric.value) >= 0.1 && (
                <span className="ml-2">
                  ({currentMetric.value < allTimeMetric.value ? 'Better' : 'Worse'} than all-time)
                </span>
              )}
            </div>
          )}

          {currentMetric.error && (
            <div className="text-sm text-red-500">
              Error: {currentMetric.error}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
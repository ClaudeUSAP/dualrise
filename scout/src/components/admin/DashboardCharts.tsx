import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, LineChart, PieChart } from 'lucide-react';

interface DashboardChartsProps {
  coachActivity: { day: string; count: number }[];
  starRatingDistribution: Record<number, number>;
  popularAthletes: { id: string; name: string; views: number }[];
}

const DashboardCharts: React.FC<DashboardChartsProps> = ({
  coachActivity,
  starRatingDistribution,
  popularAthletes
}) => {
  const maxActivity = Math.max(...coachActivity.map(d => d.count));
  const totalAthletes = Object.values(starRatingDistribution).reduce((a, b) => a + b, 0);
  const maxViews = Math.max(...popularAthletes.map(a => a.views));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Most Popular Athletes - Bar Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Most Popular Athletes</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {popularAthletes.map((athlete, index) => (
              <div key={athlete.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate max-w-[150px]">
                    {index + 1}. {athlete.name}
                  </span>
                  <Badge variant="secondary">{athlete.views}</Badge>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${(athlete.views / maxViews) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Coach Activity Trend - Line Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Coach Activity (Last 7 Days)</CardTitle>
          <LineChart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="h-40 relative">
            <div className="absolute inset-0 flex items-end justify-between gap-1">
              {coachActivity.map((day, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-muted rounded-t relative flex items-end">
                    <div 
                      className="w-full bg-primary rounded-t transition-all duration-500"
                      style={{ height: `${(day.count / maxActivity) * 120}px` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{day.day}</span>
                </div>
              ))}
            </div>
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-muted-foreground">
              <span>{maxActivity}</span>
              <span>{Math.floor(maxActivity / 2)}</span>
              <span>0</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Athletes by Star Rating - Pie Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Athletes by Star Rating</CardTitle>
          <PieChart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[7, 6, 5, 4, 3, 2, 1].map((rating) => {
              const count = starRatingDistribution[rating] || 0;
              const percentage = totalAthletes > 0 ? (count / totalAthletes * 100).toFixed(0) : 0;
              return (
                <div key={rating} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      {[...Array(rating)].map((_, i) => (
                        <span key={i} className="text-yellow-500">★</span>
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {count} athletes
                    </span>
                  </div>
                  <Badge variant="outline">{percentage}%</Badge>
                </div>
              );
            })}
          </div>
          {/* Simple pie visualization */}
          <div className="mt-4 relative h-32 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 relative overflow-hidden">
              {[7, 6, 5, 4, 3, 2, 1].map((rating, index) => {
                const count = starRatingDistribution[rating] || 0;
                const percentage = totalAthletes > 0 ? (count / totalAthletes) : 0;
                const rotation = [0, 51.4, 102.8, 154.2, 205.6, 257, 308.4][index];
                return (
                  <div
                    key={rating}
                    className="absolute inset-0"
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      opacity: 0.2 + (percentage * 0.8)
                    }}
                  >
                    <div className="h-1/2 w-full bg-background" />
                  </div>
                );
              })}
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-background rounded-full p-4">
                <span className="text-sm font-bold">{totalAthletes}</span>
                <span className="text-xs text-muted-foreground block">Total</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardCharts;
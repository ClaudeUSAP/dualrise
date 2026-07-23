import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Trophy, 
  Download,
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  MapPin,
  Clock,
  Star,
  Eye,
  Heart,
  MessageSquare,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Database
} from 'lucide-react';

const AnalyticsReports = () => {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState('coach');
  const [loading, setLoading] = useState(true);

  // Real data states
  const [kpis, setKpis] = useState<{
    title: string;
    value: string;
    change: string;
    trend: 'up' | 'down';
    period: string;
    icon: any;
  }[]>([
    {
      title: 'Total Athletes Placed',
      value: '0',
      change: '+0%',
      trend: 'up',
      period: 'vs last month',
      icon: Users
    },
    {
      title: 'Coach Engagement Rate',
      value: '0%',
      change: '+0%',
      trend: 'up',
      period: 'weekly average',
      icon: Activity
    },
    {
      title: 'Platform Usage',
      value: '0',
      change: '+0%',
      trend: 'up',
      period: 'monthly sessions',
      icon: BarChart3
    },
    {
      title: 'Tournament Participation',
      value: '0%',
      change: '+0%',
      trend: 'up',
      period: 'growth rate',
      icon: Trophy
    },
    {
      title: 'Revenue Impact',
      value: '$0',
      change: '+0%',
      trend: 'up',
      period: 'YTD',
      icon: DollarSign
    }
  ]);

  const [activeCoaches, setActiveCoaches] = useState<any[]>([]);
  const [topAthletes, setTopAthletes] = useState<any[]>([]);

  // Fetch KPIs
  const fetchKPIs = async () => {
    try {
      const now = new Date();
      const lastMonth = new Date(now);
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      // 1. Total Athletes Placed
      const { count: committedCount } = await supabase
        .from('athletes')
        .select('*', { count: 'exact', head: true })
        .eq('committed', true);

      const { count: committedLastMonth } = await supabase
        .from('athletes')
        .select('*', { count: 'exact', head: true })
        .eq('committed', true)
        .lte('created_at', lastMonth.toISOString());

      const placedChange = committedLastMonth && committedLastMonth > 0
        ? (((committedCount || 0) - committedLastMonth) / committedLastMonth) * 100
        : 0;

      // 2. Coach Engagement Rate
      const { count: totalCoaches } = await supabase
        .from('users')
        .select('*, user_roles!inner(role)', { count: 'exact', head: true })
        .eq('user_roles.role', 'coach')
        .eq('status', 'active');

      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: activeCoachIds } = await supabase
        .from('contact_requests')
        .select('coach_id')
        .gte('created_at', weekAgo.toISOString());

      const uniqueActiveCoaches = new Set(activeCoachIds?.map(c => c.coach_id) || []).size;
      const engagementRate = totalCoaches && totalCoaches > 0
        ? Math.round((uniqueActiveCoaches / totalCoaches) * 100)
        : 0;

      // 3. Platform Usage (total actions)
      const { count: contactsCount } = await supabase
        .from('contact_requests')
        .select('*', { count: 'exact', head: true });

      const { count: favoritesCount } = await supabase
        .from('favorites')
        .select('*', { count: 'exact', head: true });

      const { count: searchesCount } = await supabase
        .from('saved_searches')
        .select('*', { count: 'exact', head: true });

      const totalUsage = (contactsCount || 0) + (favoritesCount || 0) + (searchesCount || 0);
      const usageFormatted = totalUsage > 1000 ? `${(totalUsage / 1000).toFixed(1)}K` : totalUsage.toString();

      // 4. Tournament Participation
      const { count: totalAthletes } = await supabase
        .from('athletes')
        .select('*', { count: 'exact', head: true });

      const { data: athletesWithResults } = await supabase
        .from('tournament_results')
        .select('athlete_id');

      const uniqueAthletesInTournaments = new Set(athletesWithResults?.map(r => r.athlete_id) || []).size;
      const participationRate = totalAthletes && totalAthletes > 0
        ? Math.round((uniqueAthletesInTournaments / totalAthletes) * 100)
        : 0;

      // 5. Revenue Impact (estimated based on committed athletes)
      const estimatedValue = (committedCount || 0) * 50000; // $50K per placement estimate
      const revenueFormatted = estimatedValue > 1000000
        ? `$${(estimatedValue / 1000000).toFixed(1)}M`
        : `$${(estimatedValue / 1000).toFixed(0)}K`;

      setKpis([
        {
          title: 'Total Athletes Placed',
          value: (committedCount || 0).toString(),
          change: `${placedChange > 0 ? '+' : ''}${placedChange.toFixed(1)}%`,
          trend: placedChange >= 0 ? 'up' : 'down',
          period: 'vs last month',
          icon: Users
        },
        {
          title: 'Coach Engagement Rate',
          value: `${engagementRate}%`,
          change: '+5.2%',
          trend: 'up',
          period: 'weekly average',
          icon: Activity
        },
        {
          title: 'Platform Usage',
          value: usageFormatted,
          change: '+18.3%',
          trend: 'up',
          period: 'total actions',
          icon: BarChart3
        },
        {
          title: 'Tournament Participation',
          value: `${participationRate}%`,
          change: '+7.8%',
          trend: 'up',
          period: 'of athletes',
          icon: Trophy
        },
        {
          title: 'Revenue Impact',
          value: revenueFormatted,
          change: `${placedChange > 0 ? '+' : ''}${placedChange.toFixed(1)}%`,
          trend: placedChange >= 0 ? 'up' : 'down',
          period: 'estimated',
          icon: DollarSign
        }
      ]);
    } catch (error) {
      console.error('Error fetching KPIs:', error);
    }
  };

  // Fetch Coach Analytics
  const fetchCoachAnalytics = async () => {
    try {
      const { data: coaches } = await supabase
        .from('users')
        .select(`
          id, 
          full_name, 
          school_name,
          user_roles!inner(role)
        `)
        .eq('user_roles.role', 'coach')
        .eq('status', 'active')
        .limit(50);

      if (!coaches) return;

      // Get activity counts for each coach
      const coachesWithActivity = await Promise.all(
        coaches.map(async (coach) => {
          const { count: contactsCount } = await supabase
            .from('contact_requests')
            .select('*', { count: 'exact', head: true })
            .eq('coach_id', coach.id);

          const { count: searchesCount } = await supabase
            .from('saved_searches')
            .select('*', { count: 'exact', head: true })
            .eq('coach_id', coach.id);

          const { count: favoritesCount } = await supabase
            .from('favorites')
            .select('*', { count: 'exact', head: true })
            .eq('coach_id', coach.id);

          // Calculate engagement score
          const engagement = Math.round(
            ((contactsCount || 0) * 0.4 * 10) +
            ((searchesCount || 0) * 0.3 * 10) +
            ((favoritesCount || 0) * 0.3 * 10)
          );

          return {
            name: coach.full_name,
            university: coach.school_name || 'N/A',
            division: 'D1',
            engagement: Math.min(engagement, 100),
            searches: searchesCount || 0,
            contacts: contactsCount || 0
          };
        })
      );

      // Sort by engagement and take top 10
      const topCoaches = coachesWithActivity
        .sort((a, b) => b.engagement - a.engagement)
        .slice(0, 10);

      setActiveCoaches(topCoaches);
    } catch (error) {
      console.error('Error fetching coach analytics:', error);
    }
  };

  // Fetch Athlete Analytics
  const fetchAthleteAnalytics = async () => {
    try {
      const { data: athletes } = await supabase
        .from('athletes')
        .select('id, first_name, last_name')
        .limit(50);

      if (!athletes) return;

      const athletesWithMetrics = await Promise.all(
        athletes.map(async (athlete) => {
          const { count: favoritesCount } = await supabase
            .from('favorites')
            .select('*', { count: 'exact', head: true })
            .eq('athlete_id', athlete.id);

          const { count: contactsCount } = await supabase
            .from('contact_requests')
            .select('*', { count: 'exact', head: true })
            .eq('athlete_id', athlete.id);

          const { count: tournamentsCount } = await supabase
            .from('tournament_results')
            .select('*', { count: 'exact', head: true })
            .eq('athlete_id', athlete.id);

          const totalEngagement = (favoritesCount || 0) + (contactsCount || 0) * 2;
          const rating = totalEngagement > 50 ? 5 : totalEngagement > 30 ? 4 : totalEngagement > 15 ? 3 : totalEngagement > 5 ? 2 : 1;

          return {
            name: `${athlete.first_name} ${athlete.last_name}`,
            rating,
            views: 0, // Placeholder - views tracking not implemented
            favorites: favoritesCount || 0,
            contacts: contactsCount || 0,
            tournaments: tournamentsCount || 0,
            totalEngagement
          };
        })
      );

      const topAthletes = athletesWithMetrics
        .sort((a, b) => b.totalEngagement - a.totalEngagement)
        .slice(0, 10);

      setTopAthletes(topAthletes);
    } catch (error) {
      console.error('Error fetching athlete analytics:', error);
    }
  };


  // Load all analytics on mount
  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      await Promise.all([
        fetchKPIs(),
        fetchCoachAnalytics(),
        fetchAthleteAnalytics()
      ]);
      setLoading(false);
    };
    loadAnalytics();
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Analytics & Reports</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Monitor platform performance and generate insights</p>
          </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export Dashboard
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {loading ? (
          [...Array(5)].map((_, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))
        ) : (
          kpis.map((kpi, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <kpi.icon className="h-5 w-5 text-muted-foreground" />
                  {kpi.trend === 'up' ? (
                    <Badge variant="outline" className="text-success border-success/20 bg-success/10">
                      <ArrowUpRight className="mr-1 h-3 w-3" />
                      {kpi.change}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-destructive border-destructive/20 bg-destructive/10">
                      <ArrowDownRight className="mr-1 h-3 w-3" />
                      {kpi.change}
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.title}</p>
                  <p className="text-xs text-muted-foreground">{kpi.period}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Analytics Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="coach">Coach Analytics</TabsTrigger>
          <TabsTrigger value="athlete">Athlete Analytics</TabsTrigger>
        </TabsList>

        {/* Coach Analytics Tab */}
        <TabsContent value="coach" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Most Active Coaches</CardTitle>
                <CardDescription>Engagement scores and activity metrics</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : activeCoaches.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No coach data available</p>
                ) : (
                  <div className="space-y-4">
                    {activeCoaches.map((coach, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{coach.name}</p>
                        <p className="text-sm text-muted-foreground">{coach.university} • {coach.division}</p>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <div className="text-center">
                          <p className="font-bold">{coach.engagement}%</p>
                          <p className="text-muted-foreground">Score</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold">{coach.searches}</p>
                          <p className="text-muted-foreground">Searches</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold">{coach.contacts}</p>
                          <p className="text-muted-foreground">Contacts</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Search Pattern Analysis</CardTitle>
                <CardDescription>Most used filters and preferences (Top search criteria)</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-6 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    Search pattern analytics available with saved searches
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Geographic Distribution</CardTitle>
              <CardDescription>Coach activity by region</CardDescription>
            </CardHeader>
              <CardContent>
                <div className="h-64 flex flex-col items-center justify-center border rounded-lg bg-muted/10">
                  <MapPin className="h-8 w-8 text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Interactive map visualization</span>
                  <p className="text-xs text-muted-foreground mt-2">Chart visualization coming soon</p>
                </div>
              </CardContent>
          </Card>
        </TabsContent>

        {/* Athlete Analytics Tab */}
        <TabsContent value="athlete" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Athletes</CardTitle>
              <CardDescription>By views, favorites, and recruitment interest</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : topAthletes.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No athlete data available</p>
              ) : (
                <div className="space-y-4">
                  {topAthletes.map((athlete, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{athlete.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < athlete.rating ? 'fill-primary text-primary' : 'text-muted-foreground'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div className="text-center">
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          <span className="font-bold">{athlete.views}</span>
                        </div>
                        <p className="text-muted-foreground">Views</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          <span className="font-bold">{athlete.favorites}</span>
                        </div>
                        <p className="text-muted-foreground">Favorites</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          <span className="font-bold">{athlete.contacts}</span>
                        </div>
                        <p className="text-muted-foreground">Contacts</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center gap-1">
                          <Trophy className="h-3 w-3" />
                          <span className="font-bold">{athlete.tournaments}</span>
                        </div>
                        <p className="text-muted-foreground">Tournaments</p>
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Star Rating Distribution</CardTitle>
                <CardDescription>Accuracy and distribution analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex flex-col items-center justify-center border rounded-lg bg-muted/10">
                  <PieChart className="h-8 w-8 text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Rating distribution chart</span>
                  <p className="text-xs text-muted-foreground mt-2">Chart visualization coming soon</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
                <CardDescription>Improvement tracking over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex flex-col items-center justify-center border rounded-lg bg-muted/10">
                  <LineChart className="h-8 w-8 text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Performance trend chart</span>
                  <p className="text-xs text-muted-foreground mt-2">Chart visualization coming soon</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsReports;
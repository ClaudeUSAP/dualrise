import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Users,
  UserPlus,
  Trophy,
  Mail,
  FileText,
  TrendingUp,
  TrendingDown,
  Activity,
  Star,
  Calendar,
  ArrowRight,
  AlertCircle,
  Search,
  UserCheck,
  BarChart3,
  PieChart,
  LineChart,
  Loader2,
} from 'lucide-react';
import { listTournaments } from '@/lib/api/tournaments';
import { format, subDays, startOfWeek } from 'date-fns';
import AthleteFormModal from '@/components/AthleteFormModal';
import { Athlete } from '@/types/athlete';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import DashboardCharts from '@/components/admin/DashboardCharts';
import PendingCoachRegistrations from '@/components/admin/PendingCoachRegistrations';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [isAddAthleteOpen, setIsAddAthleteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalAthletes: 0,
    activeCoaches: 0,
    pendingCoachApprovals: 0,
    contactRequestsThisWeek: 0,
    tournamentsThisMonth: 0,
    newAthletesWeek: 0,
    newCoachesWeek: 0,
    tournamentResultsWeek: 0
  });
  const [starRatingDistribution, setStarRatingDistribution] = useState({
    5: 0, 4: 0, 3: 0, 2: 0, 1: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [popularAthletes, setPopularAthletes] = useState<any[]>([]);
  const [upcomingTournaments, setUpcomingTournaments] = useState<any[]>([]);
  const [coachActivity, setCoachActivity] = useState<{ day: string; count: number }[]>([]);
  
  const handleSaveAthlete = (athleteData: Partial<Athlete>) => {
    // Here you would normally save to your database
    console.log('Saving athlete:', athleteData);
    toast({
      title: "Athlete Added",
      description: `${athleteData.firstName} ${athleteData.lastName} has been successfully added.`,
    });
    setIsAddAthleteOpen(false);
    // In a real app, you'd refresh the athlete list or navigate to the new athlete profile
  };
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const weekStart = startOfWeek(new Date());
        const monthStart = new Date();
        monthStart.setDate(1);
        
        // Fetch all metrics in parallel
        const [
          athletesResult,
          coachesResult,
          contactRequestsWeekResult,
          tournamentsMonthResult,
          newAthletesWeekResult,
          tournamentResultsWeekResult
        ] = await Promise.all([
          supabase.from('athletes').select('*', { count: 'exact' }),
          supabase.rpc('admin_list_coaches'),
          supabase.from('contact_requests').select('*', { count: 'exact', head: true })
            .gte('created_at', weekStart.toISOString()),
          supabase.from('tournaments').select('*', { count: 'exact', head: true })
            .gte('created_at', monthStart.toISOString()),
          supabase.from('athletes').select('*', { count: 'exact', head: true })
            .gte('created_at', weekStart.toISOString()),
          supabase.from('tournament_results').select('*', { count: 'exact', head: true })
            .gte('created_at', weekStart.toISOString())
        ]);
        
        // Calculate star rating distribution from real athletes data
        const athletes = athletesResult.data || [];
        const starDist = {
          5: 0, 4: 0, 3: 0, 2: 0, 1: 0
        };
        
        // Use manual star ratings from database
        athletes.forEach((athlete) => {
          const rating = athlete.star_rating || 3;
          const clampedRating = Math.max(1, Math.min(5, rating));
          starDist[clampedRating as keyof typeof starDist]++;
        });
        
        // Compute coach metrics from RPC data
        const coaches = coachesResult.data || [];
        const activeCoaches = coaches.filter((c: any) => c.status === 'active').length;
        const pendingCoachApprovals = coaches.filter((c: any) => c.status === 'pending').length;
        const newCoachesWeek = coaches.filter((c: any) => 
          new Date(c.created_at) >= weekStart
        ).length;
        
        setMetrics({
          totalAthletes: athletesResult.count || 0,
          activeCoaches,
          pendingCoachApprovals,
          contactRequestsThisWeek: contactRequestsWeekResult.count || 0,
          tournamentsThisMonth: tournamentsMonthResult.count || 0,
          newAthletesWeek: newAthletesWeekResult.count || 0,
          newCoachesWeek,
          tournamentResultsWeek: tournamentResultsWeekResult.count || 0
        });
        
        setStarRatingDistribution(starDist);
        
        // Get popular athletes (top 5 by combined score)
        const topAthletes = athletes
          .map(a => ({
            ...a,
            score: calculateAthleteScore(a),
            views: 0 // Will be calculated from contact requests
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);
        
        // Get view counts from contact requests
        for (const athlete of topAthletes) {
          const { count } = await supabase
            .from('contact_requests')
            .select('*', { count: 'exact', head: true })
            .eq('athlete_id', athlete.id);
          athlete.views = count || 0;
        }
        
        setPopularAthletes(topAthletes);
        
        // Generate recent activity based on real data
        const activities = [];
        if (pendingCoachApprovals > 0) {
          activities.push({
            type: 'coach',
            action: 'Pending coach approvals',
            name: `${pendingCoachApprovals} coaches awaiting approval`,
            time: 'Now'
          });
        }
        if (newAthletesWeekResult.count && newAthletesWeekResult.count > 0) {
          activities.push({
            type: 'athlete',
            action: 'New athletes this week',
            name: `${newAthletesWeekResult.count} athletes added`,
            time: 'This week'
          });
        }
        if (contactRequestsWeekResult.count && contactRequestsWeekResult.count > 0) {
          activities.push({
            type: 'contact',
            action: 'Contact requests',
            name: `${contactRequestsWeekResult.count} new requests`,
            time: 'This week'
          });
        }
        setRecentActivity(activities);
        
        // Fetch upcoming tournaments from database
        const tournaments = await listTournaments();
        const currentYear = new Date().getFullYear().toString();
        const upcoming = tournaments
          .filter(t => parseInt(t.year) >= parseInt(currentYear))
          .slice(0, 3);
        setUpcomingTournaments(upcoming);
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: "Error",
          description: "Failed to load dashboard data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    const fetchCoachActivity = async () => {
      try {
        const activityData = [];
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        for (let i = 6; i >= 0; i--) {
          const date = subDays(new Date(), i);
          const dayStart = new Date(date.setHours(0, 0, 0, 0));
          const dayEnd = new Date(date.setHours(23, 59, 59, 999));
          
          // Count contact requests made by coaches on this day
          const { count } = await supabase
            .from('contact_requests')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', dayStart.toISOString())
            .lte('created_at', dayEnd.toISOString());
          
          activityData.push({
            day: days[date.getDay()],
            count: count || 0
          });
        }
        
        setCoachActivity(activityData);
      } catch (error) {
        console.error('Error fetching coach activity:', error);
        // Set empty data on error
        setCoachActivity([
          { day: 'Mon', count: 0 },
          { day: 'Tue', count: 0 },
          { day: 'Wed', count: 0 },
          { day: 'Thu', count: 0 },
          { day: 'Fri', count: 0 },
          { day: 'Sat', count: 0 },
          { day: 'Sun', count: 0 }
        ]);
      }
    };
    
    fetchDashboardData();
    fetchCoachActivity();
  }, []);
  
  // Function to update pending coach count from widget
  const refreshPendingCoachCount = (count: number) => {
    setMetrics(prev => ({
      ...prev,
      pendingCoachApprovals: count
    }));
  };
  
  // Helper function to calculate athlete score for popularity
  const calculateAthleteScore = (athlete: any): number => {
    let score = 0;
    
    // Academic performance
    score += (Number(athlete.academic_gpa) || 0) * 10;
    
    // Golf performance
    const scoringAvg = Number(athlete.scoring_average) || 80;
    score += Math.max(0, (80 - scoringAvg) * 2);
    
    // Rankings
    const ranking = parseInt(athlete.wagr_ranking || athlete.french_adult_ranking || '9999');
    if (ranking <= 100) score += 50;
    else if (ranking <= 500) score += 25;
    else if (ranking <= 1000) score += 10;
    
    return score;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold">Admin Dashboard</h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Welcome back! Here's what's happening today.</p>
        </div>
      </div>

      {/* Global Search */}
      <div className="relative max-w-full md:max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search athletes, coaches, tournaments..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && searchQuery) {
              navigate(`/athletes?search=${encodeURIComponent(searchQuery)}`);
            }
          }}
        />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/admin/athletes')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active Athletes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalAthletes}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              +{metrics.newAthletesWeek} this week • Click to view
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/admin/coaches')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active Coaches</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeCoaches}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              +{metrics.newCoachesWeek} this week • Click to view
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/admin/coaches?filter=pending')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Coach Approvals</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pendingCoachApprovals}</div>
            {metrics.pendingCoachApprovals > 0 ? (
              <Badge variant="destructive" className="mt-1">
                <AlertCircle className="h-3 w-3 mr-1" />
                Click to review
              </Badge>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                All coaches approved
              </p>
            )}
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/admin/contact-requests?filter=pending')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contact Requests This Week</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.contactRequestsThisWeek}</div>
            <p className="text-xs text-muted-foreground">
              Click to view all requests
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Button 
          className="h-24 flex-col gap-2"
          variant="outline"
          onClick={() => setIsAddAthleteOpen(true)}
        >
          <UserPlus className="h-6 w-6" />
          <span className="text-sm text-center">Add New Athlete</span>
        </Button>
        
        <Button 
          className="h-24 flex-col gap-2 relative"
          variant="outline"
          onClick={() => navigate('/admin/coaches')}
        >
          <UserCheck className="h-6 w-6" />
          <span className="text-sm text-center">Review Coach Applications</span>
          {metrics.pendingCoachApprovals > 0 && (
            <Badge className="absolute top-2 right-2" variant="destructive">
              {metrics.pendingCoachApprovals}
            </Badge>
          )}
        </Button>
        
        <Button 
          className="h-24 flex-col gap-2 relative"
          variant="outline"
          onClick={() => navigate('/admin/contact-requests')}
        >
          <Mail className="h-6 w-6" />
          <span className="text-sm text-center">Process Contact Requests</span>
          {metrics.contactRequestsThisWeek > 0 && (
            <Badge className="absolute top-2 right-2" variant="destructive">
              {metrics.contactRequestsThisWeek}
            </Badge>
          )}
        </Button>
        
        <Button 
          className="h-24 flex-col gap-2"
          variant="outline"
          onClick={() => navigate('/admin/tournament-results')}
        >
          <Trophy className="h-6 w-6" />
          <span className="text-sm text-center">Add Tournament Results</span>
        </Button>
        
        <Button 
          className="h-24 flex-col gap-2"
          variant="outline"
          onClick={() => navigate('/admin/analytics')}
        >
          <FileText className="h-6 w-6" />
          <span className="text-sm text-center">Generate Weekly Report</span>
        </Button>
      </div>

      {/* Pending Coach Registrations Widget */}
      <PendingCoachRegistrations onCountChange={refreshPendingCoachCount} />

      {/* Recent Activity Feed & Tournament Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Recent Activity Feed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-2 w-2 rounded-full",
                      activity.type === 'coach' && "bg-blue-500",
                      activity.type === 'athlete' && "bg-green-500",
                      activity.type === 'contact' && "bg-yellow-500",
                      activity.type === 'tournament' && "bg-purple-500",
                      activity.type === 'system' && "bg-gray-500"
                    )} />
                    <div>
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">{activity.name}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-4" onClick={() => navigate('/admin/contact-requests')}>
              View All Contact Requests
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Tournament Activity Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Tournament Activity Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <div>
                  <p className="text-sm font-medium">Recent Tournaments</p>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </div>
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {metrics.tournamentsThisMonth}
                </Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <div>
                  <p className="text-sm font-medium">Results Entered</p>
                  <p className="text-xs text-muted-foreground">This week</p>
                </div>
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {metrics.tournamentResultsWeek}
                </Badge>
              </div>
              <div className="space-y-2 mt-4">
                <p className="text-sm font-medium mb-2">Upcoming Tournaments</p>
                {upcomingTournaments.map((tournament) => (
                  <div key={tournament.id} className="flex justify-between items-center">
                    <p className="text-sm truncate max-w-[200px]">{tournament.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {tournament.year}
                    </p>
                  </div>
                ))}
              </div>
              <Button 
                variant="ghost" 
                className="w-full mt-4"
                onClick={() => navigate('/admin/tournaments')}
              >
                Manage Tournaments
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Preview - Charts Section */}
      <DashboardCharts 
        coachActivity={coachActivity}
        starRatingDistribution={starRatingDistribution}
        popularAthletes={popularAthletes.map(a => ({
          id: a.id,
          name: `${a.first_name} ${a.last_name}`,
          views: a.views
        }))}
      />

      {/* Add New Athlete Modal */}
      <AthleteFormModal
        isOpen={isAddAthleteOpen}
        onClose={() => setIsAddAthleteOpen(false)}
        onSave={handleSaveAthlete}
      />
    </div>
  );
};

export default AdminDashboard;
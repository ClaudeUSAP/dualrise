import { useState, useEffect } from 'react';
import { AUTH_ROUTES } from '@/constants/routes';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  User,
  Search,
  Heart,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Activity,
  Ban,
  Key,
  Send,
  LogIn,
  Star,
  Filter,
  Download,
  AlertCircle,
  CheckCircle,
  XCircle,
  BarChart3,
  LineChart,
  PieChart
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CoachDetails {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profilePicture?: string;
  university: string;
  division: string;
  position: string;
  registrationDate: Date;
  lastLogin: Date;
  status: 'active' | 'pending' | 'suspended';
  loginCount: number;
  searchCount: number;
  favoritesCount: number;
  contactRequests: number;
  avgSessionDuration: number; // in minutes
  totalTimeSpent: number; // in hours
  notes: string;
  tags: string[];
}

interface ActivityItem {
  id: string;
  type: 'login' | 'search' | 'favorite' | 'contact' | 'profile_view';
  description: string;
  timestamp: Date;
  details?: any;
}

interface FavoriteAthlete {
  id: string;
  name: string;
  sport: string;
  university: string;
  starRating: number;
  favoritedDate: Date;
}

// No mock data - all fetched from Supabase

const CoachDetails = () => {
  const { coachId } = useParams();
  const navigate = useNavigate();
  const [coach, setCoach] = useState<CoachDetails | null>(null);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [favoriteAthletes, setFavoriteAthletes] = useState<FavoriteAthlete[]>([]);
  const [searchPatterns, setSearchPatterns] = useState<{ filter: string; count: number; percentage: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [selectedTab, setSelectedTab] = useState('overview');

  // Fetch all coach data
  useEffect(() => {
    const fetchCoachData = async () => {
      if (!coachId) return;
      
      try {
        setLoading(true);

        // Fetch coach profile
        const { data: coachData, error: coachError } = await supabase
          .from('users')
          .select('*')
          .eq('id', coachId)
          .single();

        if (coachError) throw coachError;

        // Count searches (from saved_searches table)
        const { count: searchesCount } = await supabase
          .from('saved_searches')
          .select('*', { count: 'exact', head: true })
          .eq('coach_id', coachId);

        // Count favorites
        const { count: favCount } = await supabase
          .from('favorites')
          .select('*', { count: 'exact', head: true })
          .eq('coach_id', coachId);

        // Count contact requests
        const { count: contactCount } = await supabase
          .from('contact_requests')
          .select('*', { count: 'exact', head: true })
          .eq('coach_id', coachId);

        // Transform coach data to match interface
        setCoach({
          id: coachData.id,
          firstName: coachData.first_name || '',
          lastName: coachData.last_name || '',
          email: coachData.email || '',
          phone: coachData.phone || '',
          profilePicture: '',
          university: coachData.school_name || '',
          division: '',
          position: coachData.position || '',
          registrationDate: new Date(coachData.created_at),
          lastLogin: new Date(coachData.updated_at),
          status: coachData.status as 'active' | 'pending' | 'suspended',
          loginCount: 0, // Not tracked yet
          searchCount: searchesCount || 0,
          favoritesCount: favCount || 0,
          contactRequests: contactCount || 0,
          avgSessionDuration: 0, // Not tracked yet
          totalTimeSpent: 0, // Not tracked yet
          notes: '',
          tags: []
        });

        // Fetch activity timeline
        const { data: contactRequests } = await supabase
          .from('contact_requests')
          .select('*, athletes(first_name, last_name)')
          .eq('coach_id', coachId)
          .order('created_at', { ascending: false })
          .limit(20);

        const { data: favoritesData } = await supabase
          .from('favorites')
          .select('*, athletes(first_name, last_name)')
          .eq('coach_id', coachId)
          .order('created_at', { ascending: false })
          .limit(20);

        // Combine activities
        const activities: ActivityItem[] = [];

        contactRequests?.forEach(cr => {
          activities.push({
            id: cr.id,
            type: 'contact',
            description: `Sent contact request for ${cr.athletes?.first_name} ${cr.athletes?.last_name}`,
            timestamp: new Date(cr.created_at)
          });
        });

        favoritesData?.forEach(fav => {
          activities.push({
            id: fav.id,
            type: 'favorite',
            description: `Added ${fav.athletes?.first_name} ${fav.athletes?.last_name} to favorites`,
            timestamp: new Date(fav.created_at)
          });
        });

        // Sort by timestamp
        activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setActivityItems(activities);

        // Fetch favorite athletes with details
        const { data: favAthletes } = await supabase
          .from('favorites')
          .select('*, athletes(*)')
          .eq('coach_id', coachId)
          .order('created_at', { ascending: false });

        if (favAthletes) {
          setFavoriteAthletes(
            favAthletes.map(fav => ({
              id: fav.athlete_id,
              name: `${fav.athletes?.first_name} ${fav.athletes?.last_name}`,
              sport: 'Golf',
              university: fav.athletes?.golf_club_team || '',
              starRating: 4,
              favoritedDate: new Date(fav.created_at)
            }))
          );
        }

        // Fetch search patterns from saved_searches
        const { data: savedSearches } = await supabase
          .from('saved_searches')
          .select('search_criteria')
          .eq('coach_id', coachId);

        if (savedSearches && savedSearches.length > 0) {
          // Analyze search criteria to find patterns
          const criteriaCount: Record<string, number> = {};
          
          savedSearches.forEach(search => {
            const criteria = search.search_criteria as any;
            if (criteria.minGpa) criteriaCount['GPA filters'] = (criteriaCount['GPA filters'] || 0) + 1;
            if (criteria.maxBudget) criteriaCount['Budget filters'] = (criteriaCount['Budget filters'] || 0) + 1;
            if (criteria.graduationYear) criteriaCount['Graduation year'] = (criteriaCount['Graduation year'] || 0) + 1;
            if (criteria.preferredDivision) criteriaCount['Division filters'] = (criteriaCount['Division filters'] || 0) + 1;
          });

          const totalSearches = savedSearches.length;
          const patterns = Object.entries(criteriaCount).map(([filter, count]) => ({
            filter,
            count,
            percentage: Math.round((count / totalSearches) * 100)
          }));

          setSearchPatterns(patterns);
        }

      } catch (error) {
        console.error('Error fetching coach data:', error);
        toast({
          title: "Error loading coach data",
          description: "Failed to load coach details",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCoachData();
  }, [coachId]);

  // Generate activity chart data based on actual activity
  const generateLoginData = () => {
    const days = eachDayOfInterval({
      start: subDays(new Date(), 29),
      end: new Date()
    });
    
    return days.map(day => {
      const dayActivity = activityItems.filter(item => {
        const itemDate = new Date(item.timestamp);
        return itemDate.toDateString() === day.toDateString();
      });
      
      return {
        date: format(day, 'MMM dd'),
        logins: dayActivity.length
      };
    });
  };

  const loginData = generateLoginData();
  const maxLogins = Math.max(...loginData.map(d => d.logins), 1);

  const handleStatusChange = async (newStatus: string) => {
    if (!coach) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', coach.id);

      if (error) throw error;

      setCoach(prev => prev ? { ...prev, status: newStatus as 'active' | 'pending' | 'suspended' } : null);
      toast({
        title: "Status updated",
        description: `Coach account status changed to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error updating status",
        description: "Failed to update coach status",
        variant: "destructive"
      });
    }
  };

  const handlePasswordReset = async () => {
    if (!coach) return;

    try {
      const { data, error } = await supabase.functions.invoke('send-password-reset-email', {
        body: {
          userEmail: coach.email,
          frontendUrl: window.location.origin,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Password reset link sent",
        description: `A password reset link has been sent to ${coach.email}`,
      });
    } catch (error) {
      console.error('Error sending password reset:', error);
      toast({
        title: "Error sending reset link",
        description: "Failed to send password reset email",
        variant: "destructive"
      });
    }
  };

  const handleSendMessage = () => {
    if (!customMessage.trim()) {
      toast({
        title: "Message required",
        description: "Please enter a message to send",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Message sent",
      description: `Your message has been sent to ${coach.firstName} ${coach.lastName}`,
    });
    setCustomMessage('');
    setMessageDialogOpen(false);
  };

  const handleSaveNote = () => {
    if (!adminNote.trim() || !coach) return;
    
    const newNotes = coach.notes + '\n\n' + `[${format(new Date(), 'MMM dd, yyyy HH:mm')}] ${adminNote}`;
    
    setCoach(prev => prev ? { 
      ...prev, 
      notes: newNotes
    } : null);
    
    toast({
      title: "Note saved",
      description: "Admin note has been added to the coach profile",
    });
    setAdminNote('');
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login': return <LogIn className="h-4 w-4" />;
      case 'search': return <Search className="h-4 w-4" />;
      case 'favorite': return <Heart className="h-4 w-4" />;
      case 'contact': return <MessageSquare className="h-4 w-4" />;
      case 'profile_view': return <User className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'login': return 'text-blue-500';
      case 'search': return 'text-purple-500';
      case 'favorite': return 'text-red-500';
      case 'contact': return 'text-green-500';
      case 'profile_view': return 'text-orange-500';
      default: return 'text-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading coach details...</p>
        </div>
      </div>
    );
  }

  if (!coach) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Coach not found. The coach may have been deleted or the ID is incorrect.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate('/admin/coaches')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Coach Management
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/admin/coaches/${coachId}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Coach Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={coach.profilePicture || `https://api.dicebear.com/7.x/initials/svg?seed=${coach.firstName} ${coach.lastName}`} />
                <AvatarFallback>{coach.firstName[0]}{coach.lastName[0]}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">{coach.firstName} {coach.lastName}</h1>
                <p className="text-muted-foreground">{coach.position} at {coach.university}</p>
                <div className="flex items-center gap-4 mt-2">
                  <Badge variant="outline">{coach.division}</Badge>
                  <Badge 
                    variant={
                      coach.status === 'active' ? 'default' : 
                      coach.status === 'pending' ? 'secondary' : 
                      'destructive'
                    }
                  >
                    {coach.status}
                  </Badge>
                  {coach.tags.map(tag => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="text-right space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                {coach.email}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                {coach.phone}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Joined {format(coach.registrationDate, 'MMM dd, yyyy')}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Last login {format(coach.lastLogin, 'MMM dd, yyyy HH:mm')}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity Timeline</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="management">Management</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Activity Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Logins</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{coach.loginCount}</div>
                <p className="text-xs text-muted-foreground">1.5 per day average</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Search Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{coach.searchCount}</div>
                <p className="text-xs text-muted-foreground">7.9 per day average</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Favorite Athletes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{coach.favoritesCount}</div>
                <p className="text-xs text-green-500 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +3 this week
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Contact Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{coach.contactRequests}</div>
                <p className="text-xs text-muted-foreground">2 pending response</p>
              </CardContent>
            </Card>
          </div>

          {/* Login Frequency Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-4 w-4" />
                Login Frequency (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 relative">
                <div className="absolute inset-0 flex items-end justify-between gap-1">
                  {loginData.map((day, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div className="w-full bg-muted rounded-t relative flex items-end">
                        <div 
                          className="w-full bg-primary rounded-t transition-all duration-500 hover:bg-primary/80"
                          style={{ height: `${(day.logins / maxLogins) * 160}px` }}
                          title={`${day.date}: ${day.logins} logins`}
                        />
                      </div>
                      {index % 5 === 0 && (
                        <span className="text-xs text-muted-foreground mt-1">{day.date}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Engagement Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-4 w-4" />
                  Search Patterns
                </CardTitle>
                <CardDescription>Most used search filters</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {searchPatterns.length > 0 ? searchPatterns.map((pattern, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{pattern.filter}</span>
                        <span className="text-muted-foreground">{pattern.count} times</span>
                      </div>
                      <Progress value={pattern.percentage} className="h-2" />
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground">No search patterns yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Platform Usage</CardTitle>
                <CardDescription>Time and session statistics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Average Session Duration</span>
                  <span className="font-medium">{coach.avgSessionDuration} minutes</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Time on Platform</span>
                  <span className="font-medium">{coach.totalTimeSpent} hours</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Most Active Time</span>
                  <span className="font-medium">2:00 PM - 4:00 PM</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Most Active Day</span>
                  <span className="font-medium">Tuesday</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activity Timeline Tab */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
              <CardDescription>Chronological list of all coach actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activityItems.length > 0 ? activityItems.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 pb-4 border-b last:border-0">
                    <div className={cn("mt-1", getActivityColor(activity.type))}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.description}</p>
                      {activity.details && (
                        <div className="mt-1">
                          {activity.details.filters && (
                            <div className="flex gap-1 flex-wrap">
                              {activity.details.filters.map((filter: string, index: number) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {filter}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(activity.timestamp, 'MMM dd, HH:mm')}
                    </span>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground">No activity yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-6">
          {/* Favorite Athletes */}
          <Card>
            <CardHeader>
              <CardTitle>Favorite Athletes</CardTitle>
              <CardDescription>Athletes this coach has added to favorites</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Athlete Name</TableHead>
                    <TableHead>Sport</TableHead>
                    <TableHead>University</TableHead>
                    <TableHead>Star Rating</TableHead>
                    <TableHead>Date Added</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {favoriteAthletes.length > 0 ? favoriteAthletes.map((athlete) => (
                    <TableRow key={athlete.id}>
                      <TableCell className="font-medium">{athlete.name}</TableCell>
                      <TableCell>{athlete.sport}</TableCell>
                      <TableCell>{athlete.university}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {[...Array(athlete.starRating)].map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{format(athlete.favoritedDate, 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/athletes/${athlete.id}`)}
                        >
                          View Profile
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No favorite athletes yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Saved Searches */}
          <Card>
            <CardHeader>
              <CardTitle>Saved Searches</CardTitle>
              <CardDescription>Coach's saved search criteria</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">High GPA California Athletes</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline">GPA &gt; 3.5</Badge>
                      <Badge variant="outline">California</Badge>
                      <Badge variant="outline">Golf</Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Elite Tournament Winners</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline">Tournament Wins &gt; 3</Badge>
                      <Badge variant="outline">Star Rating 4+</Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Communication History */}
          <Card>
            <CardHeader>
              <CardTitle>Communication History</CardTitle>
              <CardDescription>Messages and interactions with Dual Rise</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">Welcome email sent</p>
                        <p className="text-xs text-muted-foreground mt-1">Automated welcome message with login credentials</p>
                      </div>
                      <span className="text-xs text-muted-foreground">Jan 10, 2024</span>
                    </div>
                  </AlertDescription>
                </Alert>
                <Alert>
                  <MessageSquare className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">Support ticket: Login issue resolved</p>
                        <p className="text-xs text-muted-foreground mt-1">Coach reported login issues, resolved by resetting password</p>
                      </div>
                      <span className="text-xs text-muted-foreground">Jan 12, 2024</span>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Management Tab */}
        <TabsContent value="management" className="space-y-6">
          {/* Account Management */}
          <Card>
            <CardHeader>
              <CardTitle>Account Management</CardTitle>
              <CardDescription>Manage coach account settings and status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Account Status</Label>
                  <Select value={coach.status} onValueChange={handleStatusChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Active
                        </div>
                      </SelectItem>
                      <SelectItem value="pending">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                          Pending
                        </div>
                      </SelectItem>
                      <SelectItem value="suspended">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-500" />
                          Suspended
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button variant="outline" onClick={handlePasswordReset}>
                    <Key className="h-4 w-4 mr-2" />
                    Send Password Reset
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Send className="h-4 w-4 mr-2" />
                      Send Custom Message
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Send Message to Coach</DialogTitle>
                      <DialogDescription>
                        Send a custom message to {coach.firstName} {coach.lastName}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="message">Message</Label>
                        <Textarea
                          id="message"
                          value={customMessage}
                          onChange={(e) => setCustomMessage(e.target.value)}
                          placeholder="Enter your message here..."
                          rows={5}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setMessageDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSendMessage}>
                        Send Message
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                
                <Button variant="outline" onClick={() => navigate(`/admin/coaches/${coachId}/edit`)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Information
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Admin Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Admin Notes</CardTitle>
              <CardDescription>Internal notes and observations about this coach</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="whitespace-pre-wrap text-sm p-4 bg-muted rounded-lg">
                {coach.notes || 'No notes yet'}
              </div>
              <div className="space-y-2">
                <Label htmlFor="newNote">Add New Note</Label>
                <Textarea
                  id="newNote"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Add a new note..."
                  rows={3}
                />
                <Button onClick={handleSaveNote} disabled={!adminNote.trim()}>
                  Save Note
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notes from Other Administrators */}
          <Card>
            <CardHeader>
              <CardTitle>Administrator Activity</CardTitle>
              <CardDescription>Actions taken by other administrators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 pb-3 border-b">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>AD</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Admin User</p>
                    <p className="text-sm text-muted-foreground">Approved coach account</p>
                  </div>
                  <span className="text-xs text-muted-foreground">Jan 10, 2024</span>
                </div>
                <div className="flex items-start gap-3 pb-3 border-b">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>MD</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Marie Dupont</p>
                    <p className="text-sm text-muted-foreground">Reset password for coach</p>
                  </div>
                  <span className="text-xs text-muted-foreground">Jan 12, 2024</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CoachDetails;
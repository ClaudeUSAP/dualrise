import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Users, 
  Star, 
  MessageSquare, 
  TrendingUp, 
  Search,
  Heart,
  Trophy,
  Calendar,
  ChevronRight,
  Eye,
  Clock,
  Award,
  Filter,
  Mail,
  AlertCircle,
  Bell,
  UserPlus,
  MapPin,
  BookOpen,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  BellRing,
  Contact,
  Loader2,
  GraduationCap,
  Circle
} from 'lucide-react';
import { listTournaments } from '@/lib/api/tournaments';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import AthleteProfileModal from '@/components/AthleteProfileModal';
import ContactRequestModal from '@/components/ContactRequestModal';
import WelcomeVideoModal from '@/components/WelcomeVideoModal';

interface DashboardStats {
  totalAthletes: number;
  newThisWeek: number;
  favoritesCount: number;
  unreadNotifications: number;
  contactRequestsCount: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalAthletes: 0,
    newThisWeek: 0,
    favoritesCount: 0,
    unreadNotifications: 0,
    contactRequestsCount: 0
  });
  const [favoriteAthletes, setFavoriteAthletes] = useState<any[]>([]);
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [contactRequests, setContactRequests] = useState<any[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [selectedAthlete, setSelectedAthlete] = useState<any>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState<string>('');
  const [contactModalAthlete, setContactModalAthlete] = useState<any>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // Check if welcome modal should be shown - only once per login session
  useEffect(() => {
    if (!loading && user) {
      const permanentlyDismissed = localStorage.getItem(`scout_welcome_video_dismissed_${user.id}`);
      const shownThisSession = sessionStorage.getItem(`scout_welcome_video_shown_${user.id}`);
      
      if (permanentlyDismissed !== 'dismissed' && !shownThisSession) {
        setShowWelcomeModal(true);
        sessionStorage.setItem(`scout_welcome_video_shown_${user.id}`, 'true');
      }
    }
  }, [loading, user]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch total athletes count (exclude committed for coaches)
        let athletesQuery = supabase
          .from('athletes_safe' as any)
          .select('*', { count: 'exact', head: true });
        
        if (userProfile?.role === 'coach') {
          athletesQuery = athletesQuery
            .neq('status', 'in_creation')
            .neq('status', 'committed')
            .neq('status', 'archived')
            .neq('status', 'in_college');
        }

        const { count: athletesCount } = await athletesQuery;

        // Fetch athletes added this week (exclude committed and archived for coaches)
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        let newAthletesQuery = supabase
          .from('athletes_safe' as any)
          .select('*', { count: 'exact', head: true })
          .gte('created_at', weekAgo.toISOString());
        
        if (userProfile?.role === 'coach') {
          newAthletesQuery = newAthletesQuery
            .neq('status', 'in_creation')
            .neq('status', 'committed')
            .neq('status', 'archived')
            .neq('status', 'in_college');
        }
        
        const { count: newAthletesCount } = await newAthletesQuery;

        // Fetch favorites count for the current user
        const { count: favCount } = await supabase
          .from('favorites')
          .select('*', { count: 'exact', head: true })
          .eq('coach_id', user.id);

        // Fetch unread notifications count
        const { count: unreadCount } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false);

        // Fetch contact requests count
        const { count: contactReqCount } = await supabase
          .from('contact_requests')
          .select('*', { count: 'exact', head: true })
          .eq('coach_id', user.id)
          .eq('status', 'pending');

        // Fetch favorite athletes with details - exclude committed and archived athletes
        const { data: favorites } = await supabase
          .from('favorites')
          .select(`
            id,
            status,
            notes,
            created_at,
            athletes!inner (
              id,
              slug,
              first_name,
              last_name,
              graduation_year,
              academic_gpa,
              scoring_average,
              country,
              french_adult_ranking,
              profile_photo,
              status
            )
          `)
          .eq('coach_id', user.id)
          .not('athletes.status', 'ilike', 'in_creation')
          .not('athletes.status', 'ilike', 'committed')
          .not('athletes.status', 'ilike', 'archived')
          .not('athletes.status', 'ilike', 'in_college')
          .order('created_at', { ascending: false })
          .limit(4);

        // Fetch saved searches
        const { data: searches } = await supabase
          .from('saved_searches')
          .select('*')
          .eq('coach_id', user.id)
          .order('last_run', { ascending: false })
          .limit(4);

        // Fetch contact requests breakdown
        const { data: contactReqData } = await supabase
          .from('contact_requests')
          .select('athlete_id, status, created_at')
          .eq('coach_id', user.id);

        // Create a map of contacted athletes for quick lookup
        const contactedAthletesMap = new Map(
          contactReqData?.map(cr => [cr.athlete_id, {
            status: cr.status,
            created_at: cr.created_at
          }]) || []
        );

        const contactReqBreakdown = [
          { status: 'Pending', count: contactReqData?.filter(r => r.status === 'pending').length || 0 },
          { status: 'Accepted', count: contactReqData?.filter(r => r.status === 'accepted').length || 0 },
          { status: 'In Discussion', count: contactReqData?.filter(r => r.status === 'responded').length || 0 }
        ];

        // Update state with real data
        setStats({
          totalAthletes: athletesCount || 0,
          newThisWeek: newAthletesCount || 0,
          favoritesCount: favCount || 0,
          unreadNotifications: unreadCount || 0,
          contactRequestsCount: contactReqCount || 0
        });

        // Format favorite athletes with contact request info
        const formattedFavorites = favorites?.map(fav => {
          const hasContactRequest = contactedAthletesMap.has(fav.athletes.id);
          const contactRequestInfo = contactedAthletesMap.get(fav.athletes.id);
          
          return {
            ...fav.athletes,
            favoriteId: fav.id,
            favoriteStatus: fav.status || 'interested',
            notes: fav.notes,
            lastUpdate: getTimeAgo(new Date(fav.created_at)),
            hasContactRequest,
            contactRequestStatus: contactRequestInfo?.status
          };
        }) || [];

        // Auto-update favorite status to 'contacted' if they have a contact request
        for (const athlete of formattedFavorites) {
          if (athlete.hasContactRequest && athlete.favoriteStatus !== 'contacted') {
            // Silently update the status in the background
            await supabase
              .from('favorites')
              .update({ status: 'contacted' })
              .eq('id', athlete.favoriteId);
            
            // Update local state
            athlete.favoriteStatus = 'contacted';
          }
        }
        
        setFavoriteAthletes(formattedFavorites);

        // Format saved searches
        const formattedSearches = searches?.map(search => ({
          id: search.id,
          name: search.name,
          matchCount: search.match_count || 0,
          lastUsed: search.last_run ? getTimeAgo(new Date(search.last_run)) : 'Never',
          newMatches: search.new_matches_count || 0
        })) || [];
        setSavedSearches(formattedSearches);

        setContactRequests(contactReqBreakdown);

        // Generate recent activity (could be enhanced with actual activity tracking)
        const activities = [];
        if (newAthletesCount && newAthletesCount > 0) {
          activities.push({
            id: 1,
            type: 'new_athlete',
            message: `${newAthletesCount} new athletes added this week`,
            time: 'This week',
            badge: 'NEW'
          });
        }
        if (contactReqCount && contactReqCount > 0) {
          activities.push({
            id: 2,
            type: 'match',
            message: `${contactReqCount} pending contact requests`,
            time: 'Now',
            badge: 'PENDING'
          });
        }
        setRecentActivity(activities);

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

    fetchDashboardData();
  }, [user]);

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'contacted': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30';
      case 'interested': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30';
      case 'highly_interested': return 'bg-green-100 text-green-800 dark:bg-green-900/30';
      case 'monitoring': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30';
      default: return 'bg-muted';
    }
  };

  const updateFavoriteStatus = async (favoriteId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('favorites')
        .update({ status: newStatus })
        .eq('id', favoriteId);

      if (error) throw error;
      
      // Optimistic update
      setFavoriteAthletes(prev => 
        prev.map(a => a.favoriteId === favoriteId 
          ? { ...a, favoriteStatus: newStatus } 
          : a
        )
      );
      
      toast({
        title: "Success",
        description: "Status updated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const updateFavoriteNotes = async (favoriteId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('favorites')
        .update({ notes })
        .eq('id', favoriteId);

      if (error) throw error;
      
      // Optimistic update
      setFavoriteAthletes(prev => 
        prev.map(a => a.favoriteId === favoriteId 
          ? { ...a, notes } 
          : a
        )
      );
      
      toast({
        title: "Success",
        description: "Notes updated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update notes",
        variant: "destructive",
      });
    }
  };

  const getActivityIcon = (type: string) => {
    switch(type) {
      case 'new_athlete': return <UserPlus className="h-4 w-4" />;
      case 'update': return <AlertCircle className="h-4 w-4" />;
      case 'match': return <Search className="h-4 w-4" />;
      case 'tournament': return <Trophy className="h-4 w-4" />;
      case 'system': return <BellRing className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const handleDontShowAgain = () => {
    if (user) {
      localStorage.setItem(`scout_welcome_video_dismissed_${user.id}`, 'dismissed');
    }
    setShowWelcomeModal(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <WelcomeVideoModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        onDontShowAgain={handleDontShowAgain}
      />
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-7xl">
      {/* Header Section */}
      <div className="mb-6 sm:mb-8">
        <div className="mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">
            Welcome back, {userProfile?.first_name || 'Coach'}!
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {userProfile?.school_name || 'University Golf Team'} • Dashboard Overview
          </p>
        </div>

        {/* Quick Stats Bar */}
        <div className="flex flex-wrap gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg bg-muted/30 border">
          <div 
            className="group relative flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1 transition-colors after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary after:scale-x-0 after:origin-left after:transition-transform after:duration-300 group-hover:after:scale-x-100"
            onClick={() => navigate('/athletes')}
          >
            <Users className="h-5 w-5 text-primary" />
            <span className="text-sm">
              <span className="font-semibold">{stats.totalAthletes.toLocaleString()}</span> Total Athletes
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-green-600" />
            <span className="text-sm">
              <span className="font-semibold text-green-600">+{stats.newThisWeek}</span> New This Week
            </span>
          </div>
          <div 
            className="group relative flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1 transition-colors after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary after:scale-x-0 after:origin-left after:transition-transform after:duration-300 group-hover:after:scale-x-100"
            onClick={() => navigate('/favorites')}
          >
            <Heart className="h-5 w-5 text-red-500" />
            <span className="text-sm">
              <span className="font-semibold">{stats.favoritesCount}</span> Favorites
            </span>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Main Content Column */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/athletes')}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg sm:text-xl flex items-center justify-between">
                  <span>Browse Our Athletes</span>
                  <Search className="h-5 w-5 text-primary" />
                </CardTitle>
                <CardDescription>Search and filter from our database</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="secondary">
                  Browse Athletes
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/favorites')}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg sm:text-xl flex items-center justify-between">
                  <span>Your Favorites</span>
                  <Heart className="h-5 w-5 text-red-500" />
                </CardTitle>
                <CardDescription>Manage your favorite prospects</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stats.favoritesCount}</p>
                <p className="text-sm text-muted-foreground">Active favorites</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/tournament-search')}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg sm:text-xl flex items-center justify-between">
                  <span>Tournaments</span>
                  <Trophy className="h-5 w-5 text-usap-orange" />
                </CardTitle>
                <CardDescription>View tournament results</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="secondary">
                  Search Tournaments
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/saved-searches')}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg sm:text-xl flex items-center justify-between">
                  <span>Saved Searches</span>
                  <BookOpen className="h-5 w-5 text-purple-500" />
                </CardTitle>
                <CardDescription>Your custom search criteria</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{savedSearches.length}</p>
                <p className="text-sm text-muted-foreground">Active searches</p>
              </CardContent>
            </Card>
          </div>

          {/* Favorite Athletes */}
          {favoriteAthletes.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg sm:text-xl">Favorite Athletes</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/favorites')}>
                    View All
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  {favoriteAthletes.map((athlete) => (
                    <Card
                      key={athlete.id}
                      className="group hover:shadow-md transition-all duration-200 border-2 hover:border-primary/20"
                    >
                      <CardContent className="p-4 space-y-4">
                        {/* Header Row */}
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 ring-2 ring-primary/20">
                            {athlete.profile_photo ? (
                              <img 
                                src={athlete.profile_photo} 
                                alt={`${athlete.first_name} ${athlete.last_name}`}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-base font-bold text-primary">
                                {athlete.first_name?.[0]}{athlete.last_name?.[0]}
                              </span>
                            )}
                          </div>
                          
                          {/* Name & Quick View */}
                          <div className="flex-1 min-w-0">
                            <h3 
                              className="font-semibold text-base truncate hover:text-primary transition-colors cursor-pointer"
                              onClick={() => window.open(`/athletes/${athlete.slug || athlete.id}`, '_blank')}
                            >
                              {athlete.first_name} {athlete.last_name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                <GraduationCap className="h-3 w-3 mr-1" />
                                Class of {athlete.graduation_year || 'N/A'}
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Contact Button/Badge */}
                            {!athlete.hasContactRequest ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1.5 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setContactModalAthlete(athlete);
                                }}
                              >
                                <Mail className="h-3.5 w-3.5" />
                                Contact
                              </Button>
                            ) : (
                              <Badge variant="secondary" className="gap-1 text-xs h-8 px-2.5">
                                <Mail className="h-3 w-3" />
                                Contacted
                              </Badge>
                            )}
                            
                            {/* Quick View Icon */}
                            <Eye 
                              className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors cursor-pointer" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAthlete(athlete);
                                setSelectedAthleteId(athlete.id);
                              }}
                            />
                          </div>
                        </div>
                        
                        {/* Status Dropdown Row */}
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground">Status:</Label>
                          <Select 
                            value={athlete.favoriteStatus} 
                            onValueChange={(value) => updateFavoriteStatus(athlete.favoriteId, value)}
                          >
                            <SelectTrigger 
                              className="h-8 w-[160px] text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="interested">Interested</SelectItem>
                              <SelectItem value="contacted">Contacted</SelectItem>
                              <SelectItem value="highly_interested">Highly Interested</SelectItem>
                              <SelectItem value="monitoring">Monitoring</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Notes Section */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">Notes:</Label>
                            {athlete.notes && editingNoteId !== athlete.favoriteId && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => {
                                  setEditingNoteId(athlete.favoriteId);
                                  setEditingNoteText(athlete.notes || '');
                                }}
                              >
                                Edit
                              </Button>
                            )}
                          </div>
                          
                          {editingNoteId === athlete.favoriteId ? (
                            // Editing mode
                            <div className="space-y-2">
                              <Textarea
                                value={editingNoteText}
                                onChange={(e) => setEditingNoteText(e.target.value)}
                                placeholder="Add your notes about this athlete..."
                                className="min-h-[80px] text-sm"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={async () => {
                                    await updateFavoriteNotes(athlete.favoriteId, editingNoteText);
                                    setEditingNoteId(null);
                                  }}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingNoteId(null);
                                    setEditingNoteText('');
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : athlete.notes ? (
                            // Display mode (has notes)
                            <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded-md">
                              {athlete.notes}
                            </p>
                          ) : (
                            // No notes - show add button
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingNoteId(athlete.favoriteId);
                                setEditingNoteText('');
                              }}
                            >
                              <MessageSquare className="h-3 w-3 mr-1" />
                              Add Note
                            </Button>
                          )}
                        </div>
                        
                        {/* Footer - Last Updated */}
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2 border-t">
                          <Clock className="h-3 w-3" />
                          <span>Added {athlete.lastUpdate}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Saved Searches */}
          {savedSearches.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg sm:text-xl">Saved Searches</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/saved-searches')}>
                All Searches
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {savedSearches.map((search) => (
              <div
                key={search.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => navigate('/athletes', { state: { filters: search.search_criteria } })}
              >
                      <div>
                        <p className="font-medium">{search.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Last used: {search.lastUsed}
                        </p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        {search.newMatches > 0 && (
                          <Badge variant="default" className="bg-primary text-primary-foreground">
                            <Sparkles className="h-3 w-3 mr-1" />
                            {search.newMatches} new
                          </Badge>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {search.matchCount} total
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Recent Activity */}
          {recentActivity.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {recentActivity.map((activity) => (
                      <div 
                        key={activity.id} 
                        className="flex gap-3 p-3 rounded-lg cursor-pointer border border-transparent hover:border-border hover:shadow-md transition-all -m-3"
                        onClick={() => {
                          if (activity.type === 'new_athlete') {
                            navigate('/athletes');
                          } else if (activity.type === 'match') {
                            navigate('/notifications');
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (activity.type === 'new_athlete') {
                              navigate('/athletes');
                            } else if (activity.type === 'match') {
                              navigate('/notifications');
                            }
                          }
                        }}
                      >
                        <div className="mt-1">{getActivityIcon(activity.type)}</div>
                        <div className="flex-1">
                          <p className="text-sm">{activity.message}</p>
                          <p className="text-xs text-muted-foreground">{activity.time}</p>
                        </div>
                        {activity.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {activity.badge}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Contact Requests Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg sm:text-xl">Contact Requests</CardTitle>
                <Contact className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {contactRequests.map((request, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">{request.status}</span>
                    <Badge variant={request.status === 'Pending' ? 'destructive' : 'secondary'}>
                      {request.count}
                    </Badge>
                  </div>
                ))}
              </div>
              <Button 
                className="w-full mt-4" 
                variant="outline"
                onClick={() => navigate('/my-contact-requests')}
              >
                View All Requests
              </Button>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/athletes')}
              >
                <Search className="mr-2 h-4 w-4" />
                Search Athletes
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/favorites')}
              >
                <Heart className="mr-2 h-4 w-4" />
                View Favorites
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/tournament-search')}
              >
                <Trophy className="mr-2 h-4 w-4" />
                Tournament Results
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Athlete Profile Modal */}
      <AthleteProfileModal
        isOpen={!!selectedAthleteId}
        onClose={() => {
          setSelectedAthleteId(null);
          setSelectedAthlete(null);
        }}
        athlete={selectedAthlete}
      />

      {/* Contact Request Modal */}
      {contactModalAthlete && (
        <ContactRequestModal
          isOpen={!!contactModalAthlete}
          onClose={async () => {
            setContactModalAthlete(null);
            // Refetch dashboard data to show updated contact status
            if (user) {
              try {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                
                const { data: favorites } = await supabase
                  .from('favorites')
                  .select(`
                    id,
                    status,
                    notes,
                    created_at,
                    athletes (
                      id,
                      slug,
                      first_name,
                      last_name,
                      graduation_year,
                      academic_gpa,
                      scoring_average,
                      country,
                      french_adult_ranking,
                      profile_photo,
                      star_rating,
                      best_recent_scoring_avg,
                      preferences_division
                    )
                  `)
                  .eq('coach_id', user.id)
                  .order('created_at', { ascending: false })
                  .limit(4);
                
                const { data: contactReqData } = await supabase
                  .from('contact_requests')
                  .select('athlete_id, status, created_at')
                  .eq('coach_id', user.id);
                
                const contactedAthletesMap = new Map(
                  contactReqData?.map(cr => [cr.athlete_id, {
                    status: cr.status,
                    created_at: cr.created_at
                  }]) || []
                );
                
                const formattedFavorites = favorites?.map(fav => {
                  const hasContactRequest = contactedAthletesMap.has(fav.athletes.id);
                  const contactRequestInfo = contactedAthletesMap.get(fav.athletes.id);
                  
                  return {
                    ...fav.athletes,
                    favoriteId: fav.id,
                    favoriteStatus: fav.status || 'interested',
                    notes: fav.notes,
                    lastUpdate: getTimeAgo(new Date(fav.created_at)),
                    hasContactRequest,
                    contactRequestStatus: contactRequestInfo?.status
                  };
                }) || [];
                
                setFavoriteAthletes(formattedFavorites);
              } catch (error) {
                console.error('Error refreshing favorite athletes:', error);
              }
            }
          }}
          athlete={{
            id: contactModalAthlete.id,
            firstName: contactModalAthlete.first_name,
            lastName: contactModalAthlete.last_name,
            profileImage: contactModalAthlete.profile_photo,
            starRating: contactModalAthlete.star_rating || 3,
            gpa: contactModalAthlete.academic_gpa,
            preferredDivision: contactModalAthlete.preferences_division,
            highSchoolYear: contactModalAthlete.graduation_year?.toString(),
            scoringAverage: contactModalAthlete.scoring_average,
            bestRecentScoringAvg: contactModalAthlete.best_recent_scoring_avg
          }}
          isFavorited={true}
          hasNotes={!!contactModalAthlete.notes}
        />
      )}
    </div>
    </>
  );
};

export default Dashboard;
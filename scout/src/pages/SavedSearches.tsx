import { useState, useEffect } from 'react';
import { normalizeStatus } from '@/lib/athleteStatus';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { BestRecentScoreDisplay } from "@/components/BestRecentScoreDisplay";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Bell, 
  Trash2, 
  Edit, 
  Play, 
  ArrowRight,
  Star,
  TrendingUp,
  Filter,
  Download,
  Copy,
  Clock,
  Users,
  Calendar,
  BarChart3,
  Trophy,
  GraduationCap,
  DollarSign,
  Globe,
  Sparkles,
  Target,
  Zap,
  Mail,
  Smartphone,
  Settings,
  Share2,
  FileText,
  ChevronRight,
  BellOff,
  Edit2,
  CheckCircle,
  AlertCircle,
  TrendingDown,
  Lightbulb,
  Plus,
  Heart
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { SearchFilters } from '@/types/athlete';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from '@/integrations/supabase/client';
import { Athlete } from '@/types/athlete';
import AthleteProfileModal from '@/components/AthleteProfileModal';
import { normalizeDivisionsWithDefault, normalizeWeatherZones, normalizeIntendedMajors } from '@/lib/divisionNormalizer';

interface SavedSearch {
  id: string;
  name: string;
  description?: string;
  filters: SearchFilters;
  createdAt: Date;
  lastRun: Date | null;
  matchCount: number;
  newMatches: number;
  notificationsEnabled: boolean;
  notificationFrequency: 'immediate' | 'daily' | 'weekly';
  category?: string;
  effectiveness?: number;
  autoRun?: boolean;
  lastNotificationSent?: Date;
  conversionRate?: number;
  tags?: string[];
}

interface SearchTemplate {
  id: string;
  name: string;
  description: string;
  icon: any;
  filters: SearchFilters;
  category: string;
}

const searchTemplates: SearchTemplate[] = [
  {
    id: 'high-academic',
    name: 'High Academic Performers',
    description: 'GPA 3.5+ with strong test scores',
    icon: GraduationCap,
    filters: {
      gpaMin: 3.5,
      gpaMax: 4.0,
    },
    category: 'academic'
  },
  {
    id: 'budget-conscious',
    name: 'Budget Conscious',
    description: 'Budget under $35k/year',
    icon: DollarSign,
    filters: {
      budgetMin: 0,
      budgetMax: 35000,
      preferredDivision: ['NCAA D3', 'NAIA'],
    },
    category: 'financial'
  },
  {
    id: 'elite-players',
    name: 'Elite Tournament Players',
    description: '5-6 star rating with low scoring average',
    icon: Trophy,
    filters: {
      starRatingMin: 5,
    },
    category: 'performance'
  },
  {
    id: 'international',
    name: 'International Prospects',
    description: 'Non-US players with language scores',
    icon: Globe,
    filters: {},
    category: 'international'
  },
  {
    id: 'rising-juniors',
    name: 'Rising Juniors',
    description: 'Class of 2026 prospects',
    icon: Calendar,
    filters: {
      highSchoolYear: ['Junior'],
      graduationYear: [2026],
    },
    category: 'class'
  },
  {
    id: 'warm-weather',
    name: 'Warm Weather Seekers',
    description: 'Prefer southern/western regions',
    icon: Target,
    filters: {},
    category: 'preferences'
  }
];

const SavedSearches = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('searches');
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Athlete[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [loadingSavedSearches, setLoadingSavedSearches] = useState(true);
  const [athleteTournamentResults, setAthleteTournamentResults] = useState<any[]>([]);

  // Fetch saved searches from database
  useEffect(() => {
    fetchSavedSearches();
  }, []);

  const fetchSavedSearches = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoadingSavedSearches(false);
        return;
      }

      const { data, error } = await supabase
        .from('saved_searches')
        .select('*')
        .eq('coach_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching saved searches:', error);
        toast({
          title: "Error loading saved searches",
          description: error.message,
          variant: "destructive"
        });
      } else if (data) {
        const mappedSearches: SavedSearch[] = data.map(search => ({
          id: search.id,
          name: search.name,
          description: search.description || undefined,
          filters: search.search_criteria as SearchFilters || {},
          createdAt: new Date(search.created_at),
          lastRun: search.last_run ? new Date(search.last_run) : null,
          matchCount: search.match_count,
          newMatches: search.new_matches_count,
          notificationsEnabled: search.is_alert_enabled,
          notificationFrequency: search.alert_frequency as 'immediate' | 'daily' | 'weekly',
        }));
        setSearches(mappedSearches);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setLoadingSavedSearches(false);
    }
  };

  const filteredSearches = searches.filter(search => {
    const matchesFilter = search.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
                         search.description?.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || search.category === selectedCategory;
    return matchesFilter && matchesCategory;
  });

  const toggleNotifications = async (id: string) => {
    const search = searches.find(s => s.id === id);
    if (!search) return;

    const newValue = !search.notificationsEnabled;
    
    // Update in database
    const { error } = await supabase
      .from('saved_searches')
      .update({ is_alert_enabled: newValue })
      .eq('id', id);

    if (error) {
      toast({
        title: "Error updating notification settings",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setSearches(searches.map(search =>
        search.id === id 
          ? { ...search, notificationsEnabled: newValue }
          : search
      ));
      toast({
        title: "Notification settings updated",
        description: "Your preferences have been saved.",
      });
    }
  };

  const updateNotificationFrequency = async (id: string, frequency: 'immediate' | 'daily' | 'weekly') => {
    const { error } = await supabase
      .from('saved_searches')
      .update({ alert_frequency: frequency })
      .eq('id', id);

    if (error) {
      toast({
        title: "Error updating frequency",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setSearches(searches.map(search =>
        search.id === id 
          ? { ...search, notificationFrequency: frequency }
          : search
      ));
      toast({
        title: "Notification frequency updated",
        description: `Alerts will be sent ${frequency === 'immediate' ? 'immediately' : frequency}.`,
      });
    }
  };

  const deleteSearch = async (id: string) => {
    // Delete from database
    const { error } = await supabase
      .from('saved_searches')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error deleting search",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setSearches(searches.filter(search => search.id !== id));
      toast({
        title: "Search deleted",
        description: "The saved search has been removed.",
      });
    }
  };

  const runSearch = async (search: SavedSearch) => {
    // Fetch search results inline
    setActiveSearchId(search.id);
    setLoadingResults(true);
    
    try {
      // Fetch favorites first
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: favData } = await supabase
          .from('favorites')
          .select('athlete_id')
          .eq('coach_id', user.id);
        
        if (favData) {
          setFavorites(favData.map(f => f.athlete_id));
        }
      }

      // Fetch athletes based on filters - exclude in_creation, committed, and
      // in_college/archived athletes from coach saved-search results
      let query = supabase.from('athletes_safe' as any).select('*')
        .not('status', 'ilike', 'in_creation')
        .not('status', 'ilike', 'committed')
        .not('status', 'ilike', 'archived')
        .not('status', 'ilike', 'in_college');
      
      // Apply filters
      if (search.filters.gpaMin) {
        query = query.gte('academic_gpa', search.filters.gpaMin);
      }
      if (search.filters.gpaMax) {
        query = query.lte('academic_gpa', search.filters.gpaMax);
      }
      if (search.filters.budgetMin) {
        query = query.gte('preferences_budget', search.filters.budgetMin);
      }
      if (search.filters.budgetMax) {
        query = query.lte('preferences_budget', search.filters.budgetMax);
      }
      if (search.filters.highSchoolYear && search.filters.highSchoolYear.length > 0) {
        const years = search.filters.highSchoolYear.map(year => {
          if (year === 'Senior') return '2025';
          if (year === 'Junior') return '2026';
          if (year === 'Sophomore') return '2027';
          return '2028';
        });
        query = query.in('graduation_year', years);
      }
      
      const { data, error } = await query.limit(20);
      
      if (error) {
        console.error('Error fetching athletes:', error);
        setSearchResults([]);
      } else if (data) {
        const mappedAthletes: Athlete[] = data.map((athlete: any) => {
          // Calculate scoring vs course rating for handicap derivation
          const svcr = Number(athlete.scoring_average_vs_course_rating) || 0;
          
          return {
            id: athlete.id,
            firstName: athlete.first_name || '',
            lastName: athlete.last_name || '',
            email: '',
            gpa: athlete.academic_gpa != null ? Number(athlete.academic_gpa) : undefined,
            intendedMajors: athlete.intended_majors || '',
            highSchoolYear: 'Senior' as const,
            duolingoScore: Number(athlete.duolingo) || undefined,
            satScore: Number(athlete.sat) || undefined,
            currentSchool: athlete.golf_club_team || '',
            scoringAverage: athlete.scoring_average ? Number(athlete.scoring_average) : undefined,
            scoringAverageVsCourseRating: svcr,
            nationalAdultRanking: parseInt(athlete.french_adult_ranking || '0') || 0,
            nationalRankingInClass: parseInt(athlete.french_ranking_in_their_class || '0') || 0,
            drivingAverageCarryDistance: Number(athlete.drive_distance_carry) || undefined,
            maxDriverClubHeadSpeed: Number(athlete.max_club_head_speed) || undefined,
            preferredDivisions: normalizeDivisionsWithDefault(athlete.preferences_division),
            starRating: athlete.star_rating || 3,
            strengths: athlete.strengths || '',
            areasOfImprovement: athlete.areas_of_improvement || '',
            weatherZone: normalizeWeatherZones(athlete.preferences_region),
            budget: (() => {
              const numericBudget = Number(athlete.preferences_budget);
              return !isNaN(numericBudget) && numericBudget > 0 ? numericBudget : undefined;
            })(),
            recruitmentPitch: athlete.why_good_recruit || '',
            hometown: athlete.country || '',
            createdAt: new Date(athlete.created_at || Date.now()),
            updatedAt: new Date(athlete.updated_at || Date.now()),
            featured: false,
            status: normalizeStatus(athlete.status),
            statusExpiresAt: athlete.status_expires_at ? new Date(athlete.status_expires_at) : undefined,
            graduationYear: athlete.graduation_year || '2025',
            preferredMajors: normalizeIntendedMajors(athlete.intended_majors),
            handicap: svcr > 0 ? Math.max(0, svcr) : undefined,
            profileImage: athlete.profile_photo || undefined,
          };
        });
        setSearchResults(mappedAthletes);
        
        // Update match count in database
        const matchCount = mappedAthletes.length;
        const { error: updateError } = await supabase
          .from('saved_searches')
          .update({ 
            last_run: new Date().toISOString(),
            match_count: matchCount,
            new_matches_count: 0 
          })
          .eq('id', search.id);

        if (updateError) {
          console.error('Error updating search:', updateError);
        } else {
          // Update local state with new match count
          setSearches(prev => prev.map(s => 
            s.id === search.id 
              ? { ...s, lastRun: new Date(), matchCount: matchCount, newMatches: 0 }
              : s
          ));
        }
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setSearchResults([]);
    } finally {
      setLoadingResults(false);
    }
  };

  const applyTemplate = async (template: SearchTemplate) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to save searches.",
        variant: "destructive"
      });
      return;
    }

    // Save to database
    const { data, error } = await supabase
      .from('saved_searches')
      .insert([{
        coach_id: user.id,
        name: template.name,
        description: template.description,
        search_criteria: template.filters as any,
        is_alert_enabled: false,
        alert_frequency: 'daily',
        match_count: 0,
        new_matches_count: 0
      }])
      .select()
      .single();

    if (error) {
      toast({
        title: "Error creating search",
        description: error.message,
        variant: "destructive"
      });
    } else if (data) {
      const newSearch: SavedSearch = {
        id: data.id,
        name: data.name,
        description: data.description || undefined,
        filters: data.search_criteria as SearchFilters || {},
        createdAt: new Date(data.created_at),
        lastRun: data.last_run ? new Date(data.last_run) : null,
        matchCount: data.match_count,
        newMatches: data.new_matches_count,
        notificationsEnabled: data.is_alert_enabled,
        notificationFrequency: data.alert_frequency as 'immediate' | 'daily' | 'weekly',
        category: template.category
      };
      
      setSearches([...searches, newSearch]);
      toast({
        title: "Template applied",
        description: `"${template.name}" search has been created.`,
      });
    }
  };

  const duplicateSearch = async (search: SavedSearch) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to duplicate searches.",
        variant: "destructive"
      });
      return;
    }

    const { data, error } = await supabase
      .from('saved_searches')
      .insert([{
        coach_id: user.id,
        name: `${search.name} (Copy)`,
        description: search.description,
        search_criteria: search.filters as any,
        is_alert_enabled: false,
        alert_frequency: search.notificationFrequency,
        match_count: 0,
        new_matches_count: 0
      }])
      .select()
      .single();

    if (error) {
      toast({
        title: "Error duplicating search",
        description: error.message,
        variant: "destructive"
      });
    } else if (data) {
      const newSearch: SavedSearch = {
        id: data.id,
        name: data.name,
        description: data.description || undefined,
        filters: (data.search_criteria as SearchFilters) || {},
        createdAt: new Date(data.created_at),
        lastRun: data.last_run ? new Date(data.last_run) : null,
        matchCount: 0,
        newMatches: 0,
        notificationsEnabled: false,
        notificationFrequency: data.alert_frequency as 'immediate' | 'daily' | 'weekly',
      };
      
      setSearches([...searches, newSearch]);
      toast({
        title: "Search duplicated",
        description: `Created "${newSearch.name}"`,
      });
    }
  };

  const shareSearch = (search: SavedSearch) => {
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/athletes?shared_search=${encodeURIComponent(search.name)}&filters=${encodeURIComponent(JSON.stringify(search.filters))}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast({
        title: "Link copied!",
        description: "Share this link with other coaches. They'll need to log in to view results.",
      });
    }).catch(() => {
      toast({
        title: "Failed to copy",
        description: "Please try again.",
        variant: "destructive"
      });
    });
  };

  const exportSearches = () => {
    const dataStr = JSON.stringify(searches, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'saved-searches.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast({
      title: "Searches exported",
      description: "Your saved searches have been downloaded.",
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Saved Searches</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage search criteria, templates, and automated notifications
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportSearches}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => {
            console.log('Create Search button clicked');
            console.log('isAuthenticated:', isAuthenticated);
            if (!isAuthenticated) {
              console.log('User not authenticated, redirecting to login');
              navigate('/login');
            } else {
              console.log('User authenticated, navigating to /athletes');
              navigate('/athletes');
            }
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Search
          </Button>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Searches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{searches.length}</div>
            <p className="text-xs text-muted-foreground">
              {searches.filter(s => s.autoRun).length} auto-running
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{searches.filter(s => s.notificationsEnabled).length}</div>
            <Progress value={(searches.filter(s => s.notificationsEnabled).length / searches.length) * 100} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">New Matches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{searches.reduce((sum, s) => sum + s.newMatches, 0)}</div>
            <p className="text-xs text-muted-foreground">Today</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="searches">My Searches</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="searches" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name or description..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="academic">Academic</SelectItem>
                <SelectItem value="financial">Financial</SelectItem>
                <SelectItem value="performance">Performance</SelectItem>
                <SelectItem value="class">Class Year</SelectItem>
                <SelectItem value="preferences">Preferences</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Saved Searches Grid */}
          {loadingSavedSearches ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading your saved searches...</p>
            </div>
          ) : searches.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground mb-4">You haven't saved any searches yet.</p>
              <Button onClick={() => setActiveTab('templates')}>
                Browse Templates
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSearches.map((search) => (
              <Card key={search.id} className={cn(
                "relative hover:shadow-lg transition-shadow",
                search.autoRun && "border-primary/50"
              )}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{search.name}</CardTitle>
                      {search.description && (
                        <CardDescription className="mt-1">
                          {search.description}
                        </CardDescription>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate('/athletes', { 
                          state: { applySavedSearch: search.filters, searchName: search.name }
                        })}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Search
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => runSearch(search)}>
                          <Play className="h-4 w-4 mr-2" />
                          Run Now
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicateSearch(search)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => shareSearch(search)}>
                          <Share2 className="h-4 w-4 mr-2" />
                          Share
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deleteSearch(search.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Tags */}
                  {search.tags && search.tags.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {search.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{search.matchCount} matches</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{search.lastRun ? new Date(search.lastRun).toLocaleDateString() : 'Never run'}</span>
                    </div>
                    {search.newMatches > 0 && (
                      <div className="flex items-center gap-2 text-primary">
                        <Sparkles className="h-4 w-4" />
                        <span>{search.newMatches} new</span>
                      </div>
                    )}
                    {search.effectiveness && (
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span>{search.effectiveness}% effective</span>
                      </div>
                    )}
                  </div>

                  {/* Notifications Toggle */}
                  <div className="space-y-2 py-2 border-t">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {search.notificationsEnabled ? (
                          <Bell className="h-4 w-4 text-primary" />
                        ) : (
                          <BellOff className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm">
                          Alerts {search.notificationsEnabled ? 'on' : 'off'}
                        </span>
                      </div>
                      <Switch
                        checked={search.notificationsEnabled}
                        onCheckedChange={() => toggleNotifications(search.id)}
                      />
                    </div>
                    
                    {/* Frequency Selector - only shown when alerts are enabled */}
                    {search.notificationsEnabled && (
                      <div className="flex items-center justify-between pl-6">
                        <span className="text-xs text-muted-foreground">Frequency:</span>
                        <Select
                          value={search.notificationFrequency}
                          onValueChange={(value: 'immediate' | 'daily' | 'weekly') => 
                            updateNotificationFrequency(search.id, value)
                          }
                        >
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="immediate">
                              <div className="flex items-center gap-2">
                                <Zap className="h-3 w-3" />
                                <span>Immediate</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="daily">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                <span>Daily</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="weekly">
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3" />
                                <span>Weekly</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1" 
                      size="sm"
                      onClick={() => runSearch(search)}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Run Search
                    </Button>
                    {search.newMatches > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate('/athletes')}
                      >
                        View New
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchTemplates.map((template) => {
              const Icon = template.icon;
              return (
                <Card key={template.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <CardDescription>{template.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => applyTemplate(template)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Use Template
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Inline Search Results */}
      {activeSearchId && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  Search Results - {searches.find(s => s.id === activeSearchId)?.name}
                </CardTitle>
                <CardDescription>
                  {searchResults.length > 0 
                    ? `Showing ${searchResults.length} matches`
                    : 'No matches found'
                  }
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const params = new URLSearchParams();
                    const search = searches.find(s => s.id === activeSearchId);
                    if (search?.filters) {
                      if (search.filters.gpaMin) params.set('gpaMin', search.filters.gpaMin.toString());
                      if (search.filters.gpaMax) params.set('gpaMax', search.filters.gpaMax.toString());
                      if (search.filters.budgetMin) params.set('budgetMin', search.filters.budgetMin.toString());
                      if (search.filters.budgetMax) params.set('budgetMax', search.filters.budgetMax.toString());
                      if (search.filters.preferredDivision) params.set('division', search.filters.preferredDivision.join(','));
                      if (search.filters.highSchoolYear) params.set('year', search.filters.highSchoolYear.join(','));
                      if (search.filters.starRatingMin) params.set('starRatingMin', search.filters.starRatingMin.toString());
                    }
                    navigate(`/athletes?${params.toString()}`);
                  }}
                >
                  View All Results
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setActiveSearchId(null);
                    setSearchResults([]);
                  }}
                >
                  Close Results
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingResults ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">Loading results...</div>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <p className="text-muted-foreground">No athletes match your search criteria</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.map((athlete) => (
                  <Card 
                    key={athlete.id} 
                    className="cursor-pointer hover:shadow-lg transition-all duration-200"
                    onClick={async () => {
                      setSelectedAthlete(athlete);
                      setIsProfileModalOpen(true);
                      
                      // Fetch tournament results for this athlete
                      try {
                        const { data: results, error } = await supabase
                          .from('tournament_results')
                          .select(`
                            *,
                            tournaments (
                              id,
                              name,
                              start_date,
                              end_date,
                              location,
                              country,
                              results_link
                            )
                          `)
                          .eq('athlete_id', athlete.id)
                          .order('created_at', { ascending: false });
                        
                        if (error) {
                          console.error('Error fetching tournament results:', error);
                          setAthleteTournamentResults([]);
                        } else {
                          setAthleteTournamentResults(results || []);
                        }
                      } catch (err) {
                        console.error('Unexpected error:', err);
                        setAthleteTournamentResults([]);
                      }
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={athlete.profileImage} />
                          <AvatarFallback>
                            {athlete.firstName[0]}{athlete.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">
                              {athlete.firstName} {athlete.lastName}
                            </h4>
                            {favorites.includes(athlete.id) && (
                              <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Class of {athlete.graduationYear}
                          </p>
                          
                          <div className="flex flex-wrap gap-1 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              {athlete.starRating} Star
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              <GraduationCap className="h-3 w-3 mr-1" />
                              {athlete.gpa != null ? athlete.gpa.toFixed(2) : 'N/A'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              <Trophy className="h-3 w-3 mr-1" />
                              <BestRecentScoreDisplay athleteId={athlete.id} showTooltip={false} />
                            </Badge>
                          </div>
                          
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {athlete.currentSchool}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Athlete Profile Modal */}
      {selectedAthlete && (
        <AthleteProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => {
            setIsProfileModalOpen(false);
            setSelectedAthlete(null);
          }}
          athlete={selectedAthlete}
          tournamentResults={athleteTournamentResults}
        />
      )}
    </div>
  );
};

export default SavedSearches;
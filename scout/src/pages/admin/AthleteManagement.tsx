import { useState, useEffect, useCallback } from 'react';
import { ATHLETE_STATUSES, statusLabel, STATUS_BADGE_CLASSES } from '@/lib/athleteStatus';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { calculateAge } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { 
  Search, 
  Filter, 
  UserPlus,
  Download,
  FileDown,
  Upload,
  Eye,
  Edit,
  Copy,
  Archive,
  ArchiveRestore,
  Trophy,
  Star,
  Heart,
  MoreHorizontal,
  TrendingUp,
  Users,
  AlertCircle,
  Calendar,
  ChevronUp,
  ChevronDown,
  LayoutGrid,
  List,
  DollarSign,
  GraduationCap,
  MapPin,
  Clock,
  Award,
  Share2
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { downloadAthleteOnePagerLive } from '@/lib/athleteOnePagerLive';
import { listAthletes, updateAthlete, deleteAthlete } from '@/lib/api/athletes';
import { supabase } from '@/integrations/supabase/client';
import { Athlete } from '@/types/athlete';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2 } from 'lucide-react';
// Removed AthleteProfileModal - using dedicated view page instead

const getProductionOrigin = () => {
  const origin = window.location.origin;
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return 'https://scout.usathleticperformance.com';
  }
  return origin;
};

const AthleteManagement = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState(true);
  const [tournamentActivityMap, setTournamentActivityMap] = useState<Map<string, number>>(new Map());
  
  // Initialize filter state from URL search params
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [starFilter, setStarFilter] = useState<number[]>(() => {
    const stars = searchParams.get('stars');
    if (stars) {
      const [min, max] = stars.split('-').map(Number);
      return [min || 0, max || 7];
    }
    return [0, 7];
  });
  const [budgetRange, setBudgetRange] = useState<number[]>(() => {
    const budget = searchParams.get('budget');
    if (budget) {
      const [min, max] = budget.split('-').map(Number);
      return [min || 0, max || 100000];
    }
    return [0, 100000];
  });
  const [divisionFilter, setDivisionFilter] = useState<string[]>(() => {
    const div = searchParams.get('div');
    return div ? div.split(',') : [];
  });
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all');
  const [graduationYear, setGraduationYear] = useState<string>(searchParams.get('year') || 'all');
  const [countryFilter, setCountryFilter] = useState<string>(searchParams.get('country') || 'all');
  const [genderFilter, setGenderFilter] = useState<string>(searchParams.get('gender') || 'all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [athleteToDelete, setAthleteToDelete] = useState<string | null>(null);
  const [tournamentFilter, setTournamentFilter] = useState<string>(searchParams.get('tournament') || 'all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>((searchParams.get('view') as 'grid' | 'table') || 'grid');
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sort') || 'name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>((searchParams.get('order') as 'asc' | 'desc') || 'asc');

  // Sync filter state to URL search params
  useEffect(() => {
    const params: Record<string, string> = {};
    if (searchQuery) params.q = searchQuery;
    if (statusFilter !== 'all') params.status = statusFilter;
    if (graduationYear !== 'all') params.year = graduationYear;
    if (countryFilter !== 'all') params.country = countryFilter;
    if (genderFilter !== 'all') params.gender = genderFilter;
    if (tournamentFilter !== 'all') params.tournament = tournamentFilter;
    if (starFilter[0] !== 0 || starFilter[1] !== 7) params.stars = `${starFilter[0]}-${starFilter[1]}`;
    if (budgetRange[0] !== 0 || budgetRange[1] !== 100000) params.budget = `${budgetRange[0]}-${budgetRange[1]}`;
    if (divisionFilter.length > 0) params.div = divisionFilter.join(',');
    if (viewMode !== 'grid') params.view = viewMode;
    if (sortBy !== 'name') params.sort = sortBy;
    if (sortOrder !== 'asc') params.order = sortOrder;
    
    setSearchParams(params, { replace: true });
  }, [searchQuery, statusFilter, graduationYear, countryFilter, genderFilter, tournamentFilter, starFilter, budgetRange, divisionFilter, viewMode, sortBy, sortOrder]);

  const fetchAthletes = async () => {
    setIsLoadingDb(true);
    try {
      const athletes = await listAthletes();
      setAthletes(athletes);

      // Fetch tournament activity counts
      const { data: activityData } = await supabase
        .from('tournament_results')
        .select('athlete_id');
      
      if (activityData) {
        const activityMap = new Map<string, number>();
        activityData.forEach((result: any) => {
          const count = activityMap.get(result.athlete_id) || 0;
          activityMap.set(result.athlete_id, count + 1);
        });
        setTournamentActivityMap(activityMap);
      }

      toast({
        title: "Athletes refreshed",
        description: `Loaded ${athletes.length} athletes`,
      });
    } catch (err: any) {
      console.error('Error fetching athletes:', err);
      toast({
        title: "Error loading athletes",
        description: err.message || "Failed to load athletes. Check RLS policies.",
        variant: "destructive",
      });
      setAthletes([]);
    } finally {
      setIsLoadingDb(false);
    }
  };

  // Fetch athletes from Supabase on component mount
  useEffect(() => {
    fetchAthletes();

    // Subscribe to realtime athlete changes
    const channel = supabase
      .channel('athletes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'athletes',
        },
        () => {
          fetchAthletes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  // Restore scroll position after data loads
  useEffect(() => {
    if (!isLoadingDb && athletes.length > 0) {
      const savedScrollPos = sessionStorage.getItem('adminAthleteListScrollPos');
      if (savedScrollPos) {
        setTimeout(() => {
          window.scrollTo(0, parseInt(savedScrollPos, 10));
          sessionStorage.removeItem('adminAthleteListScrollPos');
        }, 100);
      }
    }
  }, [isLoadingDb, athletes.length]);
  
  // Save scroll position before navigating to athlete detail
  const handleAthleteClick = (athleteId: string, action: 'view' | 'edit') => {
    sessionStorage.setItem('adminAthleteListScrollPos', window.scrollY.toString());
    if (action === 'view') {
      navigate(`/admin/athletes/${athleteId}/view`);
    } else {
      navigate(`/admin/athletes/${athleteId}`);
    }
  };

  // Copy profile link handler
  const handleCopyProfileLink = async (athlete: Athlete) => {
    const profileUrl = `${getProductionOrigin()}/athletes/${athlete.slug || athlete.id}`;
    try {
      await navigator.clipboard.writeText(profileUrl);
      toast({
        title: "Link copied!",
        description: `Profile link for ${athlete.firstName} ${athlete.lastName} copied to clipboard.`,
      });
    } catch (err) {
      console.error("Copy failed:", err);
      toast({
        title: "Error",
        description: "Failed to copy link to clipboard",
        variant: "destructive",
      });
    }
  };

  // Download the SAME coach recruiting one-pager (live, regenerated on each click).
  const handleDownloadOnePager = async (athlete: Athlete) => {
    toast({ title: 'Generating one-pager…', description: `${athlete.firstName} ${athlete.lastName}` });
    try {
      await downloadAthleteOnePagerLive(athlete.id, athlete);
      toast({ title: 'PDF generated', description: 'The one-pager has been downloaded.' });
    } catch (err) {
      console.error('Error generating one-pager PDF:', err);
      toast({ title: 'Error', description: 'Failed to generate PDF. Please try again.', variant: 'destructive' });
    }
  };

  // Enhanced filtering
  const filteredAthletes = athletes.filter(athlete => {
    const matchesSearch = 
      athlete.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      athlete.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      athlete.hometown?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStars = 
      athlete.starRating >= starFilter[0] && 
      athlete.starRating <= starFilter[1];
    
    const matchesBudget = 
      !athlete.budget || 
      (athlete.budget >= budgetRange[0] && athlete.budget <= budgetRange[1]);
    
    const matchesDivision = 
      divisionFilter.length === 0 || 
      divisionFilter.some(div => athlete.preferredDivisions?.includes(div));
    
    // Exclude in_college (placed / legacy archived) athletes by default unless
    // specifically filtering for them. Status is already canonical here.
    const matchesStatus =
      statusFilter === 'all' ? athlete.status !== 'in_college' :
      athlete.status === statusFilter;
    
    const matchesCountry = 
      countryFilter === 'all' || 
      athlete.hometown?.includes(countryFilter);
    
    const matchesGender = 
      genderFilter === 'all' || 
      (genderFilter === 'Male' && (athlete.sex === 'Men')) ||
      (genderFilter === 'Female' && (athlete.sex === 'Women')) ||
      (!athlete.sex && genderFilter === 'all');
    
    const tournamentCount = tournamentActivityMap.get(athlete.id) || 0;
    const hasTournamentActivity = tournamentCount > 0;
    const matchesTournament = 
      tournamentFilter === 'all' ||
      (tournamentFilter === 'recent' && hasTournamentActivity) ||
      (tournamentFilter === 'none' && !hasTournamentActivity);

    // Graduation year filter - supports comma-separated values like "2026, 2027"
    const gradYearValue = athlete.graduationYear || athlete.graduationYears || '';
    const matchesGraduation = 
      !graduationYear || graduationYear === 'all' ||
      !gradYearValue ||
      gradYearValue.split(',').map(y => y.trim()).includes(graduationYear);
    
    return matchesSearch && matchesStars && matchesBudget && matchesDivision && 
           matchesStatus && matchesCountry && matchesGender && matchesTournament && matchesGraduation;
  });

  // Sorting logic
  const sortedAthletes = [...filteredAthletes].sort((a, b) => {
    let aVal: any, bVal: any;
    
    switch (sortBy) {
      case 'name':
        aVal = `${a.firstName} ${a.lastName}`;
        bVal = `${b.firstName} ${b.lastName}`;
        break;
      case 'starRating':
        aVal = a.starRating;
        bVal = b.starRating;
        break;
      case 'gpa':
        aVal = a.gpa;
        bVal = b.gpa;
        break;
      case 'budget':
        aVal = a.budget || 0;
        bVal = b.budget || 0;
        break;
      case 'tournament':
        const aActivity = getTournamentActivity(a.id);
        const bActivity = getTournamentActivity(b.id);
        aVal = aActivity.length > 0 ? aActivity[0].date : new Date(0);
        bVal = bActivity.length > 0 ? bActivity[0].date : new Date(0);
        break;
      case 'lastUpdated':
        aVal = new Date();
        bVal = new Date();
        break;
      default:
        return 0;
    }
    
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // "Archived" is now the in_college status (placed athletes)
  const archivedCount = athletes.filter(a => a.status === 'in_college').length;

  const handleBulkAction = (action: string) => {
    if (selectedAthletes.length === 0) {
      toast({
        title: "No athletes selected",
        description: "Please select athletes to perform bulk actions.",
        variant: "destructive"
      });
      return;
    }

    switch (action) {
      case 'archive':
        toast({
          title: "Athletes archived",
          description: `${selectedAthletes.length} athlete profiles have been archived.`,
        });
        break;
      case 'export':
        toast({
          title: "Export started",
          description: `Exporting ${selectedAthletes.length} athlete profiles to CSV.`,
        });
        break;
      case 'update':
        navigate('/admin/athletes/bulk-edit');
        break;
      case 'tournament':
        navigate('/admin/tournaments?athletes=' + selectedAthletes.join(','));
        break;
    }
    setSelectedAthletes([]);
  };

  const handleArchiveAthlete = async (athleteId: string) => {
    try {
      await updateAthlete(athleteId, { status: 'in_college' });
      setAthletes(prev => prev.map(athlete => 
        athlete.id === athleteId ? { ...athlete, status: 'in_college' } : athlete
      ));
      toast({
        title: "Athlete archived",
        description: "The athlete profile has been archived.",
      });
    } catch (error) {
      console.error('Error archiving athlete:', error);
      toast({
        title: "Error",
        description: "Failed to archive athlete",
        variant: "destructive",
      });
    }
  };

  const handleRestoreAthlete = async (athleteId: string) => {
    try {
      await updateAthlete(athleteId, { status: 'available' });
      setAthletes(prev => prev.map(athlete => 
        athlete.id === athleteId ? { ...athlete, status: 'available' } : athlete
      ));
      toast({
        title: "Athlete restored",
        description: "The athlete profile has been restored and is now visible to coaches.",
      });
    } catch (error) {
      console.error('Error restoring athlete:', error);
      toast({
        title: "Error",
        description: "Failed to restore athlete",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAthlete = async () => {
    if (!athleteToDelete) return;
    
    try {
      await deleteAthlete(athleteToDelete);
      setAthletes(prev => prev.filter(athlete => athlete.id !== athleteToDelete));
      toast({
        title: "Athlete deleted",
        description: "The athlete profile has been permanently deleted.",
      });
    } catch (error) {
      console.error('Error deleting athlete:', error);
      toast({
        title: "Error",
        description: "Failed to delete athlete",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setAthleteToDelete(null);
    }
  };

  const handleDuplicateAthlete = (athleteId: string) => {
    const athlete = athletes.find(a => a.id === athleteId);
    if (athlete) {
      toast({
        title: "Athlete duplicated",
        description: "A copy of the athlete profile has been created.",
      });
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleClearAllFilters = () => {
    setStarFilter([0, 7]);
    setBudgetRange([0, 100000]);
    setDivisionFilter([]);
    setGraduationYear('all');
    setCountryFilter('all');
    setTournamentFilter('all');
    setStatusFilter('all');
    setGenderFilter('all');
    setSearchQuery('');
    setSortBy('name');
    setSortOrder('asc');
    setViewMode('grid');
    setSearchParams({}, { replace: true });
  };

  // Calculate stats for sidebar
  const starRatingBreakdown = {
    7: athletes.filter(a => a.starRating === 7).length,
    6: athletes.filter(a => a.starRating === 6).length,
    5: athletes.filter(a => a.starRating === 5).length,
    4: athletes.filter(a => a.starRating === 4).length,
    3: athletes.filter(a => a.starRating === 3).length,
    2: athletes.filter(a => a.starRating === 2).length,
    1: athletes.filter(a => a.starRating === 1).length,
  };

  const getTournamentActivity = (athleteId: string) => {
    const count = tournamentActivityMap.get(athleteId) || 0;
    return count > 0 ? [{ date: new Date() }] : [];
  };

  // Fetch real favorite counts from database
  const [favoriteCounts, setFavoriteCounts] = useState<Record<string, number>>({});
  
  useEffect(() => {
    const fetchFavoriteCounts = async () => {
      if (filteredAthletes.length === 0) return;
      
      const counts: Record<string, number> = {};
      for (const athlete of filteredAthletes.slice(0, 20)) { // Limit to first 20 for performance
        const { count } = await supabase
          .from('favorites')
          .select('*', { count: 'exact', head: true })
          .eq('athlete_id', athlete.id);
        counts[athlete.id] = count || 0;
      }
      setFavoriteCounts(counts);
    };
    
    fetchFavoriteCounts();
  }, [filteredAthletes]);
  
  const getFavoriteCount = (athleteId: string) => favoriteCounts[athleteId] || 0;

  const handleDivisionChange = (division: string, checked: boolean) => {
    setDivisionFilter(prev => 
      checked 
        ? [...prev, division]
        : prev.filter(d => d !== division)
    );
  };

  return (
    <div className="p-6">
      <div className="flex gap-6">
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Athlete Management</h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                <span>Total: {athletes.length} athletes • {sortedAthletes.length} active</span>
                {archivedCount > 0 && (
                  <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                    <Archive className="h-3 w-3 mr-1" />
                    {archivedCount} archived
                  </Badge>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={fetchAthletes} disabled={isLoadingDb} className="flex-1 sm:flex-none">
                <Download className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button variant="outline" onClick={() => navigate('/admin/athletes/import')} className="flex-1 sm:flex-none">
                <Upload className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Import</span>
              </Button>
              <Button onClick={() => navigate('/admin/athletes/new')} className="flex-1 sm:flex-none">
                <UserPlus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Add Athlete</span>
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/admin/tournament-results')}
                className="flex-1 sm:flex-none"
              >
                <Trophy className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Add Results</span>
              </Button>
            </div>
          </div>

          {/* Filter Controls */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                {/* Search, Status, Tournament Filter and View Toggle */}
                <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                  <div className="relative flex-1 min-w-0 sm:min-w-[200px] lg:min-w-[300px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search athletes by name, country, region..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-full"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[130px] md:w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      {ATHLETE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {statusLabel(s)}
                          {s === 'in_college' && archivedCount > 0
                            ? ` (${archivedCount})`
                            : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={tournamentFilter} onValueChange={setTournamentFilter}>
                    <SelectTrigger className="w-full sm:w-[150px] md:w-[180px]">
                      <SelectValue placeholder="Tournament Activity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Athletes</SelectItem>
                      <SelectItem value="recent">Recent Activity</SelectItem>
                      <SelectItem value="none">No Activity</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={genderFilter} onValueChange={setGenderFilter}>
                    <SelectTrigger className="w-full sm:w-[130px] md:w-[150px]">
                      <SelectValue placeholder="All Genders" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Genders</SelectItem>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-1 border rounded-lg p-1 shrink-0 w-full sm:w-auto">
                    <Button
                      size="sm"
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      onClick={() => setViewMode('grid')}
                      className="flex-1"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={viewMode === 'table' ? 'default' : 'ghost'}
                      onClick={() => setViewMode('table')}
                      className="flex-1"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Star Rating Filter with Visual Stars */}
                <div className="flex flex-wrap items-center gap-2 md:gap-4">
                  <span className="text-sm font-medium w-full sm:w-auto">Star Rating:</span>
                  <div className="flex items-center gap-2">
                    {[...Array(starFilter[0])].map((_, i) => (
                      <Star key={`min-${i}`} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                    {starFilter[0] === 0 && <span className="text-sm text-muted-foreground">0</span>}
                  </div>
                  <Slider
                    value={starFilter}
                    onValueChange={setStarFilter}
                    max={7}
                    min={0}
                    step={1}
                    className="flex-1 min-w-[200px] max-w-xs"
                  />
                  <div className="flex items-center gap-2">
                    {[...Array(starFilter[1])].map((_, i) => (
                      <Star key={`max-${i}`} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
                  
                {/* Advanced Filters Sheet */}
                <div className="flex justify-end">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Filter className="mr-2 h-3 w-3" />
                        Advanced Filters
                      </Button>
                    </SheetTrigger>
                    <SheetContent>
                      <SheetHeader>
                        <SheetTitle className="text-lg sm:text-xl">Advanced Filters</SheetTitle>
                        <SheetDescription className="text-sm sm:text-base">
                          Apply multiple filters to narrow down athlete search
                        </SheetDescription>
                      </SheetHeader>
                      <div className="space-y-6 py-6">
                        {/* Division Preference */}
                        <div>
                          <Label className="text-sm font-medium mb-3 block">Division Preference</Label>
                          <div className="space-y-2">
                            {['NCAA D1', 'NCAA D2', 'NCAA D3', 'NAIA', 'NJCAA 1', 'NJCAA 2'].map(division => (
                              <div key={division} className="flex items-center space-x-2">
                                <Checkbox 
                                  id={division}
                                  checked={divisionFilter.includes(division)}
                                  onCheckedChange={(checked) => handleDivisionChange(division, checked as boolean)}
                                />
                                <label htmlFor={division} className="text-sm cursor-pointer">
                                  {division}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Budget Range */}
                        <div>
                          <Label className="text-sm font-medium mb-3 block">
                            Budget Range: {budgetRange[0].toLocaleString()} - {budgetRange[1].toLocaleString()}
                          </Label>
                          <Slider
                            value={budgetRange}
                            onValueChange={setBudgetRange}
                            max={100000}
                            min={0}
                            step={5000}
                            className="w-full"
                          />
                        </div>

                        {/* Graduation Year */}
                        <div>
                          <Label htmlFor="gradYear" className="text-sm font-medium mb-2 block">Graduation Year</Label>
                          <Select value={graduationYear} onValueChange={setGraduationYear}>
                            <SelectTrigger id="gradYear">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Years</SelectItem>
                              <SelectItem value="2024">2024</SelectItem>
                              <SelectItem value="2025">2025</SelectItem>
                              <SelectItem value="2026">2026</SelectItem>
                              <SelectItem value="2027">2027</SelectItem>
                              <SelectItem value="2028">2028</SelectItem>
                              <SelectItem value="2029">2029</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Country/Region */}
                        <div>
                          <Label htmlFor="country" className="text-sm font-medium mb-2 block">Country/Region</Label>
                          <Select value={countryFilter} onValueChange={setCountryFilter}>
                            <SelectTrigger id="country">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Countries</SelectItem>
                              <SelectItem value="France">France</SelectItem>
                              <SelectItem value="USA">United States</SelectItem>
                              <SelectItem value="Canada">Canada</SelectItem>
                              <SelectItem value="UK">United Kingdom</SelectItem>
                              <SelectItem value="Germany">Germany</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={handleClearAllFilters}
                        >
                          Clear All Filters
                        </Button>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>

                {/* Bulk Operations Bar */}
                {selectedAthletes.length > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Checkbox 
                      checked={selectedAthletes.length === sortedAthletes.length}
                      onCheckedChange={(checked) => {
                        setSelectedAthletes(checked ? sortedAthletes.map(a => a.id) : []);
                      }}
                    />
                    <span className="text-sm font-medium">
                      {selectedAthletes.length} selected
                    </span>
                    <div className="flex gap-2 ml-auto">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleBulkAction('archive')}
                      >
                        Archive
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleBulkAction('export')}
                      >
                        Export
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleBulkAction('update')}
                      >
                        Update Status
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleBulkAction('tournament')}
                      >
                        Add Tournament Results
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Athletes Grid/Table View */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedAthletes.map((athlete) => {
                const tournamentActivity = getTournamentActivity(athlete.id);
                const favoriteCount = getFavoriteCount(athlete.id);
                
                return (
                  <Card key={athlete.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      {/* Card Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={athlete.profileImage} />
                            <AvatarFallback>
                              {athlete.firstName[0]}{athlete.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold">
                              {athlete.firstName} {athlete.lastName}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {athlete.hometown || 'France'}
                              {athlete.dateOfBirth && ` • Age ${calculateAge(athlete.dateOfBirth) ?? 'N/A'}`}
                            </p>
                          </div>
                        </div>
                        <Checkbox 
                          checked={selectedAthletes.includes(athlete.id)}
                          onCheckedChange={(checked) => {
                            setSelectedAthletes(prev => 
                              checked 
                                ? [...prev, athlete.id]
                                : prev.filter(id => id !== athlete.id)
                            );
                          }}
                        />
                      </div>

                      {/* Star Rating */}
                      <div className="flex items-center gap-1 mb-3">
                        {[...Array(7)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={cn(
                              "h-4 w-4",
                              i < athlete.starRating 
                                ? "fill-yellow-400 text-yellow-400" 
                                : "text-gray-300"
                            )}
                          />
                        ))}
                      </div>

                      {/* Status badge — shown for every athlete (Building / Available /
                          Committed / In College / Transfer) for at-a-glance scanning */}
                      <div className="mb-2">
                        <Badge className={STATUS_BADGE_CLASSES[athlete.status]}>
                          {statusLabel(athlete.status)}
                          {(athlete.status === 'committed' || athlete.status === 'in_college') &&
                          (athlete as any).committed_to
                            ? ` · ${(athlete as any).committed_to}`
                            : ''}
                        </Badge>
                      </div>

                      {/* Key Stats */}
                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <GraduationCap className="h-3 w-3" />
                            GPA
                          </span>
                          <span className="font-medium">{athlete.gpa.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            Budget
                          </span>
                          <span className="font-medium">
                            {athlete.budget ? `${athlete.budget.toLocaleString()}` : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Division</span>
                          <Badge variant="outline" className="text-xs">
                            {athlete.preferredDivisions?.join(', ') || 'N/A'}
                          </Badge>
                        </div>
                      </div>

                      {/* Tournament & Popularity Indicators */}
                      <div className="flex items-center justify-between mb-3">
                        {tournamentActivity.length > 0 ? (
                          <Badge className="bg-green-500 text-xs">
                            <Trophy className="h-3 w-3 mr-1" />
                            Recent Tournament
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            No Recent Activity
                          </Badge>
                        )}
                        {favoriteCount > 15 && (
                          <Badge variant="secondary" className="text-xs">
                            <Heart className="h-3 w-3 mr-1" />
                            Popular
                          </Badge>
                        )}
                      </div>

                      {/* Quick Actions */}
                      <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="flex-1 bg-orange-500 hover:bg-orange-600 text-white hover:text-white"
                        onClick={() => handleAthleteClick(athlete.id, 'view')}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="flex-1"
                        onClick={() => handleAthleteClick(athlete.id, 'edit')}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleCopyProfileLink(athlete)}>
                              <Share2 className="mr-2 h-4 w-4" />
                              Copy Profile Link
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateAthlete(athlete.id)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownloadOnePager(athlete)}>
                              <FileDown className="mr-2 h-4 w-4" />
                              Download recruiting PDF
                            </DropdownMenuItem>
                            {isAdmin && (
                              <>
                                {athlete.status === 'in_college' ? (
                                  <DropdownMenuItem onClick={() => handleRestoreAthlete(athlete.id)}>
                                    <ArchiveRestore className="mr-2 h-4 w-4" />
                                    Restore
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => handleArchiveAthlete(athlete.id)}>
                                    <Archive className="mr-2 h-4 w-4" />
                                    Archive
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setAthleteToDelete(athlete.id);
                                    setDeleteDialogOpen(true);
                                  }}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="w-full">
                  <div className="min-w-[800px]">
                    <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox 
                          checked={selectedAthletes.length === sortedAthletes.length && sortedAthletes.length > 0}
                          onCheckedChange={(checked) => {
                            setSelectedAthletes(checked ? sortedAthletes.map(a => a.id) : []);
                          }}
                        />
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center gap-1">
                          Athlete
                          {sortBy === 'name' && (
                            sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('starRating')}
                      >
                        <div className="flex items-center gap-1">
                          Star Rating
                          {sortBy === 'starRating' && (
                            sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('gpa')}
                      >
                        <div className="flex items-center gap-1">
                          GPA
                          {sortBy === 'gpa' && (
                            sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('budget')}
                      >
                        <div className="flex items-center gap-1">
                          Budget
                          {sortBy === 'budget' && (
                            sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>Division</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('tournament')}
                      >
                        <div className="flex items-center gap-1">
                          Tournament Activity
                          {sortBy === 'tournament' && (
                            sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('lastUpdated')}
                      >
                        <div className="flex items-center gap-1">
                          Last Updated
                          {sortBy === 'lastUpdated' && (
                            sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedAthletes.map((athlete) => {
                      const tournamentActivity = getTournamentActivity(athlete.id);
                      
                      return (
                        <TableRow key={athlete.id}>
                          <TableCell>
                            <Checkbox 
                              checked={selectedAthletes.includes(athlete.id)}
                              onCheckedChange={(checked) => {
                                setSelectedAthletes(prev => 
                                  checked 
                                    ? [...prev, athlete.id]
                                    : prev.filter(id => id !== athlete.id)
                                );
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={athlete.profileImage} />
                                <AvatarFallback>
                                  {athlete.firstName[0]}{athlete.lastName[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {athlete.firstName} {athlete.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {athlete.hometown || 'France'}
                                  {athlete.dateOfBirth && ` • Age ${calculateAge(athlete.dateOfBirth) ?? 'N/A'}`}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {[...Array(7)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={cn(
                                    "h-4 w-4",
                                    i < athlete.starRating 
                                      ? "fill-yellow-400 text-yellow-400" 
                                      : "text-gray-300"
                                  )}
                                />
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{athlete.gpa.toFixed(2)}</TableCell>
                          <TableCell>
                            {athlete.budget ? `${athlete.budget.toLocaleString()}` : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {athlete.preferredDivisions?.join(', ') || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {tournamentActivity.length > 0 ? (
                              <Badge className="bg-green-500">
                                <Trophy className="h-3 w-3 mr-1" />
                                {tournamentActivityMap.get(athlete.id) || 0} tournaments
                              </Badge>
                            ) : (
                              <Badge variant="outline">No Recent</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {format(new Date(), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleAthleteClick(athlete.id, 'view')}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAthleteClick(athlete.id, 'edit')}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                              </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCopyProfileLink(athlete)}>
                                  <Share2 className="mr-2 h-4 w-4" />
                                  Copy Profile Link
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicateAthlete(athlete.id)}>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownloadOnePager(athlete)}>
                                  <FileDown className="mr-2 h-4 w-4" />
                                  Download recruiting PDF
                                </DropdownMenuItem>
                                {isAdmin && (
                                  <>
                                    {athlete.status === 'in_college' ? (
                                      <DropdownMenuItem onClick={() => handleRestoreAthlete(athlete.id)}>
                                        <ArchiveRestore className="mr-2 h-4 w-4" />
                                        Restore
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem onClick={() => handleArchiveAthlete(athlete.id)}>
                                        <Archive className="mr-2 h-4 w-4" />
                                        Archive
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => {
                                        setAthleteToDelete(athlete.id);
                                        setDeleteDialogOpen(true);
                                      }}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Stats Sidebar */}
        <div className="w-80 shrink-0 hidden xl:block">
          <div className="sticky top-6 space-y-4">
            {/* Quick Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Athletes</span>
                    <span className="font-medium">{athletes.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Active Profiles</span>
                    <span className="font-medium text-green-500">
                      {athletes.filter(a => a.status === 'available').length}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Need Completion</span>
                    <span className="font-medium text-yellow-500">8</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Athletes by Star Rating */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Athletes by Star Rating</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[6, 5, 4, 3, 2, 1].map(rating => {
                  const count = starRatingBreakdown[rating as keyof typeof starRatingBreakdown];
                  const percentage = athletes.length > 0 ? (count / athletes.length * 100).toFixed(0) : 0;
                  
                  return (
                    <div key={rating} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center">
                            {[...Array(rating)].map((_, i) => (
                              <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                          <span className="text-muted-foreground">({count})</span>
                        </div>
                        <span className="font-medium">{percentage}%</span>
                      </div>
                      <Progress value={Number(percentage)} className="h-2" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Popular Athletes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Most Popular This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sortedAthletes.slice(0, 3).map((athlete, index) => (
                    <div key={athlete.id} className="flex items-center gap-3">
                      <div className="text-lg font-bold text-muted-foreground">#{index + 1}</div>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {athlete.firstName[0]}{athlete.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {athlete.firstName} {athlete.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <Heart className="h-3 w-3 inline mr-1" />
                          {getFavoriteCount(athlete.id)} coaches
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tournament Activity Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tournament Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Athletes with Results</span>
                  <span className="font-medium text-green-500">
                    {tournamentActivityMap.size}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Results</span>
                  <span className="font-medium">
                    {Array.from(tournamentActivityMap.values()).reduce((sum, count) => sum + count, 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Athletes Without Results</span>
                  <span className="font-medium text-yellow-500">{athletes.length - tournamentActivityMap.size}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the athlete profile
              and remove all associated data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAthlete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Athlete Profile Modal */}
      {/* Modal removed - using dedicated view page at /admin/athletes/:id/view */}
    </div>
  );
};

export default AthleteManagement;

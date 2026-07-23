import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  Heart, 
  Grid3x3, 
  List, 
  Download, 
  Save,
  Trophy,
  Star,
  Calendar,
  MapPin,
  DollarSign,
  TrendingUp,
  Activity,
  X,
  ChevronRight,
  Table,
  Columns3,
  Users,
  User,
  TrendingDown,
  Clock,
  Eye,
  UserPlus,
  FileDown,
  Share2,
  CheckSquare,
  MoreVertical,
  AlertCircle,
  ArrowUpRight,
  Award,
  Menu,
  FileText,
  Info
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

import { Athlete } from '@/types/athlete';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { normalizeStatus } from '@/lib/athleteStatus';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import ContactRequestModal from '@/components/ContactRequestModal';
import PDFExportModal from '@/components/PDFExportModal';
import AthleteProfileModal from '@/components/AthleteProfileModal';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { BestRecentScoreDisplay } from '@/components/BestRecentScoreDisplay';
import { BestRecentVsCRDisplay } from '@/components/BestRecentVsCRDisplay';

import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';

import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from '@/lib/utils';
import { CollapsibleFilterSidebar } from '@/components/CollapsibleFilterSidebar';
import { normalizeDivisionsWithDefault, normalizeWeatherZones, normalizeIntendedMajors } from '@/lib/divisionNormalizer';
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const Athletes = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'name' | 'tournament'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table' | 'comparison'>('grid');
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [gpaRange, setGpaRange] = useState<[number, number]>([2.0, 4.0]);
  const [handicapMax, setHandicapMax] = useState<number>(20);
  const [budgetRange, setBudgetRange] = useState<[number, number]>([0, 80000]);
  const [starRating, setStarRating] = useState<number>(0);
  const [weatherZones, setWeatherZones] = useState<string[]>([]);
  const [showNewOnly, setShowNewOnly] = useState<boolean>(false);
  const [gender, setGender] = useState<string>('all');
  const [averageScore, setAverageScore] = useState<[number, number]>([65, 85]);
  const [scoreVsRating, setScoreVsRating] = useState<[number, number]>([-4, 15]);
  const [drivingDistance, setDrivingDistance] = useState<[number, number]>([180, 330]);
  // Dual Rise — tennis filters
  const [utrRange, setUtrRange] = useState<[number, number]>([1, 16.5]);
  const [wtnRange, setWtnRange] = useState<[number, number]>([1, 40]);
  const [surfaces, setSurfaces] = useState<string[]>([]);
  const [tournamentFilters, setTournamentFilters] = useState({
    minTournaments: 0,
    bestFinish: 100,
    tournamentTypes: [] as string[],
    recentActivity: 'all'
  });
  const [favorites, setFavorites] = useState<string[]>([]);
  const [filteredAthletes, setFilteredAthletes] = useState<Athlete[]>([]);
  const [sortBy, setSortBy] = useState('class');
  const [resultsPerPage, setResultsPerPage] = useState(12);
  const [currentPage, setCurrentPage] = useState(() => {
    // Restore current page from sessionStorage if available
    const savedPage = sessionStorage.getItem('athleteListPage');
    return savedPage ? parseInt(savedPage, 10) : 1;
  });
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [comparisonAthletes, setComparisonAthletes] = useState<string[]>([]);
  const [dbAthletes, setDbAthletes] = useState<Athlete[]>([]);
  const [dbResults, setDbResults] = useState<any[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState(true);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showPDFExportModal, setShowPDFExportModal] = useState(false);
  const [showSaveSearchDialog, setShowSaveSearchDialog] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [selectedAthleteForContact, setSelectedAthleteForContact] = useState<Athlete | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedAthleteForProfile, setSelectedAthleteForProfile] = useState<Athlete | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [athletesQueueForContact, setAthletesQueueForContact] = useState<Athlete[]>([]);
  const [currentAthleteIndex, setCurrentAthleteIndex] = useState<number>(0);
  
  // Restore scroll position after data loads
  useEffect(() => {
    if (!isLoadingDb && dbAthletes.length > 0) {
      const savedScrollPos = sessionStorage.getItem('athleteListScrollPos');
      if (savedScrollPos) {
        // Delay slightly to ensure DOM has rendered
        setTimeout(() => {
          window.scrollTo(0, parseInt(savedScrollPos, 10));
          // Clear after restoring to prevent re-scrolling on other navigations
          sessionStorage.removeItem('athleteListScrollPos');
        }, 100);
      }
    }
  }, [isLoadingDb, dbAthletes.length]);
  
  // Save current page to sessionStorage when it changes
  useEffect(() => {
    sessionStorage.setItem('athleteListPage', currentPage.toString());
  }, [currentPage]);

  // Division normalization is now handled by the shared divisionNormalizer utility

  // Apply filters from location state (from saved search navigation)
  useEffect(() => {
    if (location.state?.filters) {
      const savedFilters = location.state.filters;
      
      // Apply all filter values from the saved search
      if (savedFilters.selectedDivisions) setSelectedDivisions(savedFilters.selectedDivisions);
      if (savedFilters.selectedYears) setSelectedYears(savedFilters.selectedYears);
      if (savedFilters.gpaRange) setGpaRange(savedFilters.gpaRange);
      if (savedFilters.handicapMax !== undefined) setHandicapMax(savedFilters.handicapMax);
      if (savedFilters.budgetRange) setBudgetRange(savedFilters.budgetRange);
      if (savedFilters.starRating !== undefined) setStarRating(savedFilters.starRating);
      if (savedFilters.weatherZones) setWeatherZones(savedFilters.weatherZones);
      if (savedFilters.showNewOnly !== undefined) setShowNewOnly(savedFilters.showNewOnly);
      if (savedFilters.gender) setGender(savedFilters.gender);
      if (savedFilters.averageScore) setAverageScore(savedFilters.averageScore);
      if (savedFilters.scoreVsRating) setScoreVsRating(savedFilters.scoreVsRating);
      if (savedFilters.drivingDistance) setDrivingDistance(savedFilters.drivingDistance);
      
      // Apply tournament filters
      if (savedFilters.bestFinish !== undefined || savedFilters.tournamentTypes || savedFilters.recentActivity) {
        setTournamentFilters(prev => ({
          ...prev,
          ...(savedFilters.bestFinish !== undefined && { bestFinish: savedFilters.bestFinish }),
          ...(savedFilters.tournamentTypes && { tournamentTypes: savedFilters.tournamentTypes }),
          ...(savedFilters.recentActivity && { recentActivity: savedFilters.recentActivity })
        }));
      }
      
      // Clear the location state to prevent reapplying on navigation
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Handle saved search filters from Edit or Share actions
  useEffect(() => {
    // Handle Edit Search from Saved Searches page
    if (location.state?.applySavedSearch) {
      const filters = location.state.applySavedSearch;
      
      // Apply filters to state
      if (filters.starRatingMin) setStarRating(filters.starRatingMin);
      if (filters.gpaMin !== undefined) setGpaRange([filters.gpaMin, gpaRange[1]]);
      if (filters.gpaMax !== undefined) setGpaRange([gpaRange[0], filters.gpaMax]);
      if (filters.budgetMin !== undefined) setBudgetRange([filters.budgetMin, budgetRange[1]]);
      if (filters.budgetMax !== undefined) setBudgetRange([budgetRange[0], filters.budgetMax]);
      if (filters.preferredDivision?.length) setSelectedDivisions(filters.preferredDivision);
      if (filters.graduationYear?.length) setSelectedYears(filters.graduationYear.map(String));
      if (filters.weatherZones?.length) setWeatherZones(filters.weatherZones);
      if (filters.gender) setGender(filters.gender);
      if (filters.averageScoreMin !== undefined || filters.averageScoreMax !== undefined) {
        setAverageScore([filters.averageScoreMin || averageScore[0], filters.averageScoreMax || averageScore[1]]);
      }
      if (filters.scoreVsRatingMin !== undefined || filters.scoreVsRatingMax !== undefined) {
        setScoreVsRating([filters.scoreVsRatingMin || scoreVsRating[0], filters.scoreVsRatingMax || scoreVsRating[1]]);
      }
      
      toast({
        title: "Search filters applied",
        description: `Loaded filters from "${location.state.searchName}"`,
      });
      
      // Clear the state to prevent reapplying on future navigation
      window.history.replaceState({}, document.title);
    }
    
    // Handle Share link with URL parameters
    const params = new URLSearchParams(location.search);
    const sharedSearchName = params.get('shared_search');
    const filtersParam = params.get('filters');
    
    if (sharedSearchName && filtersParam) {
      try {
        const filters = JSON.parse(decodeURIComponent(filtersParam));
        
        // Apply filters to state (same logic as above)
        if (filters.starRatingMin) setStarRating(filters.starRatingMin);
        if (filters.gpaMin !== undefined) setGpaRange([filters.gpaMin, gpaRange[1]]);
        if (filters.gpaMax !== undefined) setGpaRange([gpaRange[0], filters.gpaMax]);
        if (filters.budgetMin !== undefined) setBudgetRange([filters.budgetMin, budgetRange[1]]);
        if (filters.budgetMax !== undefined) setBudgetRange([budgetRange[0], filters.budgetMax]);
        if (filters.preferredDivision?.length) setSelectedDivisions(filters.preferredDivision);
        if (filters.graduationYear?.length) setSelectedYears(filters.graduationYear.map(String));
        if (filters.weatherZones?.length) setWeatherZones(filters.weatherZones);
        if (filters.gender) setGender(filters.gender);
        if (filters.averageScoreMin !== undefined || filters.averageScoreMax !== undefined) {
          setAverageScore([filters.averageScoreMin || averageScore[0], filters.averageScoreMax || averageScore[1]]);
        }
        if (filters.scoreVsRatingMin !== undefined || filters.scoreVsRatingMax !== undefined) {
          setScoreVsRating([filters.scoreVsRatingMin || scoreVsRating[0], filters.scoreVsRatingMax || scoreVsRating[1]]);
        }
        
        toast({
          title: "Shared search loaded",
          description: `Viewing results for "${sharedSearchName}"`,
        });
        
        // Clean up URL params
        navigate('/athletes', { replace: true });
      } catch (err) {
        console.error('Error parsing shared search:', err);
        toast({
          title: "Error loading shared search",
          description: "The link may be invalid or corrupted.",
          variant: "destructive"
        });
      }
    }
  }, [location.state, location.search]);

  // Fetch athletes and favorites from Supabase on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingDb(true);
      try {
        // Only filter out committed athletes for coaches, not admins/agents
        const isCoach = userProfile?.role === 'coach';
        const athletesQuery = supabase.from('athletes_safe' as any).select('*');
        // Coaches never see in_creation (profiles in preparation), committed,
        // or in_college/archived (already placed) in the catalogue.
        const athletesRes = await (isCoach
          ? athletesQuery
              .not('status', 'ilike', 'in_creation')
              .not('status', 'ilike', 'committed')
              .not('status', 'ilike', 'archived')
              .not('status', 'ilike', 'in_college')
          : athletesQuery
        );
        
        const [resultsRes, favoritesRes] = await Promise.all([
          supabase.from('tournament_results').select(`
            *,
            tournaments (
              name,
              year,
              course_rating,
              course_par,
              start_date,
              end_date,
              field_size,
              results_link
            )
          `),
          user ? supabase.from('favorites').select('athlete_id').eq('coach_id', user.id) : Promise.resolve({ data: [], error: null }),
        ]);

        if (athletesRes.error) {
          console.error('Error fetching athletes:', athletesRes.error);
          setDbAthletes([]);
        } else if (athletesRes.data) {
          const mappedAthletes: Athlete[] = athletesRes.data.map((athlete: any) => {
            // Parse scoring_average_vs_course_rating - handle string values from DB
            let svcr = 0;
            if (athlete.scoring_average_vs_course_rating) {
              const parsed = parseFloat(athlete.scoring_average_vs_course_rating);
              svcr = Number.isFinite(parsed) ? parsed : 0;
            }
            
            // Derive high school year from graduation year
            const getHighSchoolYear = (gradYear?: string): 'Freshman' | 'Sophomore' | 'Junior' | 'Senior' | 'Gap Year' | 'Undergraduate in France' | 'In College - Freshman' | 'In College - Sophomore' | 'In College - Junior' | 'In College - Senior' => {
              if (!gradYear) return 'Senior';
              const gradYearNum = parseInt(gradYear);
              if (isNaN(gradYearNum)) return 'Senior';
              const now = new Date();
              const currentYear = now.getFullYear();
              const currentMonth = now.getMonth(); // 0-11
              // After August (month 7), we're in the next academic year
              const academicYear = currentMonth >= 7 ? currentYear + 1 : currentYear;
              const yearsUntilGrad = gradYearNum - academicYear;
              
              if (yearsUntilGrad <= 0) return 'Senior';
              if (yearsUntilGrad === 1) return 'Junior';
              if (yearsUntilGrad === 2) return 'Sophomore';
              if (yearsUntilGrad === 3) return 'Freshman';
              return 'Undergraduate in France';
            };
            
            return ({
              id: athlete.id,
              firstName: athlete.first_name || '',
              lastName: athlete.last_name || '',
              email: '',
              gpa: athlete.academic_gpa != null ? Number(athlete.academic_gpa) : undefined,
              intendedMajors: athlete.intended_majors || '',
              highSchoolYear: getHighSchoolYear(athlete.graduation_year),
              duolingoScore: Number(athlete.duolingo) || undefined,
              satScore: Number(athlete.sat) || undefined,
              currentSchool: athlete.golf_club_team || '',
              scoringAverage: athlete.scoring_average ? Number(athlete.scoring_average) : undefined,
              bestRecentScoringAvg: athlete.best_recent_scoring_avg_raw ? Number(athlete.best_recent_scoring_avg_raw) : undefined,
              scoringAverageVsCourseRating: svcr,
              best_recent_scoring_avg: athlete.best_recent_scoring_avg,
              best_recent_period: athlete.best_recent_period,
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
              committedTo: athlete.committed_to || undefined,
              statusExpiresAt: athlete.status_expires_at ? new Date(athlete.status_expires_at) : undefined,
              graduationYear: athlete.graduation_year || '2025',
              preferredMajors: normalizeIntendedMajors(athlete.intended_majors),
              // Derive a basic handicap proxy from Scoring vs Course Rating if available
              handicap: svcr > 0 ? Math.max(0, svcr) : undefined,
              sex: athlete.sex || undefined,
              profileImage: athlete.profile_photo || undefined,
            });
          });
          setDbAthletes(mappedAthletes);
        }

        if (resultsRes.error) {
          console.error('Error fetching tournament_results:', resultsRes.error);
          setDbResults([]);
        } else if (resultsRes.data) {
          setDbResults(resultsRes.data);
        }

        // Set favorites from database
        if (favoritesRes.data && !favoritesRes.error) {
          const favoriteIds = favoritesRes.data.map((fav: any) => fav.athlete_id);
          setFavorites(favoriteIds);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setDbAthletes([]);
        setDbResults([]);
      } finally {
        setIsLoadingDb(false);
      }
    };

    fetchData();
  }, [user, userProfile]);

  useEffect(() => {
    filterAthletes();
  }, [searchQuery, searchType, selectedDivisions, selectedYears, gpaRange,
      budgetRange, starRating, weatherZones, tournamentFilters, sortBy, dbAthletes, dbResults, showNewOnly, gender, utrRange, wtnRange, surfaces]);

  const filterAthletes = () => {
    // Use database athletes only
    let filtered = [...dbAthletes];

    // Search filter based on type
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (searchType === 'name') {
        filtered = filtered.filter(athlete => 
          athlete.firstName.toLowerCase().includes(query) ||
          athlete.lastName.toLowerCase().includes(query)
        );
      } else if (searchType === 'tournament') {
        // Filter by tournament participation (mock implementation)
        filtered = filtered.filter(athlete => 
          athlete.achievements?.some(achievement => 
            achievement.toLowerCase().includes(query)
          )
        );
      } else {
        filtered = filtered.filter(athlete => 
          athlete.firstName.toLowerCase().includes(query) ||
          athlete.lastName.toLowerCase().includes(query) ||
          athlete.intendedMajors?.toLowerCase().includes(query) ||
          athlete.hometown?.toLowerCase().includes(query)
        );
      }
    }

    // Division filter - check if any of athlete's divisions match selected filters
    if (selectedDivisions.length > 0) {
      filtered = filtered.filter(athlete => {
        const athleteDivisions = athlete.preferredDivisions || [];
        return selectedDivisions.some(selectedDiv => 
          athleteDivisions.includes(selectedDiv)
        );
      });
    }

    // Gender filter
    if (gender !== 'all') {
      filtered = filtered.filter(athlete => {
        if (!athlete.sex) return false;
        const athleteSex = athlete.sex.toLowerCase();
        const filterGender = gender.toLowerCase();
        
        // Handle multiple possible formats
        return athleteSex === filterGender || // exact match
               (filterGender === 'male' && (athleteSex === 'men' || athleteSex === 'm')) ||
               (filterGender === 'female' && (athleteSex === 'women' || athleteSex === 'f'));
      });
    }

    // Year filter (graduation year)
    if (selectedYears.length > 0) {
      filtered = filtered.filter(athlete => {
        // Check if "Transfer" is selected and athlete is a transfer student
        if (selectedYears.includes('Transfer') && athlete.studentType === 'transfer') {
          return true;
        }
        // Check graduation year — supports multi-class athletes ("2028, 2027")
        if (athlete.graduationYear) {
          const years = athlete.graduationYear.toString().split(',').map(y => y.trim());
          return years.some(y => selectedYears.includes(y));
        }
        return false;
      });
    }

    // GPA filter - only apply to athletes with defined GPA
    filtered = filtered.filter(athlete => {
      // If athlete has no GPA defined, include them
      if (athlete.gpa === undefined) return true;
      // Otherwise apply GPA range filter
      return athlete.gpa >= gpaRange[0] && athlete.gpa <= gpaRange[1];
    });

    // UTR range filter — only apply when narrowed from the default [1, 16.5]
    if (utrRange[0] !== 1 || utrRange[1] !== 16.5) {
      filtered = filtered.filter(athlete => {
        if (athlete.utr == null) return true; // keep athletes with no UTR yet
        return athlete.utr >= utrRange[0] && athlete.utr <= utrRange[1];
      });
    }

    // WTN range filter (lower is better) — only apply when narrowed from default
    if (wtnRange[0] !== 1 || wtnRange[1] !== 40) {
      filtered = filtered.filter(athlete => {
        if (athlete.wtn == null) return true;
        return athlete.wtn >= wtnRange[0] && athlete.wtn <= wtnRange[1];
      });
    }

    // Preferred surface filter
    if (surfaces.length > 0) {
      filtered = filtered.filter(athlete => {
        if (!athlete.preferredSurface) return true;
        return surfaces.some(s => athlete.preferredSurface!.toLowerCase().includes(s.toLowerCase()));
      });
    }

    // Budget filter - only apply to athletes with defined budgets
    filtered = filtered.filter(athlete => {
      // If athlete has no budget defined, include them (they have no budget restriction)
      if (athlete.budget === undefined) return true;
      // Otherwise apply budget range filter
      return athlete.budget >= budgetRange[0] && athlete.budget <= budgetRange[1];
    });

    // Star rating filter
    if (starRating > 0) {
      filtered = filtered.filter(athlete => 
        athlete.starRating >= starRating
      );
    }

    // Weather zone filter
    if (weatherZones.length > 0) {
      filtered = filtered.filter(athlete => {
        // Include athletes with no weather zone defined
        if (!athlete.weatherZone) return true;
        // Check if any selected zone is contained in the athlete's weatherZone string
        return weatherZones.some(zone => 
          athlete.weatherZone.includes(zone)
        );
      });
    }

    // Tournament filters using Supabase results
    if (tournamentFilters.minTournaments > 0) {
      filtered = filtered.filter(athlete => 
        dbResults.filter(r => r.athlete_id === athlete.id).length >= tournamentFilters.minTournaments
      );
    }
    
    // New athletes filter (added within last 2 weeks)
    if (showNewOnly) {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      filtered = filtered.filter(athlete => 
        new Date(athlete.createdAt) >= twoWeeksAgo
      );
    }

    // Sort athletes
    filtered = sortAthletes(filtered, sortBy);

    setFilteredAthletes(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const sortAthletes = (athletes: Athlete[], sortBy: string) => {
    const sorted = [...athletes];
    switch(sortBy) {
      case 'class':
        return sorted.sort((a, b) => {
          // Prefer graduation year for precise sorting
          if (a.graduationYear && b.graduationYear) {
            const yearA = parseInt(a.graduationYear as string) || 0;
            const yearB = parseInt(b.graduationYear as string) || 0;
            return yearA - yearB;
          }
          // Fallback to high school year order
          const yearOrder: { [key: string]: number } = {
            'Freshman': 1,
            'Sophomore': 2,
            'Junior': 3,
            'Senior': 4,
            'Gap Year': 5,
            'Undergraduate in France': 6
          };
          const orderA = a.graduationYear ? parseInt(a.graduationYear as string) || 0 : yearOrder[a.highSchoolYear] || 999;
          const orderB = b.graduationYear ? parseInt(b.graduationYear as string) || 0 : yearOrder[b.highSchoolYear] || 999;
          return orderA - orderB;
        });
      case 'sex':
        return sorted.sort((a, b) => {
          const sexA = a.sex || '';
          const sexB = b.sex || '';
          return sexA.localeCompare(sexB);
        });
      case 'gpa':
        return sorted.sort((a, b) => b.gpa - a.gpa);
      case 'starRating':
        return sorted.sort((a, b) => b.starRating - a.starRating);
      case 'utr':
        return sorted.sort((a, b) => {
          // Higher UTR is better; athletes without a UTR sink to the bottom.
          const aU = a.utr != null ? a.utr : -1;
          const bU = b.utr != null ? b.utr : -1;
          return bU - aU;
        });
      case 'recent':
        return sorted.sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      case 'tournament':
        return sorted.sort((a, b) => {
          const aCount = dbResults.filter(r => r.athlete_id === a.id).length;
          const bCount = dbResults.filter(r => r.athlete_id === b.id).length;
          return bCount - aCount;
        });
      default:
        return sorted;
    }
  };
  
  const toggleFavorite = async (athleteId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to add favorites",
        variant: "destructive"
      });
      return;
    }

    const isFavorite = favorites.includes(athleteId);
    
    if (isFavorite) {
      // Remove from favorites
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('coach_id', user.id)
        .eq('athlete_id', athleteId);
      
      if (error) {
        console.error('Error removing favorite:', error);
        toast({
          title: "Error",
          description: "Failed to remove from favorites",
          variant: "destructive"
        });
      } else {
        setFavorites(prev => prev.filter(id => id !== athleteId));
        toast({
          title: "Removed from Favorites",
          description: "Athlete removed from your favorites",
        });
      }
    } else {
      // Add to favorites
      const { error } = await supabase
        .from('favorites')
        .insert({
          coach_id: user.id,
          athlete_id: athleteId,
          status: 'interested'
        });
      
      if (error) {
        console.error('Error adding favorite:', error);
        toast({
          title: "Error",
          description: "Failed to add to favorites",
          variant: "destructive"
        });
      } else {
        setFavorites(prev => [...prev, athleteId]);
        toast({
          title: "Added to Favorites",
          description: "Athlete added to your favorites",
        });
      }
    }
  };

  const toggleSelection = (athleteId: string) => {
    setSelectedAthletes(prev => 
      prev.includes(athleteId) 
        ? prev.filter(id => id !== athleteId)
        : [...prev, athleteId]
    );
  };

  const toggleComparison = (athleteId: string) => {
    if (comparisonAthletes.includes(athleteId)) {
      setComparisonAthletes(prev => prev.filter(id => id !== athleteId));
    } else if (comparisonAthletes.length < 4) {
      setComparisonAthletes(prev => [...prev, athleteId]);
    } else {
      toast({
        title: "Maximum comparison limit",
        description: "You can compare up to 4 athletes at a time.",
        variant: "destructive"
      });
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedDivisions([]);
    setSelectedYears([]);
    setGpaRange([2.0, 4.0]);
    setHandicapMax(20);
    setBudgetRange([0, 80000]);
    setStarRating(0);
    setWeatherZones([]);
    setShowNewOnly(false);
    setGender('all');
    setUtrRange([1, 16.5]);
    setWtnRange([1, 40]);
    setSurfaces([]);
    setTournamentFilters({
      minTournaments: 0,
      bestFinish: 100,
      tournamentTypes: [],
      recentActivity: 'all'
    });
  };

  const saveSearch = () => {
    setShowSaveSearchDialog(true);
  };

  const handleSaveSearchConfirm = async () => {
    if (saveSearchName.trim()) {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Please log in",
          description: "You need to be logged in to save searches.",
          variant: "destructive"
        });
        return;
      }

      // Save to Supabase database instead of localStorage
      const { error } = await supabase
        .from('saved_searches')
        .insert([{
          coach_id: user.id,
          name: saveSearchName,
          search_criteria: {
            searchQuery,
            preferredDivisions: selectedDivisions,
            highSchoolYear: selectedYears,
            gpaMin: gpaRange[0],
            gpaMax: gpaRange[1],
            handicapMax,
            budgetMin: budgetRange[0],
            budgetMax: budgetRange[1],
            starRatingMin: starRating,
            scoringAvgMin: averageScore[0],
            scoringAvgMax: averageScore[1],
            scoreVsCRMin: scoreVsRating[0],
            scoreVsCRMax: scoreVsRating[1]
          },
          is_alert_enabled: false,
          alert_frequency: 'daily',
          match_count: 0,
          new_matches_count: 0
        }]);

      if (error) {
        toast({
          title: "Error saving search",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Search saved",
        description: `Your search "${saveSearchName}" has been saved successfully.`,
      });
      setShowSaveSearchDialog(false);
      setSaveSearchName('');
    }
  };

  const exportResults = () => {
    // Create CSV content
    const headers = ['Name', 'Graduation Year', 'GPA', 'Hometown', 'Budget', 'Majors', 'Division'];
    const rows = filteredAthletes.map(athlete => [
      `${athlete.firstName} ${athlete.lastName}`,
      athlete.graduationYear || '',
      athlete.gpa || '',
      athlete.hometown || '',
      athlete.budget || '',
      athlete.intendedMajors || '',
      athlete.preferredDivisions?.join(', ') || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `athletes-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Export completed",
      description: `Successfully exported ${filteredAthletes.length} athletes to CSV.`,
    });
  };

  const handleShareSelection = () => {
    const selectedAthletesData = filteredAthletes.filter(a => selectedAthletes.includes(a.id));
    const shareText = `Check out these ${selectedAthletesData.length} athletes:\n${selectedAthletesData.map(a => `${a.firstName} ${a.lastName}`).join(', ')}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Selected Athletes',
        text: shareText,
      }).catch(() => {
        // Fallback to clipboard
        navigator.clipboard.writeText(shareText);
        toast({
          title: "Copied to clipboard",
          description: "Athletes list has been copied to your clipboard.",
        });
      });
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(shareText);
      toast({
        title: "Copied to clipboard",
        description: "Athletes list has been copied to your clipboard.",
      });
    }
  };

  const bulkAddToFavorites = () => {
    const newFavorites = selectedAthletes.filter(id => !favorites.includes(id));
    setFavorites(prev => [...prev, ...newFavorites]);
    toast({
      title: "Added to favorites",
      description: `${newFavorites.length} athletes added to favorites.`,
    });
    setSelectedAthletes([]);
  };

  const handleContactAll = () => {
    if (selectedAthletes.length === 0) {
      toast({
        title: "No athletes selected",
        description: "Please select at least one athlete to contact.",
        variant: "destructive"
      });
      return;
    }
    
    // Get all selected athletes
    const selectedAthletesData = filteredAthletes.filter(a => selectedAthletes.includes(a.id));
    
    if (selectedAthletesData.length > 0) {
      // Initialize the contact queue
      setAthletesQueueForContact(selectedAthletesData);
      setCurrentAthleteIndex(0);
      setSelectedAthleteForContact(selectedAthletesData[0]);
      setShowContactModal(true);
      
      toast({
        title: "Contact Request",
        description: `Preparing contact requests for ${selectedAthletesData.length} athlete${selectedAthletesData.length > 1 ? 's' : ''}.`,
      });
    }
  };

  const handleContactSubmitSuccess = () => {
    const nextIndex = currentAthleteIndex + 1;
    
    // Check if there are more athletes in the queue
    if (nextIndex < athletesQueueForContact.length) {
      // Move to next athlete
      setCurrentAthleteIndex(nextIndex);
      setSelectedAthleteForContact(athletesQueueForContact[nextIndex]);
      setShowContactModal(true);
      
      toast({
        title: "Contact Request Sent",
        description: `Processing athlete ${nextIndex + 1} of ${athletesQueueForContact.length}...`,
      });
    } else {
      // All done - clear selections and show success
      setShowContactModal(false);
      setSelectedAthleteForContact(null);
      setAthletesQueueForContact([]);
      setCurrentAthleteIndex(0);
      setSelectedAthletes([]);
      
      toast({
        title: "All Requests Sent!",
        description: `Successfully sent contact requests for ${athletesQueueForContact.length} athletes.`,
      });
    }
  };

  const handleExportPDFs = () => {
    if (selectedAthletes.length === 0) {
      toast({
        title: "No athletes selected",
        description: "Please select at least one athlete to export.",
        variant: "destructive"
      });
      return;
    }
    
    const selectedAthletesData = filteredAthletes.filter(a => selectedAthletes.includes(a.id));
    setShowPDFExportModal(true);
    toast({
      title: "Export Started",
      description: `Preparing PDF export for ${selectedAthletes.length} athletes.`,
    });
  };

  const renderStarRating = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(7)].map((_, i) => (
          <Star
            key={i}
            className={cn(
              "h-3 w-3",
              i < rating 
                ? "fill-yellow-400 text-yellow-400" 
                : "fill-muted text-muted"
            )}
          />
        ))}
      </div>
    );
  };

  const getTournamentPerformanceBadge = (athleteId: string) => {
    const results = dbResults
      .filter(r => r.athlete_id === athleteId)
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    if (results.length === 0) return null;

    const recent = results[0];
    const prev = results[1];
    const trend = prev && recent.position && prev.position ? (recent.position < prev.position ? 'up' : 'down') : 'up';
    
    return (
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs">
          <Trophy className="h-3 w-3 mr-1" />
          {recent.position ? `T${recent.position}` : 'Recent result'}
        </Badge>
        {trend === 'up' ? (
          <TrendingUp className="h-3 w-3 text-green-500" />
        ) : (
          <TrendingDown className="h-3 w-3 text-red-500" />
        )}
      </div>
    );
  };

  const activeFiltersCount = () => {
    let count = 0;
    if (selectedDivisions.length > 0) count++;
    if (selectedYears.length > 0) count++;
    if (gpaRange[0] !== 2.0 || gpaRange[1] !== 4.0) count++;
    if (handicapMax !== 20) count++;
    if (budgetRange[0] !== 0 || budgetRange[1] !== 80000) count++;
    if (starRating > 0) count++;
    if (weatherZones.length > 0) count++;
    if (tournamentFilters.minTournaments > 0) count++;
    if (showNewOnly) count++;
    return count;
  };

  // Check if athlete is new (added within last 2 weeks)
  const isAthleteNew = (athlete: Athlete) => {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    return new Date(athlete.createdAt) >= twoWeeksAgo;
  };

  // Pagination
  const totalPages = Math.ceil(filteredAthletes.length / resultsPerPage);
  const paginatedAthletes = filteredAthletes.slice(
    (currentPage - 1) * resultsPerPage,
    currentPage * resultsPerPage
  );

  const getSimilarAthletes = (athlete: Athlete) => {
    const sourceList = dbAthletes;
    return sourceList
      .filter(a => 
        a.id !== athlete.id &&
        Math.abs(a.gpa - athlete.gpa) < 0.5 &&
        a.preferredDivisions?.some(d => athlete.preferredDivisions?.includes(d))
      )
      .slice(0, 3);
  };
  
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Enhanced Results Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="space-y-4">
            {/* Results Summary */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <h1 className="text-2xl sm:text-3xl font-bold">
                    {searchQuery ? `Results for "${searchQuery}"` : 'All Athletes'}
                  </h1>
                  <Badge variant="secondary" className="text-sm w-fit">
                    {filteredAthletes.length} of {dbAthletes.length} athletes
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Discover and connect with elite tennis talent
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent className="w-[180px] z-[70] bg-background">
                    <SelectItem value="class">Class</SelectItem>
                    <SelectItem value="starRating">Star Rating</SelectItem>
                    <SelectItem value="gpa">GPA</SelectItem>
                    <SelectItem value="utr">UTR (highest)</SelectItem>
                    <SelectItem value="tournament">Tournament Performance</SelectItem>
                    <SelectItem value="recent">Last Updated</SelectItem>
                    <SelectItem value="sex">Sex</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={resultsPerPage.toString()} onValueChange={(v) => {
                  setResultsPerPage(parseInt(v));
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-[80px] sm:w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="w-[100px] z-[70] bg-background">
                    <SelectItem value="12">12</SelectItem>
                    <SelectItem value="24">24</SelectItem>
                    <SelectItem value="48">48</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Search Bar and Controls */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder={
                    searchType === 'name' 
                      ? "Search by athlete name..." 
                      : searchType === 'tournament'
                      ? "Search by tournament name..."
                      : "Search athletes by name, major, location..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-2">
                {/* View Mode Toggles */}
                <div className="flex items-center gap-1 border rounded-lg p-1">
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid3x3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                  >
                    <Table className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'comparison' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('comparison')}
                  >
                    <Columns3 className="h-4 w-4" />
                  </Button>
                </div>

                <Button variant="outline" onClick={exportResults} className="hidden sm:flex">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
                
                {/* Mobile-only icon button for Export */}
                <Button variant="outline" size="icon" onClick={exportResults} className="sm:hidden">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Quick Actions Bar (when items selected) */}
            {selectedAthletes.length > 0 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">
                  {selectedAthletes.length} athletes selected
                </span>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <Button size="sm" variant="outline" onClick={bulkAddToFavorites} className="flex-1 sm:flex-none">
                    <Heart className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Add to Favorites</span>
                    <span className="sm:hidden">Favorites</span>
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleContactAll} className="flex-1 sm:flex-none">
                    <UserPlus className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Contact All</span>
                    <span className="sm:hidden">Contact</span>
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleExportPDFs} className="flex-1 sm:flex-none">
                    <FileText className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Export PDFs</span>
                    <span className="sm:hidden">Export</span>
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleShareSelection} className="flex-1 sm:flex-none">
                    <Share2 className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Share</span>
                    <span className="sm:hidden">Share</span>
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setSelectedAthletes([])}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex">
        {/* Collapsible Filter Sidebar */}
        <CollapsibleFilterSidebar
          selectedDivisions={selectedDivisions}
          setSelectedDivisions={setSelectedDivisions}
          selectedYears={selectedYears}
          setSelectedYears={setSelectedYears}
          gpaRange={gpaRange}
          setGpaRange={setGpaRange}
          budgetRange={budgetRange}
          setBudgetRange={setBudgetRange}
          starRating={starRating}
          setStarRating={setStarRating}
          handicapMax={handicapMax}
          setHandicapMax={setHandicapMax}
          weatherZones={weatherZones}
          setWeatherZones={setWeatherZones}
          showNewOnly={showNewOnly}
          setShowNewOnly={setShowNewOnly}
          tournamentFilters={tournamentFilters}
          setTournamentFilters={setTournamentFilters}
          gender={gender}
          setGender={setGender}
          utrRange={utrRange}
          setUtrRange={setUtrRange}
          wtnRange={wtnRange}
          setWtnRange={setWtnRange}
          surfaces={surfaces}
          setSurfaces={setSurfaces}
          clearFilters={clearFilters}
          saveSearch={saveSearch}
          renderStarRating={renderStarRating}
        />

        {/* Results Area */}
        <div className="flex-1 min-w-0 p-3 sm:p-4 lg:p-6">
          {/* View: Grid */}
          {viewMode === 'grid' && (
            <div className="grid min-w-0 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr items-stretch">
              {paginatedAthletes.map((athlete) => {
                const isNew = new Date(athlete.createdAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000;
                const isUpdated = new Date(athlete.updatedAt).getTime() > Date.now() - 3 * 24 * 60 * 60 * 1000;
                const tournamentBadge = getTournamentPerformanceBadge(athlete.id);
                
                return (
                  <Card 
                    key={athlete.id} 
                    className="group hover:shadow-lg transition-all cursor-pointer relative w-full min-w-0 h-[280px] sm:h-[300px] overflow-hidden flex flex-col"
                  >
                    {/* Selection Checkbox */}
                    <div className="absolute top-3 left-3 z-10">
                      <Checkbox
                        checked={selectedAthletes.includes(athlete.id)}
                        onCheckedChange={() => toggleSelection(athlete.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    {/* Status Badges */}
                    <div className="absolute top-3 right-3 z-10 flex gap-1">
                      {isAthleteNew(athlete) && <StatusBadge type="new">New</StatusBadge>}
                      {isUpdated && !isAthleteNew(athlete) && <StatusBadge type="updated">Updated</StatusBadge>}
                    </div>

                    <CardContent 
                      className="pt-6 px-4 pb-4 flex flex-col h-full"
                      onClick={() => {
                        setSelectedAthleteForProfile(athlete);
                        setShowProfileModal(true);
                      }}
                    >
                      {/* Profile Section */}
                      <div className="flex items-start gap-3 mb-4">
                        <Avatar className="w-16 h-16 flex-shrink-0">
                          <AvatarImage src={athlete.profileImage} alt={`${athlete.firstName} ${athlete.lastName}`} />
                          <AvatarFallback className="bg-primary/10">
                            <User className="h-8 w-8 text-primary" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm group-hover:text-primary transition-colors truncate break-words">
                            {athlete.firstName} {athlete.lastName}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate break-words">
                            Class of {athlete.graduationYear || 'TBD'}
                          </p>
                          {renderStarRating(athlete.starRating)}
                        </div>
                      </div>

                    {/* Key Stats */}
                    <div className="space-y-2 mb-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">GPA</span>
                          <span className="font-medium">{athlete.gpa ? athlete.gpa.toFixed(2) : 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">UTR</span>
                          <span className="font-medium">{athlete.utr != null ? athlete.utr : 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">WTN</span>
                          <span className="font-medium">{athlete.wtn != null ? athlete.wtn : 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Surface</span>
                          <span className="font-medium">{athlete.preferredSurface || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Budget</span>
                          <span className="font-medium">
                            {athlete.budget ? `$${athlete.budget.toLocaleString()}` : 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Quick Actions - Stack on mobile */}
                      <div className="flex flex-col gap-2 md:flex-row w-full mt-auto">
                        <Button
                          size="sm"
                          className="w-full md:flex-1 bg-usap-orange hover:bg-usap-orange/90 text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAthleteForProfile(athlete);
                            setShowProfileModal(true);
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <div className="flex gap-2 w-full md:w-auto">
                          <Button
                            size="sm"
                            variant={favorites.includes(athlete.id) ? "default" : "outline"}
                            className="flex-1 md:flex-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(athlete.id);
                            }}
                          >
                            <Heart className={cn(
                              "h-3 w-3",
                              favorites.includes(athlete.id) && "fill-current"
                            )} />
                          </Button>
                          <Button
                            size="sm"
                            variant={comparisonAthletes.includes(athlete.id) ? "default" : "outline"}
                            className="flex-1 md:flex-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleComparison(athlete.id);
                            }}
                          >
                            <Columns3 className={cn(
                              "h-3 w-3",
                              comparisonAthletes.includes(athlete.id) && "fill-current"
                            )} />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* View: List */}
          {viewMode === 'list' && (
            <div className="space-y-3">
              {paginatedAthletes.map((athlete) => {
                const tournamentBadge = getTournamentPerformanceBadge(athlete.id);
                
                return (
                  <Card key={athlete.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-0">
                      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 p-4">
                        {/* Mobile: Top Row - Checkbox + Profile + Favorite */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Selection */}
                          <Checkbox
                            checked={selectedAthletes.includes(athlete.id)}
                            onCheckedChange={() => toggleSelection(athlete.id)}
                            className="flex-shrink-0"
                          />

                          {/* Profile */}
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Avatar className="w-12 h-12 flex-shrink-0">
                              <AvatarImage src={athlete.profileImage} alt={`${athlete.firstName} ${athlete.lastName}`} />
                              <AvatarFallback className="bg-primary/10">
                                <User className="h-6 w-6 text-primary" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold truncate break-words">{athlete.firstName} {athlete.lastName}</h3>
                              <p className="text-sm text-muted-foreground truncate break-words">
                                Class of {athlete.graduationYear || 'TBD'} • {athlete.preferredDivisions?.join(', ') || 'N/A'}
                              </p>
                            </div>
                          </div>
                          
                          {/* Mobile: Favorite button (visible only on mobile) */}
                          <Button
                            size="icon"
                            variant={favorites.includes(athlete.id) ? "default" : "outline"}
                            onClick={() => toggleFavorite(athlete.id)}
                            className="md:hidden flex-shrink-0"
                          >
                            <Heart className={cn(
                              "h-4 w-4",
                              favorites.includes(athlete.id) && "fill-current"
                            )} />
                          </Button>
                        </div>

                        {/* Desktop: Stats Grid (hidden on mobile). shrink-0 keeps it a
                            fixed zone so it never collapses under the profile block. */}
                        <div className="hidden md:grid grid-cols-5 gap-2 lg:gap-6 shrink-0">
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Stars</p>
                            {renderStarRating(athlete.starRating)}
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">GPA</p>
                            <p className="font-medium">{athlete.gpa ? athlete.gpa.toFixed(2) : 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">UTR</p>
                            <p className="font-medium">{athlete.utr != null ? athlete.utr : 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">WTN</p>
                            <p className="font-medium">{athlete.wtn != null ? athlete.wtn : 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Budget</p>
                            <p className="font-medium">{athlete.budget ? `$${(athlete.budget / 1000).toFixed(0)}k` : 'N/A'}</p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 justify-end md:justify-start shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedAthleteForProfile(athlete);
                              setShowProfileModal(true);
                            }}
                            className="flex-1 md:flex-none"
                          >
                            <span className="hidden sm:inline">View Profile</span>
                            <span className="sm:hidden">View</span>
                          </Button>
                          
                          {/* Desktop: Favorite button (hidden on mobile) */}
                          <Button
                            size="icon"
                            variant={favorites.includes(athlete.id) ? "default" : "outline"}
                            onClick={() => toggleFavorite(athlete.id)}
                            className="hidden md:flex"
                          >
                            <Heart className={cn(
                              "h-4 w-4",
                              favorites.includes(athlete.id) && "fill-current"
                            )} />
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="outline">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => toggleComparison(athlete.id)}>
                                {comparisonAthletes.includes(athlete.id) ? 'Remove from' : 'Add to'} Comparison
                              </DropdownMenuItem>
                              <DropdownMenuItem>Contact Athlete</DropdownMenuItem>
                              <DropdownMenuItem>Export Profile</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* View: Table */}
          {viewMode === 'table' && (
            <Card>
              <UITable>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedAthletes.length === paginatedAthletes.length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedAthletes(paginatedAthletes.map(a => a.id));
                          } else {
                            setSelectedAthletes([]);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Division</TableHead>
                    <TableHead>Stars</TableHead>
                    <TableHead>GPA</TableHead>
                    <TableHead>UTR</TableHead>
                    <TableHead>WTN</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAthletes.map((athlete) => {
                    // Results data loaded from Supabase via dbResults
                    
                    return (
                      <TableRow key={athlete.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedAthletes.includes(athlete.id)}
                            onCheckedChange={() => toggleSelection(athlete.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={athlete.profileImage} alt={athlete.firstName} />
                              <AvatarFallback className="bg-primary/10">
                                <User className="h-4 w-4 text-primary" />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{athlete.firstName} {athlete.lastName}</p>
                              <p className="text-xs text-muted-foreground">{athlete.hometown}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>Class of {athlete.graduationYear || 'TBD'}</TableCell>
                        <TableCell>{athlete.preferredDivisions?.join(', ') || 'N/A'}</TableCell>
                        <TableCell>{renderStarRating(athlete.starRating)}</TableCell>
                        <TableCell>{athlete.gpa ? athlete.gpa.toFixed(2) : 'N/A'}</TableCell>
                        <TableCell>{athlete.utr != null ? athlete.utr : 'N/A'}</TableCell>
                        <TableCell>{athlete.wtn != null ? athlete.wtn : 'N/A'}</TableCell>
                        <TableCell>{athlete.budget ? `$${(athlete.budget / 1000).toFixed(0)}k` : 'N/A'}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setSelectedAthleteForProfile(athlete);
                                setShowProfileModal(true);
                              }}>
                                View Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleFavorite(athlete.id)}>
                                {favorites.includes(athlete.id) ? 'Remove from' : 'Add to'} Favorites
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleComparison(athlete.id)}>
                                {comparisonAthletes.includes(athlete.id) ? 'Remove from' : 'Add to'} Comparison
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>Contact Athlete</DropdownMenuItem>
                              <DropdownMenuItem>Export Profile</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </UITable>
            </Card>
          )}

          {/* View: Comparison */}
          {viewMode === 'comparison' && (
            <div>
              {comparisonAthletes.length === 0 ? (
                <Card className="p-8 text-center">
                  <Columns3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Athletes Selected for Comparison</h3>
                  <p className="text-muted-foreground mb-4">
                    Select up to 4 athletes from the grid or list view to compare them side by side.
                  </p>
                  <Button onClick={() => setViewMode('grid')}>
                    Browse Athletes
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  {comparisonAthletes.map((athleteId) => {
                    const athlete = filteredAthletes.find(a => a.id === athleteId);
                    if (!athlete) return null;
                    
                    return (
                      <Card key={athlete.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={athlete.profileImage} alt={athlete.firstName} />
                                <AvatarFallback className="bg-primary/10">
                                  <User className="h-5 w-5 text-primary" />
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-semibold text-sm">{athlete.firstName} {athlete.lastName}</h3>
                                <p className="text-xs text-muted-foreground">Class of {athlete.graduationYear || 'TBD'}</p>
                              </div>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => toggleComparison(athlete.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Rating</p>
                            {renderStarRating(athlete.starRating)}
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">GPA</span>
                              <span className="font-medium">{athlete.gpa ? athlete.gpa.toFixed(2) : 'N/A'}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Best Recent Avg</span>
                              <span className="font-medium text-xs">
                                <BestRecentScoreDisplay 
                                  athleteId={athlete.id} 
                                  showTooltip={false}
                                  className="text-xs"
                                />
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Scoring vs CR</span>
                              <span className="font-medium text-xs">
                                <BestRecentVsCRDisplay 
                                  athleteId={athlete.id} 
                                  showTooltip={false}
                                  className="text-xs"
                                />
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Budget</span>
                              <span className="font-medium">{athlete.budget ? `$${(athlete.budget / 1000).toFixed(0)}k` : 'N/A'}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Division</span>
                              <span className="font-medium">{athlete.preferredDivisions?.join(', ') || 'N/A'}</span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              const athleteSlug = (athlete as any).slug || athlete.id;
                              navigate(`/athletes/${athleteSlug}`);
                            }}
                          >
                            View Full Profile
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      className={cn(
                        "cursor-pointer",
                        currentPage === 1 && "pointer-events-none opacity-50"
                      )}
                    />
                  </PaginationItem>
                  
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => setCurrentPage(pageNum)}
                          isActive={currentPage === pageNum}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
                  {totalPages > 5 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                  
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      className={cn(
                        "cursor-pointer",
                        currentPage === totalPages && "pointer-events-none opacity-50"
                      )}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}

          {/* No Results */}
          {filteredAthletes.length === 0 && (
            <Card className="p-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Athletes Found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your filters or search criteria to find more athletes.
              </p>
              <Button onClick={clearFilters}>Clear All Filters</Button>
            </Card>
          )}
        </div>
      </div>

      {/* Comparison Sticky Bar */}
      {comparisonAthletes.length > 0 && viewMode !== 'comparison' && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-4 shadow-lg">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-medium">
                {comparisonAthletes.length} athletes selected for comparison
              </span>
              <div className="flex gap-2">
                {comparisonAthletes.map((id) => {
                  const athlete = filteredAthletes.find(a => a.id === id);
                  return athlete ? (
                    <Badge key={id} variant="secondary">
                      {athlete.firstName} {athlete.lastName}
                      <X
                        className="ml-1 h-3 w-3 cursor-pointer"
                        onClick={() => toggleComparison(id)}
                      />
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setViewMode('comparison')}>
                View Comparison
              </Button>
              <Button variant="outline" onClick={() => setComparisonAthletes([])}>
                Clear
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Request Modal */}
      {showContactModal && selectedAthleteForContact && (
        <ContactRequestModal
          isOpen={showContactModal}
          onClose={() => {
            setShowContactModal(false);
            setSelectedAthleteForContact(null);
            setAthletesQueueForContact([]);
            setCurrentAthleteIndex(0);
            setSelectedAthletes([]);
          }}
          athlete={{
            id: selectedAthleteForContact.id,
            firstName: selectedAthleteForContact.firstName,
            lastName: selectedAthleteForContact.lastName,
            profileImage: selectedAthleteForContact.profileImage,
            starRating: selectedAthleteForContact.starRating,
            gpa: selectedAthleteForContact.gpa,
            preferredDivision: selectedAthleteForContact.preferredDivisions.join(', '),
            highSchoolYear: selectedAthleteForContact.highSchoolYear,
            hometown: selectedAthleteForContact.hometown,
            currentSchool: selectedAthleteForContact.currentSchool,
            scoringAverage: selectedAthleteForContact.scoringAverage,
            nationalRanking: selectedAthleteForContact.nationalRanking
          }}
          onSubmitSuccess={handleContactSubmitSuccess}
          showProgress={
            athletesQueueForContact.length > 1 
              ? { current: currentAthleteIndex + 1, total: athletesQueueForContact.length }
              : undefined
          }
        />
      )}

      {/* PDF Export Modal */}
      {showPDFExportModal && (
        <PDFExportModal
          isOpen={showPDFExportModal}
          onClose={() => {
            setShowPDFExportModal(false);
            setSelectedAthletes([]);
          }}
          athletes={filteredAthletes.filter(a => selectedAthletes.includes(a.id))}
        />
      )}

      {/* Save Search Dialog */}
      <Dialog open={showSaveSearchDialog} onOpenChange={setShowSaveSearchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Save Search</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Save your current search criteria to quickly access it later.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="search-name" className="mb-2 block">
              Search Name
            </Label>
            <Input
              id="search-name"
              value={saveSearchName}
              onChange={(e) => setSaveSearchName(e.target.value)}
              placeholder="e.g., Top Academic Performers"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveSearchConfirm();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowSaveSearchDialog(false);
              setSaveSearchName('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveSearchConfirm}>
              Save Search
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Athlete Profile Modal */}
      {showProfileModal && selectedAthleteForProfile && (
        <AthleteProfileModal
          isOpen={showProfileModal}
          onClose={() => {
            setShowProfileModal(false);
            setSelectedAthleteForProfile(null);
          }}
          athlete={selectedAthleteForProfile}
          tournamentResults={dbResults.filter(r => r.athlete_id === selectedAthleteForProfile.id)}
        />
      )}

      {/* Mobile Filter Button - Floating */}
      <Button
        className="lg:hidden fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg"
        size="icon"
        onClick={() => setMobileFiltersOpen(true)}
      >
        <Filter className="h-5 w-5" />
        {activeFiltersCount() > 0 && (
          <Badge 
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            {activeFiltersCount()}
          </Badge>
        )}
      </Button>

      {/* Mobile Filter Sheet */}
      <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
        <SheetContent side="bottom" className="h-[85vh] p-0">
          <div className="flex flex-col h-full">
            <SheetHeader className="p-4 border-b">
              <SheetTitle className="text-lg sm:text-xl flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
                {activeFiltersCount() > 0 && (
                  <Badge variant="secondary">
                    {activeFiltersCount()} active
                  </Badge>
                )}
              </SheetTitle>
            </SheetHeader>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-6">
                
                {/* Gender Filter */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Gender
                  </Label>
                  <RadioGroup value={gender} onValueChange={(value) => setGender(value)}>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="all" id="mobile-gender-all" />
                        <Label htmlFor="mobile-gender-all" className="text-sm font-normal cursor-pointer">
                          All
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="male" id="mobile-gender-male" />
                        <Label htmlFor="mobile-gender-male" className="text-sm font-normal cursor-pointer">
                          Male
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="female" id="mobile-gender-female" />
                        <Label htmlFor="mobile-gender-female" className="text-sm font-normal cursor-pointer">
                          Female
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
                  
                {/* New Athletes Filter */}
                <div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="mobile-new-athletes"
                      checked={showNewOnly}
                      onCheckedChange={(checked) => setShowNewOnly(!!checked)}
                    />
                    <Label htmlFor="mobile-new-athletes" className="text-sm font-normal cursor-pointer">
                      Show only new athletes (added within 2 weeks)
                    </Label>
                  </div>
                </div>

                {/* Year Filter */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Year
                  </Label>
                  <div className="space-y-2">
                    {['2025', '2026', '2027', '2028', '2029', 'Transfer'].map(year => (
                      <div key={year} className="flex items-center space-x-2">
                        <Checkbox
                          id={`mobile-class-${year}`}
                          checked={selectedYears.includes(year)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedYears([...selectedYears, year]);
                            } else {
                              setSelectedYears(selectedYears.filter(y => y !== year));
                            }
                          }}
                        />
                        <Label htmlFor={`mobile-class-${year}`} className="text-sm font-normal cursor-pointer">
                          {year}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Budget Range */}
                <div>
                  <Label className="text-sm font-medium">
                    Budget: ${(budgetRange[0] / 1000).toFixed(0)}k - ${(budgetRange[1] / 1000).toFixed(0)}k
                  </Label>
                  <div className="mt-3 px-2">
                    <Slider
                      value={budgetRange}
                      onValueChange={(value) => setBudgetRange(value as [number, number])}
                      min={0}
                      max={80000}
                      step={5000}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* UTR range */}
                <div>
                  <Label className="text-sm font-medium">
                    UTR: {utrRange[0].toFixed(1)} - {utrRange[1].toFixed(1)}
                  </Label>
                  <div className="mt-3 px-2">
                    <Slider
                      value={utrRange}
                      onValueChange={(value) => setUtrRange(value as [number, number])}
                      min={1}
                      max={16.5}
                      step={0.5}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* WTN range (lower is better) */}
                <div>
                  <Label className="text-sm font-medium">
                    WTN: {wtnRange[0].toFixed(1)} - {wtnRange[1].toFixed(1)}
                  </Label>
                  <div className="mt-3 px-2">
                    <Slider
                      value={wtnRange}
                      onValueChange={(value) => setWtnRange(value as [number, number])}
                      min={1}
                      max={40}
                      step={0.5}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* GPA Range */}
                <div>
                  <Label className="text-sm font-medium">
                    GPA Range: {gpaRange[0].toFixed(1)} - {gpaRange[1].toFixed(1)}
                  </Label>
                  <div className="mt-3 px-2">
                    <Slider
                      value={gpaRange}
                      onValueChange={(value) => setGpaRange(value as [number, number])}
                      min={2.0}
                      max={4.0}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Star Rating Filter */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Label className="text-sm font-medium">
                      Minimum Star Rating: {starRating > 0 ? starRating : 'Any'}
                    </Label>
                    <Link to="/resources?tab=rating" className="text-muted-foreground hover:text-foreground">
                      <Info className="h-4 w-4" />
                    </Link>
                  </div>
                  <div className="mt-3 px-2">
                    <Slider
                      value={[starRating]}
                      onValueChange={(value) => setStarRating(value[0])}
                      min={0}
                      max={7}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  {starRating > 0 && (
                    <div className="mt-2 flex justify-center">
                      {renderStarRating(starRating)}
                    </div>
                  )}
                </div>

                {/* Division Filter */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Preferred Division
                  </Label>
                  <div className="space-y-2">
                    {['NCAA D1', 'NCAA D2', 'NCAA D3', 'NAIA', 'NJCAA 1', 'NJCAA 2'].map(division => (
                      <div key={division} className="flex items-center space-x-2">
                        <Checkbox
                          id={`mobile-${division}`}
                          checked={selectedDivisions.includes(division)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedDivisions([...selectedDivisions, division]);
                            } else {
                              setSelectedDivisions(selectedDivisions.filter(d => d !== division));
                            }
                          }}
                        />
                        <Label htmlFor={`mobile-${division}`} className="text-sm font-normal cursor-pointer">
                          {division}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Weather Zones Filter */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Weather Zone
                  </Label>
                  <div className="space-y-2">
                    {['1', '2', '3', '4'].map(zone => (
                      <div key={zone} className="flex items-center space-x-2">
                        <Checkbox
                          id={`mobile-zone-${zone}`}
                          checked={weatherZones.includes(zone)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setWeatherZones([...weatherZones, zone]);
                            } else {
                              setWeatherZones(weatherZones.filter(z => z !== zone));
                            }
                          }}
                        />
                        <Label htmlFor={`mobile-zone-${zone}`} className="text-sm font-normal cursor-pointer">
                          {zone}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="p-4 border-t space-y-2">
              <Button 
                onClick={() => {
                  saveSearch();
                  setMobileFiltersOpen(false);
                }} 
                className="w-full"
              >
                <Save className="mr-2 h-4 w-4" />
                Save Search
              </Button>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={clearFilters} 
                  className="flex-1"
                >
                  Clear All
                </Button>
                <Button 
                  onClick={() => setMobileFiltersOpen(false)} 
                  className="flex-1"
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Athletes;
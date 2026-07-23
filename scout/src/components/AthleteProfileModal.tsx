import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  Trophy,
  Target,
  Activity,
  TrendingUp,
  MapPin,
  GraduationCap,
  Calendar,
  DollarSign,
  Globe,
  Flag,
  Users,
  Star,
  Award,
  ArrowRight,
  User,
  School,
  Mail,
  Phone,
  Clock,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { AthleteMetricsDisplay } from '@/components/AthleteMetricsDisplay';
import TournamentResultsTableSimplified from '@/components/TournamentResultsTableSimplified';
import { BestRecentScoreDisplay } from '@/components/BestRecentScoreDisplay';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { normalizeDivisions, normalizeIntendedMajors } from '@/lib/divisionNormalizer';

interface AthleteProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  athlete: any;
  tournamentResults?: any[];
}

const AthleteProfileModal: React.FC<AthleteProfileModalProps> = ({
  isOpen,
  onClose,
  athlete,
  tournamentResults = []
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState('overview');
  const [fetchedResults, setFetchedResults] = React.useState<any[]>([]);
  const [loadingResults, setLoadingResults] = React.useState(false);

  // Fetch tournament results if not provided
  React.useEffect(() => {
    if (athlete?.id) {
      setLoadingResults(true);
      
      supabase
        .from('tournament_results')
        .select(`
          *,
          tournaments (*)
        `)
        .eq('athlete_id', athlete.id)
        .then(({ data, error }) => {
          if (error) {
            console.error('Error fetching tournament results:', error);
            setFetchedResults([]);
          } else {
            // Transform and sort using priority-based logic (matches full profile)
            const transformed = (data || [])
              .map(result => ({
                ...result,
                tournament: result.tournaments
              }))
              .sort((a, b) => {
                const tourA = a.tournaments;
                const tourB = b.tournaments;
                
                // Priority 1: Sort by dates if available
                const endDateA = tourA?.end_date ? new Date(tourA.end_date).getTime() : null;
                const endDateB = tourB?.end_date ? new Date(tourB.end_date).getTime() : null;
                const startDateA = tourA?.start_date ? new Date(tourA.start_date).getTime() : null;
                const startDateB = tourB?.start_date ? new Date(tourB.start_date).getTime() : null;
                
                // Use end_date if available, fallback to start_date
                const dateA = endDateA || startDateA;
                const dateB = endDateB || startDateB;
                
                // If both have dates, sort by date (most recent first)
                if (dateA && dateB) {
                  return dateB - dateA;
                }
                
                // If only one has date, prioritize the one with date
                if (dateA) return -1;
                if (dateB) return 1;
                
                // Priority 2: Neither has dates, sort by year (most recent first)
                const yearA = parseInt(tourA?.year || '0');
                const yearB = parseInt(tourB?.year || '0');
                if (yearA !== yearB) {
                  return yearB - yearA;
                }
                
                // Priority 3: Same year, sort by name alphabetically
                const nameA = tourA?.name || '';
                const nameB = tourB?.name || '';
                return nameA.localeCompare(nameB);
              });
            setFetchedResults(transformed);
          }
          setLoadingResults(false);
        });
    }
  }, [athlete?.id, isOpen]);

  // Reset state when modal closes to ensure fresh data on next open
  React.useEffect(() => {
    if (!isOpen) {
      setFetchedResults([]);
      setLoadingResults(false);
      setActiveTab('overview');
    }
  }, [isOpen]);

  if (!athlete) return null;

  // Always use freshly fetched results for data consistency
  const resultsToShow = fetchedResults;

  // Map the data properly based on how it's structured from the parent component
  const firstName = athlete.firstName || athlete.first_name || 'Unknown';
  const lastName = athlete.lastName || athlete.last_name || 'Athlete';
  const graduationYear = athlete.graduationYear || athlete.graduation_year || new Date().getFullYear() + 1;
  const profileImage = athlete.profileImage || athlete.profile_photo;
  const golfClub = athlete.currentSchool || athlete.golf_club_team || 'Not specified';
  const hometown = athlete.hometown || athlete.country || 'Not specified';
  const gpa = athlete.gpa || athlete.academic_gpa || 0;
  
  // Use intelligent fallback for scoring average
  const scoringAverage = (() => {
    // Try best recent first (primary)
    if (athlete.bestRecentScoringAvg && athlete.bestRecentScoringAvg > 0) {
      return athlete.bestRecentScoringAvg;
    }
    const bestRecent = parseFloat(athlete.best_recent_scoring_avg_raw);
    if (bestRecent && bestRecent > 0) return bestRecent;
    
    // Try all-time average
    const allTime = parseFloat(athlete.scoring_avg_all_time_raw);
    if (allTime && allTime > 0) return allTime;
    
    // Try last 5
    const last5 = parseFloat(athlete.scoring_avg_last_5_raw);
    if (last5 && last5 > 0) return last5;
    
    // Try last 7
    const last7 = parseFloat(athlete.scoring_avg_last_7_raw);
    if (last7 && last7 > 0) return last7;
    
    // Try last 10
    const last10 = parseFloat(athlete.scoring_avg_last_10_raw);
    if (last10 && last10 > 0) return last10;
    
    // Last resort: scoring average field
    if (athlete.scoringAverage && athlete.scoringAverage > 0) {
      return athlete.scoringAverage;
    }
    
    return 0; // Will display as N/A
  })();
  const scoringVsCR = athlete.scoringAverageVsCourseRating || parseFloat(athlete.scoring_average_vs_course_rating) || 0;
  const budgetValue = athlete.budget || athlete.preferences_budget;
  const numericBudget = Number(budgetValue);
  const budget = !isNaN(numericBudget) && numericBudget > 0 ? numericBudget : null;
  const budgetDisplay = budget ? budget : budgetValue;
  // Use preferredDivisions if already normalized, otherwise parse from raw DB value
  const preferredDivisions = athlete.preferredDivisions?.length 
    ? athlete.preferredDivisions 
    : normalizeDivisions(athlete.preferences_division);
  const intendedMajorsNormalized = normalizeIntendedMajors(athlete.intendedMajors || athlete.intended_majors);
  const intendedMajors = intendedMajorsNormalized.length > 0 ? intendedMajorsNormalized.join(', ') : 'Not specified';
  const satScore = athlete.satScore || athlete.sat || 'Not taken';
  const duolingoScore = athlete.duolingoScore || athlete.duolingo;
  const toeflScore = athlete.toeflScore || athlete.toefl;
  const driveDistance = athlete.drivingAverageCarryDistance || athlete.drive_distance_carry || 'N/A';
  const maxClubSpeed = athlete.maxDriverClubHeadSpeed || athlete.max_club_head_speed || 'N/A';

  // Calculate performance metrics
  const wins = resultsToShow.filter(r => r.position === 1).length;
  const top10s = resultsToShow.filter(r => r.position && r.position <= 10).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[calc(100vw-2rem)] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary/20">
              <AvatarImage src={profileImage} />
              <AvatarFallback className="text-xl bg-gradient-primary text-white">
                {firstName[0]}{lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{firstName} {lastName}</span>
                {athlete.status === 'committed' && (
                  <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">
                    Committed
                  </Badge>
                )}
              </div>
              <DialogDescription className="text-sm sm:text-base mt-1">
                {golfClub} • Class of {graduationYear}
              </DialogDescription>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-1">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          {/* Mobile: Select Dropdown */}
          <div className="lg:hidden mb-4 relative">
            <label htmlFor="profile-tab" className="sr-only">Section</label>
            <select
              id="profile-tab"
              className="w-full h-12 rounded-md border border-input bg-background px-3 pr-10 text-base font-medium focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer"
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
            >
              <option value="overview">Overview</option>
              <option value="performance">Performance</option>
              <option value="academics">Academics</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>

          {/* Desktop: Horizontal Tabs */}
          <TabsList className="hidden lg:grid w-full grid-cols-3 bg-muted/50">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white"
            >
              <User className="mr-2 h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="performance"
              className="data-[state=active]:bg-gradient-secondary data-[state=active]:text-white"
            >
              <Trophy className="mr-2 h-4 w-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger 
              value="academics"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <GraduationCap className="mr-2 h-4 w-4" />
              Academics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Quick Stats */}
            {loadingResults ? (
              <Card className="bg-gradient-to-br from-blue-50/50 via-purple-50/50 to-pink-50/50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-pink-950/20 border-muted/30">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Clock className="h-8 w-8 text-muted-foreground/50 mb-3 animate-pulse" />
                  <p className="text-lg font-medium text-muted-foreground">Loading tournament results...</p>
                </CardContent>
              </Card>
            ) : !resultsToShow || resultsToShow.length === 0 ? (
              <Card className="bg-gradient-to-br from-blue-50/50 via-purple-50/50 to-pink-50/50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-pink-950/20 border-muted/30">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Clock className="h-8 w-8 text-muted-foreground/50 mb-3" />
                  <p className="text-lg font-medium text-muted-foreground">No tournament results available</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy className="h-4 w-4 text-primary" />
                      <p className="text-sm text-muted-foreground">Wins</p>
                    </div>
                    <p className="text-2xl font-bold text-primary">{wins}</p>
                  </CardContent>
                </Card>
                <Card className="border-secondary/20 bg-gradient-to-br from-secondary/5 to-transparent">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="h-4 w-4 text-secondary" />
                      <p className="text-sm text-muted-foreground">Top 10s</p>
                    </div>
                    <p className="text-2xl font-bold text-secondary">{top10s}</p>
                  </CardContent>
                </Card>
                <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Activity className="h-4 w-4 text-accent" />
                      <p className="text-sm text-muted-foreground">Events</p>
                    </div>
                    <p className="text-2xl font-bold text-accent">{resultsToShow.length}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Basic Info */}
            <Card className="border-border/50">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="font-medium">{hometown}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <School className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Club / Academy</p>
                      <p className="font-medium">{athlete.clubTeam || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Graduation Year</p>
                      <p className="font-medium">Class of {graduationYear}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Budget</p>
                      <p className="font-medium">
                        {budget ? `$${budget.toLocaleString()}` : (budgetDisplay || 'N/A')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Flag className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Preferred Division{preferredDivisions.length > 1 ? 's' : ''}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {preferredDivisions.length > 0 ? (
                          preferredDivisions.map((division, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {division}
                            </Badge>
                          ))
                        ) : (
                          <p className="font-medium">Not specified</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {athlete.status === 'committed' && athlete.committed_to && (
                  <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                    <div className="flex items-center gap-3">
                      <GraduationCap className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-400">
                          Committed to {athlete.committed_to}
                          {athlete.committed_division ? ` · ${athlete.committed_division}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4 mt-4">
            {/* Key Performance Metrics */}
            <Card className="border-border/50">
              <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  <div className="text-center p-3 sm:p-0 bg-muted/30 sm:bg-transparent rounded-lg">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2">UTR</p>
                    <p className="text-2xl sm:text-3xl font-bold whitespace-nowrap">{athlete.utr != null ? athlete.utr : 'N/A'}</p>
                  </div>
                  <div className="text-center p-3 sm:p-0 bg-muted/30 sm:bg-transparent rounded-lg">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2">WTN</p>
                    <p className="text-2xl sm:text-3xl font-bold whitespace-nowrap">{athlete.wtn != null ? athlete.wtn : 'N/A'}</p>
                  </div>
                  <div className="text-center p-3 sm:p-0 bg-muted/30 sm:bg-transparent rounded-lg">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2">National ranking</p>
                    <p className="text-2xl sm:text-3xl font-bold whitespace-nowrap">{athlete.nationalRanking ? `#${athlete.nationalRanking}` : 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tournament Results Table */}
            {loadingResults ? (
              <Card className="border-border/50">
                <CardContent className="p-8">
                  <p className="text-center text-muted-foreground">Loading tournament results...</p>
                </CardContent>
              </Card>
            ) : resultsToShow && resultsToShow.length > 0 ? (
              <Card className="border-border/50">
                <CardHeader className="bg-gradient-to-r from-secondary/5 to-transparent">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-secondary" />
                    Tournament Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 p-0">
                  <div className="max-h-[400px] overflow-x-auto overflow-y-auto border-t border-border">
                    <div className="min-w-[720px] md:min-w-full w-full">
                      <TournamentResultsTableSimplified 
                        results={resultsToShow}
                        athleteName={`${athlete.first_name || athlete.firstName || ''} ${athlete.last_name || athlete.lastName || ''}`}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/50">
                <CardContent className="p-8">
                  <p className="text-center text-muted-foreground">No tournament results available</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="academics" className="space-y-4 mt-4">
            {/* Academic Info */}
            <Card className="border-border/50">
              <CardHeader className="bg-gradient-to-r from-accent/5 to-transparent">
                <CardTitle className="text-lg flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-accent" />
                  Academic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">GPA</p>
                    <p className="text-xl font-bold">{gpa.toFixed(2)}</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">SAT Score</p>
                    <p className="text-xl font-bold">{satScore}</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">English Test</p>
                    <p className="text-xl font-bold">
                      {duolingoScore 
                        ? `Duolingo: ${duolingoScore}`
                        : toeflScore
                        ? `TOEFL: ${toeflScore}`
                        : 'Not taken'}
                    </p>
                  </div>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">Intended Majors</p>
                  <p className="text-sm">{intendedMajors}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          </Tabs>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button 
            className="bg-gradient-primary text-white hover:opacity-90"
            onClick={(e) => {
              const athleteSlug = (athlete as any).slug || athlete.id;
              const profilePath = window.location.pathname.startsWith('/admin') 
                ? `/admin/athletes/${athlete.id}` 
                : `/athletes/${athleteSlug}`;
              
              // Open in new tab on regular click
              window.open(profilePath, '_blank');
              onClose();
            }}
          >
            View Full Profile
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AthleteProfileModal;
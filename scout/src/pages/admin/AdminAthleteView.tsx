import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { statusLabel, STATUS_BADGE_CLASSES } from "@/lib/athleteStatus";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { 
  ArrowLeft, 
  MapPin, 
  Trophy, 
  Calendar, 
  School,
  TrendingUp,
  Star,
  Target,
  Wind,
  DollarSign,
  FileText,
  Video,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  User,
  Award,
  BarChart3,
  Printer,
  Camera,
  Activity,
  BookOpen,
  Info,
  Instagram,
  Edit,
  ChevronLeft,
  Clock,
  Archive,
  Share2,
  Loader2
} from "lucide-react";
import { downloadAthleteOnePagerLive } from "@/lib/athleteOnePagerLive";
import ShareProfileModal from "@/components/ShareProfileModal";
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { sortTournamentResults } from '@/lib/api/tournamentResults';
import { AthleteMetricsDisplay } from "@/components/AthleteMetricsDisplay";
import { TournamentResultsTable } from "@/components/TournamentResultsTable";
import { AthleteMetricsTable } from "@/components/AthleteMetricsTable";
import { BestRecentVsCRDisplay } from "@/components/BestRecentVsCRDisplay";
import { BestRecentVsParDisplay } from "@/components/BestRecentVsParDisplay";
import { BestRecentScoreDisplay } from "@/components/BestRecentScoreDisplay";
import { listAthleteRegistrations, AthleteRegistrationWithTournament } from "@/lib/api/athleteTournamentRegistrations";
import { formatDistanceToNow } from "date-fns";
import { Avatar } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getAthleteById, updateAthlete } from "@/lib/api/athletes";
import { normalizeIntendedMajors, formatWeatherZoneLabel } from '@/lib/divisionNormalizer';

// Helper function to convert YouTube URLs to embed format
const convertYouTubeUrl = (url: string): string => {
  if (!url) return '';
  
  // Already an embed URL
  if (url.includes('youtube.com/embed/')) return url;
  
  // Extract video ID from various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/,
    /youtube\.com\/embed\/([^&?/]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
  }
  
  return url; // Return original if no match
};

const AdminAthleteView: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedTournament, setExpandedTournament] = useState<string | null>(null);
  const [coverError, setCoverError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [athlete, setAthlete] = useState<any>(null);
  const [tournamentResults, setTournamentResults] = useState<any[]>([]);
  const [upcomingTournaments, setUpcomingTournaments] = useState<AthleteRegistrationWithTournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Download the SAME coach recruiting one-pager (live, regenerated on each click).
  const handleDownloadOnePager = async () => {
    if (!id) return;
    setIsGeneratingPdf(true);
    try {
      await downloadAthleteOnePagerLive(id, athlete);
      toast({ title: 'PDF generated', description: 'The one-pager has been downloaded.' });
    } catch (e) {
      console.error('Error generating one-pager PDF:', e);
      toast({ title: 'Error', description: 'Failed to generate PDF. Please try again.', variant: 'destructive' });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      setIsLoading(true);
      try {
        // Use centralized API
        const athleteData = await getAthleteById(id);
        
        if (!athleteData) {
          toast({
            title: "Error",
            description: "Athlete not found",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }
        
        setAthlete(athleteData);
        
        // Fetch tournament results with import_order
        const { data: resultsData } = await supabase
          .from('tournament_results')
          .select('*, tournaments(*)')
          .eq('athlete_id', id);
          
        if (resultsData) {
          // Transform and sort using shared utility
          const transformedResults = resultsData.map(result => ({
            ...result,
            tournament: result.tournaments
          }));
          setTournamentResults(sortTournamentResults(transformedResults));
        }
        
        // Fetch upcoming tournaments
        try {
          const registrations = await listAthleteRegistrations(id);
          const today = new Date();
          const upcoming = registrations.filter(reg => {
            const startDate = reg.tournament?.start_date ? new Date(reg.tournament.start_date) : null;
            return startDate && startDate >= today;
          });
          setUpcomingTournaments(upcoming);
        } catch (error) {
          console.error('Error fetching upcoming tournaments:', error);
        }
      } catch (err) {
        console.error('Error:', err);
        toast({
          title: "Error",
          description: "Failed to load athlete data",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [id]);

  const handleArchive = async () => {
    if (!athlete || !id) return;
    
    setIsArchiving(true);
    try {
      await updateAthlete(id, { status: 'in_college' });
      toast({
        title: "Athlete archived",
        description: "The athlete profile has been archived and is now hidden from coaches.",
      });
      navigate('/admin/athletes');
    } catch (error) {
      console.error('Error archiving athlete:', error);
      toast({
        title: "Error",
        description: "Failed to archive athlete",
        variant: "destructive",
      });
    } finally {
      setIsArchiving(false);
      setArchiveDialogOpen(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!athlete) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Athlete not found</p>
            <Button onClick={() => navigate('/admin/athletes')} className="mt-4">
              Back to Athletes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderStarRating = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[...Array(7)].map((_, i) => (
          <Star 
            key={i} 
            className={`h-5 w-5 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted'}`} 
          />
        ))}
        <span className="ml-2 text-sm font-medium">{rating}/7 Stars</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
              >
                <Info className="h-3 w-3 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">Rating based on performance metrics</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  };

  const formatWeatherZone = (zone: string) => {
    return formatWeatherZoneLabel(zone);
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header with Cover Image */}
      <div className="relative h-64">
        {athlete.coverImage && !coverError ? (
          <img 
            src={athlete.coverImage} 
            alt={`${athlete.firstName} ${athlete.lastName} cover`} 
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setCoverError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary via-primary/80 to-primary/60" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent pointer-events-none" />
        
        {/* Navigation */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
          <Button
            variant="ghost"
            className="text-white bg-black/20 hover:bg-black/40 backdrop-blur-sm"
            onClick={() => navigate('/admin/athletes')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Athletes
          </Button>

          {/* Action Buttons */}
          <div className="flex gap-2 items-start">
            <Button
              onClick={() => navigate(`/admin/athletes/${id}/edit`)}
              className="bg-primary hover:bg-primary/90"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
            <Button
              variant="outline"
              onClick={() => setArchiveDialogOpen(true)}
              disabled={isArchiving}
              className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm border-white/30"
            >
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownloadOnePager}
              disabled={isGeneratingPdf}
              title="Download recruiting one-pager PDF"
              className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm"
            >
              {isGeneratingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
            </Button>
            <ShareProfileModal 
              athleteName={`${athlete.firstName} ${athlete.lastName}`}
              athleteId={athlete.slug || athlete.id}
              isAdminContext={true}
              trigger={
                <Button 
                  variant="ghost"
                  size="icon"
                  className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              }
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-20 relative z-10 max-w-7xl">
        {/* Breadcrumb */}
        <div className="mb-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink onClick={() => navigate('/admin/athletes')} className="cursor-pointer">
                  Athletes
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{athlete.firstName} {athlete.lastName}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-6">
            {/* Profile Card */}
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                  {/* Profile Info */}
                  <div className="lg:col-span-2 flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-end">
                    <div className="flex-shrink-0">
                      <div className="relative">
                        <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden bg-gray-200 border-4 border-background shadow-xl">
                          {athlete.profileImage && !avatarError ? (
                            <img 
                              src={athlete.profileImage} 
                              alt={`${athlete.firstName} ${athlete.lastName}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={() => setAvatarError(true)}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/10">
                              <User className="h-12 w-12 sm:h-16 sm:w-16 text-primary" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 w-full text-center sm:text-left">
                      <h1 className="text-2xl sm:text-3xl font-bold mb-3">
                        {athlete.firstName} {athlete.lastName}
                      </h1>
                      
                      <div className="mb-4 flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                        {renderStarRating(athlete.starRating)}
                      </div>

                      {/* Status badge — shown for every athlete for at-a-glance scanning */}
                      <div className="mb-3">
                        <Badge className={STATUS_BADGE_CLASSES[athlete.status]}>
                          {statusLabel(athlete.status)}
                          {(athlete.status === 'committed' || athlete.status === 'in_college') &&
                          athlete.committed_to
                            ? ` · ${athlete.committed_to}`
                            : ''}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground justify-center sm:justify-start">
                        <div className="flex items-center gap-1">
                          <School className="h-4 w-4" />
                          <span>{athlete.currentSchool || 'Not specified'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{athlete.hometown || 'Not specified'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Class of {athlete.graduationYear}</span>
                        </div>
                      </div>

                      {athlete.instagramHandle && (
                        <div className="mt-3 flex items-center gap-2 justify-center sm:justify-start">
                          <Instagram className="h-4 w-4 text-muted-foreground" />
                          <a 
                            href={
                              athlete.instagramHandle.startsWith('http://') || athlete.instagramHandle.startsWith('https://')
                                ? athlete.instagramHandle
                                : `https://instagram.com/${athlete.instagramHandle.replace('@', '')}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            {(() => {
                              if (athlete.instagramHandle.startsWith('http://') || athlete.instagramHandle.startsWith('https://')) {
                                // Extract username from URL
                                try {
                                  const urlObj = new URL(athlete.instagramHandle);
                                  const match = urlObj.pathname.match(/^\/([^/?]+)/);
                                  return match ? `@${match[1]}` : 'Instagram Profile';
                                } catch {
                                  return 'Instagram Profile';
                                }
                              }
                              return `@${athlete.instagramHandle.replace('@', '')}`;
                            })()}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Video Section */}
                  {athlete.videoLink && (
                    <div className="lg:col-span-1">
                      <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                        <iframe
                          src={convertYouTubeUrl(athlete.videoLink)}
                          title="Athlete highlight video"
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t">
                  <div className="text-center">
                    <BestRecentScoreDisplay athleteId={athlete.id} showTooltip={true} className="text-2xl font-bold text-primary" />
                    <div className="text-xs text-muted-foreground">Best Recent Avg</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{athlete.gpa?.toFixed(2) || 'N/A'}</div>
                    <div className="text-xs text-muted-foreground">GPA</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{athlete.drivingAverageCarryDistance || 'N/A'}</div>
                    <div className="text-xs text-muted-foreground">Drive Distance</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{athlete.preferredDivisions?.length > 0 ? athlete.preferredDivisions.join(', ') : 'N/A'}</div>
                    <div className="text-xs text-muted-foreground">Target Division</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs Section */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-1 h-auto p-1">
                <TabsTrigger value="overview" className="text-xs sm:text-sm px-2 py-1.5">Overview</TabsTrigger>
                <TabsTrigger value="academic" className="text-xs sm:text-sm px-2 py-1.5">Academic</TabsTrigger>
                <TabsTrigger value="tennis" className="text-xs sm:text-sm px-2 py-1.5 col-span-2 sm:col-span-1">Tennis</TabsTrigger>
                <TabsTrigger value="tournaments" className="text-xs sm:text-sm px-2 py-1.5">Tournaments</TabsTrigger>
                <TabsTrigger value="schedule" className="text-xs sm:text-sm px-2 py-1.5">Schedule</TabsTrigger>
                <TabsTrigger value="media" className="text-xs sm:text-sm px-2 py-1.5">Media</TabsTrigger>
                <TabsTrigger value="notes" className="text-xs sm:text-sm px-2 py-1.5 col-span-2 sm:col-span-1">Notes</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        Basic Information
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <Badge variant={athlete.status === 'committed' ? 'default' : 'secondary'}>
                            {athlete.status}
                          </Badge>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Club:</span>
                          <span className="font-medium">{athlete.clubTeam || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Hometown:</span>
                          <span className="font-medium">{athlete.hometown || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Graduation Year:</span>
                          <span className="font-medium">{athlete.graduationYear}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Golf Stats */}
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-primary" />
                        Tennis Performance
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">UTR:</span>
                          <span className="font-medium">{athlete.utr != null ? athlete.utr : 'N/A'}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">WTN:</span>
                          <span className="font-medium">{athlete.wtn != null ? athlete.wtn : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">National ranking:</span>
                          <span className="font-medium">{athlete.nationalRanking ? `#${athlete.nationalRanking}` : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">ITF Junior:</span>
                          <span className="font-medium">{(athlete as any).itfJuniorRanking ?? 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Preferred surface:</span>
                          <span className="font-medium">{athlete.preferredSurface || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Play style:</span>
                          <span className="font-medium">{athlete.playStyle || 'N/A'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Strengths and Areas of Improvement */}
                {(athlete.strengths || athlete.areasOfImprovement) && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {athlete.strengths && (
                      <Card>
                        <CardContent className="p-6">
                          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <Award className="h-5 w-5 text-primary" />
                            Strengths
                          </h3>
                          <p className="text-muted-foreground whitespace-pre-wrap">{athlete.strengths}</p>
                        </CardContent>
                      </Card>
                    )}
                    {athlete.areasOfImprovement && (
                      <Card>
                        <CardContent className="p-6">
                          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <Target className="h-5 w-5 text-primary" />
                            Areas of Improvement
                          </h3>
                          <p className="text-muted-foreground whitespace-pre-wrap">{athlete.areasOfImprovement}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* Recruitment Pitch */}
                {athlete.recruitmentPitch && (
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Why This Athlete is a Good Recruit
                      </h3>
                      <p className="text-muted-foreground whitespace-pre-wrap">{athlete.recruitmentPitch}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Academic Tab */}
              <TabsContent value="academic" className="space-y-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      Academic Profile
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">GPA:</span>
                          <span className="font-medium">{athlete.gpa?.toFixed(2) || 'N/A'}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">SAT Score:</span>
                          <span className="font-medium">{athlete.satScore || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Duolingo:</span>
                          <span className="font-medium">{athlete.duolingoScore || 'N/A'}</span>
                        </div>
                        {athlete.toeflScore && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">TOEFL:</span>
                            <span className="font-medium">{athlete.toeflScore}</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Intended Major:</span>
                          <span className="font-medium">{normalizeIntendedMajors(athlete.intendedMajors).join(', ') || 'Undecided'}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Graduation Year:</span>
                          <span className="font-medium">{athlete.graduationYear}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Golf Tab */}
              <TabsContent value="tennis" className="space-y-6">
                {/* Ratings & rankings */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <Activity className="h-5 w-5 text-primary" />
                        <p className="font-semibold">UTR</p>
                      </div>
                      <p className="text-3xl font-bold">{athlete.utr != null ? athlete.utr : 'N/A'}</p>
                      <p className="text-sm text-muted-foreground mt-1">Universal Tennis Rating</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        <p className="font-semibold">WTN</p>
                      </div>
                      <p className="text-3xl font-bold">{athlete.wtn != null ? athlete.wtn : 'N/A'}</p>
                      <p className="text-sm text-muted-foreground mt-1">World Tennis Number</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                        <p className="font-semibold">National</p>
                      </div>
                      <p className="text-3xl font-bold font-mono">{athlete.nationalRanking ? `#${athlete.nationalRanking}` : 'N/A'}</p>
                      <p className="text-sm text-muted-foreground mt-1">{athlete.nationalRankingCountry || 'National ranking'}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <Award className="h-5 w-5 text-primary" />
                        <p className="font-semibold">ITF Junior</p>
                      </div>
                      <p className="text-3xl font-bold font-mono">{(athlete as any).itfJuniorRanking ?? 'N/A'}</p>
                      <p className="text-sm text-muted-foreground mt-1">ITF junior ranking</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Play profile & preferences */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Play profile
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Dominant hand:</span>
                          <span className="font-medium">{athlete.dominantHand || 'N/A'}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Backhand:</span>
                          <span className="font-medium">{athlete.backhandType || 'N/A'}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Preferred surface:</span>
                          <span className="font-medium">{athlete.preferredSurface || 'N/A'}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Play style:</span>
                          <span className="font-medium">{athlete.playStyle || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Height / Weight:</span>
                          <span className="font-medium">{[athlete.heightCm ? `${athlete.heightCm} cm` : null, athlete.weightKg ? `${athlete.weightKg} kg` : null].filter(Boolean).join(' · ') || 'N/A'}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Preferred Division:</span>
                          <span className="font-medium">{athlete.preferredDivisions?.join(', ') || 'N/A'}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Weather Zone:</span>
                          <span className="font-medium">{athlete.weatherZone ? formatWeatherZone(athlete.weatherZone) : 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tournaments Tab */}
              <TabsContent value="tournaments" className="space-y-6">
                <Card>
                  <CardContent className="p-6">
                    {/* Tournament Summary Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-2xl font-bold">
                          {athlete.sex === 'Male' 
                            ? tournamentResults.filter(r => r.position <= 10).length
                            : tournamentResults.filter(r => r.position <= 3).length
                          }
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {athlete.sex === 'Male' ? 'Top 10 Finishes' : 'Top 3 Finishes'}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-2xl font-bold">
                          {tournamentResults.filter(r => r.position === 1).length}
                        </p>
                        <p className="text-xs text-muted-foreground">Wins</p>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <BestRecentScoreDisplay athleteId={athlete.id} showTooltip={true} className="text-2xl font-bold" />
                        <p className="text-xs text-muted-foreground">Best Recent Avg</p>
                      </div>
                    </div>

                    {/* Tournament Results Table */}
                    <TournamentResultsTable 
                      results={tournamentResults}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Schedule Tab */}
              <TabsContent value="schedule" className="space-y-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      Upcoming Tournaments
                    </h3>
                    {upcomingTournaments.length === 0 ? (
                      <div className="text-center py-12">
                        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No upcoming tournaments scheduled</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {upcomingTournaments.map((registration) => {
                          const startDate = registration.tournament?.start_date ? new Date(registration.tournament.start_date) : null;
                          const endDate = registration.tournament?.end_date ? new Date(registration.tournament.end_date) : null;
                          
                          return (
                            <Card key={registration.id} className="overflow-hidden">
                              <CardContent className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                  <div className="flex-1">
                                    <h3 className="font-semibold text-lg mb-1">
                                      {registration.tournament?.name || 'Tournament'}
                                    </h3>
                                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                                      {startDate && (
                                        <div className="flex items-center gap-1">
                                          <Calendar className="h-4 w-4" />
                                          <span>
                                            {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            {endDate && ` - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                                          </span>
                                        </div>
                                      )}
                                      {registration.tournament?.location && (
                                        <div className="flex items-center gap-1">
                                          <MapPin className="h-4 w-4" />
                                          <span>{registration.tournament.location}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <Badge variant={
                                    registration.registration_status === 'confirmed' ? 'default' :
                                    registration.registration_status === 'registered' ? 'secondary' :
                                    registration.registration_status === 'waitlisted' ? 'outline' :
                                    'destructive'
                                  }>
                                    {registration.registration_status}
                                  </Badge>
                                </div>
                                
                                {startDate && (
                                  <div className="flex items-center gap-2 text-sm bg-muted/50 p-3 rounded-lg">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">
                                      {formatDistanceToNow(startDate, { addSuffix: true })}
                                    </span>
                                  </div>
                                )}
                                
                                {registration.notes && (
                                  <div className="mt-3 text-sm text-muted-foreground border-l-2 border-primary/50 pl-3">
                                    {registration.notes}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Media Tab */}
              <TabsContent value="media" className="space-y-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Video className="h-5 w-5 text-primary" />
                      Videos & Media
                    </h3>
                    
                    {/* Primary Video */}
                    {athlete.videoLink ? (
                      <div className="mb-6">
                        <div className="aspect-video bg-black rounded-lg overflow-hidden">
                          <iframe
                            src={convertYouTubeUrl(athlete.videoLink)}
                            title="Athlete highlight video"
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-6">
                        <div className="text-center">
                          <Video className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                          <p className="text-muted-foreground">No videos available</p>
                        </div>
                      </div>
                    )}

                    {/* External Links */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground mb-3">External Resources</h4>
                      <div className="flex flex-wrap gap-3">
                        {athlete.tournamentResultsLink && (
                          <Button variant="outline" onClick={() => window.open(athlete.tournamentResultsLink, '_blank')}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Tournament Results
                          </Button>
                        )}
                        {athlete.trackmanReportLink && (
                          <Button variant="outline" onClick={() => window.open(athlete.trackmanReportLink, '_blank')}>
                            <BarChart3 className="mr-2 h-4 w-4" />
                            Trackman Report
                          </Button>
                        )}
                        {athlete.golfDataLink && (
                          <Button variant="outline" onClick={() => window.open(athlete.golfDataLink, '_blank')}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Golf Data Profile
                          </Button>
                        )}
                      </div>
                      {!athlete.tournamentResultsLink && !athlete.trackmanReportLink && !athlete.golfDataLink && (
                        <p className="text-sm text-muted-foreground">No external links available</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notes Tab */}
              <TabsContent value="notes" className="space-y-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Internal Notes
                    </h3>
                    <div className="text-center py-12 bg-muted/50 rounded-lg">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Admin note-taking functionality coming soon</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this athlete?</AlertDialogTitle>
            <AlertDialogDescription>
              Archived athletes are hidden from coaches and won't appear in search results. You can restore them later from the admin panel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} disabled={isArchiving}>
              {isArchiving ? "Archiving..." : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminAthleteView;

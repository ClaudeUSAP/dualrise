import { useState, useEffect } from 'react';
import { normalizeStatus } from '@/lib/athleteStatus';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from '@/integrations/supabase/client';
import { Athlete } from '@/types/athlete';
import { SearchFilters } from '@/types/athlete';
import { Heart, Eye, Star, GraduationCap, DollarSign, MapPin, Trophy, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { normalizeDivisionsWithDefault, normalizeIntendedMajors } from '@/lib/divisionNormalizer';

interface SearchResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchName: string;
  filters: SearchFilters;
}

const SearchResultsModal = ({ isOpen, onClose, searchName, filters }: SearchResultsModalProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchResults();
      fetchFavorites();
    }
  }, [isOpen, filters]);

  const fetchFavorites = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('favorites')
        .select('athlete_id')
        .eq('coach_id', user.id);
      
      if (data) {
        setFavorites(data.map(f => f.athlete_id));
      }
    }
  };

  const fetchResults = async () => {
    setLoading(true);
    try {
      // Exclude in_creation (in preparation), committed, and in_college/archived
      // (already placed) athletes from coach search results
      let query = supabase.from('athletes_safe' as any).select('*')
        .not('status', 'ilike', 'in_creation')
        .not('status', 'ilike', 'committed')
        .not('status', 'ilike', 'archived')
        .not('status', 'ilike', 'in_college');
      
      // Apply filters
      if (filters.gpaMin) {
        query = query.gte('academic_gpa', filters.gpaMin);
      }
      if (filters.gpaMax) {
        query = query.lte('academic_gpa', filters.gpaMax);
      }
      if (filters.budgetMin) {
        query = query.gte('preferences_budget', filters.budgetMin);
      }
      if (filters.budgetMax) {
        query = query.lte('preferences_budget', filters.budgetMax);
      }
      if (filters.highSchoolYear && filters.highSchoolYear.length > 0) {
        const years = filters.highSchoolYear.map(year => {
          if (year === 'Senior') return '2025';
          if (year === 'Junior') return '2026';
          if (year === 'Sophomore') return '2027';
          return '2028';
        });
        query = query.in('graduation_year', years);
      }
      
      const { data, error } = await query.limit(10);
      
      if (error) {
        console.error('Error fetching athletes:', error);
        setAthletes([]);
      } else if (data) {
        const mappedAthletes: Athlete[] = data.map((athlete: any) => ({
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
          scoringAverageVsCourseRating: Number(athlete.scoring_average_vs_course_rating) || 0,
          nationalAdultRanking: parseInt(athlete.french_adult_ranking || '0') || 0,
          nationalRankingInClass: parseInt(athlete.french_ranking_in_their_class || '0') || 0,
          drivingAverageCarryDistance: Number(athlete.drive_distance_carry) || 250,
          maxDriverClubHeadSpeed: Number(athlete.max_club_head_speed) || 100,
          preferredDivisions: normalizeDivisionsWithDefault(athlete.preferences_division),
          starRating: Math.floor(Math.random() * 6) + 1,
          strengths: athlete.strengths || '',
          areasOfImprovement: athlete.areas_of_improvement || '',
          weatherZone: 'Zone 2' as const,
          budget: Number(athlete.preferences_budget) || 40000,
          recruitmentPitch: athlete.why_good_recruit || '',
          hometown: athlete.country || '',
          createdAt: new Date(athlete.created_at || Date.now()),
          updatedAt: new Date(athlete.updated_at || Date.now()),
          featured: false,
          status: normalizeStatus(athlete.status),
          statusExpiresAt: athlete.status_expires_at ? new Date(athlete.status_expires_at) : undefined,
          graduationYear: athlete.graduation_year || '2025',
          preferredMajors: normalizeIntendedMajors(athlete.intended_majors),
          handicap: 0,
          profileImage: athlete.profile_photo || undefined,
        }));
        setAthletes(mappedAthletes);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setAthletes([]);
    } finally {
      setLoading(false);
    }
  };

  const renderStarRating = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[...Array(7)].map((_, i) => (
          <Star
            key={i}
            className={cn(
              "h-3 w-3",
              i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            )}
          />
        ))}
      </div>
    );
  };

  const viewFullResults = () => {
    const params = new URLSearchParams();
    if (filters.gpaMin) params.set('gpaMin', filters.gpaMin.toString());
    if (filters.gpaMax) params.set('gpaMax', filters.gpaMax.toString());
    if (filters.budgetMin) params.set('budgetMin', filters.budgetMin.toString());
    if (filters.budgetMax) params.set('budgetMax', filters.budgetMax.toString());
    if (filters.preferredDivision) params.set('division', filters.preferredDivision.join(','));
    if (filters.highSchoolYear) params.set('year', filters.highSchoolYear.join(','));
    if (filters.starRatingMin) params.set('starRatingMin', filters.starRatingMin.toString());
    
    navigate(`/athletes?${params.toString()}`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">{searchName} - Quick Results</DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Showing top {athletes.length} matches. Click "View All Results" to see the complete list.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[500px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading results...</div>
            </div>
          ) : athletes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <p className="text-muted-foreground">No athletes match your search criteria</p>
            </div>
          ) : (
            <div className="space-y-3">
              {athletes.map((athlete) => (
                <Card key={athlete.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
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
                          <div className="flex items-center gap-4 mt-1">
                            {renderStarRating(athlete.starRating)}
                            <Badge variant="secondary" className="text-xs">
                              <GraduationCap className="h-3 w-3 mr-1" />
                              GPA {athlete.gpa != null ? athlete.gpa.toFixed(2) : 'N/A'}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              <DollarSign className="h-3 w-3 mr-1" />
                              ${(athlete.budget / 1000).toFixed(0)}k
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              <Trophy className="h-3 w-3 mr-1" />
                              UTR {athlete.utr != null ? athlete.utr : 'N/A'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const athleteSlug = (athlete as any).slug || athlete.id;
                          navigate(`/athletes/${athleteSlug}`);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <div className="flex justify-between items-center mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {athletes.length} of potentially more results
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={viewFullResults}>
              View All Results
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SearchResultsModal;
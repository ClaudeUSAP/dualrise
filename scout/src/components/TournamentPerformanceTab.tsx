import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Trophy, TrendingUp } from 'lucide-react';
import { parseRoundsToNumbers, formatRoundsDisplay } from '@/lib/roundsParser';

interface TournamentResult {
  id: string;
  athlete_id: string;
  tournament_id: string;
  position: number | null;
  total_score: number | null;
  rounds: string | null;
  field_size: number | null;
  tournaments?: {
    id: string;
    name: string;
    start_date: string | null;
    end_date: string | null;
    location: string | null;
    country: string | null;
    results_link: string | null;
    course_rating: string | null;
    course_par: string | null;
    field_size: string | null;
  };
}

interface FavoriteAthlete {
  id: string;
  athlete_id: string;
  status: string;
  notes: string | null;
  created_at: string;
  athlete: {
    id: string;
    first_name: string;
    last_name: string;
    graduation_year: string | null;
    academic_gpa: number | null;
    scoring_average: string | null;
    country: string | null;
  };
}

interface TournamentPerformanceTabProps {
  favoriteAthletes: FavoriteAthlete[];
  tournamentResults: TournamentResult[];
}

export const TournamentPerformanceTab = ({ favoriteAthletes, tournamentResults }: TournamentPerformanceTabProps) => {
  if (favoriteAthletes.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No favorite athletes</h3>
          <p className="text-muted-foreground">
            Add athletes to your favorites to track their tournament performance
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {favoriteAthletes.map(favorite => {
        const athlete = favorite.athlete;
        const athleteResults = tournamentResults.filter(r => r.athlete_id === favorite.athlete_id);
        
        // Calculate statistics
        const totalTournaments = athleteResults.length;
        const validPositions = athleteResults.filter(r => r.position !== null);
        const validScores = athleteResults.filter(r => r.total_score !== null);
        
        const avgPosition = validPositions.length > 0 
          ? Math.round(validPositions.reduce((sum, r) => sum + (r.position || 0), 0) / validPositions.length)
          : null;
        
        // Calculate average score per round (not per tournament)
        const allRoundScores = athleteResults.flatMap((r: any) => parseRoundsToNumbers(r.rounds));
        
        const avgScore = allRoundScores.length > 0
          ? Math.round(allRoundScores.reduce((sum: number, score: number) => sum + score, 0) / allRoundScores.length)
          : null;
        
        // Get results from 2025 or last 5 tournaments
        const currentYear = new Date().getFullYear();
        const recentResults = athleteResults.filter(r => {
          if (!r.tournaments?.start_date) return false;
          const year = new Date(r.tournaments.start_date).getFullYear();
          return year === currentYear;
        });
        
        const resultsToShow = recentResults.length > 0 ? recentResults : athleteResults.slice(0, 5);
        
        return (
          <Card key={favorite.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {athlete.first_name} {athlete.last_name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {athlete.country} • Class of {athlete.graduation_year}
                  </p>
                </div>
                <div className="flex gap-6">
                  {avgPosition && (
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Avg Position</p>
                      <p className="text-2xl font-bold text-primary">#{avgPosition}</p>
                    </div>
                  )}
                  {avgScore && (
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Avg Score</p>
                      <p className="text-2xl font-bold text-primary">{avgScore}</p>
                    </div>
                  )}
                  {athlete.scoring_average && (
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Scoring Avg</p>
                      <p className="text-2xl font-bold text-primary">{athlete.scoring_average}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {resultsToShow.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <TrendingUp className="h-4 w-4" />
                    <span>
                      {recentResults.length > 0 
                        ? `${currentYear} Tournament Results (${recentResults.length} events)`
                        : `Recent Tournament Results (Last ${resultsToShow.length} events)`}
                    </span>
                  </div>
                  {resultsToShow.map(result => (
                    <div 
                      key={result.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="font-medium">
                          {result.tournaments?.name || 'Unknown Tournament'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {result.tournaments?.location && `${result.tournaments.location}`}
                          {result.tournaments?.start_date && ` • ${new Date(result.tournaments.start_date).toLocaleDateString()}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          {/* Position with field size */}
                          {result.position && (
                            <div className="font-semibold mb-1">
                              Position: <span className="text-primary">
                                #{result.position}
                                {(result.tournaments?.field_size || result.field_size) && (
                                  <span className="text-muted-foreground font-normal text-xs ml-1">
                                    / {result.tournaments?.field_size || result.field_size} joueurs
                                  </span>
                                )}
                              </span>
                            </div>
                          )}
                          
                          {/* Detailed round scores */}
                          {result.rounds && (
                            <div className="text-sm mb-1">
                              <span className="text-muted-foreground">Rounds: </span>
                              <span className="font-medium">{formatRoundsDisplay(result.rounds)}</span>
                              {result.total_score && (
                                <span className="text-muted-foreground text-xs ml-1">
                                  (Total: {result.total_score})
                                </span>
                              )}
                            </div>
                          )}
                          
                          {/* Course Rating */}
                          {result.tournaments?.course_rating && (
                            <div className="text-sm text-muted-foreground">
                              CR: {result.tournaments.course_rating}
                              {result.tournaments.course_par && (
                                <span className="ml-1">(Par: {result.tournaments.course_par})</span>
                              )}
                            </div>
                          )}
                        </div>
                        {result.tournaments?.results_link && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(result.tournaments.results_link, '_blank')}
                            title="View full results"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No tournament results recorded</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
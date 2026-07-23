import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, Heart, User, ExternalLink, ArrowUp, ArrowDown } from "lucide-react";
import { parseRoundsToNumbers } from "@/lib/roundsParser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { getTournamentById } from "@/lib/api/tournaments";
import { getTournamentResults } from "@/lib/api/tournamentResults";
import { Tournament, TournamentResult } from "@/types/tournament";
import { formatUSDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { isValidUrl } from "@/lib/csvExporter";
import { normalizeStatus, hasUniversityTag } from "@/lib/athleteStatus";

type SortColumn = 'position' | 'name' | 'total' | 'vsCR' | 'class';
type SortDirection = 'asc' | 'desc';

const isSpecialEntry = (result: TournamentResult) => {
  const pt = (result.positionText || '').toUpperCase().trim();
  if (['MC', 'WD', 'DQ', '-'].includes(pt)) return true;
  if ((result.finalPosition === 0 || result.finalPosition == null) && pt && isNaN(Number(pt))) return true;
  return false;
};

const specialOrder = (result: TournamentResult): number => {
  const pt = (result.positionText || '').toUpperCase().trim();
  if (pt === 'MC') return 0;
  if (pt === 'DQ') return 1;
  if (pt === 'WD') return 2;
  return 3;
};

// Position cell: never render "0". For a real position (> 0) keep the existing
// behaviour (position_text if any, else the number). For position 0 / NULL show
// the status text (MC, DNF, WD, NC, ABJ, …), defaulting to "MC" when it is empty.
const renderPosition = (result: TournamentResult): string => {
  const pos = result.finalPosition;
  if (pos && pos > 0) return result.positionText || String(pos);
  return (result.positionText || '').trim() || 'MC';
};

export default function TournamentLeaderboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [results, setResults] = useState<TournamentResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<TournamentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  // Default: show ALL USAP players (incl. committed/in_college with their
  // university tag). The toggle narrows down to uncommitted (Available) only.
  const [showUncommittedOnly, setShowUncommittedOnly] = useState(false);
  const [selectedGradYear, setSelectedGradYear] = useState("all");
  const [athleteDetails, setAthleteDetails] = useState<Record<string, any>>({});
  const [sortColumn, setSortColumn] = useState<SortColumn>('position');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      // Coaches must never read the raw `athletes` table (RLS-blocked, RGPD) —
      // skip the athlete embed on the results and read identity from athletes_safe.
      const [tournamentData, resultsData, favoritesData] = await Promise.all([
        getTournamentById(id),
        getTournamentResults(id, { includeAthlete: false }),
        user ? supabase.from('favorites').select('athlete_id').eq('coach_id', user.id) : Promise.resolve({ data: [], error: null }),
      ]);

      setTournament(tournamentData);
      setResults(resultsData);
      setFilteredResults(resultsData);

      if (favoritesData.data && !favoritesData.error) {
        const favoriteIds = favoritesData.data.map((fav: any) => fav.athlete_id);
        setFavorites(favoriteIds);
      }

      // Athlete identity + visibility status comes from athletes_safe, fetched by
      // the athlete_ids present in this tournament's results. The score/position
      // data still comes from tournament_results (above); only the identity/link
      // block goes through athletes_safe.
      const athleteIds = Array.from(new Set(resultsData.map((r) => r.athleteId).filter(Boolean)));
      if (athleteIds.length > 0) {
        const { data: athletesData } = await (supabase
          .from('athletes_safe' as any)
          .select('id, first_name, last_name, status, graduation_year, committed, committed_to, slug, french_adult_ranking, french_adult_ranking_at_commit, committed_division, scoreboard_current_rank')
          .in('id', athleteIds) as any);
        const details: Record<string, any> = {};
        (athletesData || []).forEach((athlete: any) => {
          details[athlete.id] = athlete;
        });
        setAthleteDetails(details);
      } else {
        setAthleteDetails({});
      }
    } catch (error) {
      console.error("Error loading tournament leaderboard:", error);
      toast({
        title: "Error",
        description: "Failed to load tournament leaderboard",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    applyFilters();
  }, [showUncommittedOnly, selectedGradYear, results]);

  const applyFilters = () => {
    let filtered = [...results];

    // Coach visibility: show ONLY available / committed / in_college. in_creation
    // (in preparation) and archived must NEVER appear. archived normalizes to
    // in_college, so exclude it on the raw value before applying the whitelist.
    filtered = filtered.filter((result) => {
      const raw = (athleteDetails[result.athleteId]?.status ?? '').trim().toLowerCase();
      if (raw === 'in_creation' || raw === 'archived') return false;
      const status = normalizeStatus(raw);
      return status === 'available' || status === 'committed' || status === 'in_college';
    });

    if (showUncommittedOnly) {
      // "Show uncommitted only" → strictly available athletes (committed AND
      // in_college are hidden).
      filtered = filtered.filter((result) => {
        const athleteDetail = athleteDetails[result.athleteId];
        return athleteDetail && normalizeStatus(athleteDetail.status) === 'available';
      });
    }

    if (selectedGradYear !== "all") {
      filtered = filtered.filter((result) => {
        const athleteDetail = athleteDetails[result.athleteId];
        // Supports multi-class athletes ("2028, 2027") — match if any year matches
        return athleteDetail && String(athleteDetail.graduation_year ?? '')
          .split(',').map(y => y.trim()).includes(selectedGradYear);
      });
    }

    setFilteredResults(filtered);
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        // Reset to default
        setSortColumn('position');
        setSortDirection('asc');
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedResults = useMemo(() => {
    const ranked = filteredResults.filter(r => !isSpecialEntry(r));
    const special = filteredResults.filter(r => isSpecialEntry(r));

    const compare = (a: TournamentResult, b: TournamentResult): number => {
      const dir = sortDirection === 'asc' ? 1 : -1;
      switch (sortColumn) {
        case 'position':
          return ((a.finalPosition || 999) - (b.finalPosition || 999)) * dir;
        case 'name': {
          // Identity comes from athletes_safe (athleteDetails), not the results embed.
          const da = athleteDetails[a.athleteId];
          const db = athleteDetails[b.athleteId];
          const nameA = `${da?.first_name || ''} ${da?.last_name || ''}`.trim();
          const nameB = `${db?.first_name || ''} ${db?.last_name || ''}`.trim();
          return nameA.localeCompare(nameB) * dir;
        }
        case 'total':
          return ((a.totalScore || 0) - (b.totalScore || 0)) * dir;
        case 'vsCR':
          return ((a.scoreVsCourseRating || 0) - (b.scoreVsCourseRating || 0)) * dir;
        case 'class': {
          const classA = athleteDetails[a.athleteId]?.graduation_year || 9999;
          const classB = athleteDetails[b.athleteId]?.graduation_year || 9999;
          return (classA - classB) * dir;
        }
        default:
          return 0;
      }
    };

    ranked.sort(compare);
    special.sort((a, b) => specialOrder(a) - specialOrder(b));
    return [...ranked, ...special];
  }, [filteredResults, sortColumn, sortDirection, athleteDetails]);

  const SortHeader = ({ column, label, className = '' }: { column: SortColumn; label: string; className?: string }) => (
    <th
      className={`pb-3 pr-4 font-medium text-sm cursor-pointer select-none hover:text-foreground ${className}`}
      onClick={() => handleSort(column)}
    >
      <div className={`flex items-center gap-1 ${className.includes('text-center') ? 'justify-center' : ''}`}>
        {label}
        {sortColumn === column && (
          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        )}
      </div>
    </th>
  );

  const toggleFavorite = async (athleteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
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
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('coach_id', user.id)
        .eq('athlete_id', athleteId);
      
      if (error) {
        console.error('Error removing favorite:', error);
        toast({ title: "Error", description: "Failed to remove from favorites", variant: "destructive" });
      } else {
        setFavorites(prev => prev.filter(id => id !== athleteId));
        toast({ title: "Removed from Favorites", description: "Athlete removed from your favorites" });
      }
    } else {
      const { error } = await supabase
        .from('favorites')
        .insert({ coach_id: user.id, athlete_id: athleteId, status: 'interested' });
      
      if (error) {
        console.error('Error adding favorite:', error);
        toast({ title: "Error", description: "Failed to add to favorites", variant: "destructive" });
      } else {
        setFavorites(prev => [...prev, athleteId]);
        toast({ title: "Added to Favorites", description: "Athlete added to your favorites" });
      }
    }
  };

  const gradYears = Array.from(
    new Set(
      results
        .map((r) => athleteDetails[r.athleteId]?.graduation_year)
        .filter(Boolean)
    )
  ).sort((a, b) => a - b);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Tournament not found</div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto py-8 px-4">
      <div className="mb-6 flex items-center gap-4">
        <SidebarTrigger />
        <Button variant="ghost" onClick={() => navigate("/tournament-search")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tournament Search
        </Button>
      </div>

      {/* Tournament Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-3xl mb-2">
                {tournament.name}
              </CardTitle>
              {isValidUrl(tournament.resultsLink) && (
                <div className="mt-3 mb-2">
                  <Button variant="default" size="default" asChild>
                    <a href={tournament.resultsLink!} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Link to the full results
                    </a>
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-3 text-muted-foreground">
                <span>{tournament.location}, {tournament.country}</span>
                <span>•</span>
                <span>{tournament.year}</span>
                {tournament.startDate && tournament.endDate && (
                  <>
                    <span>•</span>
                    <span>
                      {formatUSDate(tournament.startDate)} - {formatUSDate(tournament.endDate)}
                    </span>
                  </>
                )}
                {tournament.startDate && !tournament.endDate && (
                  <>
                    <span>•</span>
                    <span>{formatUSDate(tournament.startDate)}</span>
                  </>
                )}
              </div>
            </div>
            {tournament.status && (
              <Badge variant={
                tournament.status === 'completed' ? 'default' :
                tournament.status === 'in_progress' ? 'secondary' :
                'outline'
              }>
                {tournament.status}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Par</div>
              <div className="text-2xl font-bold">{tournament.par}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Course Rating</div>
              <div className="text-2xl font-bold">{tournament.courseRating}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Field Size</div>
              <div className="text-2xl font-bold">{tournament.participatingAthletes || results.length}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Yardage</div>
              <div className="text-2xl font-bold">
                {tournament.yardage ? (+tournament.yardage).toLocaleString() : 'N/A'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="uncommitted" 
                checked={showUncommittedOnly}
                onCheckedChange={(checked) => setShowUncommittedOnly(checked as boolean)}
              />
              <Label htmlFor="uncommitted" className="cursor-pointer">
                Only show uncommitted players
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Label>Class Year:</Label>
              <Select value={selectedGradYear} onValueChange={setSelectedGradYear}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {gradYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="mr-2 h-5 w-5" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedResults.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No results match your filters.
            </div>
          ) : (
            <>
              {/* Mobile Card Layout */}
              <div className="md:hidden space-y-4">
                {sortedResults.map((result) => {
                  const athleteDetail = athleteDetails[result.athleteId];
                  const isFavorite = favorites.includes(result.athleteId);
                  const isCommitted =
                    hasUniversityTag(athleteDetail?.status) || athleteDetail?.committed;
                  // University tag for committed / in_college athletes (only when known)
                  const universityTag = isCommitted ? athleteDetail?.committed_to || null : null;
                  const athleteSlug = athleteDetail?.slug || result.athleteId;
                  const displayName =
                    (athleteDetail?.first_name && athleteDetail?.last_name
                      ? `${athleteDetail.first_name} ${athleteDetail.last_name}`
                      : result.athlete?.firstName && result.athlete?.lastName
                      ? `${result.athlete.firstName} ${result.athlete.lastName}`
                      : null) || 'Unknown athlete';
                  // Already-placed athletes (in_college): show FR ranking WHEN COMMITTED
                  // and the CURRENT scoreboard rank. Each hidden independently when null.
                  const isInCollege = normalizeStatus(athleteDetail?.status) === 'in_college';
                  const frAtCommit = (() => {
                    const n = parseInt(String(athleteDetail?.french_adult_ranking_at_commit ?? ''), 10);
                    return Number.isFinite(n) && n > 0 ? n : null;
                  })();
                  const sbRank = (() => {
                    const n = parseInt(String(athleteDetail?.scoreboard_current_rank ?? ''), 10);
                    return Number.isFinite(n) && n > 0 ? n : null;
                  })();

                  return (
                    <Card key={result.id}>
                      <CardContent className="pt-4 space-y-3">
                        {/* Header: Position + Athlete Name + Badges */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant="secondary" className="text-sm font-bold">
                                {renderPosition(result)}
                              </Badge>
                              {universityTag && (
                                <Badge className="text-xs bg-red-50 text-red-800 border border-red-200">
                                  🎓 Committed to {universityTag}
                                  {isInCollege && athleteDetail?.committed_division ? ` · ${athleteDetail.committed_division}` : ''}
                                </Badge>
                              )}
                              {universityTag &&
                                parseInt(String(athleteDetail?.french_adult_ranking ?? ''), 10) > 0 && (
                                <Badge className="text-xs bg-blue-50 text-blue-800 border border-blue-200">
                                  Current French Ranking: #{parseInt(String(athleteDetail.french_adult_ranking), 10)}
                                </Badge>
                              )}
                              {athleteDetail?.graduation_year && (
                                <Badge variant="outline" className="text-xs">
                                  {athleteDetail.graduation_year}
                                </Badge>
                              )}
                            </div>
                            {/* committed / in_college: name + university tag only,
                                NOT clickable (no consultable profile for coaches) */}
                            {isCommitted ? (
                              <span className="font-semibold text-base text-left">
                                {displayName}
                              </span>
                            ) : (
                              <button
                                className="font-semibold text-base hover:underline cursor-pointer text-left"
                                onClick={() => window.open(`/athletes/${athleteSlug}`, '_blank')}
                              >
                                {displayName}
                              </button>
                            )}
                            {isInCollege && (frAtCommit != null || sbRank != null) && (
                              <div className="mt-1 text-xs text-muted-foreground">
                                {frAtCommit != null && `#${frAtCommit} FR when committed`}
                                {sbRank != null && `${frAtCommit != null ? ' · ' : ''}#${sbRank} Scoreboard now`}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Score Section */}
                        <div className="grid grid-cols-2 gap-3 py-3 border-y">
                          <div>
                            <div className="text-xs text-muted-foreground">Total Score</div>
                            <div className="text-2xl font-bold">{result.totalScore}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">vs Course Rating</div>
                            <div className={`text-2xl font-bold ${result.scoreVsCourseRating > 0 ? "text-destructive" : "text-green-600"}`}>
                              {result.scoreVsCourseRating > 0 ? "+" : ""}{result.scoreVsCourseRating}
                            </div>
                          </div>
                        </div>

                        {/* Rounds Grid */}
                        {(() => {
                          const parsedRounds = parseRoundsToNumbers(result.rounds);
                          if (parsedRounds.length === 0) return null;
                          return (
                            <div>
                              <div className="text-xs text-muted-foreground mb-2">Round Scores</div>
                              <div className="grid grid-cols-4 gap-2">
                                {parsedRounds.map((score, idx) => (
                                  <div key={idx} className="text-center p-2 bg-muted rounded">
                                    <div className="text-xs text-muted-foreground">R{idx + 1}</div>
                                    <div className="font-semibold">{score}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                          {/* Favorites are only for available players — placed
                              (committed / in_college) athletes cannot be favorited. */}
                          {!isCommitted && (
                            <Button
                              variant={isFavorite ? "default" : "outline"}
                              size="sm"
                              className="flex-1"
                              onClick={(e) => toggleFavorite(result.athleteId, e)}
                            >
                              <Heart className={`h-4 w-4 mr-2 ${isFavorite ? 'fill-current' : ''}`} />
                              {isFavorite ? 'Favorited' : 'Add to Favorites'}
                            </Button>
                          )}
                          {/* Profiles of placed (committed / in_college) athletes are
                              intentionally not accessible to coaches — hide the link. */}
                          {!isCommitted && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(`/athletes/${athleteSlug}`, '_blank')}
                              title="View profile in new tab"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr className="text-left">
                      <SortHeader column="position" label="Pos" />
                      <SortHeader column="name" label="Athlete" />
                      <SortHeader column="class" label="Class" className="text-center" />
                      <SortHeader column="total" label="Total" className="text-center" />
                      <SortHeader column="vsCR" label="vs CR" className="text-center" />
                      {(() => {
                        const headerRounds = parseRoundsToNumbers(sortedResults[0]?.rounds);
                        return headerRounds.map((_, idx) => (
                          <th key={idx} className="pb-3 pr-4 font-medium text-center text-sm">
                            R{idx + 1}
                          </th>
                        ));
                      })()}
                      <th className="pb-3 font-medium text-center text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedResults.map((result) => {
                      const athleteDetail = athleteDetails[result.athleteId];
                      const isFavorite = favorites.includes(result.athleteId);
                      const isCommitted =
                        hasUniversityTag(athleteDetail?.status) || athleteDetail?.committed;
                      const universityTag = isCommitted ? athleteDetail?.committed_to || null : null;
                      const athleteSlug = athleteDetail?.slug || result.athleteId;
                  const displayName =
                    (athleteDetail?.first_name && athleteDetail?.last_name
                      ? `${athleteDetail.first_name} ${athleteDetail.last_name}`
                      : result.athlete?.firstName && result.athlete?.lastName
                      ? `${result.athlete.firstName} ${result.athlete.lastName}`
                      : null) || 'Unknown athlete';
                      // Already-placed athletes (in_college): show FR ranking WHEN COMMITTED
                      // and the CURRENT scoreboard rank. Each hidden independently when null.
                      const isInCollege = normalizeStatus(athleteDetail?.status) === 'in_college';
                      const frAtCommit = (() => {
                        const n = parseInt(String(athleteDetail?.french_adult_ranking_at_commit ?? ''), 10);
                        return Number.isFinite(n) && n > 0 ? n : null;
                      })();
                      const sbRank = (() => {
                        const n = parseInt(String(athleteDetail?.scoreboard_current_rank ?? ''), 10);
                        return Number.isFinite(n) && n > 0 ? n : null;
                      })();

                      return (
                        <tr key={result.id} className="border-b last:border-0">
                          <td className="py-4 pr-4">
                            <div className="font-semibold text-sm">
                              {renderPosition(result)}
                            </div>
                          </td>
                          <td className="py-4 pr-4">
                            <div className="flex items-center gap-2">
                              {/* committed / in_college: name + university tag only,
                                  NOT clickable (no consultable profile for coaches) */}
                              {isCommitted ? (
                                <span className="font-medium text-sm text-left">
                                  {displayName}
                                </span>
                              ) : (
                                <button
                                  className="font-medium text-sm hover:underline cursor-pointer text-left"
                                  onClick={() => window.open(`/athletes/${athleteSlug}`, '_blank')}
                                >
                                  {displayName}
                                </button>
                              )}
                              {universityTag && (
                                <Badge className="text-xs bg-red-50 text-red-800 border border-red-200">
                                  🎓 Committed to {universityTag}
                                  {isInCollege && athleteDetail?.committed_division ? ` · ${athleteDetail.committed_division}` : ''}
                                </Badge>
                              )}
                              {universityTag &&
                                parseInt(String(athleteDetail?.french_adult_ranking ?? ''), 10) > 0 && (
                                <Badge className="text-xs bg-blue-50 text-blue-800 border border-blue-200">
                                  Current French Ranking: #{parseInt(String(athleteDetail.french_adult_ranking), 10)}
                                </Badge>
                              )}
                              {isInCollege && (frAtCommit != null || sbRank != null) && (
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {frAtCommit != null && `#${frAtCommit} FR when committed`}
                                  {sbRank != null && `${frAtCommit != null ? ' · ' : ''}#${sbRank} Scoreboard now`}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-4 pr-4 text-center text-sm">
                            {athleteDetail?.graduation_year && (
                              <Badge variant="outline" className="text-xs">
                                {athleteDetail.graduation_year}
                              </Badge>
                            )}
                          </td>
                          <td className="py-4 pr-4 text-center font-bold text-sm">
                            {result.totalScore}
                          </td>
                          <td className="py-4 pr-4 text-center text-sm">
                            <span className={result.scoreVsCourseRating > 0 ? "text-destructive" : "text-green-600"}>
                              {result.scoreVsCourseRating > 0 ? "+" : ""}{result.scoreVsCourseRating}
                            </span>
                          </td>
                          {parseRoundsToNumbers(result.rounds).map((score, roundIdx) => (
                            <td key={roundIdx} className="py-4 pr-4 text-center text-sm">
                              {score}
                            </td>
                          ))}
                          <td className="py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {/* Favorites are only for available players — placed
                                  (committed / in_college) athletes cannot be favorited. */}
                              {!isCommitted && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant={isFavorite ? "default" : "outline"}
                                      size="sm"
                                      onClick={(e) => toggleFavorite(result.athleteId, e)}
                                    >
                                      <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{isFavorite ? 'Remove from favorites' : 'Add to favorites'}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {/* Placed (committed / in_college) athletes' profiles are
                                  intentionally not accessible to coaches — hide the link. */}
                              {!isCommitted && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => window.open(`/athletes/${athleteSlug}`, '_blank')}
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>View profile</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      </div>
    </TooltipProvider>
  );
}

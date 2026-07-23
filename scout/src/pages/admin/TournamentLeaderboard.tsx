import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Trophy, ExternalLink, Pencil, ArrowUp, ArrowDown } from "lucide-react";
import { parseRoundsToNumbers } from "@/lib/roundsParser";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTournamentById } from "@/lib/api/tournaments";
import { getTournamentResults } from "@/lib/api/tournamentResults";
import { Tournament, TournamentResult } from "@/types/tournament";
import { formatUSDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { isValidUrl } from "@/lib/csvExporter";

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

export default function TournamentLeaderboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, isAgent } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [results, setResults] = useState<TournamentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [athleteDetails, setAthleteDetails] = useState<Record<string, any>>({});
  const [sortColumn, setSortColumn] = useState<SortColumn>('position');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const [tournamentData, resultsData, athletesData] = await Promise.all([
          getTournamentById(id),
          getTournamentResults(id),
          supabase.from('athletes').select('id, first_name, last_name, graduation_year, slug')
        ]);
        
        setTournament(tournamentData);
        setResults(resultsData);

        if (athletesData.data) {
          const details: Record<string, any> = {};
          athletesData.data.forEach((athlete: any) => {
            details[athlete.id] = athlete;
          });
          setAthleteDetails(details);
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

    loadData();
  }, [id, toast]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn('position');
        setSortDirection('asc');
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedResults = useMemo(() => {
    const ranked = results.filter(r => !isSpecialEntry(r));
    const special = results.filter(r => isSpecialEntry(r));

    const compare = (a: TournamentResult, b: TournamentResult): number => {
      const dir = sortDirection === 'asc' ? 1 : -1;
      switch (sortColumn) {
        case 'position':
          return ((a.finalPosition || 999) - (b.finalPosition || 999)) * dir;
        case 'name': {
          const nameA = `${a.athlete?.firstName || ''} ${a.athlete?.lastName || ''}`.trim();
          const nameB = `${b.athlete?.firstName || ''} ${b.athlete?.lastName || ''}`.trim();
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
  }, [results, sortColumn, sortDirection, athleteDetails]);

  const SortHeader = ({ column, label, className = '' }: { column: SortColumn; label: string; className?: string }) => (
    <th
      className={`pb-3 pr-4 font-medium cursor-pointer select-none hover:text-foreground ${className}`}
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

  const handleExport = () => {
    toast({
      title: "Exporting leaderboard",
      description: "Downloading leaderboard as PDF..."
    });
  };

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
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/admin/tournaments")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tournaments
        </Button>
        <div className="flex gap-2">
          {(isAdmin || isAgent) && (
            <Button onClick={() => navigate(`/admin/tournaments/${id}/edit`)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Tournament
            </Button>
          )}
          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

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
              No results available for this tournament yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                        <th key={idx} className="pb-3 pr-4 font-medium text-center">
                          R{idx + 1}
                        </th>
                      ));
                    })()}
                  </tr>
                </thead>
                <tbody>
                  {sortedResults.map((result) => {
                    const athleteDetail = athleteDetails[result.athleteId];
                    const displayName =
                      (athleteDetail?.first_name && athleteDetail?.last_name
                        ? `${athleteDetail.first_name} ${athleteDetail.last_name}`
                        : result.athlete?.firstName && result.athlete?.lastName
                        ? `${result.athlete.firstName} ${result.athlete.lastName}`
                        : null) || 'Unknown athlete';

                    return (
                      <tr key={result.id} className="border-b last:border-0">
                        <td className="py-4 pr-4">
                          <div className="font-semibold">
                            {result.positionText || result.finalPosition}
                          </div>
                        </td>
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-2">
                            <button
                              className="font-medium hover:underline cursor-pointer text-left"
                              onClick={() => navigate(`/admin/athletes/${result.athleteId}/view`)}
                            >
                              {displayName}
                            </button>
                            {result.athleteId && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => navigate(`/admin/athletes/${result.athleteId}/view`)}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </td>
                        <td className="py-4 pr-4 text-center">
                          {athleteDetail?.graduation_year && (
                            <Badge variant="outline" className="text-xs">
                              {athleteDetail.graduation_year}
                            </Badge>
                          )}
                        </td>
                        <td className="py-4 pr-4 text-center font-bold">
                          {result.totalScore}
                        </td>
                        <td className="py-4 pr-4 text-center">
                          <span className={result.scoreVsCourseRating > 0 ? "text-destructive" : "text-green-600"}>
                            {result.scoreVsCourseRating > 0 ? "+" : ""}{result.scoreVsCourseRating}
                          </span>
                        </td>
                        {parseRoundsToNumbers(result.rounds).map((score, roundIdx) => (
                          <td key={roundIdx} className="py-4 pr-4 text-center">
                            {score}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

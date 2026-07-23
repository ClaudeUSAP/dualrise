import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Trophy, MapPin, Calendar, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  searchTournaments,
  getPageVisibleCounts,
  getDistinctYears,
  getDistinctCountries,
} from "@/lib/api/tournaments";
import { Tournament } from "@/types/tournament";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/StatusBadge";

const PAGE_SIZE = 50;

export default function TournamentSearch() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [selectedGender, setSelectedGender] = useState("all");

  const [years, setYears] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Guards against out-of-order responses when filters change quickly.
  const requestSeq = useRef(0);

  // Filter dropdown options (full distinct lists, not just the current page).
  useEffect(() => {
    getDistinctYears().then(setYears).catch(() => setYears([]));
    getDistinctCountries().then(setCountries).catch(() => setCountries([]));
  }, []);

  // Debounce the free-text search.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Fetch a page from the server. `append` keeps the existing rows (load more),
  // otherwise it replaces them (new search / filter change).
  const fetchPage = async (pageNum: number, append: boolean) => {
    const seq = ++requestSeq.current;
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const { rows, totalCount: total } = await searchTournaments({
        search: debouncedQuery,
        country: selectedCountry,
        year: selectedYear,
        gender: selectedGender,
        // Date added first (created_at), then event date (start_date), then name.
        sortKey: "dateAdded",
        sortDir: "desc",
        page: pageNum,
        pageSize: PAGE_SIZE,
      });
      // Ignore stale responses.
      if (seq !== requestSeq.current) return;

      // Coach-facing count: only athletes visible to coaches
      // (available / committed / in_college). A tournament with no visible
      // athletes shows "0 athletes".
      const visibleCounts = await getPageVisibleCounts(rows.map((r) => r.id));
      if (seq !== requestSeq.current) return;
      const rowsWithCounts = rows.map((r) => ({
        ...r,
        resultCount: visibleCounts.get(r.id) ?? 0,
      }));

      setTotalCount(total);
      setPage(pageNum);
      setTournaments((prev) => (append ? [...prev, ...rowsWithCounts] : rowsWithCounts));
    } catch (error) {
      console.error("Error loading tournaments:", error);
      if (seq === requestSeq.current) {
        toast({
          title: "Error",
          description: "Failed to load tournaments",
          variant: "destructive",
        });
      }
    } finally {
      if (seq === requestSeq.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  // Re-fetch page 1 whenever the search term or a filter changes.
  useEffect(() => {
    fetchPage(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, selectedYear, selectedCountry, selectedGender]);

  const hasMore = tournaments.length < totalCount;

  return (
    <div className="container mx-auto min-w-0 px-3 sm:px-4 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Tournament Search</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Discover talented athletes through tournament performance</p>
      </div>

      {/* Filters Section */}
      <Card className="mb-6 w-full min-w-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter Tournaments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tournaments by name or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Year Filter */}
            <div>
              <Label>Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Country Filter */}
            <div>
              <Label>Country</Label>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {countries.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Gender Filter */}
            <div>
              <Label>Gender</Label>
              <RadioGroup value={selectedGender} onValueChange={setSelectedGender}>
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="gender-all" />
                    <Label htmlFor="gender-all" className="font-normal cursor-pointer">All</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Men" id="gender-male" />
                    <Label htmlFor="gender-male" className="font-normal cursor-pointer">Male</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Women" id="gender-female" />
                    <Label htmlFor="gender-female" className="font-normal cursor-pointer">Female</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {loading
            ? "Loading tournaments…"
            : `Showing ${tournaments.length} of ${totalCount} tournament${totalCount !== 1 ? "s" : ""}`}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading tournaments…
        </div>
      ) : tournaments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No tournaments found</h3>
            <p className="text-muted-foreground">
              Try adjusting your filters or search query
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3 min-w-0">
            {tournaments.map((tournament) => {
              const tournamentData = tournament as any;
              const athleteCount = tournament.resultCount ?? 0;

              return (
                <Card
                  key={tournament.id}
                  className="w-full min-w-0 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
                  onClick={() => navigate(`/tournament-leaderboard/${tournament.id}`)}
                >
                  <CardContent className="p-3 sm:p-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="font-semibold text-lg">{tournament.name}</h3>
                          {tournamentData.status === 'archived' ? (
                            <StatusBadge type="archived">(archived)</StatusBadge>
                          ) : tournamentData.status ? (
                            <Badge variant={tournamentData.status === 'completed' ? 'default' : 'secondary'}>
                              {tournamentData.status}
                            </Badge>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {tournament.location}, {tournament.country}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {tournament.year}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {athleteCount} athlete{athleteCount !== 1 ? 's' : ''} in database
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" className="w-full sm:w-auto">
                        View Leaderboard
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {hasMore && (
            <div className="mt-6 flex justify-center">
              <Button
                variant="outline"
                onClick={() => fetchPage(page + 1, true)}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading…
                  </>
                ) : (
                  `Load more (${totalCount - tournaments.length} remaining)`
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

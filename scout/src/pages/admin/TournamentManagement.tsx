import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import {
  Search,
  Plus,
  Upload,
  Calendar,
  MapPin,
  Users,
  Trophy,
  Edit,
  Eye,
  Archive,
  Download,
  Filter,
  Grid3X3,
  List,
  CalendarDays,
  MoreHorizontal,
  Flag,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  FileBarChart,
  ArrowUpDown,
  Trash2,
  Database,
  Merge,
  Mail,
  Phone,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import {
  searchTournaments,
  getPageResultCounts,
  getTournamentStats,
  getDistinctCountries,
  updateTournament,
  deleteTournament,
} from '@/lib/api/tournaments';
import { findDuplicateTournaments, DuplicateGroup } from '@/lib/api/tournamentDeduplication';
import { exportTournamentsForResultsLinkUpdate } from '@/lib/csvExporter';
import { Tournament } from '@/types/tournament';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 25;

type SortKey = 'name' | 'year' | 'location' | 'startDate';
type SortDir = 'asc' | 'desc';

export default function TournamentManagement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ----- Filters / search -----
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // ----- Sort & pagination -----
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDir } | null>(null);
  const [page, setPage] = useState(1);

  // ----- View / UI -----
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');
  const [showFilters, setShowFilters] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [expandedTournament, setExpandedTournament] = useState<string | null>(null);

  // ----- Selection / delete / archive -----
  const [selectedTournaments, setSelectedTournaments] = useState<string[]>([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  // Debounce search input (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Reset to page 1 whenever a filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedType, selectedStatus, selectedCountry, selectedGender, dateRange?.from, dateRange?.to, sortConfig?.key, sortConfig?.direction]);

  // Primitive sort deps for hook stability
  const sortKey = sortConfig?.key;
  const sortDir = sortConfig?.direction;
  const dateFrom = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
  const dateTo = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined;

  // ----- Stats query -----
  const statsQuery = useQuery({
    queryKey: ['admin-tournament-stats'],
    queryFn: getTournamentStats,
    staleTime: 60_000,
  });

  // ----- Countries query -----
  const countriesQuery = useQuery({
    queryKey: ['admin-tournament-countries'],
    queryFn: getDistinctCountries,
    staleTime: 5 * 60_000,
  });

  // ----- Search query (paginated) -----
  const searchQueryResult = useQuery({
    queryKey: [
      'admin-tournament-search',
      debouncedSearch,
      selectedType,
      selectedCountry,
      selectedGender,
      selectedStatus,
      dateFrom,
      dateTo,
      sortKey,
      sortDir,
      page,
    ],
    queryFn: () =>
      searchTournaments({
        search: debouncedSearch,
        type: selectedType,
        country: selectedCountry,
        gender: selectedGender,
        status: selectedStatus,
        dateFrom,
        dateTo,
        sortKey: sortKey ?? 'startDate',
        sortDir: sortDir ?? 'desc',
        page,
        pageSize: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });

  const tournamentsPage: Tournament[] = searchQueryResult.data?.rows ?? [];
  const totalCount: number = searchQueryResult.data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const isPageLoading = searchQueryResult.isLoading || searchQueryResult.isFetching;

  // ----- Page-level result counts (athletes per tournament on current page) -----
  const pageIds = useMemo(() => tournamentsPage.map(t => t.id), [tournamentsPage]);

  const pageCountsQuery = useQuery({
    queryKey: ['admin-tournament-page-counts', pageIds],
    queryFn: () => getPageResultCounts(pageIds),
    enabled: pageIds.length > 0,
    staleTime: 30_000,
  });

  const pageCountsMap = pageCountsQuery.data ?? new Map();

  // Merge per-page athlete counts onto the rows
  const tournamentsWithCounts: Tournament[] = useMemo(() => {
    return tournamentsPage.map(t => {
      const counts = pageCountsMap.get(t.id);
      if (!counts) return t;
      return { ...t, participatingAthletes: counts.athleteCount };
    });
  }, [tournamentsPage, pageCountsMap]);

  // ----- Calendar month query (only when viewMode === 'calendar') -----
  const calendarMonthStart = useMemo(() => startOfMonth(currentMonth), [currentMonth]);
  const calendarMonthEnd = useMemo(() => endOfMonth(currentMonth), [currentMonth]);
  const calendarMonthFrom = format(calendarMonthStart, 'yyyy-MM-dd');
  const calendarMonthTo = format(calendarMonthEnd, 'yyyy-MM-dd');

  const calendarMonthQuery = useQuery({
    queryKey: [
      'admin-tournaments-calendar',
      calendarMonthFrom,
      calendarMonthTo,
      debouncedSearch,
      selectedType,
      selectedCountry,
      selectedGender,
      selectedStatus,
    ],
    queryFn: () =>
      searchTournaments({
        search: debouncedSearch,
        type: selectedType,
        country: selectedCountry,
        gender: selectedGender,
        status: selectedStatus,
        dateFrom: calendarMonthFrom,
        dateTo: calendarMonthTo,
        sortKey: 'startDate',
        sortDir: 'asc',
        page: 1,
        pageSize: 500,
      }),
    enabled: viewMode === 'calendar',
    placeholderData: keepPreviousData,
  });

  const calendarTournaments: Tournament[] = calendarMonthQuery.data?.rows ?? [];
  const isCalendarLoading = calendarMonthQuery.isLoading || calendarMonthQuery.isFetching;


  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  useEffect(() => {
    let mounted = true;
    findDuplicateTournaments()
      .then(groups => { if (mounted) setDuplicateGroups(groups); })
      .catch(err => console.error('Error fetching duplicate tournaments:', err));
    return () => { mounted = false; };
  }, []);

  // ----- Sort handler -----
  const handleSort = useCallback((key: SortKey) => {
    setSortConfig(prev => {
      if (prev?.key === key && prev.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return { key, direction: 'asc' };
    });
  }, []);

  // ----- Selection handlers (operate per-page) -----
  const allOnPageSelected =
    tournamentsWithCounts.length > 0 &&
    tournamentsWithCounts.every(t => selectedTournaments.includes(t.id));

  const handleSelectAllOnPage = () => {
    if (allOnPageSelected) {
      const pageIdSet = new Set(tournamentsWithCounts.map(t => t.id));
      setSelectedTournaments(prev => prev.filter(id => !pageIdSet.has(id)));
    } else {
      setSelectedTournaments(prev =>
        Array.from(new Set([...prev, ...tournamentsWithCounts.map(t => t.id)]))
      );
    }
  };

  const handleSelectTournament = (tournamentId: string) => {
    setSelectedTournaments(prev =>
      prev.includes(tournamentId)
        ? prev.filter(id => id !== tournamentId)
        : [...prev, tournamentId]
    );
  };

  // ----- Delete handlers -----
  const handleDeleteTournament = (tournamentId: string) => {
    const counts = pageCountsMap.get(tournamentId);
    if (counts && counts.resultCount > 0) {
      toast({
        title: 'Cannot delete tournament',
        description: `This tournament has ${counts.resultCount} results. Archive it instead.`,
        variant: 'destructive',
      });
      return;
    }
    setPendingDeleteIds([tournamentId]);
    setConfirmDeleteOpen(true);
  };

  const refreshAfterMutation = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-tournament-search'] });
    queryClient.invalidateQueries({ queryKey: ['admin-tournament-stats'] });
    queryClient.invalidateQueries({ queryKey: ['admin-tournament-page-counts'] });
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    let successCount = 0;
    let failedCount = 0;
    const skippedWithResults: string[] = [];

    for (const id of pendingDeleteIds) {
      const counts = pageCountsMap.get(id);
      if (counts && counts.resultCount > 0) {
        skippedWithResults.push(id);
        continue;
      }
      try {
        await deleteTournament(id);
        successCount++;
      } catch (error) {
        console.error(`Failed to delete tournament ${id}:`, error);
        failedCount++;
      }
    }

    if (successCount > 0) {
      setSelectedTournaments(prev => prev.filter(id => !pendingDeleteIds.includes(id)));
      refreshAfterMutation();
    }

    if (successCount > 0 && failedCount === 0 && skippedWithResults.length === 0) {
      toast({
        title: 'Tournaments deleted',
        description: `Successfully deleted ${successCount} tournament${successCount > 1 ? 's' : ''}.`,
      });
    } else if (successCount > 0 || failedCount > 0 || skippedWithResults.length > 0) {
      toast({
        title: 'Deletion complete',
        description: `Deleted: ${successCount}, Skipped (has results): ${skippedWithResults.length}, Failed: ${failedCount}`,
        variant: skippedWithResults.length > 0 || failedCount > 0 ? 'destructive' : 'default',
      });
    }

    setIsDeleting(false);
    setConfirmDeleteOpen(false);
    setPendingDeleteIds([]);
  };

  const handleBulkAction = (action: string) => {
    switch (action) {
      case 'export':
        toast({
          title: 'Exporting tournaments',
          description: `Exporting ${selectedTournaments.length} tournaments to CSV...`,
        });
        break;
      case 'archive':
        setConfirmArchiveOpen(true);
        break;
      case 'delete': {
        const withResults = selectedTournaments.filter(id => {
          const c = pageCountsMap.get(id);
          return c ? c.resultCount > 0 : false;
        });
        if (withResults.length === selectedTournaments.length && withResults.length > 0) {
          toast({
            title: 'Cannot delete',
            description: 'All selected tournaments have results. Archive them instead.',
            variant: 'destructive',
          });
          return;
        }
        setPendingDeleteIds(selectedTournaments);
        setConfirmDeleteOpen(true);
        break;
      }
      case 'report':
        toast({
          title: 'Generating report',
          description: `Creating report for ${selectedTournaments.length} tournaments...`,
        });
        break;
    }
  };

  const handleEditTournament = (tournament: Tournament) => {
    navigate(`/admin/tournaments/${tournament.id}/edit`);
  };

  const handleArchiveTournament = async (tournament: Tournament) => {
    try {
      await updateTournament(tournament.id, { status: 'archived' });
      toast({
        title: 'Tournament archived',
        description: `${tournament.name} has been archived successfully.`,
      });
      refreshAfterMutation();
    } catch (error) {
      console.error('Error archiving tournament:', error);
      toast({
        title: 'Error',
        description: 'Failed to archive tournament',
        variant: 'destructive',
      });
    }
  };

  const handleConfirmBulkArchive = async () => {
    setIsArchiving(true);
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    // Build a quick lookup of currently-loaded statuses (best-effort; missing => attempt anyway)
    const statusById = new Map<string, string | undefined>();
    tournamentsWithCounts.forEach(t => statusById.set(t.id, t.status));

    const targets = selectedTournaments.filter(id => {
      const s = statusById.get(id);
      if (s === 'archived') {
        skippedCount++;
        return false;
      }
      return true;
    });

    const results = await Promise.allSettled(
      targets.map(id => updateTournament(id, { status: 'archived' }))
    );

    results.forEach(r => {
      if (r.status === 'fulfilled') successCount++;
      else {
        failedCount++;
        console.error('Bulk archive failure:', r.reason);
      }
    });

    if (successCount > 0) {
      setSelectedTournaments([]);
      refreshAfterMutation();
    }

    if (successCount > 0 && failedCount === 0 && skippedCount === 0) {
      toast({
        title: 'Tournaments archived',
        description: `Archived ${successCount} tournament${successCount > 1 ? 's' : ''}.`,
      });
    } else {
      toast({
        title: 'Archive complete',
        description: `Archived: ${successCount}, Already archived: ${skippedCount}, Failed: ${failedCount}`,
        variant: failedCount > 0 ? 'destructive' : 'default',
      });
    }

    setIsArchiving(false);
    setConfirmArchiveOpen(false);
  };

  // ----- Calendar view (month-scoped query) -----
  const renderCalendarView = () => {
    const monthStart = calendarMonthStart;
    const monthEnd = calendarMonthEnd;
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Build day -> tournaments map (only tournaments with both start_date and end_date)
    const dayMap = new Map<string, Tournament[]>();
    const datedCount = calendarTournaments.filter(t => t.startDate && t.endDate).length;
    const skippedCount = calendarTournaments.length - datedCount;

    calendarTournaments.forEach(t => {
      if (!t.startDate || !t.endDate) return;
      const start = new Date(t.startDate);
      const end = new Date(t.endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return;
      // Clamp to current month
      const clampStart = start < monthStart ? monthStart : start;
      const clampEnd = end > monthEnd ? monthEnd : end;
      if (clampStart > clampEnd) return;
      const span = eachDayOfInterval({ start: clampStart, end: clampEnd });
      span.forEach(d => {
        const key = format(d, 'yyyy-MM-dd');
        const arr = dayMap.get(key) ?? [];
        arr.push(t);
        dayMap.set(key, arr);
      });
    });

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tournament Calendar</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(new Date())}
              >
                Today
              </Button>
              <span className="font-medium min-w-[140px] text-center">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {!isCalendarLoading && (
            <p className="text-xs text-muted-foreground mt-2">
              {calendarTournaments.length === 0
                ? 'No tournaments this month'
                : `${datedCount} tournament${datedCount === 1 ? '' : 's'} shown${skippedCount > 0 ? ` · ${skippedCount} hidden (no dates)` : ''}`}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="grid grid-cols-7 gap-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
              {days.map(day => {
                const key = format(day, 'yyyy-MM-dd');
                const dayTs = dayMap.get(key) ?? [];
                const visible = dayTs.slice(0, 3);
                const overflow = dayTs.length - visible.length;
                return (
                  <div
                    key={day.toString()}
                    className={cn(
                      'min-h-[100px] p-2 border rounded-lg flex flex-col gap-1',
                      !isSameMonth(day, currentMonth) && 'opacity-50'
                    )}
                  >
                    <div className="text-sm font-medium mb-1">{format(day, 'd')}</div>
                    {isCalendarLoading ? (
                      <Skeleton className="h-4 w-full" />
                    ) : (
                      <>
                        {visible.map(t => (
                          <button
                            key={t.id}
                            onClick={() => navigate(`/admin/tournaments/${t.id}/edit`)}
                            title={t.name}
                            className="text-left text-[10px] leading-tight px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 truncate"
                          >
                            {t.name}
                          </button>
                        ))}
                        {overflow > 0 && (
                          <span className="text-[10px] text-muted-foreground px-1.5">
                            +{overflow} more
                          </span>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            {!isCalendarLoading && calendarTournaments.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-background/80 backdrop-blur-sm px-4 py-2 rounded-lg border">
                  <p className="text-sm text-muted-foreground">No tournaments this month</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // ----- Grid card -----
  const renderTournamentCard = (tournament: Tournament) => (
    <Card
      key={tournament.id}
      className={cn(
        'hover:shadow-lg transition-all',
        selectedTournaments.includes(tournament.id) && 'ring-2 ring-primary'
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={selectedTournaments.includes(tournament.id)}
              onCheckedChange={() => handleSelectTournament(tournament.id)}
            />
            <div className="flex-1">
              <CardTitle className="text-lg">{tournament.name}</CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">{tournament.year}</Badge>
                <Badge variant="outline">{tournament.category}</Badge>
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleEditTournament(tournament)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/admin/tournaments/${tournament.id}/results`)}>
                <Trophy className="mr-2 h-4 w-4" />
                Add Results
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/admin/tournaments/${tournament.id}/leaderboard`)}>
                <Eye className="mr-2 h-4 w-4" />
                View Leaderboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleArchiveTournament(tournament)}>
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleDeleteTournament(tournament.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {tournament.startDate ? format(new Date(tournament.startDate), 'MMM dd, yyyy') : tournament.year}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {tournament.location}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Flag className="h-3 w-3" />
              {tournament.country}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-3 w-3" />
              {tournament.participatingAthletes} athletes
            </div>
          </div>

          {tournament.status && (
            <div>
              <Badge
                variant={
                  tournament.status === 'completed' ? 'secondary' :
                  tournament.status === 'in_progress' ? 'default' :
                  tournament.status === 'cancelled' ? 'destructive' :
                  'outline'
                }
                className="capitalize"
              >
                {tournament.status.replace('_', ' ')}
              </Badge>
            </div>
          )}

          <div className="bg-muted/50 rounded-lg p-2 text-sm">
            <div className="font-medium mb-1">Course Details</div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>Par: {tournament.par}</div>
              <div>CR: {tournament.courseRating}</div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Results Completion</span>
              <span className="font-medium">
                {tournament.participatingAthletes > 0 ? '100%' : '0%'}
              </span>
            </div>
            <Progress value={tournament.participatingAthletes > 0 ? 100 : 0} className="h-2" />
          </div>

          <Collapsible
            open={expandedTournament === tournament.id}
            onOpenChange={() =>
              setExpandedTournament(expandedTournament === tournament.id ? null : tournament.id)
            }
          >
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full">
                {expandedTournament === tournament.id ? (
                  <>Hide Details <ChevronUp className="ml-2 h-4 w-4" /></>
                ) : (
                  <>Show Details <ChevronDown className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">
              <Separator />
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Field Size:</span> {tournament.participatingAthletes}
                </div>
                <div>
                  <span className="font-medium">Tournament Director:</span> —
                  <div className="text-xs text-muted-foreground">
                    <Mail className="inline h-3 w-3 mr-1" />—
                    <Phone className="inline h-3 w-3 ml-2 mr-1" />—
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </CardContent>
    </Card>
  );

  // ----- List view -----
  const renderListView = () => {
    return (
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Checkbox
                          checked={allOnPageSelected}
                          onCheckedChange={handleSelectAllOnPage}
                        />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Select all on this page</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort('name')}>
                  Tournament Name
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort('year')}>
                  Year
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort('location')}>
                  Location
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort('startDate')}>
                  Start Date
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="text-center">
                <span className="text-sm font-medium px-3">
                  Our Athletes <span className="text-muted-foreground font-normal">(this page)</span>
                </span>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPageLoading
              ? Array.from({ length: PAGE_SIZE }).map((_, idx) => (
                  <TableRow key={`skeleton-${idx}`}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              : tournamentsWithCounts.map((tournament) => (
                  <TableRow key={tournament.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedTournaments.includes(tournament.id)}
                        onCheckedChange={() => handleSelectTournament(tournament.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <button
                        onClick={() => navigate(`/admin/tournaments/${tournament.id}/leaderboard`)}
                        className="text-primary hover:underline cursor-pointer text-left"
                      >
                        {tournament.name}
                      </button>
                    </TableCell>
                    <TableCell>{tournament.year}</TableCell>
                    <TableCell>
                      <div>
                        <div>{tournament.location}</div>
                        <div className="text-xs text-muted-foreground">{tournament.country}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {tournament.sex === 'Men' ? 'Men' :
                         tournament.sex === 'Women' ? 'Women' :
                         'Not Set'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {tournament.startDate ? (
                        <div className="text-sm">
                          {format(new Date(tournament.startDate), 'MMM dd, yyyy')}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">No date</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{tournament.participatingAthletes}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          tournament.status === 'completed' ? 'secondary' :
                          tournament.status === 'in_progress' ? 'default' :
                          tournament.status === 'cancelled' ? 'destructive' :
                          'outline'
                        }
                      >
                        {tournament.status ? tournament.status.replace('_', ' ') : 'Planned'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditTournament(tournament)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/admin/tournaments/${tournament.id}/results`)}>
                            <Trophy className="mr-2 h-4 w-4" />
                            Add Results
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/admin/tournaments/${tournament.id}/leaderboard`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Leaderboard
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleArchiveTournament(tournament)}>
                            <Archive className="mr-2 h-4 w-4" />
                            Archive
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteTournament(tournament.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  // ----- Pagination -----
  const renderPagination = () => {
    const startItem = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const endItem = Math.min(page * PAGE_SIZE, totalCount);
    return (
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-muted-foreground">
          {totalCount === 0
            ? 'No results'
            : `Showing ${startItem.toLocaleString()}–${endItem.toLocaleString()} of ${totalCount.toLocaleString()}`}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || isPageLoading}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {page} of {totalPages.toLocaleString()}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || isPageLoading}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    );
  };

  const stats = statsQuery.data;
  const countries = countriesQuery.data ?? [];

  // Subtitle: "Managing 1,091 tournaments across 38 countries · 92 athletes tracked"
  const subtitle = useMemo(() => {
    if (statsQuery.isLoading || !stats) return 'Loading tournament overview…';
    return `Managing ${stats.total.toLocaleString()} tournaments across ${stats.distinct_countries.toLocaleString()} countries · ${stats.total_athletes.toLocaleString()} athletes tracked`;
  }, [stats, statsQuery.isLoading]);

  // Active filter detection + clear-all helper
  const hasActiveFilters =
    debouncedSearch !== '' ||
    selectedType !== 'all' ||
    selectedStatus !== 'all' ||
    selectedCountry !== 'all' ||
    selectedGender !== 'all' ||
    !!dateRange?.from;

  const clearAllFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedType('all');
    setSelectedStatus('all');
    setSelectedCountry('all');
    setSelectedGender('all');
    setDateRange(undefined);
  };


  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Tournament Management</h1>
            <p className="text-muted-foreground">{subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {duplicateGroups.length > 0 && (
              <Button
                variant="secondary"
                onClick={() => navigate('/admin/tournament-deduplication')}
              >
                <Merge className="h-4 w-4 lg:mr-2" />
                <span className="hidden lg:inline">Review Duplicates ({duplicateGroups.length})</span>
                <span className="lg:hidden">({duplicateGroups.length})</span>
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => navigate('/admin/tournament-results?tab=bulk-import')}
            >
              <Upload className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Bulk Import</span>
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                const result = await exportTournamentsForResultsLinkUpdate();
                if (result.success) {
                  toast({
                    title: 'Template Downloaded',
                    description: `Exported ${result.count} tournaments with missing/invalid result links`,
                  });
                } else {
                  toast({
                    title: 'Export Error',
                    description: result.error || 'Failed to export tournaments',
                    variant: result.error?.includes('All tournaments') ? 'default' : 'destructive',
                  });
                }
              }}
            >
              <Download className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Missing Links Template</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/admin/tournament-deduplication')}
            >
              <Database className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Cleanup Data</span>
            </Button>
            <Button onClick={() => navigate('/admin/tournaments/new')}>
              <Plus className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Add New Tournament</span>
            </Button>
          </div>
        </div>

        {/* Search and View Toggle */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tournaments by name, location, or country..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {showFilters && <ChevronUp className="ml-2 h-4 w-4" />}
          </Button>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="mr-1 h-3 w-3" />
              Clear all filters
            </Button>
          )}
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as typeof viewMode)}>
            <TabsList>
              <TabsTrigger value="list"><List className="h-4 w-4" /></TabsTrigger>
              <TabsTrigger value="grid"><Grid3X3 className="h-4 w-4" /></TabsTrigger>
              <TabsTrigger value="calendar"><CalendarDays className="h-4 w-4" /></TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Quick Stats — driven by statsQuery */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          className="cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 hover:ring-2 hover:ring-primary/20"
          onClick={() => setSelectedStatus('planned')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Planned</p>
                <p className="text-2xl font-bold">
                  {statsQuery.isLoading ? '—' : (stats?.planned ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 hover:ring-2 hover:ring-primary/20"
          onClick={() => setSelectedStatus('in_progress')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Trophy className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">
                  {statsQuery.isLoading ? '—' : (stats?.in_progress ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 hover:ring-2 hover:ring-primary/20"
          onClick={() => setSelectedStatus('completed')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-500/10 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">
                  {statsQuery.isLoading ? '—' : (stats?.completed ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 hover:ring-2 hover:ring-amber-500/20"
          onClick={() => setSelectedStatus('needs_results')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <FileBarChart className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Needs Results</p>
                <p className="text-2xl font-bold">
                  {statsQuery.isLoading ? '—' : (stats?.needs_results ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Controls */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filter Tournaments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>Date Range</Label>
                <div className="flex items-center gap-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                        <Calendar className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, 'LLL dd')} - {format(dateRange.to, 'LLL dd')}
                            </>
                          ) : (
                            format(dateRange.from, 'LLL dd, y')
                          )
                        ) : (
                          <span className="text-muted-foreground">Pick dates</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                      />
                      <div className="flex justify-end p-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDateRange(undefined)}
                          disabled={!dateRange?.from}
                        >
                          Clear
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                  {dateRange?.from && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => setDateRange(undefined)}
                      aria-label="Clear date range"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="National">National</SelectItem>
                    <SelectItem value="International">International</SelectItem>
                    <SelectItem value="National Team">National Team</SelectItem>
                    <SelectItem value="Club Competition">Club Competition</SelectItem>
                    <SelectItem value="PRO">PRO</SelectItem>
                    <SelectItem value="Collegiate">Collegiate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={selectedGender} onValueChange={setSelectedGender}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Genders</SelectItem>
                    <SelectItem value="Men">Men</SelectItem>
                    <SelectItem value="Women">Women</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Country</Label>
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    {countries.map(country => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                    <SelectItem value="needs_results">Needs Results</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div>
        {/* Bulk Operations Bar */}
        {selectedTournaments.length > 0 && (
          <Card className="mb-4">
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {selectedTournaments.length} tournament(s) selected
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleBulkAction('export')}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleBulkAction('archive')}>
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleBulkAction('report')}>
                    <FileBarChart className="mr-2 h-4 w-4" />
                    Generate Report
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleBulkAction('delete')}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* View Content */}
        {viewMode === 'list' && renderListView()}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isPageLoading
              ? Array.from({ length: PAGE_SIZE }).map((_, idx) => (
                  <Card key={`skeleton-card-${idx}`}>
                    <CardContent className="pt-6 space-y-3">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))
              : tournamentsWithCounts.map(renderTournamentCard)}
          </div>
        )}
        {viewMode === 'calendar' && renderCalendarView()}

        {/* Pagination — only for list & grid */}
        {viewMode !== 'calendar' && renderPagination()}

        {/* Empty State */}
        {!isPageLoading && tournamentsWithCounts.length === 0 && (
          <Card className="mt-4">
            <CardContent className="text-center py-12">
              <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No tournaments found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your filters or search criteria
              </p>
              <Button onClick={() => navigate('/admin/tournaments/new')}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Tournament
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bulk Archive Confirmation Dialog */}
      <AlertDialog open={confirmArchiveOpen} onOpenChange={setConfirmArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Archive {selectedTournaments.length} tournament{selectedTournaments.length === 1 ? '' : 's'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Selected tournaments will be moved to the archived status. Tournaments already archived will be skipped. You can restore them later by editing each tournament.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmBulkArchive}
              disabled={isArchiving}
            >
              {isArchiving ? 'Archiving…' : 'Archive'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete Tournament{pendingDeleteIds.length > 1 ? 's' : ''}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteIds.length === 1 ? (
                <>Are you sure you want to delete this tournament? This action cannot be undone.</>
              ) : (
                <>
                  Are you sure you want to delete {pendingDeleteIds.length} tournaments?
                  This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

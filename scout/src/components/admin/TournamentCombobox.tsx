import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Plus, MapPin, Calendar, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

// Minimal shape of a tournament used by the combobox and returned via onValueChange
// so parents can merge it into their local `tournaments` state (lazy hydration).
export interface TournamentLite {
  id: string;
  name: string;
  location?: string | null;
  year?: string | null;
  start_date?: string | null;
  sex?: string | null;
  category?: string | null;
  status?: string | null;
  // Extra fields commonly needed by callers (par/yardage/cr/slope/results_link)
  course_par?: string | null;
  course_slope?: string | null;
  course_rating?: string | null;
  yardage?: string | null;
  results_link?: string | null;
}

interface TournamentComboboxProps {
  value: string;
  onValueChange: (value: string, tournament?: TournamentLite) => void;
  className?: string;
  onCreateNew?: (name: string) => void;
  newTournamentName?: string;
}

const SELECT_COLUMNS =
  "id, name, location, year, start_date, sex, category, status, course_par, course_slope, course_rating, yardage, results_link";

// Sanitise user-typed search for .ilike — strip characters that have special meaning in
// ilike patterns or .or() arg-list syntax (%, _, comma, parentheses).
const sanitiseQuery = (raw: string) => raw.replace(/[%_,()]/g, "").trim();

const useDebouncedValue = <T,>(value: T, delay = 250): T => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);
  return debounced;
};

const formatTournamentDisplay = (tournament: TournamentLite | null | undefined): string => {
  if (!tournament || !tournament.name) return "Unknown Tournament";

  let display = tournament.name;

  if (tournament.location && tournament.location !== "TBD") {
    display += ` - ${tournament.location}`;
  }

  if (tournament.year) {
    display += ` (${tournament.year})`;
  } else if (tournament.start_date) {
    const date = new Date(tournament.start_date);
    display += ` (${date.toLocaleDateString("en-US", { month: "short", year: "numeric" })})`;
  } else {
    display += " (Year TBD)";
  }

  if (tournament.sex) {
    display += ` - ${tournament.sex}`;
  }

  return display;
};

const statusSuffix = (status?: string | null): string | null => {
  if (!status) return null;
  if (status === "archived") return "archived";
  if (status === "cancelled") return "cancelled";
  return null;
};

export default function TournamentCombobox({
  value,
  onValueChange,
  className,
  onCreateNew,
  newTournamentName,
}: TournamentComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const sanitised = sanitiseQuery(debouncedSearch);

  // Search query — excludes archived + cancelled by default. Selected-value resolver (below)
  // bypasses this filter so existing references to archived/cancelled tournaments still render.
  const searchQuery = useQuery({
    queryKey: ["tournament-search", sanitised],
    enabled: open,
    staleTime: 30_000,
    gcTime: 300_000,
    queryFn: async () => {
      let query = supabase
        .from("tournaments")
        .select(SELECT_COLUMNS)
        .not("status", "in", "(archived,cancelled)")
        .order("start_date", { ascending: false, nullsFirst: false })
        .order("id", { ascending: true })
        .limit(50);

      if (sanitised) {
        // Wrap search term once — sanitiseQuery already stripped % _ , ( )
        query = query.or(`name.ilike.%${sanitised}%,location.ilike.%${sanitised}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as TournamentLite[];
    },
  });

  // Resolve the currently-selected value regardless of status (bypasses archived/cancelled filter).
  const isRealId = !!value && !value.startsWith("new");
  const selectedQuery = useQuery({
    queryKey: ["tournament-by-id", value],
    enabled: isRealId,
    staleTime: 30_000,
    gcTime: 300_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select(SELECT_COLUMNS)
        .eq("id", value)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as TournamentLite | null;
    },
  });

  const searchResults = searchQuery.data ?? [];
  const selectedTournament = selectedQuery.data ?? null;

  // Merge selected tournament at top of options (dedupe by id), so it stays visible/pickable
  // even if it's archived/cancelled or outside the 50-row search window.
  const options = useMemo(() => {
    if (!selectedTournament) return searchResults;
    if (searchResults.some((t) => t.id === selectedTournament.id)) return searchResults;
    return [selectedTournament, ...searchResults];
  }, [searchResults, selectedTournament]);

  // Trigger label — 6-step fallback chain (in order):
  //   1. new / 2. new: prefixes
  //   3. match in current search results
  //   4. match in selected-value cache
  //   5. loading selected value
  //   6. error loading selected value → shortened UUID
  // Else → null (caller shows "Select tournament...")
  const displayValue = useMemo(() => {
    // 1. "new" with pending name
    if (value === "new" && newTournamentName) return `New: ${newTournamentName}`;
    // 2. "new:<name>" prefix
    if (value?.startsWith("new:")) return `Create: ${value.substring(4)}`;
    // 3. Match in current search results
    const searchMatch = searchResults.find((t) => t.id === value);
    if (searchMatch) {
      const suffix = statusSuffix(searchMatch.status);
      return formatTournamentDisplay(searchMatch) + (suffix ? ` (${suffix})` : "");
    }
    // 4. Match in selected-value cache
    if (selectedTournament) {
      const suffix = statusSuffix(selectedTournament.status);
      return formatTournamentDisplay(selectedTournament) + (suffix ? ` (${suffix})` : "");
    }
    // 5. Loading
    if (isRealId && selectedQuery.isLoading) return "Loading…";
    // 6. Error → shortened UUID
    if (isRealId && selectedQuery.isError) return `Tournament #${value.slice(0, 8)}`;
    return null;
  }, [value, newTournamentName, searchResults, selectedTournament, isRealId, selectedQuery.isLoading, selectedQuery.isError]);

  const triggerErrorClass = isRealId && selectedQuery.isError && !selectedTournament ? "text-destructive" : "";

  const handleSelect = (tournament: TournamentLite) => {
    onValueChange(tournament.id, tournament);
    setOpen(false);
    setSearch("");
  };

  const handleCreate = () => {
    const name = search.trim();
    if (!name) return;
    if (onCreateNew) {
      onCreateNew(name);
    } else {
      onValueChange(`new:${name}`);
    }
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between text-left font-normal overflow-hidden", className)}
        >
          <span className={cn("truncate block pr-2", triggerErrorClass)}>
            {displayValue || "Select tournament..."}
          </span>
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command
          shouldFilter={false}
        >
          <CommandInput
            placeholder="Search tournaments..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {searchQuery.isError ? (
              <div className="px-2 py-3 text-xs text-destructive">
                Couldn't load tournaments. Try again.
              </div>
            ) : null}

            <CommandEmpty>
              {searchQuery.isLoading ? (
                <div className="flex items-center justify-center py-3 text-xs text-muted-foreground">
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Searching…
                </div>
              ) : search ? (
                <button
                  type="button"
                  className="w-full px-2 py-1.5 text-left hover:bg-accent hover:text-accent-foreground flex items-center"
                  onClick={handleCreate}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create new tournament: "{search}"
                </button>
              ) : (
                "No tournament found."
              )}
            </CommandEmpty>

            <CommandGroup>
              {options.map((tournament) => {
                const suffix = statusSuffix(tournament.status);
                return (
                  <CommandItem
                    key={tournament.id}
                    value={tournament.id}
                    onSelect={() => handleSelect(tournament)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === tournament.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <div className="font-medium">
                        {tournament.name}
                        {suffix && (
                          <span className="ml-2 text-xs text-muted-foreground">({suffix})</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        {tournament.location && tournament.location !== "TBD" && (
                          <>
                            <MapPin className="h-3 w-3" />
                            {tournament.location}
                          </>
                        )}
                        {tournament.year || tournament.start_date ? (
                          <>
                            <Calendar className="h-3 w-3" />
                            {tournament.year ||
                              new Date(tournament.start_date as string).toLocaleDateString("en-US", {
                                month: "short",
                                year: "numeric",
                              })}
                          </>
                        ) : (
                          <>
                            <Calendar className="h-3 w-3" />
                            <span>Year TBD</span>
                          </>
                        )}
                        {tournament.sex && (
                          <>
                            <User className="h-3 w-3" />
                            {tournament.sex}
                          </>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

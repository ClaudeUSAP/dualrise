import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface University {
  id: string;
  name: string;
  division: string | null;
  state: string | null;
}

export interface CommittedUniversitySelection {
  id: string;
  name: string;
  division: string | null;
}

interface CommittedUniversitySelectProps {
  value: string | null; // committed_university_id
  committedToName?: string | null; // committed_to (display fallback if the id isn't in the list)
  onSelect: (selection: CommittedUniversitySelection | null) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Searchable university picker for an athlete's "Committed to" school, fed by the
 * canonical `universities` reference (via the list_universities RPC). Selecting a
 * university returns its id + name + division so the caller can set
 * committed_university_id (FK) and committed_to (display cache). No free text.
 */
export function CommittedUniversitySelect({
  value,
  committedToName,
  onSelect,
  disabled = false,
  className,
}: CommittedUniversitySelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: universities = [], isLoading } = useQuery({
    queryKey: ["universities-list"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_universities");
      if (error) throw error;
      return data as University[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const selected = useMemo(
    () => universities.find((u) => u.id === value),
    [universities, value]
  );

  const filtered = useMemo(() => {
    if (!searchQuery) return universities;
    const q = searchQuery.toLowerCase();
    return universities.filter((u) => u.name.toLowerCase().includes(q));
  }, [universities, searchQuery]);

  const displayValue = selected
    ? `${selected.name}${selected.division ? ` — ${selected.division}` : ""}`
    : committedToName || null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className={cn(
            "w-full justify-between text-left font-normal overflow-hidden",
            !displayValue && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate block pr-2 flex items-center gap-2">
            {isLoading ? (
              "Loading universities..."
            ) : displayValue ? (
              <>
                <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                {displayValue}
              </>
            ) : (
              "Search for a university..."
            )}
          </span>
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type to search universities..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">
              No university found matching "{searchQuery}"
            </CommandEmpty>
            <CommandGroup>
              {value && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onSelect(null);
                    setOpen(false);
                    setSearchQuery("");
                  }}
                >
                  <span className="text-muted-foreground">Clear selection</span>
                </CommandItem>
              )}
              {filtered.map((u) => (
                <CommandItem
                  key={u.id}
                  value={u.id}
                  onSelect={() => {
                    onSelect({ id: u.id, name: u.name, division: u.division });
                    setOpen(false);
                    setSearchQuery("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === u.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{u.name}</span>
                    {u.division && (
                      <span className="text-xs text-muted-foreground">
                        {u.division}
                        {u.state && ` • ${u.state}`}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default CommittedUniversitySelect;

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Building2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface University {
  id: string;
  name: string;
  division: string | null;
  state: string | null;
}

interface UniversityComboboxProps {
  value: string | null; // university_id
  onValueChange: (universityId: string | null) => void;
  onNewUniversity: (isNew: boolean) => void;
  isNewUniversity: boolean;
  newUniversityName: string;
  onNewUniversityNameChange: (name: string) => void;
  newUniversityDivision: string;
  onNewUniversityDivisionChange: (division: string) => void;
  newUniversityState: string;
  onNewUniversityStateChange: (state: string) => void;
  className?: string;
  disabled?: boolean;
  error?: boolean;
}

const DIVISIONS = [
  { value: "NCAA D1", label: "NCAA Division I" },
  { value: "NCAA D2", label: "NCAA Division II" },
  { value: "NCAA D3", label: "NCAA Division III" },
  { value: "NAIA", label: "NAIA" },
  { value: "NJCAA 1", label: "NJCAA Division I" },
  { value: "NJCAA 2", label: "NJCAA Division II" },
];

export function UniversityCombobox({
  value,
  onValueChange,
  onNewUniversity,
  isNewUniversity,
  newUniversityName,
  onNewUniversityNameChange,
  newUniversityDivision,
  onNewUniversityDivisionChange,
  newUniversityState,
  onNewUniversityStateChange,
  className,
  disabled = false,
  error = false,
}: UniversityComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch universities from RPC
  const { data: universities = [], isLoading } = useQuery({
    queryKey: ['universities-list'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_universities');
      if (error) throw error;
      return data as University[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Find selected university
  const selectedUniversity = useMemo(() => 
    universities.find(u => u.id === value),
    [universities, value]
  );

  // Filter universities based on search (fuzzy matching)
  const filteredUniversities = useMemo(() => {
    if (!searchQuery) return universities;
    const query = searchQuery.toLowerCase();
    return universities.filter(u => 
      u.name.toLowerCase().includes(query)
    );
  }, [universities, searchQuery]);

  // Display value
  const displayValue = selectedUniversity 
    ? `${selectedUniversity.name}${selectedUniversity.division ? ` — ${selectedUniversity.division}` : ''}`
    : null;

  // If in "new university" mode, show the form fields
  if (isNewUniversity) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">New University Details</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onNewUniversity(false);
              onNewUniversityNameChange("");
              onNewUniversityDivisionChange("");
              onNewUniversityStateChange("");
            }}
            className="text-xs"
          >
            ← Back to search
          </Button>
        </div>
        
        <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
          <div className="space-y-2">
            <Label htmlFor="new-university-name">
              University Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="new-university-name"
              value={newUniversityName}
              onChange={(e) => onNewUniversityNameChange(e.target.value)}
              placeholder="Enter university name"
              disabled={disabled}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="new-university-division">
              Division <span className="text-destructive">*</span>
            </Label>
            <Select 
              value={newUniversityDivision} 
              onValueChange={onNewUniversityDivisionChange}
              disabled={disabled}
            >
              <SelectTrigger id="new-university-division">
                <SelectValue placeholder="Select division" />
              </SelectTrigger>
              <SelectContent>
                {DIVISIONS.map((div) => (
                  <SelectItem key={div.value} value={div.value}>
                    {div.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="new-university-state">State (optional)</Label>
            <Input
              id="new-university-state"
              value={newUniversityState}
              onChange={(e) => onNewUniversityStateChange(e.target.value)}
              placeholder="e.g., California"
              disabled={disabled}
            />
          </div>
          
          <p className="text-xs text-muted-foreground">
            Your university will be added and verified by our team.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || isLoading}
            className={cn(
              "w-full justify-between text-left font-normal overflow-hidden",
              !displayValue && "text-muted-foreground",
              error && "border-destructive",
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
                "Search for your university..."
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
              <CommandEmpty className="py-2">
                <div className="text-center space-y-3 px-4">
                  <p className="text-sm text-muted-foreground">
                    No university found matching "{searchQuery}"
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setOpen(false);
                      onNewUniversity(true);
                      onNewUniversityNameChange(searchQuery);
                      onValueChange(null);
                    }}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add "{searchQuery}" as new university
                  </Button>
                </div>
              </CommandEmpty>
              <CommandGroup>
                {filteredUniversities.map((university) => (
                  <CommandItem
                    key={university.id}
                    value={university.id}
                    onSelect={() => {
                      onValueChange(university.id);
                      setOpen(false);
                      setSearchQuery("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === university.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{university.name}</span>
                      {university.division && (
                        <span className="text-xs text-muted-foreground">
                          {university.division}
                          {university.state && ` • ${university.state}`}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              
              {filteredUniversities.length > 0 && (
                <div className="p-2 border-t">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setOpen(false);
                      onNewUniversity(true);
                      onValueChange(null);
                    }}
                    className="w-full text-muted-foreground"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    My university is not listed
                  </Button>
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* Show selected university's division */}
      {selectedUniversity && (
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          Division: <span className="font-medium text-foreground">
            {selectedUniversity.division || 'Not specified'}
          </span>
        </p>
      )}
    </div>
  );
}

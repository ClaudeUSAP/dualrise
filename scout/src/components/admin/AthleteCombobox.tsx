import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { AthleteMatch } from "@/lib/athleteNameMatcher";

interface AthleteComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  athletes: AthleteMatch[];
  className?: string;
  disabled?: boolean;
}

export function AthleteCombobox({ 
  value, 
  onValueChange, 
  athletes,
  className,
  disabled = false
}: AthleteComboboxProps) {
  const [open, setOpen] = useState(false);

  const selectedAthlete = athletes.find(a => a.id === value);
  const displayValue = selectedAthlete 
    ? `${selectedAthlete.lastName}, ${selectedAthlete.firstName}`
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between text-left font-normal overflow-hidden", className)}
        >
          <span className="truncate block pr-2">
            {displayValue || "Select athlete..."}
          </span>
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command filter={(value, search) => {
          // Custom filter for case-insensitive search
          const searchLower = search.toLowerCase();
          if (value.toLowerCase().includes(searchLower)) return 1;
          return 0;
        }}>
          <CommandInput placeholder="Type to search athletes..." />
          <CommandList>
            <CommandEmpty>No athlete found.</CommandEmpty>
            <CommandGroup>
              {athletes.map((athlete) => (
                <CommandItem
                  key={athlete.id}
                  value={`${athlete.lastName} ${athlete.firstName}`}
                  onSelect={() => {
                    onValueChange(athlete.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === athlete.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span>{athlete.lastName}, {athlete.firstName}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

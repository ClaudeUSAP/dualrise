import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, User, Trash2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  TableCell,
  TableRow,
} from "@/components/ui/table";

interface TournamentResultRowProps {
  row: any;
  athletes: any[];
  updateRow: (id: string, field: string, value: string) => void;
  removeRow: (id: string) => void;
  onSaveRow?: (id: string) => void;
  isSaving?: boolean;
}

export default function TournamentResultRow({ row, athletes, updateRow, removeRow, onSaveRow, isSaving }: TournamentResultRowProps) {
  const [athleteOpen, setAthleteOpen] = useState(false);
  const [search, setSearch] = useState("");
  
  const filtered = athletes.filter(a => {
    const searchLower = search.toLowerCase();
    const fullName = `${a.last_name}, ${a.first_name}`.toLowerCase();
    return fullName.includes(searchLower);
  });

  return (
    <TableRow>
      <TableCell>
        <Popover open={athleteOpen} onOpenChange={setAthleteOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={athleteOpen}
              className="w-[200px] justify-between"
            >
              {row.athleteId 
                ? `${athletes.find(a => a.id === row.athleteId)?.last_name}, ${athletes.find(a => a.id === row.athleteId)?.first_name}`
                : "Select..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0">
            <Command>
              <CommandInput 
                placeholder="Search athletes..." 
                value={search}
                onValueChange={setSearch}
              />
              <CommandList>
                <CommandEmpty>No athlete found.</CommandEmpty>
                <CommandGroup>
                  {filtered.map((athlete) => (
                    <CommandItem
                      key={athlete.id}
                      value={`${athlete.last_name}, ${athlete.first_name}`}
                      onSelect={() => {
                        updateRow(row.id, "athleteId", athlete.id);
                        setAthleteOpen(false);
                        setSearch("");
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          row.athleteId === athlete.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <User className="mr-2 h-4 w-4" />
                      {athlete.last_name}, {athlete.first_name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </TableCell>
      <TableCell>
        <Input
          type="number"
          value={row.round1}
          onChange={(e) => updateRow(row.id, "round1", e.target.value)}
          className="w-16"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          value={row.round2}
          onChange={(e) => updateRow(row.id, "round2", e.target.value)}
          className="w-16"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          value={row.round3}
          onChange={(e) => updateRow(row.id, "round3", e.target.value)}
          className="w-16"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          value={row.round4}
          onChange={(e) => updateRow(row.id, "round4", e.target.value)}
          className="w-16"
        />
      </TableCell>
      <TableCell className="font-semibold">
        {row.totalScore}
      </TableCell>
      <TableCell className="font-semibold">
        {row.avgScore}
      </TableCell>
      <TableCell>
        <Input
          type="text"
          value={row.position}
          onChange={(e) => updateRow(row.id, "position", e.target.value)}
          className="w-20"
          placeholder="T5"
        />
      </TableCell>
      <TableCell>
        <Input
          type="url"
          value={row.resultsLink}
          onChange={(e) => updateRow(row.id, "resultsLink", e.target.value)}
          className="w-32"
          placeholder="https://..."
        />
      </TableCell>
      <TableCell>
        <Input
          type="text"
          value={row.notes}
          onChange={(e) => updateRow(row.id, "notes", e.target.value)}
          className="w-32"
          placeholder="Notes..."
        />
      </TableCell>
      <TableCell>
        <TooltipProvider>
          <div className="flex items-center gap-1">
            {onSaveRow && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSaveRow(row.id)}
                    disabled={isSaving}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Save this result</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRow(row.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete this row</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </TableCell>
    </TableRow>
  );
}
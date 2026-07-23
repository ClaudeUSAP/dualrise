import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface University {
  id: string;
  name: string;
  division: string | null;
  coach_count: number;
}

interface UniversityMergeDialogProps {
  sourceUniversity: University;
  universities: University[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMerge: (targetId: string) => Promise<void>;
  isLoading: boolean;
}

export default function UniversityMergeDialog({
  sourceUniversity,
  universities,
  open,
  onOpenChange,
  onMerge,
  isLoading,
}: UniversityMergeDialogProps) {
  const [targetId, setTargetId] = useState<string>("");
  const [comboOpen, setComboOpen] = useState(false);

  const targetUniversity = universities.find((u) => u.id === targetId);

  const handleMerge = async () => {
    if (!targetId) return;
    await onMerge(targetId);
    setTargetId("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Merge University</DialogTitle>
          <DialogDescription>
            Merge "{sourceUniversity.name}" into another university. All linked
            coaches will be transferred to the target university.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Source (will be deleted)</Label>
            <div className="p-3 bg-muted rounded-md">
              <p className="font-medium">{sourceUniversity.name}</p>
              {sourceUniversity.coach_count > 0 && (
                <p className="text-sm text-muted-foreground">
                  {sourceUniversity.coach_count} coach
                  {sourceUniversity.coach_count !== 1 ? "es" : ""} will be
                  transferred
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Target University (will keep)</Label>
            <Popover open={comboOpen} onOpenChange={setComboOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboOpen}
                  className="w-full justify-between"
                >
                  {targetUniversity ? (
                    <span>
                      {targetUniversity.name}
                      {targetUniversity.division && (
                        <span className="text-muted-foreground ml-2">
                          — {targetUniversity.division}
                        </span>
                      )}
                    </span>
                  ) : (
                    "Select university..."
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search universities..." />
                  <CommandList>
                    <CommandEmpty>No university found.</CommandEmpty>
                    <CommandGroup>
                      {universities.map((university) => (
                        <CommandItem
                          key={university.id}
                          value={university.name}
                          onSelect={() => {
                            setTargetId(university.id);
                            setComboOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              targetId === university.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <div className="flex-1">
                            <span>{university.name}</span>
                            {university.division && (
                              <span className="text-muted-foreground ml-2">
                                — {university.division}
                              </span>
                            )}
                          </div>
                          {university.coach_count > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {university.coach_count} coach
                              {university.coach_count !== 1 ? "es" : ""}
                            </span>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {targetId && sourceUniversity.coach_count > 0 && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p className="text-sm">
                {sourceUniversity.coach_count} coach
                {sourceUniversity.coach_count !== 1 ? "es" : ""} will be moved
                from "{sourceUniversity.name}" to "{targetUniversity?.name}".
                This action cannot be undone.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleMerge}
            disabled={!targetId || isLoading}
            variant="destructive"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Merge Universities
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

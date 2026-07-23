import { useState, useRef, useEffect } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, Trash2, Loader2, ExternalLink, Pencil } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import TournamentCombobox, { TournamentLite } from "./TournamentCombobox";
import { isValidUrl } from "@/lib/csvExporter";

interface TournamentResultEditRowProps {
  row: {
    id: string;
    tournamentId: string;
    round1: number;
    round2: number;
    round3: number;
    round4: number;
    position: string;
    resultsLink?: string;
    notes?: string;
    tournamentFieldSize?: number | null;
  };
  onUpdate: (id: string, field: string, value: any) => void;
  onSave: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onFieldSizeUpdate?: (tournamentId: string, newFieldSize: number) => Promise<void>;
  // Bubble up the full tournament object picked in the combobox so the parent
  // can merge it into local `tournaments` state (lazy hydration beyond 1000-row cap).
  onTournamentSelected?: (tournament: TournamentLite) => void;
  // Forwarded to the inner TournamentCombobox. When provided, the combobox calls this with the
  // typed name instead of emitting a `new:<name>` placeholder. The parent should open a
  // QuickTournamentDialog so the tournament is persisted (and its real UUID returned) before
  // anything else happens. Prevents the silent-failure path where `new:<name>` lives only in
  // local state and is never INSERTed.
  onCreateNew?: (name: string) => void;
  isNew: boolean;
  isSaving?: boolean;
  rowIndex?: number;
  onNavigate?: (rowIndex: number, columnIndex: number, direction: 'up' | 'down' | 'left' | 'right' | 'enter') => void;
  onRegisterField?: (rowIndex: number, columnIndex: number, element: HTMLElement | null) => void;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

export function TournamentResultEditRow({
  row,
  onUpdate,
  onSave,
  onDelete,
  onFieldSizeUpdate,
  onTournamentSelected,
  onCreateNew,
  isNew,
  isSaving = false,
  rowIndex = 0,
  onNavigate,
  onRegisterField,
  isSelected = false,
  onToggleSelect,
}: TournamentResultEditRowProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [fieldSizeOpen, setFieldSizeOpen] = useState(false);
  const [newFieldSize, setNewFieldSize] = useState<string>("");
  const [isSavingFieldSize, setIsSavingFieldSize] = useState(false);
  
  // Refs for all input fields
  const round1Ref = useRef<HTMLInputElement>(null);
  const round2Ref = useRef<HTMLInputElement>(null);
  const round3Ref = useRef<HTMLInputElement>(null);
  const round4Ref = useRef<HTMLInputElement>(null);
  const positionRef = useRef<HTMLInputElement>(null);
  const resultsLinkRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLInputElement>(null);

  // Register fields with navigation hook
  useEffect(() => {
    if (onRegisterField) {
      onRegisterField(rowIndex, 1, round1Ref.current);
      onRegisterField(rowIndex, 2, round2Ref.current);
      onRegisterField(rowIndex, 3, round3Ref.current);
      onRegisterField(rowIndex, 4, round4Ref.current);
      onRegisterField(rowIndex, 5, positionRef.current);
      onRegisterField(rowIndex, 6, resultsLinkRef.current);
      onRegisterField(rowIndex, 7, notesRef.current);
    }
  }, [rowIndex, onRegisterField]);

  const handleSave = async () => {
    await onSave(row.id);
  };

  const handleDelete = async () => {
    if (!isNew && !confirm("Are you sure you want to delete this tournament result?")) {
      return;
    }
    setIsDeleting(true);
    try {
      await onDelete(row.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    columnIndex: number
  ) => {
    if (!onNavigate) return;

    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    const cursorPosition = target.selectionStart || 0;
    const textLength = target.value.length;

    switch (e.key) {
      case 'ArrowLeft':
        // Only navigate if cursor is at the start
        if (cursorPosition === 0) {
          e.preventDefault();
          onNavigate(rowIndex, columnIndex, 'left');
        }
        break;
      case 'ArrowRight':
        // Only navigate if cursor is at the end
        if (cursorPosition === textLength) {
          e.preventDefault();
          onNavigate(rowIndex, columnIndex, 'right');
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        onNavigate(rowIndex, columnIndex, 'up');
        break;
      case 'ArrowDown':
        e.preventDefault();
        onNavigate(rowIndex, columnIndex, 'down');
        break;
      case 'Enter':
        e.preventDefault();
        onNavigate(rowIndex, columnIndex, 'enter');
        handleSave();
        break;
    }
  };

  const totalScore = (row.round1 || 0) + (row.round2 || 0) + (row.round3 || 0) + (row.round4 || 0);
  const roundsPlayed = [row.round1, row.round2, row.round3, row.round4].filter(r => r > 0).length;
  const avgScore = roundsPlayed > 0 ? (totalScore / roundsPlayed).toFixed(1) : "-";
  const cleanedResultsLink = (row.resultsLink || "").trim();
  const showViewLink = isValidUrl(cleanedResultsLink);

  const handleFieldSizeSave = async () => {
    if (!onFieldSizeUpdate || !row.tournamentId || !newFieldSize) return;
    
    const parsed = parseInt(newFieldSize, 10);
    if (isNaN(parsed) || parsed < 1) return;
    
    setIsSavingFieldSize(true);
    try {
      await onFieldSizeUpdate(row.tournamentId, parsed);
      setFieldSizeOpen(false);
      setNewFieldSize("");
    } finally {
      setIsSavingFieldSize(false);
    }
  };

  return (
    <TableRow className={isNew ? "bg-yellow-50 dark:bg-yellow-950/20" : ""}>
      <TableCell className="w-[50px] py-1.5 px-2 text-xs">
        {!isNew && onToggleSelect && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            aria-label="Select tournament result"
          />
        )}
      </TableCell>
      <TableCell className="min-w-[250px] py-1.5 px-2 text-xs">
        <TournamentCombobox
          value={row.tournamentId}
          onValueChange={(value, tournament) => {
            onUpdate(row.id, "tournamentId", value);
            if (tournament) onTournamentSelected?.(tournament);
          }}
          onCreateNew={onCreateNew}
        />
      </TableCell>
      
      <TableCell className="py-1.5 px-2 text-xs">
        <Input
          ref={round1Ref}
          type="number"
          value={row.round1 || ""}
          onChange={(e) => onUpdate(row.id, "round1", parseInt(e.target.value) || 0)}
          onKeyDown={(e) => handleKeyDown(e, 1)}
          className="w-16 text-xs font-mono tabular-nums"
          min="0"
          max="150"
        />
      </TableCell>
      
      <TableCell className="py-1.5 px-2 text-xs">
        <Input
          ref={round2Ref}
          type="number"
          value={row.round2 || ""}
          onChange={(e) => onUpdate(row.id, "round2", parseInt(e.target.value) || 0)}
          onKeyDown={(e) => handleKeyDown(e, 2)}
          className="w-16 text-xs font-mono tabular-nums"
          min="0"
          max="150"
        />
      </TableCell>
      
      <TableCell className="py-1.5 px-2 text-xs">
        <Input
          ref={round3Ref}
          type="number"
          value={row.round3 || ""}
          onChange={(e) => onUpdate(row.id, "round3", parseInt(e.target.value) || 0)}
          onKeyDown={(e) => handleKeyDown(e, 3)}
          className="w-16 text-xs font-mono tabular-nums"
          min="0"
          max="150"
        />
      </TableCell>
      
      <TableCell className="py-1.5 px-2 text-xs">
        <Input
          ref={round4Ref}
          type="number"
          value={row.round4 || ""}
          onChange={(e) => onUpdate(row.id, "round4", parseInt(e.target.value) || 0)}
          onKeyDown={(e) => handleKeyDown(e, 4)}
          className="w-16 text-xs font-mono tabular-nums"
          min="0"
          max="150"
        />
      </TableCell>
      
      <TableCell className="py-1.5 px-2 text-xs font-medium font-mono tabular-nums text-center">
        {totalScore > 0 ? totalScore : "-"}
      </TableCell>
      
      <TableCell className="py-1.5 px-2 text-xs font-medium font-mono tabular-nums text-center">
        {avgScore}
      </TableCell>
      
      <TableCell className="py-1.5 px-2 text-xs">
        <Input
          ref={positionRef}
          type="text"
          value={row.position}
          onChange={(e) => onUpdate(row.id, "position", e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, 5)}
          placeholder="1/95, T5, MC"
          className="w-24 text-xs text-center"
        />
      </TableCell>

      {/* Field Size - Tournament-level single source of truth */}
      <TableCell className="py-1.5 px-2 text-xs text-center">
        {row.tournamentId ? (
          <Popover open={fieldSizeOpen} onOpenChange={(open) => {
            setFieldSizeOpen(open);
            if (open) {
              setNewFieldSize(row.tournamentFieldSize?.toString() || "");
            }
          }}>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 text-xs hover:bg-muted font-mono tabular-nums"
              >
                {row.tournamentFieldSize || "-"}
                <Pencil className="h-3 w-3 ml-1 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="center">
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  This updates the field size for the entire tournament.
                </p>
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g., 95"
                  value={newFieldSize}
                  onChange={(e) => setNewFieldSize(e.target.value)}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={handleFieldSizeSave}
                    disabled={isSavingFieldSize || !newFieldSize}
                  >
                    {isSavingFieldSize ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : null}
                    Save
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setFieldSizeOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>

      <TableCell className="min-w-[120px] py-1.5 px-2 text-xs">
        <div className="flex items-center gap-2">
          <Input
            ref={resultsLinkRef}
            type="url"
            value={row.resultsLink || ""}
            onChange={(e) => onUpdate(row.id, "resultsLink", e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 6)}
            placeholder="https://..."
            className="min-w-[200px] text-xs"
          />

          {showViewLink && (
            <Button variant="outline" size="icon" asChild title="View results">
              <a href={cleanedResultsLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </TableCell>

      <TableCell className="py-1.5 px-2 text-xs">
        <Input
          ref={notesRef}
          type="text"
          value={row.notes || ''}
          onChange={(e) => onUpdate(row.id, "notes", e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, 7)}
          placeholder="Add notes..."
          className="min-w-[150px] text-xs"
        />
      </TableCell>
      
      <TableCell className="py-1.5 px-2 text-xs">
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={isSaving || isDeleting || !row.tournamentId}
            size="icon"
            variant="ghost"
            title={!row.tournamentId ? "Select a tournament first" : "Save"}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
          </Button>
          
          <Button
            onClick={handleDelete}
            disabled={isSaving || isDeleting}
            size="icon"
            variant="ghost"
            title="Delete"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 text-destructive" />
            )}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

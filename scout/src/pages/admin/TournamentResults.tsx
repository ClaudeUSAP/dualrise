import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, Save, Trash2, Check, ChevronsUpDown, PlusCircle, MapPin, Calendar, User, Upload, FileText, AlertCircle, Loader2, ChevronDown, ChevronRight, BarChart3, Merge, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import TournamentCombobox from "@/components/admin/TournamentCombobox";
import TournamentResultRow from "@/components/admin/TournamentResultRow";
import QuickTournamentDialog from "@/components/admin/QuickTournamentDialog";
import { TournamentResultsImportModal } from "@/components/admin/TournamentResultsImportModal";
import { AthleteCombobox } from "@/components/admin/AthleteCombobox";
import { parseCSVTournamentResults } from "@/lib/csvTournamentResultsParser";
import { matchTournaments, TournamentMatch } from "@/lib/tournamentMatcher";
import { importTournamentResults, ImportResult } from "@/lib/api/tournamentResultsImport";
import { extractNameFromFilename, matchAthleteByName, getAllAthletes, AthleteMatch } from "@/lib/athleteNameMatcher";

interface TournamentResultEntry {
  id: string;
  tournamentId: string;
  athleteId: string;
  round1: string;
  round2: string;
  round3: string;
  round4: string;
  totalScore: number;
  avgScore: number;
  vspar: number;
  vsCourseRating: number;
  position: string;
  notes: string;
  // Course details - for display and new tournament creation
  yardage: string;
  par: string;
  slope: string;
  courseRating: string;
  resultsLink: string;
  isNewTournament?: boolean;
  newTournamentName?: string;
}

export default function TournamentResults() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"athlete" | "tournament" | "bulk">("athlete");
  const [athletes, setAthletes] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState("");
  const [selectedTournament, setSelectedTournament] = useState("");
  const [results, setResults] = useState<TournamentResultEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  
  // For searchable comboboxes
  const [athleteOpen, setAthleteOpen] = useState(false);
  const [tournamentOpen, setTournamentOpen] = useState(false);
  const [athleteSearch, setAthleteSearch] = useState("");
  const [tournamentSearch, setTournamentSearch] = useState("");
  
  // For quick tournament creation dialog
  const [quickTournamentOpen, setQuickTournamentOpen] = useState(false);
  const [quickTournamentName, setQuickTournamentName] = useState("");
  const [pendingRowId, setPendingRowId] = useState<string | null>(null);
  
  // For CSV import modal
  const [importModalOpen, setImportModalOpen] = useState(false);
  
  // Bulk import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileUploads, setFileUploads] = useState<Array<{
    id: string;
    file: File;
    athleteId: string | null;
    athleteName: string;
    athleteMatch: AthleteMatch | null;
    matches: TournamentMatch[];
    status: 'pending' | 'processing' | 'complete' | 'error';
    error?: string;
    result?: ImportResult;
    expanded: boolean;
    parseErrors?: { row: number; message: string }[];
    importStats?: {
      totalRows: number;
      validResults: number;
      newResults: number;
      existingResults: number;
      newTournaments: number;
    };
  }>>([]);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [allAthletes, setAllAthletes] = useState<AthleteMatch[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showDedupeButton, setShowDedupeButton] = useState(false);

  // Fetch athletes and tournaments on mount
  useEffect(() => {
    fetchAthletes();
    fetchTournaments();
    loadAllAthletes();
  }, []);
  
  const loadAllAthletes = async () => {
    const athletes = await getAllAthletes();
    const sortedAthletes = athletes.sort((a, b) => {
      const lastNameCompare = a.lastName.localeCompare(b.lastName);
      if (lastNameCompare !== 0) return lastNameCompare;
      return a.firstName.localeCompare(b.firstName);
    });
    setAllAthletes(sortedAthletes);
  };

  const fetchAthletes = async () => {
    const { data, error } = await supabase
      .from("athletes")
      .select("id, first_name, last_name")
      .order("last_name", { ascending: true });
    
    if (error) {
      toast({
        title: "Error fetching athletes",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setAthletes(data || []);
    }
  };

  const fetchTournaments = async () => {
    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .order("start_date", { ascending: false });
    
    if (error) {
      toast({
        title: "Error fetching tournaments",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setTournaments(data || []);
    }
  };

  const addNewRow = () => {
    const newRow: TournamentResultEntry = {
      id: Math.random().toString(36).substr(2, 9),
      tournamentId: mode === "tournament" ? selectedTournament : "",
      athleteId: mode === "athlete" ? selectedAthlete : "",
      round1: "",
      round2: "",
      round3: "",
      round4: "",
      totalScore: 0,
      avgScore: 0,
      vspar: 0,
      vsCourseRating: 0,
      position: "",
      notes: "",
      yardage: "",
      par: "",
      slope: "",
      courseRating: "",
      resultsLink: "",
    };
    setResults([...results, newRow]);
  };

  const removeRow = (id: string) => {
    setResults(results.filter(r => r.id !== id));
  };

  const handleQuickTournamentCreate = (rowId: string, name: string) => {
    setPendingRowId(rowId);
    setQuickTournamentName(name);
    setQuickTournamentOpen(true);
  };

  // Parse Supabase errors into user-friendly messages
  const parseSupabaseError = (error: any): string => {
    const message = error?.message || '';
    
    // Check constraint violations
    if (message.includes('check_category_values') || message.includes('tournaments_category_check')) {
      return 'Invalid category. Please select: National, International, National Team, Club Competition, PRO, or Collegiate.';
    }
    if (message.includes('check_tournament_type') || message.includes('tournaments_tournament_type_check')) {
      return 'Invalid tournament type. Please select: Adult or Junior.';
    }
    if (message.includes('check_sex_values') || message.includes('tournaments_sex_check')) {
      return 'Invalid gender. Please select: Men or Women.';
    }
    
    // Unique constraint violations
    if (message.includes('duplicate key') || message.includes('unique constraint')) {
      return 'A tournament with this name and year already exists.';
    }
    
    // Not null violations
    if (message.includes('null value in column')) {
      const match = message.match(/column "([^"]+)"/);
      const column = match ? match[1].replace(/_/g, ' ') : 'a required field';
      return `Missing required field: ${column}`;
    }
    
    // Foreign key violations
    if (message.includes('violates foreign key constraint')) {
      return 'Invalid reference to another record. Please check your selections.';
    }
    
    // Default: return original message
    return message || 'An unexpected error occurred. Please try again.';
  };

  const handleTournamentCreated = async (newTournament: any): Promise<boolean> => {
    // Create the tournament in the database
    const { data, error } = await supabase
      .from("tournaments")
      .insert({
        name: newTournament.name,
        series_name: newTournament.series_name || newTournament.name,
        location: newTournament.location,
        country: newTournament.country,
        sex: newTournament.sex,
        tournament_type: newTournament.tournament_type || 'Adult',
        category: newTournament.category || 'National',
        year: newTournament.year,
        start_date: newTournament.start_date,
        yardage: newTournament.yardage,
        course_par: newTournament.course_par,
        course_slope: newTournament.course_slope,
        course_rating: newTournament.course_rating
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Failed to Create Tournament",
        description: parseSupabaseError(error),
        variant: "destructive",
      });
      return false;
    }

    if (data) {
      // Add the new tournament to the list
      setTournaments([...tournaments, data]);
      
      // If in "tournament" mode (not from a result row), select the new tournament
      if (!pendingRowId && mode === "tournament") {
        setSelectedTournament(data.id);
      }
      
      // Update the pending row with the new tournament (for "athlete" mode)
      if (pendingRowId) {
        updateRow(pendingRowId, "tournamentId", data.id);
      }
      
      toast({
        title: "Tournament Created",
        description: `"${newTournament.name}" has been created successfully.`,
      });
    }
    
    setPendingRowId(null);
    setQuickTournamentName("");
    return true;
  };

  const updateRow = (id: string, field: string, value: string) => {
    setResults(results.map(row => {
      if (row.id === id) {
        const updatedRow = { ...row, [field]: value };
        
        // Handle tournament selection/changes
        if (field === "tournamentId") {
          if (value === "new" || value.startsWith("new:")) {
            // Don't update the tournament details yet, wait for actual creation
            updatedRow.isNewTournament = true;
            updatedRow.tournamentId = "new";
            if (value.startsWith("new:")) {
              updatedRow.newTournamentName = value.substring(4);
            }
          } else {
            // User selected an existing tournament
            updatedRow.isNewTournament = false;
            updatedRow.newTournamentName = "";
            const tournament = tournaments.find(t => t.id === value);
            if (tournament) {
              updatedRow.yardage = tournament.yardage || "";
              updatedRow.par = tournament.course_par || "";
              updatedRow.slope = tournament.course_slope || "";
              updatedRow.courseRating = tournament.course_rating || "";
              updatedRow.resultsLink = tournament.results_link || "";
            }
          }
        }
        
        // Recalculate scores when round scores or course details change
        if (field.startsWith("round") || field === "par" || field === "courseRating") {
          const rounds = [
            updatedRow.round1,
            updatedRow.round2,
            updatedRow.round3,
            updatedRow.round4
          ].filter(r => r && r !== "").map(Number);
          
          if (rounds.length > 0) {
            updatedRow.totalScore = rounds.reduce((a, b) => a + b, 0);
            updatedRow.avgScore = Number((updatedRow.totalScore / rounds.length).toFixed(2));
            
            // Calculate vs par and vs course rating
            const par = Number(updatedRow.par) || 72;
            const courseRating = Number(updatedRow.courseRating) || 72;
            updatedRow.vspar = Number((updatedRow.avgScore - par).toFixed(2));
            updatedRow.vsCourseRating = Number((updatedRow.avgScore - courseRating).toFixed(2));
          }
        }
        
        return updatedRow;
      }
      return row;
    }));
  };

  const saveIndividualResult = async (rowId: string) => {
    const row = results.find(r => r.id === rowId);
    if (!row) return;

    // Validate row
    if (!row.athleteId) {
      toast({
        title: "Validation Error",
        description: "Please select an athlete",
        variant: "destructive",
      });
      return;
    }
    
    if (!row.tournamentId || row.tournamentId === "new") {
      toast({
        title: "Validation Error",
        description: "Please select or create a tournament first",
        variant: "destructive",
      });
      return;
    }

    setSavingRowId(rowId);

    try {
      const dbResult = {
        tournament_id: row.tournamentId,
        athlete_id: row.athleteId,
        rounds: [row.round1, row.round2, row.round3, row.round4].filter(x => x).join(","),
        total_score: row.totalScore || null,
        position: row.position ? Number(row.position) : null,
        position_text: row.position,
        notes: row.notes || null
      };

      const { error } = await supabase
        .from("tournament_results")
        .insert(dbResult);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Tournament result saved successfully",
      });

      // Remove the saved row from the list
      setResults(results.filter(r => r.id !== rowId));
    } catch (error: any) {
      toast({
        title: "Error saving result",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingRowId(null);
    }
  };

  const saveResults = async () => {
    setLoading(true);
    
    // Validate that all required fields are filled
    const invalidRows = results.filter(r => {
      if (!r.athleteId) return true;
      if (!r.tournamentId || r.tournamentId === "new") return true;
      return false;
    });
    
    if (invalidRows.length > 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (tournament, athlete, and at least one round score)",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      // Transform data for database
      const dbResults = results.map(r => ({
        tournament_id: r.tournamentId,
        athlete_id: r.athleteId,
        rounds: [r.round1, r.round2, r.round3, r.round4].filter(x => x).join(","),
        total_score: r.totalScore || null,
        position: r.position ? Number(r.position) : null,
        position_text: r.position,
        notes: r.notes || null
      }));

      const { error } = await supabase
        .from("tournament_results")
        .upsert(dbResults, { onConflict: 'athlete_id,tournament_id' });

      if (error) throw error;

      toast({
        title: "Success",
        description: `${results.length} tournament results saved successfully`,
      });

      // Clear the form
      setResults([]);
      setSelectedAthlete("");
      setSelectedTournament("");
    } catch (error: any) {
      toast({
        title: "Error saving results",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImportComplete = () => {
    toast({
      title: "Import complete",
      description: "Tournament results have been imported successfully",
    });
    setImportModalOpen(false);
    // Optionally refresh tournaments list in case new ones were created
    fetchTournaments();
  };
  
  // Bulk import handlers
  const refreshAthletes = async () => {
    await loadAllAthletes();
    toast({
      title: "Athlete list refreshed",
      description: `Loaded ${allAthletes.length} athletes`,
    });
  };
  
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newUploads: typeof fileUploads = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.name.endsWith('.csv')) continue;

      const extractedName = extractNameFromFilename(file.name);
      let athleteMatch: AthleteMatch | null = null;

      if (extractedName) {
        athleteMatch = await matchAthleteByName(extractedName.firstName, extractedName.lastName);
      }

      newUploads.push({
        id: `${Date.now()}-${i}`,
        file,
        athleteId: athleteMatch?.id || null,
        athleteName: athleteMatch?.fullName || 'Unknown',
        athleteMatch,
        matches: [],
        status: 'pending',
        expanded: false,
      });
    }

    setFileUploads(prev => [...prev, ...newUploads]);
    
    for (const upload of newUploads) {
      parseFile(upload);
    }

    toast({
      title: "Files uploaded",
      description: `Added ${newUploads.length} file(s) to the queue.`,
    });
  }, []);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  const parseFile = async (upload: typeof fileUploads[number]) => {
    try {
      const text = await upload.file.text();
      const parseResult = parseCSVTournamentResults(text);

      const matches = await matchTournaments(parseResult.results, tournaments);
      
      if (upload.athleteId) {
        const { data: existingResults } = await supabase
          .from('tournament_results')
          .select('tournament_id')
          .eq('athlete_id', upload.athleteId);

        const existingTournamentIds = new Set(existingResults?.map(r => r.tournament_id) || []);
        
        const newResults = matches.filter(m => {
          const tournamentId = m.matchedTournament?.id;
          return tournamentId && !existingTournamentIds.has(tournamentId);
        }).length;

        const existingResultsCount = matches.filter(m => {
          const tournamentId = m.matchedTournament?.id;
          return tournamentId && existingTournamentIds.has(tournamentId);
        }).length;

        const newTournaments = matches.filter(m => m.matchConfidence === 'none').length;

        const importStats = {
          totalRows: parseResult.results.length + parseResult.errors.length,
          validResults: matches.length,
          newResults,
          existingResults: existingResultsCount,
          newTournaments,
        };

        setFileUploads(prev => prev.map(u => 
          u.id === upload.id 
            ? { ...u, matches, parseErrors: parseResult.errors, importStats }
            : u
        ));
      } else {
        setFileUploads(prev => prev.map(u => 
          u.id === upload.id 
            ? { ...u, matches, parseErrors: parseResult.errors }
            : u
        ));
      }
    } catch (error) {
      setFileUploads(prev => prev.map(u => 
        u.id === upload.id 
          ? { ...u, status: 'error', error: error instanceof Error ? error.message : 'Parse error' }
          : u
      ));
    }
  };

  const handleAthleteChange = async (uploadId: string, athleteId: string) => {
    const selectedAthlete = allAthletes.find(a => a.id === athleteId);
    setFileUploads(prev => prev.map(u => 
      u.id === uploadId 
        ? { 
            ...u, 
            athleteId, 
            athleteName: selectedAthlete?.fullName || 'Unknown',
            athleteMatch: selectedAthlete || null 
          }
        : u
    ));

    const upload = fileUploads.find(u => u.id === uploadId);
    if (upload) {
      parseFile({ ...upload, athleteId });
    }
  };

  const removeFile = (uploadId: string) => {
    setFileUploads(prev => prev.filter(u => u.id !== uploadId));
  };

  const toggleExpanded = (uploadId: string) => {
    setFileUploads(prev => prev.map(u => 
      u.id === uploadId ? { ...u, expanded: !u.expanded } : u
    ));
  };

  const handleSingleFileImport = async (uploadId: string) => {
    const upload = fileUploads.find(u => u.id === uploadId);
    if (!upload || !upload.athleteId || upload.matches.length === 0) return;

    setFileUploads(prev => prev.map(u => 
      u.id === uploadId ? { ...u, status: 'processing' } : u
    ));

    try {
      const result = await importTournamentResults(upload.athleteId, upload.matches);
      
      setFileUploads(prev => prev.map(u => 
        u.id === uploadId 
          ? { ...u, status: 'complete', result }
          : u
      ));

      toast({
        title: "Import successful",
        description: `${upload.file.name}: ${result.successCount} results added, ${result.resultsUpdated} updated. ${result.tournamentsCreated} new tournaments created.`,
      });
    } catch (error) {
      setFileUploads(prev => prev.map(u => 
        u.id === uploadId 
          ? { ...u, status: 'error', error: error instanceof Error ? error.message : 'Import failed' }
          : u
      ));

      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : 'An error occurred during import',
        variant: "destructive",
      });
    }
  };

  const handleBulkImport = async () => {
    const validUploads = fileUploads.filter(u => 
      u.athleteId && 
      u.matches.length > 0 && 
      u.status !== 'complete'
    );
    
    if (validUploads.length === 0) {
      toast({
        title: "No pending files",
        description: "All valid files have already been imported or there are no valid files to import.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingBulk(true);
    setCurrentFileIndex(0);

    // Initialize local accumulators
    let successFiles = 0;
    let errorFiles = 0;
    let totalResultsAdded = 0;
    let totalResultsUpdated = 0;
    let totalTournamentsCreated = 0;
    let totalRowErrors = 0;
    const totalSelected = validUploads.length;

    for (let i = 0; i < validUploads.length; i++) {
      const upload = validUploads[i];
      setCurrentFileIndex(i + 1);

      setFileUploads(prev => prev.map(u => 
        u.id === upload.id ? { ...u, status: 'processing' } : u
      ));

      try {
        const result = await importTournamentResults(upload.athleteId!, upload.matches);
        
        // Accumulate local totals
        successFiles++;
        totalResultsAdded += result.successCount || 0;
        totalResultsUpdated += result.resultsUpdated || 0;
        totalTournamentsCreated += result.tournamentsCreated || 0;
        totalRowErrors += result.errorCount || 0;
        
        setFileUploads(prev => prev.map(u => 
          u.id === upload.id 
            ? { ...u, status: 'complete', result }
            : u
        ));
      } catch (error) {
        errorFiles++;
        setFileUploads(prev => prev.map(u => 
          u.id === upload.id 
            ? { ...u, status: 'error', error: error instanceof Error ? error.message : 'Import failed' }
            : u
        ));
      }
    }

    setIsProcessingBulk(false);
    
    if (totalTournamentsCreated > 0) {
      setShowDedupeButton(true);
    }
    
    // Build message from local totals
    const messageParts = [];
    if (totalResultsAdded > 0) {
      messageParts.push(`✓ Imported ${totalResultsAdded} new result${totalResultsAdded !== 1 ? 's' : ''}`);
    }
    if (totalResultsUpdated > 0) {
      messageParts.push(`✓ Updated ${totalResultsUpdated} existing result${totalResultsUpdated !== 1 ? 's' : ''}`);
    }
    if (totalTournamentsCreated > 0) {
      messageParts.push(`✓ Created ${totalTournamentsCreated} new tournament${totalTournamentsCreated !== 1 ? 's' : ''}`);
    }
    if (totalRowErrors > 0) {
      messageParts.push(`⚠ ${totalRowErrors} row error${totalRowErrors !== 1 ? 's' : ''}`);
    }
    
    const description = messageParts.length > 0 
      ? messageParts.join('\n') + (totalTournamentsCreated > 0 ? '\n\nConsider reviewing duplicates.' : '')
      : 'No changes were needed';
    
    const toastVariant: 'default' | 'destructive' = successFiles === 0 ? 'destructive' : 'default';
    
    toast({
      title: `Bulk import complete (${successFiles} of ${totalSelected} succeeded)`,
      description,
      variant: toastVariant,
    });
  };

  const clearCompleted = () => {
    setFileUploads(prev => prev.filter(u => u.status !== 'complete'));
  };
  
  const totalFiles = fileUploads.length;
  const pendingFiles = fileUploads.filter(u => u.athleteId && u.matches.length > 0 && u.status !== 'complete').length;
  const completedFiles = fileUploads.filter(u => u.status === 'complete').length;
  const progressPercent = totalFiles > 0 ? (currentFileIndex / totalFiles) * 100 : 0;

  // Format tournament display
  const formatTournamentDisplay = (tournament: any) => {
    const parts = [tournament.name];
    if (tournament.location && tournament.location !== "TBD") {
      parts.push(tournament.location);
    }
    if (tournament.year) {
      parts.push(`(${tournament.year})`);
    } else if (tournament.start_date) {
      const date = new Date(tournament.start_date);
      parts.push(`(${date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})`);
    }
    return parts.join(" - ");
  };

  // Filter tournaments based on search
  const filteredTournaments = tournaments.filter(t => {
    const searchLower = tournamentSearch.toLowerCase();
    const display = formatTournamentDisplay(t).toLowerCase();
    return display.includes(searchLower);
  });

  // Filter athletes based on search
  const filteredAthletes = athletes.filter(a => {
    const searchLower = athleteSearch.toLowerCase();
    const fullName = `${a.last_name}, ${a.first_name}`.toLowerCase();
    return fullName.includes(searchLower);
  });


  return (
    <>
      <QuickTournamentDialog
        open={quickTournamentOpen}
        onOpenChange={setQuickTournamentOpen}
        onTournamentCreated={handleTournamentCreated}
        initialName={quickTournamentName}
      />
      
      <TournamentResultsImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        athleteId={selectedAthlete}
        existingTournaments={tournaments}
        onImportComplete={handleImportComplete}
      />
      
      <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Tournament Results Entry</h1>
        <p className="text-muted-foreground mt-2">
          Add multiple tournament results efficiently by athlete, tournament, or bulk CSV import
        </p>
      </div>

      <Tabs value={mode} onValueChange={(v) => setMode(v as "athlete" | "tournament" | "bulk")}>
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="athlete">By Athlete</TabsTrigger>
          <TabsTrigger value="tournament">By Tournament</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Import (CSV)</TabsTrigger>
        </TabsList>

        <TabsContent value="athlete">
          <Card>
            <CardHeader>
              <CardTitle>Add Results for Single Athlete</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label htmlFor="athlete-select">Select Athlete</Label>
                <Popover open={athleteOpen} onOpenChange={setAthleteOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={athleteOpen}
                      className="w-full justify-between"
                    >
                      {selectedAthlete 
                        ? `${athletes.find(a => a.id === selectedAthlete)?.last_name}, ${athletes.find(a => a.id === selectedAthlete)?.first_name}`
                        : "Choose an athlete..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start" sideOffset={4}>
                    <Command>
                      <CommandInput 
                        placeholder="Search athletes..." 
                        value={athleteSearch}
                        onValueChange={setAthleteSearch}
                      />
                      <CommandList>
                        <CommandEmpty>No athlete found.</CommandEmpty>
                        <CommandGroup>
                          {filteredAthletes.map((athlete) => (
                            <CommandItem
                              key={athlete.id}
                              value={`${athlete.last_name}, ${athlete.first_name}`}
                              onSelect={() => {
                                setSelectedAthlete(athlete.id);
                                setAthleteOpen(false);
                                setAthleteSearch("");
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedAthlete === athlete.id ? "opacity-100" : "opacity-0"
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
              </div>

              {selectedAthlete && (
                <>
                  <div className="mb-4 flex gap-2">
                    <Button onClick={addNewRow} className="mb-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Tournament Result
                    </Button>
                    <Button 
                      onClick={() => setImportModalOpen(true)} 
                      variant="outline"
                      className="mb-4"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Import from CSV
                    </Button>
                  </div>

                  {results.length > 0 && (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tournament</TableHead>
                            <TableHead>Yardage</TableHead>
                            <TableHead>Par</TableHead>
                            <TableHead>Slope</TableHead>
                            <TableHead>CR</TableHead>
                            <TableHead>R1</TableHead>
                            <TableHead>R2</TableHead>
                            <TableHead>R3</TableHead>
                            <TableHead>R4</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Avg</TableHead>
                            <TableHead>vs Par</TableHead>
                            <TableHead>vs CR</TableHead>
                            <TableHead title="Finishing position/rank in the tournament">Rank</TableHead>
                            <TableHead>Link</TableHead>
                            <TableHead>Notes</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {results.map(row => (
                            <TableRow key={row.id}>
                              <TableCell>
                                <TournamentCombobox 
                                  value={row.tournamentId} 
                                  onValueChange={(v, tournament) => {
                                    updateRow(row.id, "tournamentId", v);
                                    if (tournament) {
                                      setTournaments(prev =>
                                        prev.some((t: any) => t.id === tournament.id) ? prev : [...prev, tournament]
                                      );
                                    }
                                  }}
                                  onCreateNew={(name) => handleQuickTournamentCreate(row.id, name)}
                                  newTournamentName={row.newTournamentName}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="text"
                                  value={row.yardage}
                                  onChange={(e) => updateRow(row.id, "yardage", e.target.value)}
                                  disabled={!row.isNewTournament}
                                  className="w-24"
                                  placeholder="6800"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={row.par}
                                  onChange={(e) => updateRow(row.id, "par", e.target.value)}
                                  disabled={!row.isNewTournament}
                                  className="w-20"
                                  placeholder="72"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="text"
                                  value={row.slope}
                                  onChange={(e) => updateRow(row.id, "slope", e.target.value)}
                                  disabled={!row.isNewTournament}
                                  className="w-20"
                                  placeholder="113"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="text"
                                  value={row.courseRating}
                                  onChange={(e) => updateRow(row.id, "courseRating", e.target.value)}
                                  disabled={!row.isNewTournament}
                                  className="w-20"
                                  placeholder="72.5"
                                />
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
                              <TableCell className={cn(
                                "font-semibold",
                                row.vspar > 0 ? "text-destructive" : row.vspar < 0 ? "text-green-600" : ""
                              )}>
                                {row.vspar > 0 ? `+${row.vspar}` : row.vspar}
                              </TableCell>
                              <TableCell className={cn(
                                "font-semibold",
                                row.vsCourseRating > 0 ? "text-destructive" : row.vsCourseRating < 0 ? "text-green-600" : ""
                              )}>
                                {row.vsCourseRating > 0 ? `+${row.vsCourseRating}` : row.vsCourseRating}
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
                                  disabled={!row.isNewTournament}
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
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => saveIndividualResult(row.id)}
                                          disabled={savingRowId === row.id}
                                        >
                                          <Save className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Save this result</TooltipContent>
                                    </Tooltip>
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
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tournament">
          <Card>
            <CardHeader>
              <CardTitle>Add Results for Single Tournament</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label htmlFor="tournament-select">Select Tournament</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Popover open={tournamentOpen} onOpenChange={setTournamentOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={tournamentOpen}
                          className="w-full justify-between"
                        >
                          {selectedTournament 
                            ? formatTournamentDisplay(tournaments.find(t => t.id === selectedTournament))
                            : "Choose a tournament..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start" sideOffset={4}>
                        <Command>
                          <CommandInput 
                            placeholder="Search tournaments..." 
                            value={tournamentSearch}
                            onValueChange={setTournamentSearch}
                          />
                          <CommandList>
                            <CommandEmpty>No tournament found.</CommandEmpty>
                            <CommandGroup>
                              {filteredTournaments.map((tournament) => (
                                <CommandItem
                                  key={tournament.id}
                                  value={formatTournamentDisplay(tournament)}
                                  onSelect={() => {
                                    setSelectedTournament(tournament.id);
                                    setTournamentOpen(false);
                                    setTournamentSearch("");
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedTournament === tournament.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <div className="font-medium">{tournament.name}</div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                      {tournament.location && tournament.location !== "TBD" && (
                                        <>
                                          <MapPin className="h-3 w-3" />
                                          {tournament.location}
                                        </>
                                      )}
                                      {(tournament.year || tournament.start_date) && (
                                        <>
                                          <Calendar className="h-3 w-3" />
                                          {tournament.year || new Date(tournament.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQuickTournamentName("");
                      setPendingRowId(null);
                      setQuickTournamentOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New
                  </Button>
                </div>
              </div>

              {selectedTournament && (
                <>
                  <div className="mb-4">
                    <Button onClick={addNewRow} className="mb-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Athlete Result
                    </Button>
                  </div>

                  {results.length > 0 && (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Athlete</TableHead>
                            <TableHead>R1</TableHead>
                            <TableHead>R2</TableHead>
                            <TableHead>R3</TableHead>
                            <TableHead>R4</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Avg</TableHead>
                            <TableHead title="Finishing position/rank in the tournament">Rank</TableHead>
                            <TableHead>Link</TableHead>
                            <TableHead>Notes</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {results.map(row => (
                            <TournamentResultRow
                              key={row.id}
                              row={row}
                              athletes={athletes}
                              updateRow={updateRow}
                              removeRow={removeRow}
                              onSaveRow={saveIndividualResult}
                              isSaving={savingRowId === row.id}
                            />
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="bulk">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Bulk Import Tournament Results</CardTitle>
                <p className="text-muted-foreground text-sm mt-1">
                  Upload multiple CSV files at once and batch import tournament results
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={refreshAthletes}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Refresh Athletes
                </Button>
                {showDedupeButton && completedFiles > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => navigate('/admin/tournament-deduplication')}
                  >
                    <Merge className="mr-2 h-4 w-4" />
                    Review Duplicates
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Upload Zone */}
              <div
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 cursor-pointer transition-colors ${
                  isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
              >
                <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Click to upload or drag and drop</p>
                <p className="text-sm text-muted-foreground">CSV files only (multiple files supported)</p>
                <Input
                  ref={fileInputRef}
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
              </div>

              {/* Files List */}
              {fileUploads.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">
                      Files ({pendingFiles} pending, {completedFiles} completed)
                    </h2>
                    <div className="flex gap-2">
                      {completedFiles > 0 && (
                        <Button
                          variant="outline"
                          onClick={clearCompleted}
                          disabled={isProcessingBulk}
                        >
                          Clear Completed
                        </Button>
                      )}
                      <Button
                        onClick={handleBulkImport}
                        disabled={isProcessingBulk || pendingFiles === 0}
                      >
                        {isProcessingBulk ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing ({currentFileIndex}/{totalFiles})
                          </>
                        ) : (
                          `Import All Pending (${pendingFiles})`
                        )}
                      </Button>
                    </div>
                  </div>

                  {isProcessingBulk && (
                    <div className="space-y-2">
                      <Progress value={progressPercent} />
                      <p className="text-sm text-muted-foreground text-center">
                        Processing file {currentFileIndex} of {totalFiles}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    {fileUploads.map((upload) => (
                      <div key={upload.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => toggleExpanded(upload.id)}
                            >
                              {upload.expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                            
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium truncate">{upload.file.name}</span>
                            
                            {upload.athleteMatch && (
                              <Badge variant={
                                upload.athleteMatch.confidence === 'exact' ? 'default' :
                                upload.athleteMatch.confidence === 'high' ? 'secondary' : 'outline'
                              }>
                                {upload.athleteMatch.confidence} match
                              </Badge>
                            )}

                            {upload.parseErrors && upload.parseErrors.length > 0 && (
                              <Badge variant="outline" className="border-orange-500 text-orange-600">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                {upload.parseErrors.length} parse error{upload.parseErrors.length === 1 ? '' : 's'}
                              </Badge>
                            )}

                            {upload.status === 'complete' && (
                              <Badge variant="default" className="bg-green-500">
                                <Check className="h-3 w-3 mr-1" /> Complete
                              </Badge>
                            )}
                            {upload.status === 'error' && (
                              <Badge variant="destructive">
                                <X className="h-3 w-3 mr-1" /> Error
                              </Badge>
                            )}
                            {upload.status === 'processing' && (
                              <Badge variant="secondary">
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Processing
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <AthleteCombobox
                              value={upload.athleteId || ''}
                              onValueChange={(value) => handleAthleteChange(upload.id, value)}
                              athletes={allAthletes}
                              className="w-[250px]"
                              disabled={upload.status === 'processing' || upload.status === 'complete'}
                            />

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(upload.id)}
                              disabled={upload.status === 'processing'}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {upload.error && (
                          <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded">
                            <AlertCircle className="h-4 w-4 mt-0.5" />
                            <span>{upload.error}</span>
                          </div>
                        )}

                        {upload.expanded && upload.importStats && (
                          <div className="ml-9 space-y-4">
                            <Alert>
                              <BarChart3 className="h-4 w-4" />
                              <AlertDescription>
                                <div className="space-y-1">
                                  <div>Found <strong>{upload.importStats.validResults}</strong> valid results out of <strong>{upload.importStats.totalRows}</strong> rows</div>
                                  {upload.importStats.newResults > 0 && (
                                    <div className="text-green-600 dark:text-green-400">• {upload.importStats.newResults} new results to import</div>
                                  )}
                                  {upload.importStats.existingResults > 0 && (
                                    <div className="text-blue-600 dark:text-blue-400">• {upload.importStats.existingResults} existing results (will be updated)</div>
                                  )}
                                  {upload.importStats.newTournaments > 0 && (
                                    <div className="text-blue-600 dark:text-blue-400">• {upload.importStats.newTournaments} new tournaments will be created</div>
                                  )}
                                </div>
                              </AlertDescription>
                            </Alert>

                            <Button
                              onClick={() => handleSingleFileImport(upload.id)}
                              disabled={
                                upload.status === 'processing' || 
                                upload.status === 'complete' || 
                                !upload.athleteId || 
                                upload.matches.length === 0
                              }
                              size="sm"
                            >
                              {upload.status === 'complete' ? (
                                <><Check className="mr-2 h-4 w-4" /> Imported</>
                              ) : upload.status === 'processing' ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...</>
                              ) : (
                                <><Upload className="mr-2 h-4 w-4" /> Import This File</>
                              )}
                            </Button>
                          </div>
                        )}

                        {upload.result && (
                          <div className="ml-9 space-y-3">
                            <div className="grid grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Results Added</p>
                                <p className="font-semibold text-green-600">{upload.result.successCount}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Results Updated</p>
                                <p className="font-semibold text-blue-600">{upload.result.resultsUpdated}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">New Tournaments</p>
                                <p className="font-semibold text-blue-600">{upload.result.tournamentsCreated}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Errors</p>
                                <p className="font-semibold text-red-600">{upload.result.errorCount}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {results.length > 0 && mode !== 'bulk' && (
        <div className="mt-6 flex gap-4">
          <Button onClick={saveResults} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            Save All Results
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setResults([]);
              setSelectedAthlete("");
              setSelectedTournament("");
            }}
          >
            Clear All
          </Button>
        </div>
      )}
    </div>
    </>
  );
}

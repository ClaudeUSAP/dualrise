import { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, FileText, Check, X, AlertCircle, Loader2, ChevronDown, ChevronRight, BarChart3, Merge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { parseCSVTournamentResults } from '@/lib/csvTournamentResultsParser';
import { matchTournaments, TournamentMatch } from '@/lib/tournamentMatcher';
import { importTournamentResults, ImportResult } from '@/lib/api/tournamentResultsImport';
import { extractNameFromFilename, matchAthleteByName, getAllAthletes, AthleteMatch } from '@/lib/athleteNameMatcher';
import { AthleteCombobox } from '@/components/admin/AthleteCombobox';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface ImportStats {
  totalRows: number;
  validResults: number;
  newResults: number;
  existingResults: number;
  newTournaments: number;
}

interface FileUpload {
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
  importStats?: ImportStats;
}

const BulkTournamentImport = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileUploads, setFileUploads] = useState<FileUpload[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [allAthletes, setAllAthletes] = useState<AthleteMatch[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showDedupeButton, setShowDedupeButton] = useState(false);

  const refreshAthletes = async () => {
    const athletes = await getAllAthletes();
    const sortedAthletes = athletes.sort((a, b) => {
      const lastNameCompare = a.lastName.localeCompare(b.lastName);
      if (lastNameCompare !== 0) return lastNameCompare;
      return a.firstName.localeCompare(b.firstName);
    });
    setAllAthletes(sortedAthletes);
    
    toast({
      title: "Athlete list refreshed",
      description: `Loaded ${sortedAthletes.length} athletes`,
    });
  };

  // Tab visibility warning during import
  useEffect(() => {
    if (!isProcessing) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Import in progress. Are you sure you want to leave?';
      return e.returnValue;
    };

    const handleVisibilityChange = () => {
      if (document.hidden && isProcessing) {
        toast({
          title: "⚠️ Keep this tab open",
          description: "The import may slow down or pause if you switch tabs.",
          variant: "destructive",
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isProcessing, toast]);

  // Load athletes and tournaments on mount
  useEffect(() => {
    const loadData = async () => {
      const athletes = await getAllAthletes();
      
      // Sort alphabetically by last name, then first name
      const sortedAthletes = athletes.sort((a, b) => {
        const lastNameCompare = a.lastName.localeCompare(b.lastName);
        if (lastNameCompare !== 0) return lastNameCompare;
        return a.firstName.localeCompare(b.firstName);
      });
      
      setAllAthletes(sortedAthletes);

      const { data: tournamentsData } = await supabase
        .from('tournaments')
        .select('*')
        .order('year', { ascending: false });
      
      if (tournamentsData) {
        setTournaments(tournamentsData);
      }
    };
    
    loadData();

    // Subscribe to realtime athlete changes
    const channel = supabase
      .channel('athletes-changes-bulk')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'athletes',
        },
        async () => {
          await refreshAthletes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newUploads: FileUpload[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.name.endsWith('.csv')) continue;

      // Try to extract name from filename
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
    
    // Parse CSV files
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

  const parseFile = async (upload: FileUpload) => {
    try {
      const text = await upload.file.text();
      const parseResult = parseCSVTournamentResults(text);

      const matches = await matchTournaments(parseResult.results, tournaments);
      
      // Calculate import statistics
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

        const importStats: ImportStats = {
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

    // Recalculate stats with new athlete
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

    setIsProcessing(true);
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

    setIsProcessing(false);
    
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bulk Import Tournament Results</h1>
          <p className="text-muted-foreground mt-2">
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
      </div>

      {/* Tab Warning Banner */}
      {isProcessing && (
        <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
          <AlertCircle className="h-4 w-4 text-orange-500" />
          <AlertDescription className="text-orange-700 dark:text-orange-400">
            <strong>Please keep this tab visible.</strong> Switching tabs may pause the import process.
            <span className="block mt-1 text-sm">
              <strong>Tip:</strong> Need to continue working? Open Scout in a new browser window (Ctrl+N / Cmd+N) instead of switching tabs.
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Zone */}
      <Card className="p-8">
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
      </Card>

      {/* Files List */}
      {fileUploads.length > 0 && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Files ({pendingFiles} pending, {completedFiles} completed)
            </h2>
            <div className="flex gap-2">
              {completedFiles > 0 && (
                <Button
                  variant="outline"
                  onClick={clearCompleted}
                  disabled={isProcessing}
                >
                  Clear Completed
                </Button>
              )}
              <Button
                onClick={handleBulkImport}
                disabled={isProcessing || pendingFiles === 0}
              >
                {isProcessing ? (
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

          {isProcessing && (
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

                    <div>
                      <p className="font-medium mb-2">Tournament Preview (first 10):</p>
                      <div className="border rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-muted">
                              <tr>
                                <th className="text-left p-2 font-medium">#</th>
                                <th className="text-left p-2 font-medium">Tournament</th>
                                <th className="text-left p-2 font-medium">Year</th>
                                <th className="text-left p-2 font-medium">Rounds</th>
                                <th className="text-left p-2 font-medium">Score</th>
                                <th className="text-left p-2 font-medium">Position</th>
                                <th className="text-left p-2 font-medium">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {upload.matches.slice(0, 10).map((match, idx) => {
                                const isDuplicate = upload.importStats && idx < upload.importStats.existingResults;
                                return (
                                  <tr key={idx} className="border-t">
                                    <td className="p-2 text-muted-foreground">{idx + 1}</td>
                                    <td className="p-2 font-medium">{match.canonicalName}</td>
                                    <td className="p-2">{match.parsedResult.year}</td>
                                    <td className="p-2">{match.parsedResult.rounds}</td>
                                    <td className="p-2">{match.parsedResult.totalScore || '-'}</td>
                                    <td className="p-2">{match.parsedResult.position || '-'}</td>
                                    <td className="p-2">
                                      {isDuplicate ? (
                                        <Badge variant="outline" className="text-xs border-blue-500 text-blue-600">Existing</Badge>
                                      ) : match.matchConfidence === 'exact' ? (
                                        <Badge variant="outline" className="text-xs border-green-500 text-green-600">Similar</Badge>
                                      ) : match.matchConfidence === 'none' ? (
                                        <Badge variant="secondary" className="text-xs">New</Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-xs">Match</Badge>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      {upload.matches.length > 10 && (
                        <p className="text-sm text-muted-foreground mt-2">...and {upload.matches.length - 10} more tournaments</p>
                      )}
                    </div>

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

                {upload.expanded && upload.parseErrors && upload.parseErrors.length > 0 && (
                  <div className="ml-9 space-y-2 text-sm">
                    <p className="font-medium text-orange-600">Parse Errors ({upload.parseErrors.length}):</p>
                    <div className="space-y-1 bg-orange-50 dark:bg-orange-950/20 p-3 rounded border border-orange-200 dark:border-orange-800">
                      {upload.parseErrors.slice(0, 10).map((error, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs">
                          <Badge variant="outline" className="text-xs shrink-0 border-orange-500 text-orange-600">
                            Row {error.row}
                          </Badge>
                          <span className="text-orange-700 dark:text-orange-300">{error.message}</span>
                        </div>
                      ))}
                      {upload.parseErrors.length > 10 && (
                        <p className="text-xs text-muted-foreground italic">
                          ...and {upload.parseErrors.length - 10} more errors
                        </p>
                      )}
                    </div>
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
                    
                    {upload.parseErrors && upload.parseErrors.length > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        <span className="text-orange-600 dark:text-orange-400">
                          {upload.parseErrors.length} row(s) skipped due to invalid data
                        </span>
                        <Button 
                          variant="link" 
                          size="sm" 
                          onClick={() => toggleExpanded(upload.id)}
                          className="h-auto p-0 text-orange-600"
                        >
                          View details
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default BulkTournamentImport;

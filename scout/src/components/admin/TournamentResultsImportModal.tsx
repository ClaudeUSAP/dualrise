import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { parseCSVTournamentResults, ParsedTournamentResult } from '@/lib/csvTournamentResultsParser';
import { matchTournaments, TournamentMatch } from '@/lib/tournamentMatcher';
import { Tournament } from '@/types/tournament';
import { importTournamentResults } from '@/lib/api/tournamentResultsImport';
import { Upload, CheckCircle, AlertCircle, PlusCircle, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TournamentResultsImportModalProps {
  open: boolean;
  onClose: () => void;
  athleteId: string;
  existingTournaments: Tournament[];
  onImportComplete: () => void;
}

export const TournamentResultsImportModal: React.FC<TournamentResultsImportModalProps> = ({
  open,
  onClose,
  athleteId,
  existingTournaments,
  onImportComplete,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [parseErrors, setParseErrors] = useState<{ row: number; message: string }[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState<{ total: number; valid: number } | null>(null);
  const [editedNotes, setEditedNotes] = useState<Map<number, string>>(new Map());

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast({
        title: 'Invalid file',
        description: 'Please select a CSV file',
        variant: 'destructive',
      });
      return;
    }

    setFile(selectedFile);
    
    // Parse CSV
    const reader = new FileReader();
    reader.onload = async (event) => {
      const csvText = event.target?.result as string;
      const parseResult = parseCSVTournamentResults(csvText);
      
      setParseErrors(parseResult.errors);
      setImportStats({ total: parseResult.totalRows, valid: parseResult.validRows });

      if (parseResult.results.length > 0) {
        const tournamentMatches = await matchTournaments(parseResult.results, existingTournaments);
        
        // Check for duplicates by querying existing tournament_results
        const tournamentIds = tournamentMatches
          .filter(m => m.matchedTournament)
          .map(m => m.matchedTournament!.id);
        
        if (tournamentIds.length > 0) {
          const { data: existingResults } = await supabase
            .from('tournament_results')
            .select('tournament_id')
            .eq('athlete_id', athleteId)
            .in('tournament_id', tournamentIds);
          
          const existingTournamentIds = new Set(existingResults?.map(r => r.tournament_id) || []);
          
          // Mark duplicates
          tournamentMatches.forEach(match => {
            if (match.matchedTournament && existingTournamentIds.has(match.matchedTournament.id)) {
              match.isDuplicate = true;
            }
          });
        }
        
        setMatches(tournamentMatches);
      } else {
        setMatches([]);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (matches.length === 0) return;

    setIsImporting(true);
    try {
      // Merge edited notes back into matches
      const matchesWithEditedNotes = matches.map(match => ({
        ...match,
        parsedResult: {
          ...match.parsedResult,
          notes: editedNotes.get(match.parsedResult.rowNumber) ?? match.parsedResult.notes
        }
      }));
      
      const result = await importTournamentResults(athleteId, matchesWithEditedNotes);
      
      // Build comprehensive message
      const messageParts = [];
      if (result.successCount > 0) {
        messageParts.push(`✓ Imported ${result.successCount} new result${result.successCount !== 1 ? 's' : ''}`);
      }
      if (result.resultsUpdated > 0) {
        messageParts.push(`✓ Updated ${result.resultsUpdated} existing result${result.resultsUpdated !== 1 ? 's' : ''}`);
      }
      if (result.tournamentsCreated > 0) {
        messageParts.push(`✓ Created ${result.tournamentsCreated} new tournament${result.tournamentsCreated !== 1 ? 's' : ''}`);
      }
      if (parseErrors.length > 0) {
        messageParts.push(`⚠ Skipped ${parseErrors.length} invalid row${parseErrors.length !== 1 ? 's' : ''}`);
      }
      if (result.errorCount > 0) {
        messageParts.push(`✗ Failed ${result.errorCount} result${result.errorCount !== 1 ? 's' : ''}`);
        console.error('Import errors:', result.errors);
      }

      const totalSuccess = result.successCount + result.resultsUpdated;
      const hasErrors = result.errorCount > 0 || parseErrors.length > 0;

      // Determine toast variant
      let toastVariant: 'default' | 'destructive' = 'default';
      let toastTitle = 'Import successful';

      if (totalSuccess === 0 && hasErrors) {
        toastVariant = 'destructive';
        toastTitle = 'Import failed';
      } else if (totalSuccess > 0 && hasErrors) {
        toastTitle = 'Import completed with warnings';
      }

      toast({
        title: toastTitle,
        description: messageParts.length > 0 
          ? messageParts.join('\n') 
          : 'No changes were needed - all data already exists',
        variant: toastVariant,
      });

      onImportComplete();
      handleClose();
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'An error occurred during import',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setMatches([]);
    setParseErrors([]);
    setImportStats(null);
    setEditedNotes(new Map());
    onClose();
  };

  const getMatchIcon = (confidence: TournamentMatch['matchConfidence']) => {
    switch (confidence) {
      case 'exact':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fuzzy':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'none':
        return <PlusCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const getMatchBadge = (match: TournamentMatch) => {
    if (match.isDuplicate) {
      return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-500/20">Already Imported</Badge>;
    }
    switch (match.matchConfidence) {
      case 'exact':
        return <Badge variant="default" className="bg-green-500">Matched</Badge>;
      case 'fuzzy':
        return <Badge variant="secondary" className="bg-yellow-500">Fuzzy Match</Badge>;
      case 'none':
        return <Badge variant="outline" className="border-blue-500 text-blue-500">Create New</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-lg sm:text-xl">Import Tournament Results (CSV)</DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Upload a CSV file with tournament results. The system will match existing tournaments or create new ones.
          </DialogDescription>
        </DialogHeader>

        {/* Fixed content area - file upload, alerts, buttons */}
        <div className="space-y-4 flex-shrink-0">
          {/* File Upload Section */}
          <div className="space-y-2">
            <Label htmlFor="csv-file">CSV File</Label>
            <div className="flex items-center gap-2">
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={isImporting}
              />
              {file && (
                <Badge variant="secondary">
                  {file.name}
                </Badge>
              )}
            </div>
          </div>

          {/* Error Alerts Section */}
          <div className="space-y-3">
            {/* Critical Parse Errors */}
            {parseErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-2">
                    🚫 {parseErrors.length} row{parseErrors.length !== 1 ? 's' : ''} will be SKIPPED due to critical errors
                  </div>
                  <div className="text-sm mb-2">
                    These rows are missing required fields and cannot be imported:
                  </div>
                  <ul className="list-none space-y-2 text-sm">
                    {parseErrors.slice(0, 5).map((error, i) => (
                      <li key={i} className="border-l-2 border-destructive pl-2">
                        <span className="font-medium">Row {error.row}:</span>
                        <div className="ml-2 text-xs">{error.message}</div>
                      </li>
                    ))}
                    {parseErrors.length > 5 && (
                      <li className="text-muted-foreground italic">
                        ...and {parseErrors.length - 5} more critical errors
                      </li>
                    )}
                  </ul>
                  <div className="mt-2 text-xs opacity-80">
                    💡 Required fields: Series Name, Year, Country, Gender
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Warnings for rows with missing optional data */}
            {matches.some(m => m.parsedResult.errors && m.parsedResult.errors.length > 0) && (
              <Alert>
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <AlertDescription>
                  <div className="font-semibold mb-2">
                    ⚠️ {matches.filter(m => m.parsedResult.errors?.length > 0).length} row{matches.filter(m => m.parsedResult.errors?.length > 0).length !== 1 ? 's' : ''} have warnings (will still import)
                  </div>
                  <div className="text-sm mb-2">
                    These rows have incomplete data but will be imported:
                  </div>
                  <ul className="list-none space-y-1 text-sm">
                    {matches
                      .filter(m => m.parsedResult.errors?.length > 0)
                      .slice(0, 3)
                      .map((match, i) => (
                        <li key={i} className="border-l-2 border-yellow-500 pl-2">
                          <span className="font-medium">Row {match.parsedResult.rowNumber}:</span>
                          <div className="ml-2 text-xs">
                            {match.parsedResult.errors.map(e => e.message).join(', ')}
                          </div>
                        </li>
                      ))}
                    {matches.filter(m => m.parsedResult.errors?.length > 0).length > 3 && (
                      <li className="text-muted-foreground italic text-xs">
                        ...and {matches.filter(m => m.parsedResult.errors?.length > 0).length - 3} more rows with warnings
                      </li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Import Stats */}
            {importStats && (
              <Alert>
                <Upload className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div>Found {importStats.valid} valid results out of {importStats.total} rows</div>
                    {matches.length > 0 && (
                      <>
                        <div className="text-green-600 dark:text-green-400">
                          • {matches.filter(m => !m.isDuplicate).length} new results to import
                        </div>
                        {matches.filter(m => m.isDuplicate).length > 0 && (
                          <div className="text-blue-600 dark:text-blue-400">
                            • {matches.filter(m => m.isDuplicate).length} existing results (will be updated)
                          </div>
                        )}
                        {matches.filter(m => m.matchConfidence === 'fuzzy' && !m.isDuplicate).length > 0 && (
                          <div className="text-yellow-600 dark:text-yellow-400">
                            • {matches.filter(m => m.matchConfidence === 'fuzzy' && !m.isDuplicate).length} matched to similar existing tournaments
                          </div>
                        )}
                        {matches.filter(m => m.matchConfidence === 'none' && !m.isDuplicate).length > 0 && (
                          <div className="text-blue-600 dark:text-blue-400">
                            • {matches.filter(m => m.matchConfidence === 'none' && !m.isDuplicate).length} new tournaments will be created
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Buttons - Above the table */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={handleClose} disabled={isImporting}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={matches.length === 0 || isImporting}
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  Import {matches.filter(m => !m.isDuplicate).length} New
                  {matches.filter(m => m.isDuplicate).length > 0 && 
                    ` + Update ${matches.filter(m => m.isDuplicate).length} Existing`
                  }
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Scrollable Preview Table - fixed height for scrolling */}
        {matches.length > 0 && (
          <div className="border rounded-md overflow-hidden">
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Row</TableHead>
                    <TableHead>Tournament</TableHead>
                    <TableHead className="w-[100px]">Year</TableHead>
                    <TableHead className="w-[100px]">Rounds</TableHead>
                    <TableHead className="w-[80px]">Total</TableHead>
                    <TableHead className="w-[80px]">Pos</TableHead>
                    <TableHead className="w-[150px]">Match Status</TableHead>
                    <TableHead className="w-[200px]">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matches.map((match, index) => (
                    <TableRow 
                      key={index}
                      className={match.parsedResult.errors?.length > 0 ? "bg-yellow-50 dark:bg-yellow-950/10" : ""}
                    >
                      <TableCell className="font-mono text-sm">
                        {match.parsedResult.rowNumber}
                        {match.parsedResult.errors?.length > 0 && (
                          <Badge variant="outline" className="ml-1 text-yellow-600 border-yellow-600">
                            ⚠️
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {getMatchIcon(match.matchConfidence)}
                          <span className="truncate max-w-[200px]" title={match.canonicalName}>
                            {match.canonicalName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{match.parsedResult.year}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {[
                          match.parsedResult.round1,
                          match.parsedResult.round2,
                          match.parsedResult.round3,
                          match.parsedResult.round4,
                        ]
                          .filter(r => r !== undefined)
                          .join('-')}
                      </TableCell>
                      <TableCell className="font-semibold">{match.parsedResult.totalScore}</TableCell>
                      <TableCell>
                        {match.parsedResult.position || match.parsedResult.positionText || '-'}
                      </TableCell>
                      <TableCell>
                        {getMatchBadge(match)}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={editedNotes.get(match.parsedResult.rowNumber) ?? match.parsedResult.notes ?? ''}
                          onChange={(e) => {
                            const newNotes = new Map(editedNotes);
                            newNotes.set(match.parsedResult.rowNumber, e.target.value);
                            setEditedNotes(newNotes);
                          }}
                          placeholder="Add notes..."
                          className="w-full"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

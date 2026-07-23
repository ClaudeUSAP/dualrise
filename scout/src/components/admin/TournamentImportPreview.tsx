import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tournament } from '@/types/tournament';
import { ParsedTournamentCSV, TournamentValidationError } from '@/lib/csvTournamentParser';
import { listTournaments } from '@/lib/api/tournaments';
import { calculateSimilarity } from '@/lib/tournamentMatcher';
import { 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info,
  Loader2,
  Calendar,
  MapPin,
  Users,
  Trophy
} from 'lucide-react';

export interface TournamentMatch {
  parsed: ParsedTournamentCSV;
  existingTournament?: Tournament;
  matchConfidence: number;
  action: 'create' | 'update' | 'skip';
}

interface TournamentImportPreviewProps {
  parsedTournaments: ParsedTournamentCSV[];
  errors: TournamentValidationError[];
  onConfirm: (matches: TournamentMatch[], strategy: 'skip' | 'update' | 'create' | 'dates_only') => Promise<void>;
  onCancel: () => void;
}

export const TournamentImportPreview = ({
  parsedTournaments,
  errors,
  onConfirm,
  onCancel,
}: TournamentImportPreviewProps) => {
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [isMatching, setIsMatching] = useState(true);
  const [importStrategy, setImportStrategy] = useState<'skip' | 'update' | 'create' | 'dates_only'>('skip');
  const [selectedMatches, setSelectedMatches] = useState<Set<number>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Match tournaments on mount
  useEffect(() => {
    const matchTournaments = async () => {
      setIsMatching(true);
      try {
        const existingTournaments = await listTournaments();
        
        const tournamentMatches: TournamentMatch[] = parsedTournaments.map((parsed) => {
          // Try to find exact or fuzzy match
          let bestMatch: Tournament | undefined;
          let bestScore = 0;

          for (const existing of existingTournaments) {
            // Exact match on name
            if (existing.name === parsed.tournamentData.name) {
              return {
                parsed,
                existingTournament: existing,
                matchConfidence: 1.0,
                action: 'update' as const,
              };
            }

            // Fuzzy match
            const similarity = calculateSimilarity(
              parsed.tournamentData.name || '',
              existing.name
            );

            // Also check year and country
            const yearMatch = existing.year === parsed.tournamentData.year;
            const countryMatch = existing.country === parsed.tournamentData.country;
            
            let adjustedScore = similarity;
            if (yearMatch) adjustedScore += 0.1;
            if (countryMatch) adjustedScore += 0.05;

            if (adjustedScore > bestScore && adjustedScore >= 0.75) {
              bestScore = adjustedScore;
              bestMatch = existing;
            }
          }

          if (bestMatch && bestScore >= 0.75) {
            return {
              parsed,
              existingTournament: bestMatch,
              matchConfidence: bestScore,
              action: 'update' as const,
            };
          }

          return {
            parsed,
            matchConfidence: 0,
            action: 'create' as const,
          };
        });

        setMatches(tournamentMatches);
        
        // Auto-select all by default
        setSelectedMatches(new Set(tournamentMatches.map((_, idx) => idx)));
      } catch (error) {
        console.error('Error matching tournaments:', error);
      } finally {
        setIsMatching(false);
      }
    };

    matchTournaments();
  }, [parsedTournaments]);

  const handleConfirm = async () => {
    const selectedTournamentMatches = matches.filter((_, idx) => selectedMatches.has(idx));
    
    setIsImporting(true);
    setImportProgress(0);
    
    try {
      await onConfirm(selectedTournamentMatches, importStrategy);
    } finally {
      setIsImporting(false);
    }
  };

  const toggleSelection = (index: number) => {
    const newSelection = new Set(selectedMatches);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedMatches(newSelection);
  };

  const toggleAll = () => {
    if (selectedMatches.size === matches.length) {
      setSelectedMatches(new Set());
    } else {
      setSelectedMatches(new Set(matches.map((_, idx) => idx)));
    }
  };

  const stats = {
    total: matches.length,
    create: matches.filter(m => m.action === 'create').length,
    update: matches.filter(m => m.action === 'update').length,
    errors: errors.length,
  };

  if (isMatching) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Matching Tournaments...
          </CardTitle>
          <CardDescription>
            Comparing imported tournaments with existing database records
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Tournament Import Preview</CardTitle>
        <CardDescription>
          Review and confirm tournament imports. Duplicates are automatically detected using fuzzy matching.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Total Tournaments</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.create}</div>
              <p className="text-xs text-muted-foreground">New Tournaments</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{stats.update}</div>
              <p className="text-xs text-muted-foreground">Potential Updates</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
              <p className="text-xs text-muted-foreground">Errors</p>
            </CardContent>
          </Card>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold mb-2">Validation Errors ({errors.length})</div>
              <ScrollArea className="h-32">
                <ul className="space-y-1 text-sm">
                  {errors.map((error, idx) => (
                    <li key={idx}>
                      Row {error.row}: {error.field} - {error.message}
                      {error.value && <span className="text-muted-foreground"> (found: {error.value})</span>}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </AlertDescription>
          </Alert>
        )}

        {/* Import Strategy */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Import Strategy for Matches</Label>
          <RadioGroup value={importStrategy} onValueChange={(v: any) => setImportStrategy(v)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="skip" id="skip" />
              <Label htmlFor="skip" className="font-normal cursor-pointer">
                Skip duplicates - Only import new tournaments
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="update" id="update" />
              <Label htmlFor="update" className="font-normal cursor-pointer">
                Update matches - Update existing tournaments with new data
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="dates_only" id="dates_only" />
              <Label htmlFor="dates_only" className="font-normal cursor-pointer">
                <strong>Update Dates Only</strong> - Update start/end dates on matched tournaments, create new ones, preserve all other data
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="create" id="create" />
              <Label htmlFor="create" className="font-normal cursor-pointer">
                Force create - Create all as new tournaments (may create duplicates)
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Tournament List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">
              Tournaments to Import ({selectedMatches.size} selected)
            </Label>
            <Button variant="outline" size="sm" onClick={toggleAll}>
              {selectedMatches.size === matches.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>

          <ScrollArea className="h-96 border rounded-md">
            <div className="space-y-2 p-4">
              {matches.map((match, idx) => (
                <Card key={idx} className={selectedMatches.has(idx) ? 'border-primary' : ''}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedMatches.has(idx)}
                        onCheckedChange={() => toggleSelection(idx)}
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm">
                              {match.parsed.tournamentData.name}
                            </h4>
                            {match.parsed.inferredData.sex && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Inferred: {match.parsed.inferredData.sex} · {match.parsed.inferredData.tournamentType}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {match.action === 'create' && (
                              <Badge variant="default" className="bg-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                New
                              </Badge>
                            )}
                            {match.action === 'update' && (
                              <Badge variant="default" className="bg-blue-600">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Match {Math.round(match.matchConfidence * 100)}%
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {match.parsed.tournamentData.startDate?.toLocaleDateString() || 'No date'}
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {match.parsed.tournamentData.location || 'No location'}
                          </div>
                        </div>

                        {match.existingTournament && (
                          <Alert className="mt-2">
                            <Info className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                              <div className="font-semibold">Matched with existing:</div>
                              <div>{match.existingTournament.name}</div>
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Import Progress */}
        {isImporting && (
          <div className="space-y-2">
            <Label>Importing tournaments...</Label>
            <Progress value={importProgress} />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isImporting}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={selectedMatches.size === 0 || isImporting}
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              `Import ${selectedMatches.size} Tournaments`
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

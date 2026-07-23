import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, AlertTriangle, Trash2, CheckCircle2, X, ChevronDown, Info } from 'lucide-react';
import { findDuplicateTournaments, mergeTournaments, DuplicateGroup } from '@/lib/api/tournamentDeduplication';

const TournamentDeduplication = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(false);
  const [selectedKeepIds, setSelectedKeepIds] = useState<Record<string, string>>({});
  const [dismissedGroups, setDismissedGroups] = useState<Set<string>>(() => {
    const stored = localStorage.getItem('dismissedTournamentGroups');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  // Persist dismissed groups to localStorage
  useEffect(() => {
    localStorage.setItem('dismissedTournamentGroups', JSON.stringify([...dismissedGroups]));
  }, [dismissedGroups]);

  useEffect(() => {
    loadDuplicates();
  }, []);

  const loadDuplicates = async () => {
    try {
      setLoading(true);
      const groups = await findDuplicateTournaments();
      setDuplicateGroups(groups);

      // Auto-select the tournament with most results for each group
      const autoSelected: Record<string, string> = {};
      groups.forEach(group => {
        autoSelected[group.key] = group.tournaments[0].id;
      });
      setSelectedKeepIds(autoSelected);
    } catch (error) {
      console.error('Error loading duplicates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load duplicate tournaments',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMergeGroup = async (group: DuplicateGroup) => {
    const keepId = selectedKeepIds[group.key];
    if (!keepId) return;

    const removeIds = group.tournaments
      .filter(t => t.id !== keepId)
      .map(t => t.id);

    try {
      setMerging(true);
      await mergeTournaments(keepId, removeIds);
      
      toast({
        title: 'Success',
        description: `Merged ${removeIds.length} duplicate tournament${removeIds.length > 1 ? 's' : ''}`,
      });

      // Reload duplicates
      await loadDuplicates();
    } catch (error) {
      console.error('Error merging tournaments:', error);
      toast({
        title: 'Error',
        description: 'Failed to merge tournaments',
        variant: 'destructive'
      });
    } finally {
      setMerging(false);
    }
  };

  const handleDismissGroup = (groupKey: string) => {
    setDismissedGroups(prev => new Set([...prev, groupKey]));
    toast({
      title: 'Dismissed',
      description: 'These tournaments will be kept as separate entries',
    });
  };

  const handleMergeAll = async () => {
    try {
      setMerging(true);
      
      for (const group of visibleGroups) {
        const keepId = selectedKeepIds[group.key];
        if (!keepId) continue;

        const removeIds = group.tournaments
          .filter(t => t.id !== keepId)
          .map(t => t.id);

        await mergeTournaments(keepId, removeIds);
      }

      toast({
        title: 'Success',
        description: `Merged all ${visibleGroups.length} duplicate groups`,
      });

      await loadDuplicates();
    } catch (error) {
      console.error('Error merging all tournaments:', error);
      toast({
        title: 'Error',
        description: 'Failed to merge all tournaments',
        variant: 'destructive'
      });
    } finally {
      setMerging(false);
    }
  };

  const visibleGroups = duplicateGroups.filter(
    group => !dismissedGroups.has(group.key)
  );

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/tournaments')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tournaments
          </Button>
        </div>
        <div className="text-center py-12">Loading duplicate tournaments...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/tournaments')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tournaments
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Tournament Deduplication</h1>
            <p className="text-muted-foreground mt-1">
              Merge duplicate tournaments based on course characteristics
            </p>
          </div>
        </div>
        {visibleGroups.length > 0 && (
          <Button onClick={handleMergeAll} disabled={merging}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Merge All Groups
          </Button>
        )}
      </div>

      {visibleGroups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Duplicates Found</h3>
            <p className="text-muted-foreground">
              All tournaments are unique based on course characteristics
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
                {visibleGroups.length} Duplicate Group{visibleGroups.length > 1 ? 's' : ''} Found
              </h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                Review each group and select which tournament to keep. Results from duplicates will be merged.
              </p>
            </div>
          </div>

          {visibleGroups.map((group, idx) => (
            <Card key={group.key}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 flex-wrap">
                      <span>Group {idx + 1}</span>
                      <Badge 
                        variant={group.similarityScore >= 90 ? "destructive" : group.similarityScore >= 70 ? "default" : "secondary"}
                      >
                        {group.similarityScore}% match
                      </Badge>
                      <Badge variant="outline">
                        {group.tournaments.length} Tournaments
                      </Badge>
                    </CardTitle>
                    <CardDescription className="mt-2">
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        <span><strong>Year:</strong> {group.year}</span>
                        <span><strong>Gender:</strong> {group.sex}</span>
                        <span><strong>Country:</strong> {group.country}</span>
                      </div>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDismissGroup(group.key)}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Keep Separate
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleMergeGroup(group)}
                      disabled={merging}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Merge Group
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={selectedKeepIds[group.key]}
                  onValueChange={(value) => 
                    setSelectedKeepIds(prev => ({ ...prev, [group.key]: value }))
                  }
                >
                  <div className="space-y-3">
                    {group.tournaments.map((tournament, tidx) => (
                      <Collapsible key={tournament.id}>
                        <div
                          className={`p-3 rounded-lg border ${
                            selectedKeepIds[group.key] === tournament.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <RadioGroupItem value={tournament.id} id={tournament.id} className="mt-1" />
                            <div className="flex-1 min-w-0">
                              <Label htmlFor={tournament.id} className="cursor-pointer">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold break-words">{tournament.name}</div>
                                    <div className="text-sm text-muted-foreground mt-1">
                                      <span className="font-medium">{tournament.resultsCount} result{tournament.resultsCount !== 1 ? 's' : ''}</span>
                                      {tournament.location && <> • {tournament.location}</>}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {tidx === 0 && (
                                      <Badge variant="outline" className="bg-green-50 dark:bg-green-950 whitespace-nowrap">
                                        Recommended
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </Label>
                              
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs">
                                  <Info className="h-3 w-3 mr-1" />
                                  Show Details
                                  <ChevronDown className="h-3 w-3 ml-1" />
                                </Button>
                              </CollapsibleTrigger>
                              
                              <CollapsibleContent className="mt-3">
                                <div className="p-3 bg-muted/50 rounded-md text-sm space-y-1.5">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div><span className="font-medium">Series Name:</span> {tournament.seriesName}</div>
                                    {tournament.seriesType && (
                                      <div><span className="font-medium">Series Type:</span> {tournament.seriesType}</div>
                                    )}
                                    {tournament.courseRating && (
                                      <div><span className="font-medium">Rating:</span> {tournament.courseRating}</div>
                                    )}
                                    {tournament.courseSlope && (
                                      <div><span className="font-medium">Slope:</span> {tournament.courseSlope}</div>
                                    )}
                                    {tournament.coursePar && (
                                      <div><span className="font-medium">Par:</span> {tournament.coursePar}</div>
                                    )}
                                    {tournament.startDate && (
                                      <div className="col-span-2">
                                        <span className="font-medium">Dates:</span> {tournament.startDate}
                                        {tournament.endDate && ` to ${tournament.endDate}`}
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground pt-1 border-t border-border/50">
                                    Imported: {new Date(tournament.createdAt).toLocaleDateString()}
                                  </div>
                                </div>
                              </CollapsibleContent>
                            </div>
                          </div>
                        </div>
                      </Collapsible>
                    ))}
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TournamentDeduplication;

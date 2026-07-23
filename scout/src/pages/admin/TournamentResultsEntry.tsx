import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Trophy,
  Upload,
  Save,
  Send,
  Download,
  CheckCircle,
  AlertCircle,
  Users,
  TrendingUp,
  Award,
  FileSpreadsheet,
  Edit,
  Filter,
  ChevronLeft,
  Plus,
  Settings,
  BarChart,
  Target,
  Flag,
  X,
  ChevronDown,
  ChevronUp,
  Star,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { listAthletes } from '@/lib/api/athletes';
import { getTournamentById } from '@/lib/api/tournaments';
import { createTournamentResult } from '@/lib/api/tournamentResults';
import { parseRoundsToNumbers } from '@/lib/roundsParser';

interface TournamentResult {
  athleteId: string;
  athleteName: string;
  position: number;
  totalScore: number;
  scoreToPar: number;
  rounds: number[];
  status: 'completed' | 'in_progress' | 'withdrawn' | 'disqualified';
  achievements: string[];
  notes: string;
}

export default function TournamentResultsEntry() {
  const navigate = useNavigate();
  const { tournamentId } = useParams();
  
  const [tournament, setTournament] = useState<any>(null);
  const [allAthletes, setAllAthletes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [entryMode, setEntryMode] = useState<'individual' | 'bulk'>('individual');
  const [selectedAthlete, setSelectedAthlete] = useState('');
  const [athleteSearchOpen, setAthleteSearchOpen] = useState(false);
  
  const [position, setPosition] = useState('');
  const [totalScore, setTotalScore] = useState('');
  const [rounds, setRounds] = useState<string[]>(['', '', '', '']);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [performanceNotes, setPerformanceNotes] = useState('');
  const [results, setResults] = useState<TournamentResult[]>([]);
  const [editingResult, setEditingResult] = useState<string | null>(null);
  const [showRoundDetails, setShowRoundDetails] = useState<string | null>(null);
  const [selectedResults, setSelectedResults] = useState<string[]>([]);

  
  useEffect(() => {
    fetchTournamentData();
  }, [tournamentId]);
  
  const fetchTournamentData = async () => {
    setLoading(true);
    try {
      let tournamentData = null;
      
      // Fetch tournament
      if (tournamentId) {
        tournamentData = await getTournamentById(tournamentId);
      }
      
      // If no tournament found, get first from database
      if (!tournamentData) {
        const { data: tournaments } = await supabase
          .from('tournaments')
          .select('*')
          .limit(1);
        
        if (tournaments && tournaments.length > 0) {
          tournamentData = await getTournamentById(tournaments[0].id);
        }
      }
      
      if (!tournamentData) {
        throw new Error('No tournament found');
      }
      
      setTournament({
        ...tournamentData,
        par: tournamentData.par || 72,
        courseRating: tournamentData.courseRating || 72,
        slopeRating: tournamentData.slopeRating || 113,
      });
      
      // Fetch all athletes (exclude committed and archived)
      const athletesData = await listAthletes();
      const activeAthletes = athletesData.filter(a => 
        a.status !== 'committed' && a.status !== 'archived'
      );
      setAllAthletes(activeAthletes.map(a => ({
        ...a,
        first_name: a.firstName,
        last_name: a.lastName
      })));
      
      // Fetch existing results for this tournament
      if (tournamentData.id) {
        const { data: resultsData } = await supabase
          .from('tournament_results')
          .select('*')
          .eq('tournament_id', tournamentData.id);
        
        if (resultsData && resultsData.length > 0) {
          const mappedResults = resultsData.map(r => {
            const athlete = athletesData.find(a => a.id === r.athlete_id);
            return {
              athleteId: r.athlete_id,
              athleteName: athlete ? `${athlete.firstName} ${athlete.lastName}` : 'Unknown',
              position: r.position || 0,
              totalScore: r.total_score || 0,
              scoreToPar: calculateScoreToPar(r.total_score || 0),
              rounds: parseRoundsToNumbers(r.rounds),
              status: 'completed' as const,
              achievements: [],
              notes: r.notes || '',
            };
          });
          setResults(mappedResults);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load tournament data",
        variant: "destructive",
      });
      setAllAthletes([]);
    } finally {
      setLoading(false);
    }
  };

  const completionPercentage = (results.length / 156) * 100;

  const calculateScoreToPar = (score: number) => {
    return score - (tournament.par * 4);
  };

  const handleSaveResult = async () => {
    const parsedScore = parseInt(totalScore);
    const hasScores = totalScore && !isNaN(parsedScore) && parsedScore > 0;
    const hasNotes = performanceNotes.trim().length > 0;
    
    if (!selectedAthlete || !position) {
      toast({
        title: 'Validation Error',
        description: 'Please select an athlete and enter a position.',
        variant: 'destructive',
      });
      return;
    }
    
    // No-score entries are valid (team/match-play events) — no need to require scores or notes

    try {
      // Save to database
      await createTournamentResult({
        tournamentId: tournament.id,
        athleteId: selectedAthlete,
        position: parseInt(position),
        positionText: position,
        totalScore: hasScores ? parsedScore : null,
        rounds: rounds.filter(r => r).join(','),
        notes: performanceNotes || undefined,
      });
      
      const athlete = allAthletes.find(a => a.id === selectedAthlete);
      const newResult: TournamentResult = {
        athleteId: selectedAthlete,
        athleteName: athlete ? `${(athlete as any).first_name} ${(athlete as any).last_name}` : '',
        position: parseInt(position),
        totalScore: parseInt(totalScore),
        scoreToPar: calculateScoreToPar(parseInt(totalScore)),
        rounds: rounds.map(r => parseInt(r) || 0),
        status: 'completed',
        achievements: achievements,
        notes: performanceNotes,
      };

      setResults([...results, newResult]);
    
    // Reset form
    setSelectedAthlete('');
    setPosition('');
    setTotalScore('');
    setRounds(['', '', '', '']);
    setAchievements([]);
    setPerformanceNotes('');

      toast({
        title: 'Result Saved',
        description: 'Athlete result has been added successfully',
      });
    } catch (error) {
      console.error('Error saving result:', error);
      toast({
        title: 'Error',
        description: 'Failed to save result',
        variant: 'destructive',
      });
    }
  };

  const handlePublishTournament = () => {
    toast({
      title: 'Tournament Published',
      description: 'Results are now publicly visible',
    });
  };

  const toggleResultSelection = (athleteId: string) => {
    setSelectedResults(prev =>
      prev.includes(athleteId)
        ? prev.filter(id => id !== athleteId)
        : [...prev, athleteId]
    );
  };

  const fieldAverage = results.reduce((acc, r) => acc + r.totalScore, 0) / results.length || 0;
  const bestRound = Math.min(...results.flatMap(r => r.rounds).filter(Boolean));
  const worstRound = Math.max(...results.flatMap(r => r.rounds).filter(Boolean));

  if (loading || !tournament) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading tournament...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Tournament Context Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/admin/tournaments')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{tournament.name}</h1>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Trophy className="h-4 w-4" />
                    {tournament.location}
                  </span>
                  <span>•</span>
                  <span>March 15-18, 2024</span>
                  <span>•</span>
                  <span>Par {tournament.par} • Rating {tournament.courseRating} • Slope {tournament.slopeRating}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Completion</p>
                <div className="flex items-center gap-2">
                  <Progress value={completionPercentage} className="w-24" />
                  <span className="text-sm font-medium">{Math.round(completionPercentage)}%</span>
                </div>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Users className="h-3 w-3" />
                {results.length}/156 Entries
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Results Entry Section */}
          <div className="col-span-8">
            <Tabs value={entryMode} onValueChange={(v) => setEntryMode(v as 'individual' | 'bulk')}>
              <TabsList className="mb-4">
                <TabsTrigger value="individual" className="gap-2">
                  <Edit className="h-4 w-4" />
                  Individual Entry
                </TabsTrigger>
                <TabsTrigger value="bulk" className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Bulk Import
                </TabsTrigger>
              </TabsList>

              {/* Individual Entry Mode */}
              <TabsContent value="individual">
                <Card>
                  <CardHeader>
                    <CardTitle>Enter Athlete Result</CardTitle>
                    <CardDescription>Add individual athlete results for this tournament</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Athlete Selection */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Athlete *</Label>
                        <Popover open={athleteSearchOpen} onOpenChange={setAthleteSearchOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                              {selectedAthlete 
                                ? (() => {
                                    const athlete = allAthletes.find(a => a.id === selectedAthlete);
                                    if (!athlete) return "Select athlete...";
                                    const firstName = (athlete as any).first_name || (athlete as any).firstName;
                                    const lastName = (athlete as any).last_name || (athlete as any).lastName;
                                    return `${firstName} ${lastName}`;
                                  })()
                                : "Search athlete..."}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0" align="start">
                            <Command filter={(value, search) => {
                              if (value.toLowerCase().includes(search.toLowerCase())) return 1;
                              return 0;
                            }}>
                              <CommandInput placeholder="Type to search athletes..." />
                              <CommandList className="max-h-[300px]">
                                <CommandEmpty>No athlete found.</CommandEmpty>
                                <CommandGroup>
                                  {allAthletes.map((athlete) => {
                                    const firstName = (athlete as any).first_name || (athlete as any).firstName || 'U';
                                    const lastName = (athlete as any).last_name || (athlete as any).lastName || 'A';
                                    return (
                                      <CommandItem
                                        key={athlete.id}
                                        value={`${firstName} ${lastName}`}
                                        onSelect={() => {
                                          setSelectedAthlete(athlete.id);
                                          setAthleteSearchOpen(false);
                                        }}
                                        className="flex items-center gap-2"
                                      >
                                        <Avatar className="h-6 w-6">
                                          <AvatarFallback className="text-xs">
                                            {firstName[0]}{lastName[0]}
                                          </AvatarFallback>
                                        </Avatar>
                                        {firstName} {lastName}
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Final Position *</Label>
                          <Input
                            type="number"
                            placeholder="1"
                            value={position}
                            onChange={(e) => setPosition(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Total Score *</Label>
                          <Input
                            type="number"
                            placeholder="280"
                            value={totalScore}
                            onChange={(e) => setTotalScore(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Score to Par (Auto-calculated) */}
                    {totalScore && (
                      <div className="p-3 bg-accent/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Score to Par:</span>
                          <span className={`text-lg font-bold ${
                            calculateScoreToPar(parseInt(totalScore)) < 0 ? 'text-green-600' : 
                            calculateScoreToPar(parseInt(totalScore)) > 0 ? 'text-red-600' : 
                            'text-foreground'
                          }`}>
                            {calculateScoreToPar(parseInt(totalScore)) > 0 ? '+' : ''}
                            {calculateScoreToPar(parseInt(totalScore))}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Round-by-round scores */}
                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary">
                        <ChevronDown className="h-4 w-4" />
                        Round-by-Round Scores
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-3">
                        <div className="grid grid-cols-4 gap-3">
                          {[1, 2, 3, 4].map((round) => (
                            <div key={round}>
                              <Label className="text-xs">Round {round}</Label>
                              <Input
                                type="number"
                                placeholder="72"
                                value={rounds[round - 1]}
                                onChange={(e) => {
                                  const newRounds = [...rounds];
                                  newRounds[round - 1] = e.target.value;
                                  setRounds(newRounds);
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Notable Achievements */}
                    <div>
                      <Label>Notable Achievements</Label>
                      <div className="grid grid-cols-3 gap-3 mt-2">
                        {['Hole-in-one', 'Eagle', 'Albatross', 'Lowest Round', 'Course Record', 'Most Birdies'].map((achievement) => (
                          <div key={achievement} className="flex items-center space-x-2">
                            <Checkbox
                              id={achievement}
                              checked={achievements.includes(achievement)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setAchievements([...achievements, achievement]);
                                } else {
                                  setAchievements(achievements.filter(a => a !== achievement));
                                }
                              }}
                            />
                            <label
                              htmlFor={achievement}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {achievement}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Performance Notes */}
                    <div>
                      <Label>Performance Notes</Label>
                      <Textarea
                        placeholder="Add highlights or notable moments..."
                        value={performanceNotes}
                        onChange={(e) => setPerformanceNotes(e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    {/* Action Button */}
                    <Button onClick={handleSaveResult} className="w-full">
                      <Save className="h-4 w-4 mr-2" />
                      Save & Add Another
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Bulk Entry Mode */}
              <TabsContent value="bulk">
                <Card>
                  <CardHeader>
                    <CardTitle>Bulk Import Results</CardTitle>
                    <CardDescription>Upload a CSV file with tournament results</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="border-2 border-dashed rounded-lg p-8 text-center">
                      <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">Drop CSV file here</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        or click to browse your files
                      </p>
                      <input type="file" className="hidden" id="csv-upload" accept=".csv" />
                      <label htmlFor="csv-upload">
                        <Button variant="secondary" className="cursor-pointer">
                          Select File
                        </Button>
                      </label>
                    </div>

                    <Button variant="outline" className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Download CSV Template
                    </Button>

                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>CSV Format Requirements</AlertTitle>
                      <AlertDescription>
                        The CSV file should include columns for: Athlete Name, Position, Total Score, R1, R2, R3, R4, Status
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Current Tournament Leaderboard */}
            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Tournament Leaderboard</CardTitle>
                    <CardDescription>Current results and standings</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                    <Select defaultValue="position">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="position">By Position</SelectItem>
                        <SelectItem value="name">By Name</SelectItem>
                        <SelectItem value="score">By Score</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedResults.length === results.length}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedResults(results.map(r => r.athleteId));
                            } else {
                              setSelectedResults([]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead className="w-16">Pos</TableHead>
                      <TableHead>Athlete</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-center">To Par</TableHead>
                      <TableHead className="text-center">R1</TableHead>
                      <TableHead className="text-center">R2</TableHead>
                      <TableHead className="text-center">R3</TableHead>
                      <TableHead className="text-center">R4</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result) => (
                      <TableRow key={result.athleteId}>
                        <TableCell>
                          <Checkbox
                            checked={selectedResults.includes(result.athleteId)}
                            onCheckedChange={() => toggleResultSelection(result.athleteId)}
                          />
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-lg">{result.position}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {result.athleteName.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{result.athleteName}</p>
                              {result.achievements.length > 0 && (
                                <div className="flex gap-1 mt-1">
                                  {result.achievements.includes('Hole-in-one') && (
                                    <Badge variant="secondary" className="text-xs py-0">
                                      <Star className="h-3 w-3 mr-1" />
                                      Ace
                                    </Badge>
                                  )}
                                  {result.achievements.includes('Eagle') && (
                                    <Badge variant="secondary" className="text-xs py-0">
                                      <Award className="h-3 w-3 mr-1" />
                                      Eagle
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {editingResult === result.athleteId ? (
                            <Input
                              type="number"
                              className="w-16 h-8"
                              defaultValue={result.totalScore}
                            />
                          ) : (
                            result.totalScore
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-medium ${
                            result.scoreToPar < 0 ? 'text-green-600' : 
                            result.scoreToPar > 0 ? 'text-red-600' : 
                            'text-foreground'
                          }`}>
                            {result.scoreToPar > 0 ? '+' : ''}{result.scoreToPar}
                          </span>
                        </TableCell>
                        {result.rounds.map((round, idx) => (
                          <TableCell key={idx} className="text-center">
                            {editingResult === result.athleteId ? (
                              <Input
                                type="number"
                                className="w-14 h-8"
                                defaultValue={round}
                              />
                            ) : (
                              <span className={round < tournament.par ? 'text-green-600' : round > tournament.par ? 'text-red-600' : ''}>
                                {round}
                              </span>
                            )}
                          </TableCell>
                        ))}
                        <TableCell className="text-center">
                          <Badge 
                            variant={result.status === 'completed' ? 'default' : 
                                   result.status === 'withdrawn' ? 'secondary' : 
                                   'destructive'}
                            className="text-xs"
                          >
                            {result.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingResult(editingResult === result.athleteId ? null : result.athleteId)}
                          >
                            {editingResult === result.athleteId ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Edit className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {selectedResults.length > 0 && (
                  <div className="mt-4 p-4 bg-accent/50 rounded-lg flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {selectedResults.length} results selected
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-2" />
                        Bulk Edit
                      </Button>
                      <Button variant="outline" size="sm">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Update Rankings
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="col-span-4 space-y-6">
            {/* Tournament Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="h-5 w-5" />
                  Tournament Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Field Average</p>
                    <p className="text-2xl font-bold">{fieldAverage.toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">To Par Avg</p>
                    <p className="text-2xl font-bold text-green-600">
                      {(fieldAverage - (tournament.par * 4)).toFixed(1)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Best Round</p>
                    <p className="text-2xl font-bold text-green-600">{bestRound}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Worst Round</p>
                    <p className="text-2xl font-bold text-red-600">{worstRound}</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Eagles</span>
                    <Badge variant="secondary">12</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Birdies</span>
                    <Badge variant="secondary">247</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Pars</span>
                    <Badge variant="secondary">1,842</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Bogeys</span>
                    <Badge variant="secondary">456</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Double Bogeys+</span>
                    <Badge variant="secondary">89</Badge>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-medium mb-2">Statistical Leaders</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Lowest Round</span>
                      <span className="font-medium">Emma Wilson (68)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Most Eagles</span>
                      <span className="font-medium">Marcus Johnson (3)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Most Birdies</span>
                      <span className="font-medium">Sarah Chen (18)</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results Validation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Validation Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-900">Score Validation</AlertTitle>
                  <AlertDescription className="text-green-700">
                    All scores within realistic range
                  </AlertDescription>
                </Alert>

                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertTitle className="text-yellow-900">Position Conflicts</AlertTitle>
                  <AlertDescription className="text-yellow-700">
                    2 ties need resolution (T4, T8)
                  </AlertDescription>
                </Alert>

                <Alert className="border-blue-200 bg-blue-50">
                  <Flag className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-900">Cut Line</AlertTitle>
                  <AlertDescription className="text-blue-700">
                    Cut applied at +2 (70 players)
                  </AlertDescription>
                </Alert>

                <Button variant="outline" className="w-full" size="sm">
                  Run Full Validation
                </Button>
              </CardContent>
            </Card>

            {/* Integration Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Performance Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Trophy className="h-4 w-4 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Career Best</p>
                      <p className="text-xs text-muted-foreground">Emma Wilson - First professional win</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Significant Improvement</p>
                      <p className="text-xs text-muted-foreground">Marcus Johnson - 15 spot jump</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Star className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Special Achievement</p>
                      <p className="text-xs text-muted-foreground">Sarah Chen - Hole-in-one on 12th</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4" />
                  3 coach notifications pending
                </div>
              </CardContent>
            </Card>

            {/* Form Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full" size="sm">
                  <Save className="h-4 w-4 mr-2" />
                  Save All Results
                </Button>
                
                <Button 
                  variant="default" 
                  className="w-full" 
                  size="sm"
                  onClick={handlePublishTournament}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Publish Tournament
                </Button>

                <Button variant="outline" className="w-full" size="sm">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>

                <Button variant="outline" className="w-full" size="sm">
                  <Send className="h-4 w-4 mr-2" />
                  Send Notifications
                </Button>

                <Select defaultValue="excel">
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excel">Export as Excel</SelectItem>
                    <SelectItem value="csv">Export as CSV</SelectItem>
                    <SelectItem value="pdf">Export as PDF</SelectItem>
                    <SelectItem value="json">Export as JSON</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { parseCSV, generateCSVTemplate, type ValidationError, type ParsedAthleteData } from '@/lib/csvParser';
import { AthleteImportPreview, type AthleteMatch } from '@/components/admin/AthleteImportPreview';
import { exportAthletes, exportTournaments, exportTournamentResults, exportUserGDPRData } from '@/lib/csvExporter';
import { parseFFGolfTournamentCSV, parseExportedTournamentCSV, type ParsedTournamentCSV, type TournamentValidationError } from '@/lib/csvTournamentParser';
import { TournamentImportPreview, type TournamentMatch } from '@/components/admin/TournamentImportPreview';
import { createTournament, updateTournament } from '@/lib/api/tournaments';
import { 
  Upload,
  Download,
  FileUp,
  FileDown,
  FileSpreadsheet,
  FileJson,
  FileText,
  FilePlus,
  Database,
  CloudUpload,
  CloudDownload,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  Calendar as CalendarIcon,
  Clock,
  Archive,
  Shield,
  Lock,
  Unlock,
  Users,
  Trophy,
  UserCheck,
  History,
  Settings,
  Filter,
  ArrowRight,
  ArrowLeft,
  Save,
  Trash2,
  Eye,
  EyeOff,
  Zap,
  Link,
  Unlink,
  AlertTriangle,
  HardDrive,
  Package,
  Send,
  Mail,
  FolderOpen,
  RotateCcw,
  ChevronRight,
  Loader2,
  PlayCircle,
  PauseCircle,
  StopCircle,
  CheckSquare,
  Square,
  Columns,
  Table,
  Hash,
  Type,
  Calendar as CalendarDays,
  BarChart3,
  PieChart,
  LineChart,
  FileWarning,
  ShieldCheck,
  Key,
  Fingerprint,
  FileKey,
  Server,
  Plus,
  ClipboardCheck
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const DataImportExport = () => {
  const { toast } = useToast();
  const [selectedImportTab, setSelectedImportTab] = useState('athletes');
  const [selectedExportTab, setSelectedExportTab] = useState('quick');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dateRange, setDateRange] = useState({ from: new Date(), to: new Date() });
  const [selectedExportFormat, setSelectedExportFormat] = useState('csv');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationError[]>([]);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [athleteMatches, setAthleteMatches] = useState<AthleteMatch[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update' | 'updateAll'>('skip');
  const [exportType, setExportType] = useState<'athletes' | 'tournaments' | 'tournament_results'>('athletes');
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingGDPR, setIsGeneratingGDPR] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [users, setUsers] = useState<Array<{ id: string; email: string; full_name: string }>>([]);
  
  // Tournament import state
  const [parsedTournaments, setParsedTournaments] = useState<ParsedTournamentCSV[]>([]);
  const [tournamentErrors, setTournamentErrors] = useState<TournamentValidationError[]>([]);
  const [showTournamentPreview, setShowTournamentPreview] = useState(false);
  const [tournamentImportFormat, setTournamentImportFormat] = useState<'ffgolf' | 'exported'>('ffgolf');

  // Load users for GDPR export
  useEffect(() => {
    const loadUsers = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name')
        .order('full_name');
      
      if (data && !error) {
        setUsers(data);
      }
    };
    
    loadUsers();
  }, []);

  // Available columns for export
  const availableColumns = {
    athletes: ['Name', 'Email', 'Phone', 'Handicap', 'University', 'Birth Date', 'Star Rating', 'Recent Tournaments', 'Average Score'],
    coaches: ['Name', 'Email', 'University', 'Division', 'Sport', 'Join Date', 'Activity Level', 'Contact Count'],
    tournaments: ['Tournament Name', 'Date', 'Location', 'Participants', 'Winner', 'Average Score', 'Course Rating']
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const parseAndMatchAthletes = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setImportSuccess(false);
    setValidationResults([]);
    setShowPreview(false);

    try {
      const fileText = await selectedFile.text();
      const { data, errors } = parseCSV(fileText);

      setUploadProgress(20);
      setValidationResults(errors);

      if (errors.length > 0) {
        setIsUploading(false);
        toast({
          title: "Validation Errors",
          description: `Found ${errors.length} errors in the file. Please review and fix them.`,
          variant: "destructive",
        });
        return;
      }

      // Fetch existing athletes for matching
      setUploadProgress(40);
      const { data: existingAthletes, error: fetchError } = await supabase
        .from('athletes')
        .select('id, first_name, last_name, date_of_birth, graduation_year, source_sync_id');

      if (fetchError) throw fetchError;

      // Match each parsed athlete
      const matches: AthleteMatch[] = data.map((parsed) => {
        // Try to find duplicate
        let matchStatus: AthleteMatch['matchStatus'] = 'new';
        let existingId: string | undefined;
        let matchReason: string | undefined;

        // 1. Check source_sync_id if provided
        if (parsed.sourceSyncId) {
          const match = existingAthletes?.find(
            (existing) => existing.source_sync_id === parsed.sourceSyncId
          );
          if (match) {
            matchStatus = 'duplicate';
            existingId = match.id;
            matchReason = 'Matched by Source ID';
          }
        }

        // 2. Check first + last + date of birth (case-insensitive, trimmed)
        if (matchStatus === 'new' && parsed.dateOfBirth) {
          const match = existingAthletes?.find(
            (existing) =>
              existing.first_name?.toLowerCase().trim() === parsed.firstName.toLowerCase().trim() &&
              existing.last_name?.toLowerCase().trim() === parsed.lastName.toLowerCase().trim() &&
              existing.date_of_birth === parsed.dateOfBirth
          );
          if (match) {
            matchStatus = 'duplicate';
            existingId = match.id;
            matchReason = 'Matched by Name + DOB';
          }
        }

        // 3. Check first + last + graduation year (case-insensitive, trimmed)
        if (matchStatus === 'new' && parsed.graduationYear) {
          const match = existingAthletes?.find(
            (existing) =>
              existing.first_name?.toLowerCase().trim() === parsed.firstName.toLowerCase().trim() &&
              existing.last_name?.toLowerCase().trim() === parsed.lastName.toLowerCase().trim() &&
              existing.graduation_year?.toString() === parsed.graduationYear
          );
          if (match) {
            matchStatus = 'duplicate';
            existingId = match.id;
            matchReason = 'Matched by Name + Grad Year';
          }
        }

        // 4. Check for possible match (name only, case-insensitive, trimmed)
        if (matchStatus === 'new') {
          const match = existingAthletes?.find(
            (existing) =>
              existing.first_name?.toLowerCase().trim() === parsed.firstName.toLowerCase().trim() &&
              existing.last_name?.toLowerCase().trim() === parsed.lastName.toLowerCase().trim()
          );
          if (match) {
            matchStatus = 'possible';
            existingId = match.id;
            matchReason = 'Similar name found';
          }
        }

        return { parsed, matchStatus, existingId, matchReason };
      });

      setAthleteMatches(matches);
      setShowPreview(true);
      setUploadProgress(100);
      setIsUploading(false);

      toast({
        title: "Preview Ready",
        description: `Found ${matches.filter(m => m.matchStatus === 'new').length} new athletes and ${matches.filter(m => m.matchStatus === 'duplicate').length} duplicates.`,
      });
    } catch (error) {
      console.error('Parse error:', error);
      setIsUploading(false);
      toast({
        title: "Parse Failed",
        description: error instanceof Error ? error.message : "An error occurred parsing the file.",
        variant: "destructive",
      });
    }
  };

  const executeImport = async () => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      let successCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;

      const toProcess = athleteMatches.filter((match) => {
        if (match.matchStatus === 'new') return true;
        if (match.matchStatus === 'duplicate' && (duplicateStrategy === 'update' || duplicateStrategy === 'updateAll')) return true;
        if (match.matchStatus === 'possible' && duplicateStrategy === 'updateAll') return true;
        return false;
      });

      // Helper to normalize status for database
      const normalizeStatusForDB = (csvStatus: string | undefined): string => {
        if (!csvStatus || csvStatus.trim() === '') return 'available';
        const lower = csvStatus.toLowerCase().trim();
        
        // Map CSV values to the 4-state model
        if (lower === 'building' || lower === 'in_creation') return 'in_creation';
        if (lower === 'committed') return 'committed';
        if (lower === 'in college' || lower === 'in_college' || lower === 'archived') return 'in_college';
        // available / uncommitted / new / transfer (removed) → available
        return 'available';
      };

      for (let i = 0; i < toProcess.length; i++) {
        const match = toProcess[i];
        const athlete = match.parsed;

        // Helper to parse numeric values, treating empty/N/A as null
        const parseNumber = (value: string | undefined): number | null => {
          if (!value || value === 'N/A' || value === 'n/a') return null;
          const num = parseFloat(value);
          return isNaN(num) ? null : num;
        };

        const parseInteger = (value: string | undefined): number | null => {
          if (!value || value === 'N/A' || value === 'n/a') return null;
          const num = parseInt(value);
          return isNaN(num) ? null : num;
        };

        const athleteData = {
          first_name: athlete.firstName.trim(),
          last_name: athlete.lastName.trim(),
          date_of_birth: athlete.dateOfBirth || null,
          country: athlete.country || 'France',
          graduation_year: athlete.graduationYear || null,
          sex: athlete.sex || null,
          golf_club_team: athlete.golfClubTeam || null,
          committed: athlete.committed === 'true' || athlete.committed === '1' || athlete.committed?.toLowerCase() === 'yes',
          committed_to: athlete.committedTo || null,
          academic_gpa: parseNumber(athlete.academicGpa),
          sat: athlete.sat || null,
          duolingo: athlete.duolingo || null,
          toefl: athlete.toefl || null,
          intended_majors: athlete.intendedMajors || null,
          scoring_average: athlete.scoringAverage || null,
          scoring_average_vs_par: athlete.scoringAverageVsPar || null,
          scoring_average_vs_course_rating: athlete.scoringAverageVsCourseRating || null,
          french_adult_ranking: athlete.frenchAdultRanking || null,
          french_ranking_in_their_class: athlete.frenchRankingInTheirClass || null,
          wagr_ranking: athlete.wagrRanking || null,
          drive_distance_carry: athlete.driveDistanceCarry || null,
          seven_iron_distance_carry: athlete.sevenIronDistanceCarry || null,
          max_club_head_speed: parseNumber(athlete.maxClubHeadSpeed),
          strengths: athlete.strengths || null,
          areas_of_improvement: athlete.areasOfImprovement || null,
          preferences_budget: athlete.preferencesBudget || null,
          preferences_division: athlete.preferencesDivision || null,
          preferences_region: athlete.preferencesRegion || null,
          importance_large_city: athlete.importanceLargeCity || null,
          video_links: athlete.videoLinks || null,
          profile_photo: athlete.profilePhoto || null,
          instagram_handle: athlete.instagramHandle || null,
          status: normalizeStatusForDB(athlete.status),
          source_sync_id: athlete.sourceSyncId || `${athlete.firstName.trim()}_${athlete.lastName.trim()}_${athlete.graduationYear || 'unknown'}`,
          other_interests: athlete.otherInterests || null,
          why_good_recruit: athlete.whyGoodRecruit || null,
          something_else_coaches_know: athlete.somethingElseCoachesKnow || null,
          star_rating: parseInteger(athlete.starRating),
        };

        if ((match.matchStatus === 'duplicate' || match.matchStatus === 'possible') && match.existingId) {
          // Update existing - fetch current data first for smart merge
          const { data: existingAthlete } = await supabase
            .from('athletes')
            .select('*')
            .eq('id', match.existingId)
            .maybeSingle();

          // Smart merge: Only update fields that have non-null/non-empty values in CSV
          const mergedData: any = {};
          
          Object.keys(athleteData).forEach((key) => {
            const newValue = athleteData[key];
            const existingValue = existingAthlete?.[key];
            
            // Update if new value is not null/undefined/empty, otherwise keep existing
            if (newValue !== null && newValue !== undefined && newValue !== '') {
              mergedData[key] = newValue;
            } else if (existingValue !== null && existingValue !== undefined && existingValue !== '') {
              mergedData[key] = existingValue;
            } else {
              mergedData[key] = null;
            }
          });

          const { error } = await supabase
            .from('athletes')
            .update(mergedData)
            .eq('id', match.existingId);

          if (!error) updatedCount++;
        } else {
          // Insert new
          const { error } = await supabase.from('athletes').insert([athleteData]);
          if (!error) successCount++;
        }

        setUploadProgress((i + 1) / toProcess.length * 100);
      }

      skippedCount = athleteMatches.filter(m => 
        (m.matchStatus === 'duplicate' && duplicateStrategy === 'skip') ||
        (m.matchStatus === 'possible' && duplicateStrategy !== 'updateAll')
      ).length;

      setImportedCount(successCount + updatedCount);
      setImportSuccess(true);
      setUploadProgress(100);
      setIsUploading(false);
      setShowPreview(false);
      setSelectedFile(null);

      toast({
        title: "Import Complete",
        description: `${successCount} new, ${updatedCount} updated, ${skippedCount} skipped.`,
      });
    } catch (error) {
      console.error('Import error:', error);
      setIsUploading(false);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "An error occurred during import.",
        variant: "destructive",
      });
    }
  };

  // Tournament import handlers
  const parseAndMatchTournaments = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setImportSuccess(false);
    setTournamentErrors([]);
    setShowTournamentPreview(false);

    try {
      const fileText = await selectedFile.text();
      
      let result;
      if (tournamentImportFormat === 'ffgolf') {
        result = parseFFGolfTournamentCSV(fileText);
      } else {
        result = parseExportedTournamentCSV(fileText);
      }

      setUploadProgress(50);
      setParsedTournaments(result.tournaments);
      setTournamentErrors(result.errors);

      if (result.errors.length > 0) {
        toast({
          title: "Validation Warnings",
          description: `Found ${result.errors.length} validation issues. Review before importing.`,
          variant: "default",
        });
      }

      setShowTournamentPreview(true);
      setUploadProgress(100);
      setIsUploading(false);

      toast({
        title: "Preview Ready",
        description: `Parsed ${result.tournaments.length} tournaments.`,
      });
    } catch (error) {
      console.error('Parse error:', error);
      setIsUploading(false);
      toast({
        title: "Parse Failed",
        description: error instanceof Error ? error.message : "An error occurred parsing the file.",
        variant: "destructive",
      });
    }
  };

  const executeTournamentImport = async (
    matches: TournamentMatch[],
    strategy: 'skip' | 'update' | 'create' | 'dates_only'
  ) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      let createdCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;

      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        
        // Skip if strategy is skip and there's a match
        if (strategy === 'skip' && match.existingTournament) {
          skippedCount++;
          setUploadProgress((i + 1) / matches.length * 100);
          continue;
        }

        // Update existing tournament
        if (match.existingTournament && (strategy === 'update' || strategy === 'dates_only')) {
          // For dates_only strategy, only pass startDate and endDate
          const updateData = strategy === 'dates_only' 
            ? { 
                startDate: match.parsed.tournamentData.startDate,
                endDate: match.parsed.tournamentData.endDate 
              }
            : match.parsed.tournamentData;
          
          await updateTournament(match.existingTournament.id, updateData);
          updatedCount++;
        } else {
          // Create new tournament
          await createTournament(match.parsed.tournamentData);
          createdCount++;
        }

        setUploadProgress((i + 1) / matches.length * 100);
      }

      toast({
        title: "Tournament Import Complete",
        description: `Created ${createdCount} tournaments, updated ${updatedCount}, and skipped ${skippedCount}.`,
      });

      setImportSuccess(true);
      setImportedCount(createdCount + updatedCount);
      setShowTournamentPreview(false);
      setSelectedFile(null);
      setParsedTournaments([]);
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "An error occurred during import.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate();
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'athlete_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Template Downloaded",
      description: "Use this template to format your athlete data.",
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      let result;
      
      switch (exportType) {
        case 'athletes':
          result = await exportAthletes(selectedColumns.length > 0 ? selectedColumns : undefined);
          break;
        case 'tournaments':
          result = await exportTournaments();
          break;
        case 'tournament_results':
          result = await exportTournamentResults();
          break;
        default:
          toast({
            title: "Error",
            description: "Please select a data type to export.",
            variant: "destructive",
          });
          return;
      }
      
      if (result.success) {
        toast({
          title: "Export Successful",
          description: `Successfully exported ${result.count} records.`,
        });
      } else {
        toast({
          title: "Export Failed",
          description: result.error || "No data available to export.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Error",
        description: "An unexpected error occurred during export.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleGDPRExport = async () => {
    if (!selectedUserId) {
      toast({
        title: "Error",
        description: "Please select a user for GDPR export.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingGDPR(true);
    
    try {
      const result = await exportUserGDPRData(selectedUserId);
      
      if (result.success) {
        toast({
          title: "GDPR Export Successful",
          description: `Successfully exported ${result.count} data categories as ZIP file.`,
        });
      } else {
        toast({
          title: "GDPR Export Failed",
          description: result.error || "Failed to generate GDPR export.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('GDPR export error:', error);
      toast({
        title: "Export Error",
        description: "An unexpected error occurred during GDPR export.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingGDPR(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Success':
        return <Badge className="bg-success/10 text-success border-success/20">Success</Badge>;
      case 'Partial':
        return <Badge className="bg-warning/10 text-warning border-warning/20">Partial</Badge>;
      case 'Failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'Active':
        return <Badge className="bg-success/10 text-success border-success/20">Active</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Data Import/Export</h1>
          <p className="text-muted-foreground mt-1">Manage bulk data operations and system backups</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <History className="mr-2 h-4 w-4" />
            Import History
          </Button>
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>


      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6">
        {/* Import Section */}
        <Card>
          <CardHeader>
            <CardTitle>Data Import</CardTitle>
            <CardDescription>Import data from CSV, Excel, or JSON files</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedImportTab} onValueChange={setSelectedImportTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="athletes">Athletes</TabsTrigger>
                <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
              </TabsList>

              <TabsContent value="athletes" className="space-y-4">
                {/* File Upload Area */}
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <CloudUpload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm font-medium mb-2">
                    Drop your file here, or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Supports CSV, XLSX, and JSON formats (max 10MB)
                  </p>
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".csv,.xlsx,.json"
                    onChange={handleFileChange}
                  />
                  <label htmlFor="file-upload">
                    <Button variant="outline" size="sm" asChild>
                      <span>
                        <Upload className="mr-2 h-4 w-4" />
                        Choose File
                      </span>
                    </Button>
                  </label>
                  <Button variant="ghost" size="sm" className="ml-2" onClick={handleDownloadTemplate}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Template
                  </Button>
                </div>

                {selectedFile && !showPreview && (
                  <>
                    <Alert>
                      <FileSpreadsheet className="h-4 w-4" />
                      <AlertDescription>
                        Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                      </AlertDescription>
                    </Alert>

                    {/* Upload Progress */}
                    {isUploading && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Analyzing file...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <Progress value={uploadProgress} />
                      </div>
                    )}

                    <Button onClick={parseAndMatchAthletes} disabled={isUploading} className="w-full">
                      {isUploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Preview Import
                        </>
                      )}
                    </Button>
                  </>
                )}

                {/* Preview */}
                {showPreview && athleteMatches.length > 0 && (
                  <AthleteImportPreview
                    matches={athleteMatches}
                    duplicateStrategy={duplicateStrategy}
                    onStrategyChange={setDuplicateStrategy}
                    onConfirm={executeImport}
                    onCancel={() => {
                      setShowPreview(false);
                      setSelectedFile(null);
                      setAthleteMatches([]);
                    }}
                    isProcessing={isUploading}
                  />
                )}

                {/* Validation Results */}
                {validationResults.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-semibold mb-2">Found {validationResults.length} validation error{validationResults.length > 1 ? 's' : ''}</div>
                      <ScrollArea className="h-40 mt-2">
                        <div className="space-y-2">
                          {validationResults.map((result, index) => (
                            <div key={index} className="text-sm p-2 bg-background/50 rounded">
                              <div className="font-medium">Row {result.row}: {result.field}</div>
                              <div className="text-muted-foreground">{result.error}</div>
                              {result.suggestion && (
                                <div className="text-xs mt-1 text-muted-foreground italic">
                                  Suggestion: {result.suggestion}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              <TabsContent value="tournaments" className="space-y-4">
                {/* Format Selection */}
                <div className="space-y-3">
                  <Label>Tournament CSV Format</Label>
                  <RadioGroup 
                    value={tournamentImportFormat} 
                    onValueChange={(value) => setTournamentImportFormat(value as 'ffgolf' | 'exported')}
                  >
                    <div className="flex items-start space-x-2">
                      <RadioGroupItem value="ffgolf" id="format-ffgolf" className="mt-1" />
                      <div className="space-y-1">
                        <label htmlFor="format-ffgolf" className="text-sm font-medium cursor-pointer">
                          FFGolf Schedule CSV
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Format from FFGolf with columns: Nom, Nom 2, Date Début, Date Fin, Lieu, Pays, etc.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <RadioGroupItem value="exported" id="format-exported" className="mt-1" />
                      <div className="space-y-1">
                        <label htmlFor="format-exported" className="text-sm font-medium cursor-pointer">
                          Exported Tournament CSV
                        </label>
                        <p className="text-xs text-muted-foreground">
                          CSV exported from this system with all tournament fields
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {/* File Upload Area */}
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <CloudUpload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm font-medium mb-2">
                    Drop your tournament CSV file here, or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Supports CSV format (max 10MB)
                  </p>
                  <input
                    type="file"
                    id="tournament-file-upload"
                    className="hidden"
                    accept=".csv"
                    onChange={handleFileChange}
                  />
                  <label htmlFor="tournament-file-upload">
                    <Button variant="outline" size="sm" asChild>
                      <span>
                        <Upload className="mr-2 h-4 w-4" />
                        Choose File
                      </span>
                    </Button>
                  </label>
                </div>

                {selectedFile && !showTournamentPreview && (
                  <>
                    <Alert>
                      <FileSpreadsheet className="h-4 w-4" />
                      <AlertDescription>
                        Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                      </AlertDescription>
                    </Alert>

                    {/* Upload Progress */}
                    {isUploading && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Analyzing file...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <Progress value={uploadProgress} />
                      </div>
                    )}

                    <Button onClick={parseAndMatchTournaments} disabled={isUploading} className="w-full">
                      {isUploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Trophy className="mr-2 h-4 w-4" />
                          Preview Import
                        </>
                      )}
                    </Button>
                  </>
                )}

                {/* Preview */}
                {showTournamentPreview && parsedTournaments.length > 0 && (
                  <TournamentImportPreview
                    parsedTournaments={parsedTournaments}
                    errors={tournamentErrors}
                    onConfirm={executeTournamentImport}
                    onCancel={() => {
                      setShowTournamentPreview(false);
                      setSelectedFile(null);
                      setParsedTournaments([]);
                      setTournamentErrors([]);
                    }}
                  />
                )}

                {/* Validation Errors */}
                {tournamentErrors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-semibold mb-2">Found {tournamentErrors.length} validation error{tournamentErrors.length > 1 ? 's' : ''}</div>
                      <ScrollArea className="h-40 mt-2">
                        <div className="space-y-2">
                          {tournamentErrors.map((error, index) => (
                            <div key={index} className="text-sm p-2 bg-background/50 rounded">
                              <div className="font-medium">Row {error.row}: {error.field}</div>
                              <div className="text-muted-foreground">{error.message}</div>
                              {error.value && (
                                <div className="text-xs mt-1 text-muted-foreground italic">
                                  Value: {error.value}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

            </Tabs>

          </CardContent>
        </Card>

        {/* Export Section */}
        <Card>
          <CardHeader>
            <CardTitle>Data Export</CardTitle>
            <CardDescription>Export data for analysis, backup, or migration</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedExportTab} onValueChange={setSelectedExportTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="quick">Quick Export</TabsTrigger>
                <TabsTrigger value="custom">Custom Export</TabsTrigger>
                <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
              </TabsList>

              <TabsContent value="quick" className="space-y-4">
                <div className="space-y-3">
                  <Label>Export Type</Label>
                  <RadioGroup value={exportType} onValueChange={(value) => setExportType(value as any)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="athletes" id="export-athletes" />
                      <label htmlFor="export-athletes" className="text-sm">Complete Athlete Database</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="tournaments" id="export-tournaments" />
                      <label htmlFor="export-tournaments" className="text-sm">Tournaments</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="tournament_results" id="export-tournament-results" />
                      <label htmlFor="export-tournament-results" className="text-sm">Tournament Results</label>
                    </div>
                  </RadioGroup>
                </div>

                <Button onClick={handleExport} disabled={isExporting} className="w-full">
                  {isExporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Export to CSV
                    </>
                  )}
                </Button>
              </TabsContent>

              <TabsContent value="custom" className="space-y-4">
                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(dateRange.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(date) => date && setDateRange({ ...dateRange, from: date })}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Select Columns</Label>
                  <ScrollArea className="h-32 border rounded-lg p-3">
                    <div className="space-y-2">
                      {availableColumns.athletes.map(column => (
                        <div key={column} className="flex items-center space-x-2">
                          <Checkbox 
                            id={column}
                            checked={selectedColumns.includes(column)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedColumns([...selectedColumns, column]);
                              } else {
                                setSelectedColumns(selectedColumns.filter(c => c !== column));
                              }
                            }}
                          />
                          <label htmlFor={column} className="text-sm">{column}</label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <Button onClick={handleExport} className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Generate Custom Export
                </Button>
              </TabsContent>

              <TabsContent value="scheduled" className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Scheduled exports can be configured to automatically export data at regular intervals.
                  </AlertDescription>
                </Alert>
                <Button variant="outline" className="w-full mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Scheduled Export
                </Button>
              </TabsContent>
            </Tabs>

          </CardContent>
        </Card>
      </div>

      {/* Compliance & Security Section */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance & Security</CardTitle>
          <CardDescription>GDPR data export for user data portability</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertDescription>
              All exports comply with GDPR Article 20 - Right to Data Portability
            </AlertDescription>
          </Alert>
          
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="gdpr-user">Select User for GDPR Export</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger id="gdpr-user">
                  <SelectValue placeholder="Select a user..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleGDPRExport}
              disabled={!selectedUserId || isGeneratingGDPR}
              className="w-full"
            >
              {isGeneratingGDPR ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating GDPR Export...
                </>
              ) : (
                <>
                  <FileKey className="mr-2 h-4 w-4" />
                  Generate GDPR Export
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground">
              Exports include: user profile, saved searches, favorites, contact requests, notifications, and athlete notes
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataImportExport;
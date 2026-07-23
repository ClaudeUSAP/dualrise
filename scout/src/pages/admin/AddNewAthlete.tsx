import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ATHLETE_STATUSES, statusLabel } from '@/lib/athleteStatus';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { WEATHER_ZONE_LABELS } from '@/lib/divisionNormalizer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CommittedUniversitySelect } from '@/components/CommittedUniversitySelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ImageUpload } from '@/components/ImageUpload';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import TournamentCombobox from '@/components/admin/TournamentCombobox';
import QuickTournamentDialog from '@/components/admin/QuickTournamentDialog';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Save,
  User,
  GraduationCap,
  Trophy,
  DollarSign,
  MapPin,
  Star,
  Upload as UploadIcon,
  Link,
  FileText,
  Target,
  Award,
  Globe,
  Plus,
  X,
  Info,
  Trash2,
  Loader2
} from 'lucide-react';
import { TournamentResultsImportModal } from '@/components/admin/TournamentResultsImportModal';
import { athleteFormStorage } from '@/lib/validation/athleteFormStorage';

// Form schema
const athleteSchema = z.object({
  // Personal Information
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  sex: z.enum(['Men', 'Women']),
  dateOfBirth: z.string().optional(),
  profileImage: z.string().url().optional().or(z.literal('')),
  coverImage: z.string().url().optional().or(z.literal('')),
  
  // Academic Data
  gpa: z.number().min(0).max(4).optional(),
  intendedMajors: z.string().optional(),
  graduationYear: z.array(z.number()).min(1, 'At least one graduation year is required').default([]),
  duolingoScore: z.number().optional(),
  satScore: z.number().optional(),
  currentSchool: z.string().optional(),
  
  // Golf Performance Data
  scoringAverage: z.number().optional(),
  scoringAverageVsCourseRating: z.number().optional(),
  wagrRanking: z.number().optional(),
  nationalAdultRanking: z.number().optional(),
  nationalRankingInClass: z.number().optional(),
  drivingAverageCarryDistance: z.number().optional(),
  maxDriverClubHeadSpeed: z.number().optional(),
  preferredDivision: z.array(z.enum(['NCAA D1', 'NCAA D2', 'NCAA D3', 'NAIA', 'NJCAA 1', 'NJCAA 2'])).default([]),
  starRating: z.number().min(0).max(7).optional(),

  // Dual Rise — tennis
  utr: z.number().optional(),
  wtn: z.number().optional(),
  nationalRanking: z.number().optional(),
  nationalRankingCountry: z.string().optional(),
  itfJuniorRanking: z.number().optional(),
  utrProfileLink: z.string().url().optional().or(z.literal('')),
  wtnProfileLink: z.string().url().optional().or(z.literal('')),
  dominantHand: z.string().optional(),
  backhandType: z.string().optional(),
  preferredSurface: z.string().optional(),
  playStyle: z.string().optional(),
  heightCm: z.number().optional(),
  weightKg: z.number().optional(),
  city: z.string().optional(),
  clubTeam: z.string().optional(),
  physFlexibility: z.number().min(0).max(10).optional(),
  physStrength: z.number().min(0).max(10).optional(),
  physEndurance: z.number().min(0).max(10).optional(),
  techServe: z.number().min(0).max(10).optional(),
  techForehand: z.number().min(0).max(10).optional(),
  techBackhand: z.number().min(0).max(10).optional(),
  techVolley: z.number().min(0).max(10).optional(),
  techSmash: z.number().min(0).max(10).optional(),
  techBaseline: z.number().min(0).max(10).optional(),
  techNet: z.number().min(0).max(10).optional(),
  tacDecisionMaking: z.number().min(0).max(10).optional(),
  tacAdaptability: z.number().min(0).max(10).optional(),
  tacMentalResilience: z.number().min(0).max(10).optional(),
  tacAnticipation: z.number().min(0).max(10).optional(),
  weaknesses: z.string().optional(),
  objectives: z.string().optional(),
  bestResults: z.string().optional(),
  recentResults: z.string().optional(),
  highSchool: z.string().optional(),
  eligibilityYears: z.string().optional(),

  // External Links
  videoLink: z.string().url().optional().or(z.literal('')),
  tournamentResultsLink: z.string().url().optional().or(z.literal('')),
  trackmanReportLink: z.string().url().optional().or(z.literal('')),
  golfDataLink: z.string().url().optional().or(z.literal('')),
  
  // Other Information
  strengths: z.string().optional(),
  areasOfImprovement: z.string().optional(),
  weatherZone: z.array(z.enum(['Hot', 'Warm', 'Temperate', 'Cold', 'Very Cold'])).default([]),
  budget: z.number().min(0).optional(),
  recruitmentPitch: z.string().optional(),
  
  // Location Info
  hometown: z.string().optional(),
  preferredStates: z.array(z.string()).optional(),
  
  // Status
  status: z.enum(['in_creation', 'available', 'committed', 'in_college']).default('available'),
  featured: z.boolean().default(false),
  studentType: z.enum(['first_year', 'transfer']).default('first_year').optional(),
  
  // Transfer-specific fields (conditional)
  transferIndividualRanking: z.string().optional(),
  transferFromSchool: z.string().optional(),
  transferFromDivision: z.enum(['NCAA D1', 'NCAA D2', 'NCAA D3', 'NAIA', 'NJCAA 1', 'NJCAA 2']).optional(),
});

type AthleteFormValues = z.infer<typeof athleteSchema>;

interface TournamentResultEntry {
  id: string;
  tournamentId: string;
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
  yardage: string;
  par: string;
  slope: string;
  courseRating: string;
  resultsLink: string;
  isNewTournament?: boolean;
  newTournamentName?: string;
}

const AddNewAthlete = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [preferredStates, setPreferredStates] = useState<string[]>([]);
  const [currentState, setCurrentState] = useState('');
  const [studentType, setStudentType] = useState<'firstYear' | 'transfer'>('firstYear');
  const [isSaving, setIsSaving] = useState(false);
  const [saveAndAddAnother, setSaveAndAddAnother] = useState(false);
  const [tournamentResults, setTournamentResults] = useState<TournamentResultEntry[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [preferredDivisions, setPreferredDivisions] = useState<string[]>([]);
  const [weatherZones, setWeatherZones] = useState<string[]>([]);
  const [graduationYears, setGraduationYears] = useState<number[]>([]);
  // Committed university (FK + display cache) for placed athletes.
  const [committedUniversityId, setCommittedUniversityId] = useState<string | null>(null);
  const [committedToName, setCommittedToName] = useState<string | null>(null);
  const [committedDivision, setCommittedDivision] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // QuickTournamentDialog state. Opened when the user clicks "Create new tournament: X" in the
  // combobox. The row's previous `tournamentId` is captured at open time so cancelling the
  // dialog leaves the row state exactly as it was — we never write a `new:<name>` literal into
  // row state. On confirm, we patch the row's `tournamentId` to the newly-created UUID.
  const [quickDialog, setQuickDialog] = useState<{
    open: boolean;
    rowId: string;
    prefilledName: string;
    previousTournamentId: string;
  } | null>(null);

  const form = useForm<AthleteFormValues>({
    resolver: zodResolver(athleteSchema),
    mode: "onTouched", // Validate after first blur, then on every change
    defaultValues: {
      firstName: '',
      lastName: '',
      sex: 'Men',
      dateOfBirth: '',
      gpa: undefined,
      graduationYear: [],
      scoringAverageVsCourseRating: undefined,
      nationalAdultRanking: undefined,
      nationalRankingInClass: undefined,
      drivingAverageCarryDistance: undefined,
      maxDriverClubHeadSpeed: undefined,
      preferredDivision: [],
      starRating: undefined,
      weatherZone: [],
      budget: undefined,
      status: 'available',
      featured: false,
    },
  });

  // Load draft on mount from sessionStorage
  useEffect(() => {
    const draft = athleteFormStorage.loadFormDraft();
    if (draft) {
      form.reset({ ...form.getValues(), ...draft.formData } as any);
      if (draft.tournamentResults?.length) {
        setTournamentResults(draft.tournamentResults as any);
      }
      toast({
        title: "Draft loaded",
        description: "Your previous draft has been restored.",
        duration: 10000,
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              athleteFormStorage.clearFormDraft();
              form.reset({
                firstName: '',
                lastName: '',
                sex: 'Men',
                dateOfBirth: '',
                gpa: undefined,
                graduationYear: [],
                scoringAverageVsCourseRating: undefined,
                nationalAdultRanking: undefined,
                nationalRankingInClass: undefined,
                drivingAverageCarryDistance: undefined,
                maxDriverClubHeadSpeed: undefined,
                preferredDivision: [],
                starRating: undefined,
                weatherZone: [],
                budget: undefined,
                status: 'available',
                featured: false,
              });
              setTournamentResults([]);
              setPreferredStates([]);
              setPreferredDivisions([]);
              setWeatherZones([]);
              setGraduationYears([]);
              toast({
                title: "Draft discarded",
                description: "Form has been reset to a clean slate.",
              });
            }}
          >
            Start Fresh
          </Button>
        ),
      });
    }

    // Prefill from query params (e.g. linked from another tool). Only fill
    // fields still empty after the draft restore, so an existing draft is never
    // overwritten.
    const current = form.getValues();
    const patch: Partial<AthleteFormValues> = {};

    const qpFirst = searchParams.get('firstName');
    if (qpFirst && !current.firstName) patch.firstName = qpFirst;

    const qpLast = searchParams.get('lastName');
    if (qpLast && !current.lastName) patch.lastName = qpLast;

    // sex has no "empty" state (defaults to 'Men'), so only apply it on a clean
    // form (no draft) and only when valid — otherwise keep the current default.
    const qpSex = searchParams.get('sex');
    if (qpSex && !draft && (qpSex === 'Men' || qpSex === 'Women')) {
      patch.sex = qpSex;
    }

    const qpYear = searchParams.get('graduationYear');
    if (qpYear && (!current.graduationYear || current.graduationYear.length === 0)) {
      const n = parseInt(qpYear, 10);
      if (Number.isInteger(n) && n >= 2024 && n <= 2030) {
        patch.graduationYear = [n];
      }
    }

    if (Object.keys(patch).length > 0) {
      form.reset({ ...form.getValues(), ...patch } as any);
    }
  }, []);

  // Auto-save functionality using sessionStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      const values = form.getValues();
      // Only save if there's actual data entered
      const hasRealData = values.firstName || values.lastName || tournamentResults.length > 0;
      if (hasRealData) {
        athleteFormStorage.saveFormDraft(values as any, tournamentResults as any);
        setLastSavedAt(new Date());
      }
    }, 2000); // Save after 2 seconds of inactivity

    return () => clearTimeout(timer);
  }, [form.watch(), tournamentResults]);

  // Handle validation errors when form submission fails
  const onInvalid = (errors: any) => {
    console.error('Form validation errors:', errors);
    
    // Scroll to top so user sees errors
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    const fieldLabels: Record<string, string> = {
      firstName: 'First Name',
      lastName: 'Last Name',
      graduationYear: 'Graduation Year',
      sex: 'Gender',
      dateOfBirth: 'Date of Birth',
      country: 'Country',
      gpa: 'GPA',
      sat: 'SAT Score',
      toefl: 'TOEFL Score',
      duolingo: 'Duolingo Score',
      profileImage: 'Profile Image',
      coverImage: 'Cover Image',
      videoLink: 'Video Link',
      starRating: 'Star Rating',
      budget: 'Budget',
      studentType: 'Student Type',
      currentSchool: 'Golf Team',
    };
    
    const errorMessages = Object.entries(errors).map(([field, error]) => {
      const label = fieldLabels[field] || field;
      const message = (error as any)?.message || 'Invalid value';
      return `${label}: ${message}`;
    });
    
    toast({
      title: 'Missing Required Fields',
      description: (
        <div className="mt-2">
          <p className="mb-2">Please fix the following errors:</p>
          <ul className="list-none space-y-1">
            {errorMessages.map((msg, i) => (
              <li key={i} className="text-sm">• {msg}</li>
            ))}
          </ul>
        </div>
      ),
      variant: 'destructive',
      duration: 10000,
    });
  };

  // INVARIANT: Tournaments are fetched lazily by TournamentCombobox (react-query) and merged
  // into local `tournaments` state via onValueChange's second arg. This enables par/yardage
  // auto-fill for tournaments beyond the legacy 1000-row cap.
  // Do NOT reintroduce a mount-time fetch: this page never pre-fills tournament-linked rows
  // from drafts/URL params/clone (draft rows carry yardage/par/slope/courseRating/resultsLink
  // inline on each row, not via a tournament lookup).

  // Tournament result functions
  const addTournamentRow = () => {
    const newRow: TournamentResultEntry = {
      id: Math.random().toString(36).substr(2, 9),
      tournamentId: "",
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
    setTournamentResults([...tournamentResults, newRow]);
  };

  const removeTournamentRow = (id: string) => {
    setTournamentResults(tournamentResults.filter(r => r.id !== id));
  };

  // Stable handler — opens QuickTournamentDialog with the typed name pre-filled.
  // CRITICAL: never write `new:<name>` literal into row state. Capture the row's existing
  // tournamentId at open time so cancel restores it exactly.
  const handleCreateNewTournament = (rowId: string, name: string) => {
    const currentRow = tournamentResults.find(r => r.id === rowId);
    const previousTournamentId = (currentRow?.tournamentId ?? '') as string;
    setQuickDialog({ open: true, rowId, prefilledName: name, previousTournamentId });
  };

  // QuickTournamentDialog confirm — INSERT synchronously, refresh list, patch row.
  const handleQuickTournamentCreated = async (newTournament: any): Promise<boolean> => {
    if (!quickDialog) return false;

    const { data, error } = await supabase
      .from('tournaments')
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
        course_rating: newTournament.course_rating,
        results_link: newTournament.results_link,
      })
      .select()
      .single();

    if (error || !data) {
      toast({
        title: 'Failed to Create Tournament',
        description: error?.message || 'Unknown error',
        variant: 'destructive',
      });
      return false;
    }

    setTournaments(prev => prev.some(t => t.id === data.id) ? prev : [...prev, data]);

    // Patch row: real UUID + auto-fill course details from the freshly-inserted tournament.
    setTournamentResults(prev => prev.map(r => {
      if (r.id !== quickDialog.rowId) return r;
      return {
        ...r,
        tournamentId: data.id,
        isNewTournament: false,
        newTournamentName: '',
        yardage: data.yardage || '',
        par: data.course_par || '',
        slope: data.course_slope || '',
        courseRating: data.course_rating || '',
        resultsLink: data.results_link || '',
      };
    }));

    setQuickDialog(null);
    toast({ title: 'Tournament Created', description: `"${data.name}" has been added.` });
    return true;
  };

  // Cancel/close — do nothing to row state. Because the `new:` guard never lets the literal
  // into row state in the first place, the row's previous tournamentId is already intact.
  const handleQuickDialogOpenChange = (open: boolean) => {
    if (!open) setQuickDialog(null);
  };

  const updateTournamentRow = (id: string, field: string, value: string) => {
    // GUARD: do NOT write `new:<name>` literal into row state. Open the create dialog and
    // let the user confirm. If they cancel, the row's tournamentId stays unchanged.
    if (field === 'tournamentId' && typeof value === 'string' && value.startsWith('new:')) {
      const name = value.slice(4);
      handleCreateNewTournament(id, name);
      return;
    }
    setTournamentResults(tournamentResults.map(row => {
      if (row.id === id) {
        const updatedRow = { ...row, [field]: value };
        
        // Handle tournament selection/changes
        if (field === "tournamentId") {
          if (value.startsWith("new:")) {
            // User selected "Create New Tournament"
            const newName = value.substring(4);
            updatedRow.isNewTournament = true;
            updatedRow.tournamentId = "new";
            updatedRow.newTournamentName = newName;
            updatedRow.yardage = "";
            updatedRow.par = "";
            updatedRow.slope = "";
            updatedRow.courseRating = "";
            updatedRow.resultsLink = "";
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

  const onSubmit = async (data: AthleteFormValues) => {
    try {
      setIsSaving(true);
      
      // Convert graduation years array to comma-separated string
      const gradYearsStr = data.graduationYear.join(', ');
      
      // Use the admin's selected status, or default to 'available'
      const finalStatus = data.status || 'available';
      
      // Map form fields to database columns
      const { data: athleteData, error: athleteError } = await supabase.from('athletes').insert([{
        first_name: data.firstName,
        last_name: data.lastName,
        sex: data.sex,
        date_of_birth: data.dateOfBirth || null,
        country: 'France', // Default
        graduation_year: gradYearsStr, // Store as comma-separated string
        student_type: studentType === 'firstYear' ? 'first_year' : 'transfer',
        golf_club_team: data.hometown || '',
        academic_gpa: data.gpa || null,
        intended_majors: data.intendedMajors || '',
        sat: data.satScore?.toString() || null,
        duolingo: data.duolingoScore?.toString() || null,
        scoring_average: data.scoringAverage?.toString() || null,
        scoring_average_vs_course_rating: data.scoringAverageVsCourseRating?.toString() || null,
        french_adult_ranking: data.nationalAdultRanking?.toString() || null,
        french_ranking_in_their_class: data.nationalRankingInClass?.toString() || null,
        wagr_ranking: data.wagrRanking?.toString() || null,
        drive_distance_carry: data.drivingAverageCarryDistance?.toString() || null,
        max_club_head_speed: data.maxDriverClubHeadSpeed || null,
        strengths: data.strengths || null,
        areas_of_improvement: data.areasOfImprovement || null,
        preferences_budget: data.budget?.toString() || null,
        preferences_division: preferredDivisions.join(', ') || null,
        preferences_region: weatherZones.join(', ') || null,
        video_links: data.videoLink || null,
        profile_photo: data.profileImage || null,
        status: finalStatus,
        committed_university_id: committedUniversityId,
        committed_to: committedToName,
        transfer_individual_ranking: data.transferIndividualRanking || null,
        transfer_from_school: data.transferFromSchool || null,
        transfer_from_division: data.transferFromDivision || null,
        // Dual Rise — tennis
        utr: data.utr ?? null,
        wtn: data.wtn ?? null,
        national_ranking: data.nationalRanking ?? null,
        national_ranking_country: data.nationalRankingCountry || null,
        itf_junior_ranking: data.itfJuniorRanking ?? null,
        utr_profile_link: data.utrProfileLink || null,
        wtn_profile_link: data.wtnProfileLink || null,
        dominant_hand: data.dominantHand || null,
        backhand_type: data.backhandType || null,
        preferred_surface: data.preferredSurface || null,
        play_style: data.playStyle || null,
        height_cm: data.heightCm ?? null,
        weight_kg: data.weightKg ?? null,
        city: data.city || null,
        club_team: data.clubTeam || null,
        phys_flexibility: data.physFlexibility ?? null,
        phys_strength: data.physStrength ?? null,
        phys_endurance: data.physEndurance ?? null,
        tech_serve: data.techServe ?? null,
        tech_forehand: data.techForehand ?? null,
        tech_backhand: data.techBackhand ?? null,
        tech_volley: data.techVolley ?? null,
        tech_smash: data.techSmash ?? null,
        tech_baseline: data.techBaseline ?? null,
        tech_net: data.techNet ?? null,
        tac_decision_making: data.tacDecisionMaking ?? null,
        tac_adaptability: data.tacAdaptability ?? null,
        tac_mental_resilience: data.tacMentalResilience ?? null,
        tac_anticipation: data.tacAnticipation ?? null,
        weaknesses: data.weaknesses || null,
        objectives: data.objectives || null,
        best_results: data.bestResults || null,
        recent_results: data.recentResults || null,
        high_school: data.highSchool || null,
        eligibility_years: data.eligibilityYears || null,
      }]).select().single();

      if (athleteError) throw athleteError;

      // Save tournament results if any
      if (tournamentResults.length > 0 && athleteData) {
        // First, create any new tournaments
        const newTournaments = tournamentResults.filter(r => r.isNewTournament);
        const tournamentIdMap: Record<string, string> = {};
        
        for (const result of newTournaments) {
          if (result.newTournamentName && !tournamentIdMap[result.newTournamentName]) {
            const { data: newTournament, error: tournamentError} = await supabase
              .from("tournaments")
              .insert({
                name: result.newTournamentName,
                series_name: result.newTournamentName,
                location: 'France',
                country: 'France',
                sex: 'Men',
                tournament_type: 'Adult',
                category: 'National',
                year: new Date().getFullYear().toString(),
                yardage: result.yardage || null,
                course_par: result.par || null,
                course_slope: result.slope || null,
                course_rating: result.courseRating || null,
                results_link: result.resultsLink || null,
              })
              .select()
              .single();
            
            if (tournamentError) {
              console.error("Error creating tournament:", tournamentError);
            } else if (newTournament) {
              tournamentIdMap[result.newTournamentName] = newTournament.id;
            }
          }
        }
        
        // Save tournament results
        const dbResults = tournamentResults.map(r => ({
          tournament_id: r.isNewTournament ? tournamentIdMap[r.newTournamentName!] : r.tournamentId,
          athlete_id: athleteData.id,
          rounds: [r.round1, r.round2, r.round3, r.round4].filter(x => x).join(","),
          total_score: r.totalScore,
          position: r.position ? Number(r.position) : null,
          position_text: r.position,
          notes: r.notes || null
        })).filter(r => r.tournament_id); // Only include results with valid tournament IDs

        if (dbResults.length > 0) {
          const { error: resultsError } = await supabase
            .from("tournament_results")
            .insert(dbResults);

          if (resultsError) {
            console.error("Error saving tournament results:", resultsError);
            toast({
              title: "Warning",
              description: "Athlete created but some tournament results could not be saved.",
              variant: "destructive",
            });
          }
        }
      }

      // Clear draft after successful save
      athleteFormStorage.clearFormDraft();

      toast({
        title: 'Athlete created successfully',
        description: `${data.firstName} ${data.lastName} has been added to the database.`,
      });

      if (saveAndAddAnother) {
        athleteFormStorage.clearFormDraft();
        form.reset();
        setPreferredStates([]);
        setTournamentResults([]);
        setSaveAndAddAnother(false);
      } else {
        navigate('/admin/athletes');
      }
    } catch (error) {
      console.error('Error creating athlete:', error);
      toast({
        title: 'Error creating athlete',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const onSaveAsDraft = () => {
    const data = form.getValues();
    console.log('Saving as draft:', data);
    toast({
      title: 'Draft saved',
      description: 'Athlete profile saved as draft.',
    });
  };

  const addState = () => {
    if (currentState && !preferredStates.includes(currentState)) {
      setPreferredStates([...preferredStates, currentState]);
      setCurrentState('');
    }
  };

  const removeState = (state: string) => {
    setPreferredStates(preferredStates.filter(s => s !== state));
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin/athletes')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Add New Athlete</h1>
            <div className="flex items-center gap-3">
              <p className="text-muted-foreground">Create a new athlete profile</p>
              {lastSavedAt && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Save className="h-3 w-3" />
                  Draft saved at {lastSavedAt.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              setSaveAndAddAnother(true);
              form.handleSubmit(onSubmit, onInvalid)();
            }}
            disabled={isSaving}
          >
            <Plus className="mr-2 h-4 w-4" />
            Save & Add Another
          </Button>
          <Button 
            onClick={() => {
              setSaveAndAddAnother(false);
              form.handleSubmit(onSubmit, onInvalid)();
            }}
            disabled={isSaving}
            className="transition-all"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Create Athlete
              </>
            )}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6">
          <Tabs defaultValue="personal" className="space-y-6">
            <TabsList className="grid grid-cols-5 w-full max-w-4xl">
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="academic">Academic</TabsTrigger>
              <TabsTrigger value="athletic">Athletic</TabsTrigger>
              <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
            </TabsList>

            {/* Personal Information Tab */}
            <TabsContent value="personal" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Basic athlete profile information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="sex"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Men">Men</SelectItem>
                              <SelectItem value="Women">Women</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormDescription>
                            Optional: Athlete's date of birth
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Student Type Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="studentType">Student Type</Label>
                    <Select value={studentType} onValueChange={(value: 'firstYear' | 'transfer') => setStudentType(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select student type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="firstYear">First Year</SelectItem>
                        <SelectItem value="transfer">Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select whether this is a first-year student or a transfer student
                    </FormDescription>
                  </div>

                  {/* Class of Year - Multiple Selection */}
                  <FormField
                    control={form.control}
                    name="graduationYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Class of * (Select all that apply)</FormLabel>
                        <FormDescription>
                          Select multiple graduation years if the athlete is deciding between them
                        </FormDescription>
                        <FormControl>
                          <div className={cn(
                            "space-y-2 p-3 rounded-md border transition-all",
                            form.formState.errors.graduationYear 
                              ? "border-destructive bg-destructive/5" 
                              : "border-transparent"
                          )}>
                            {[2025, 2026, 2027, 2028, 2029, 2030].map((year) => (
                              <div key={year} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`grad-year-${year}`}
                                  checked={field.value?.includes(year)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    const updated = checked
                                      ? [...current, year]
                                      : current.filter((y) => y !== year);
                                    field.onChange(updated);
                                  }}
                                />
                                <label
                                  htmlFor={`grad-year-${year}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                  {year}
                                </label>
                              </div>
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="hometown"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hometown</FormLabel>
                          <FormControl>
                            <Input placeholder="City, State" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="profileImage"
                      render={({ field }) => (
                        <FormItem>
                          <ImageUpload
                            label="Profile Image"
                            value={field.value || ''}
                            onChange={field.onChange}
                            type="profile"
                            description="Upload athlete's profile photo"
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="coverImage"
                      render={({ field }) => (
                        <FormItem>
                          <ImageUpload
                            label="Cover Image"
                            value={field.value || ''}
                            onChange={field.onChange}
                            type="cover"
                            description="Upload athlete's cover photo"
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  {/* Status and Featured */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ATHLETE_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {statusLabel(s)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="featured"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Featured Athlete
                            </FormLabel>
                            <FormDescription>
                              Display this athlete in featured sections
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Committed university — only for placed athletes. Selecting a school sets
                      committed_university_id (FK) + committed_to (display cache); division is
                      then derived from the FK in athletes_safe. No free text. */}
                  {(form.watch('status') === 'committed' || form.watch('status') === 'in_college') && (
                    <div className="border-t pt-4 mt-4 space-y-2">
                      <FormLabel>Committed to</FormLabel>
                      <CommittedUniversitySelect
                        value={committedUniversityId}
                        committedToName={committedToName}
                        onSelect={(sel) => {
                          setCommittedUniversityId(sel?.id ?? null);
                          setCommittedToName(sel?.name ?? null);
                          setCommittedDivision(sel?.division ?? null);
                        }}
                      />
                      {committedDivision && (
                        <p className="text-xs text-muted-foreground">
                          Division: <span className="font-medium text-foreground">{committedDivision}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Conditional Transfer Fields */}
                  {studentType === 'transfer' && (
                    <div className="border-t pt-4 mt-4 space-y-4">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Transfer Information
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="transferIndividualRanking"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Scoreboard Individual Ranking</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., #2, Top 5" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="transferFromSchool"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Current School</FormLabel>
                              <FormControl>
                                <Input placeholder="School transferring from" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="transferFromDivision"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>School's Current Division</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select division" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="NCAA D1">NCAA D1</SelectItem>
                                  <SelectItem value="NCAA D2">NCAA D2</SelectItem>
                                  <SelectItem value="NCAA D3">NCAA D3</SelectItem>
                                  <SelectItem value="NAIA">NAIA</SelectItem>
                                  <SelectItem value="NJCAA 1">NJCAA 1</SelectItem>
                                  <SelectItem value="NJCAA 2">NJCAA 2</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Academic Tab */}
            <TabsContent value="academic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Academic Information</CardTitle>
                  <CardDescription>Educational background and test scores</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="gpa"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>GPA</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              min="0" 
                              max="4" 
                              {...field}
                              onChange={e => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>On a 4.0 scale</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                  <FormField
                    control={form.control}
                    name="intendedMajors"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Intended Majors</FormLabel>
                        <FormControl>
                          <Input placeholder="Business, Engineering, etc." {...field} />
                        </FormControl>
                        <FormDescription>
                          Comma-separated list of intended majors
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="satScore"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SAT Score</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="1600" 
                              {...field}
                              onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="duolingoScore"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duolingo Score</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="160" 
                              {...field}
                              onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Athletic Tab */}
            <TabsContent value="athletic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Athletic Performance</CardTitle>
                  <CardDescription>Tennis ratings, rankings & play profile</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="clubTeam"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Club / Academy</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Tennis Spora" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Luxembourg" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="utr"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>UTR</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="e.g. 11.60"
                              {...field}
                              value={field.value ?? ''}
                              onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="wtn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>WTN (lower is better)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="e.g. 20.50"
                              {...field}
                              value={field.value ?? ''}
                              onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="nationalRanking"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>National ranking</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="e.g. 11"
                              {...field}
                              value={field.value ?? ''}
                              onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="nationalRankingCountry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ranking country</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Luxembourg" {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="itfJuniorRanking"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ITF Junior ranking</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="e.g. 818"
                              {...field}
                              value={field.value ?? ''}
                              onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dominantHand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dominant hand</FormLabel>
                          <FormControl>
                            <Input placeholder="Right / Left" {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="backhandType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Backhand</FormLabel>
                          <FormControl>
                            <Input placeholder="One-handed / Two-handed" {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="preferredSurface"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred surface</FormLabel>
                          <FormControl>
                            <Input placeholder="Hard / Clay / Grass" {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="playStyle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Play style</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Aggressive baseliner" {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="heightCm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Height (cm)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="e.g. 190"
                              {...field}
                              value={field.value ?? ''}
                              onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="weightKg"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weight (kg)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="e.g. 74"
                              {...field}
                              value={field.value ?? ''}
                              onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Ratings 0–10 (physical / technical / tactical) */}
                  <div className="pt-2">
                    <h4 className="text-sm font-semibold mb-2">Physical (0–10)</h4>
                    <div className="grid grid-cols-3 gap-4">
                      {([['physFlexibility', 'Flexibility'], ['physStrength', 'Strength'], ['physEndurance', 'Endurance']] as const).map(([name, label]) => (
                        <FormField key={name} control={form.control} name={name as any} render={({ field }) => (
                          <FormItem>
                            <FormLabel>{label}</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} max={10} placeholder="0–10" {...field} value={field.value ?? ''}
                                onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      ))}
                    </div>
                  </div>
                  <div className="pt-2">
                    <h4 className="text-sm font-semibold mb-2">Technical (0–10)</h4>
                    <div className="grid grid-cols-4 gap-4">
                      {([['techServe', 'Serve'], ['techForehand', 'Forehand'], ['techBackhand', 'Backhand'], ['techVolley', 'Volley'], ['techSmash', 'Smash'], ['techBaseline', 'Baseline'], ['techNet', 'Net']] as const).map(([name, label]) => (
                        <FormField key={name} control={form.control} name={name as any} render={({ field }) => (
                          <FormItem>
                            <FormLabel>{label}</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} max={10} placeholder="0–10" {...field} value={field.value ?? ''}
                                onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      ))}
                    </div>
                  </div>
                  <div className="pt-2">
                    <h4 className="text-sm font-semibold mb-2">Tactical (0–10)</h4>
                    <div className="grid grid-cols-4 gap-4">
                      {([['tacDecisionMaking', 'Decision-making'], ['tacAdaptability', 'Adaptability'], ['tacMentalResilience', 'Mental resilience'], ['tacAnticipation', 'Anticipation']] as const).map(([name, label]) => (
                        <FormField key={name} control={form.control} name={name as any} render={({ field }) => (
                          <FormItem>
                            <FormLabel>{label}</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} max={10} placeholder="0–10" {...field} value={field.value ?? ''}
                                onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      ))}
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="starRating"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Star Rating</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-4">
                            <Slider
                              min={0}
                              max={7}
                              step={1}
                              value={[field.value ?? 0]}
                              onValueChange={values => field.onChange(values[0])}
                              className="flex-1"
                            />
                            <div className="flex items-center gap-1 min-w-[100px]">
                              {Array.from({ length: field.value ?? 0 }).map((_, i) => (
                                <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                              ))}
                              <span className="ml-2 text-sm text-muted-foreground">
                                ({field.value ?? 0}/7)
                              </span>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <div className="space-y-4">
                    <Label>External Links</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="videoLink"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Video Link</FormLabel>
                            <FormControl>
                              <Input placeholder="https://youtube.com/..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tournamentResultsLink"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tournament Results Link</FormLabel>
                            <FormControl>
                              <Input placeholder="https://..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="trackmanReportLink"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Trackman Report Link</FormLabel>
                            <FormControl>
                              <Input placeholder="https://..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="golfDataLink"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Golf Data Link</FormLabel>
                            <FormControl>
                              <Input placeholder="https://..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tournaments Tab */}
            <TabsContent value="tournaments" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Tournament Results</CardTitle>
                      <CardDescription>Add tournament results for this athlete</CardDescription>
                    </div>
                    <Button 
                      type="button" 
                      onClick={() => setShowImportModal(true)}
                      variant="outline"
                      size="sm"
                    >
                      <UploadIcon className="mr-2 h-4 w-4" />
                      Import CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="mb-4">
                    <Button type="button" onClick={addTournamentRow} variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Tournament Result
                    </Button>
                  </div>

                  {tournamentResults.length > 0 && (
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
                            <TableHead>Rank</TableHead>
                            <TableHead>Link</TableHead>
                            <TableHead>Notes</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tournamentResults.map(row => (
                            <TableRow key={row.id}>
                              <TableCell>
                                <TournamentCombobox 
                                  value={row.tournamentId} 
                                  onValueChange={(v, tournament) => {
                                    updateTournamentRow(row.id, "tournamentId", v);
                                    if (tournament) {
                                      setTournaments(prev =>
                                        prev.some(t => t.id === tournament.id) ? prev : [...prev, tournament]
                                      );
                                    }
                                  }}
                                  onCreateNew={(name) => handleCreateNewTournament(row.id, name)}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="text"
                                  value={row.yardage}
                                  onChange={(e) => updateTournamentRow(row.id, "yardage", e.target.value)}
                                  disabled={!row.isNewTournament}
                                  className="w-24"
                                  placeholder="6800"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={row.par}
                                  onChange={(e) => updateTournamentRow(row.id, "par", e.target.value)}
                                  disabled={!row.isNewTournament}
                                  className="w-20"
                                  placeholder="72"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="text"
                                  value={row.slope}
                                  onChange={(e) => updateTournamentRow(row.id, "slope", e.target.value)}
                                  disabled={!row.isNewTournament}
                                  className="w-20"
                                  placeholder="113"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="text"
                                  value={row.courseRating}
                                  onChange={(e) => updateTournamentRow(row.id, "courseRating", e.target.value)}
                                  disabled={!row.isNewTournament}
                                  className="w-20"
                                  placeholder="72.5"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={row.round1}
                                  onChange={(e) => updateTournamentRow(row.id, "round1", e.target.value)}
                                  className="w-16"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={row.round2}
                                  onChange={(e) => updateTournamentRow(row.id, "round2", e.target.value)}
                                  className="w-16"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={row.round3}
                                  onChange={(e) => updateTournamentRow(row.id, "round3", e.target.value)}
                                  className="w-16"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={row.round4}
                                  onChange={(e) => updateTournamentRow(row.id, "round4", e.target.value)}
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
                                  onChange={(e) => updateTournamentRow(row.id, "position", e.target.value)}
                                  className="w-20"
                                  placeholder="T5"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="url"
                                  value={row.resultsLink}
                                  onChange={(e) => updateTournamentRow(row.id, "resultsLink", e.target.value)}
                                  disabled={!row.isNewTournament}
                                  className="w-32"
                                  placeholder="https://..."
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="text"
                                  value={row.notes}
                                  onChange={(e) => updateTournamentRow(row.id, "notes", e.target.value)}
                                  className="w-32"
                                  placeholder="Notes..."
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeTournamentRow(row.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {tournamentResults.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Trophy className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p>No tournament results added yet</p>
                      <p className="text-sm mt-2">Click "Add Tournament Result" to start adding results</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Preferences & Additional Info</CardTitle>
                  <CardDescription>Budget, location preferences, and other details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="preferredDivision"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Division (select all that apply)</FormLabel>
                          <div className="space-y-2">
                            {['NCAA D1', 'NCAA D2', 'NCAA D3', 'NAIA', 'NJCAA 1', 'NJCAA 2'].map((division) => (
                              <div key={division} className="flex items-center space-x-2">
                                <Checkbox
                                  checked={preferredDivisions.includes(division)}
                                  onCheckedChange={(checked) => {
                                    const newDivisions = checked
                                      ? [...preferredDivisions, division]
                                      : preferredDivisions.filter(d => d !== division);
                                    setPreferredDivisions(newDivisions);
                                    field.onChange(newDivisions);
                                  }}
                                />
                                <Label className="font-normal cursor-pointer">
                                  {division}
                                </Label>
                              </div>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="weatherZone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weather Zone</FormLabel>
                          <div className="space-y-2">
                            {['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4'].map((zone) => (
                              <div key={zone} className="flex items-center space-x-2">
                                <Checkbox
                                  checked={weatherZones.includes(zone)}
                                  onCheckedChange={(checked) => {
                                    const newZones = checked
                                      ? [...weatherZones, zone]
                                      : weatherZones.filter(z => z !== zone);
                                    setWeatherZones(newZones);
                                    field.onChange(newZones);
                                  }}
                                />
                                <Label className="font-normal cursor-pointer">
                                  {zone} — {WEATHER_ZONE_LABELS[zone]}
                                </Label>
                              </div>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="budget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Budget (USD)</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <Slider
                              min={0}
                              max={100000}
                              step={5000}
                              value={[field.value ?? 0]}
                              onValueChange={values => field.onChange(values[0])}
                            />
                            <div className="flex justify-between text-sm text-muted-foreground">
                              <span>$0</span>
                              <span className="font-medium text-foreground">
                                ${(field.value ?? 0).toLocaleString()}
                              </span>
                              <span>$100,000</span>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <Label>Preferred States</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter state"
                        value={currentState}
                        onChange={(e) => setCurrentState(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addState())}
                      />
                      <Button type="button" onClick={addState} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {preferredStates.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {preferredStates.map((state) => (
                          <Badge key={state} variant="secondary">
                            {state}
                            <button
                              type="button"
                              onClick={() => removeState(state)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name="strengths"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Strengths</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe the athlete's key strengths..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="areasOfImprovement"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Areas of Improvement</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe areas that need improvement..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="recruitmentPitch"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recruitment Pitch</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Why would this athlete be a good recruit?"
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Explain why this athlete would be valuable to college programs
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="committed">Committed</SelectItem>
                              <SelectItem value="graduated">Graduated</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="featured"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Featured Athlete
                            </FormLabel>
                            <FormDescription>
                              Display this athlete in featured sections
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </form>
      </Form>

      {/* CSV Import Modal - Note: Import feature requires saving athlete first */}
      {showImportModal && (
        <TournamentResultsImportModal
          open={showImportModal}
          onClose={() => setShowImportModal(false)}
          athleteId=""
          existingTournaments={tournaments}
          onImportComplete={() => {
            toast({
              title: "Import Complete",
              description: "Tournament results imported. Save athlete to persist changes.",
            });
            setShowImportModal(false);
          }}
        />
      )}

      {/* Quick Tournament Creation Dialog — opened when the user clicks
          "Create new tournament: X" in the row's combobox. Forces synchronous
          INSERT so we never store a `new:<name>` literal in row state. */}
      <QuickTournamentDialog
        open={!!quickDialog?.open}
        onOpenChange={handleQuickDialogOpenChange}
        onTournamentCreated={handleQuickTournamentCreated}
        initialName={quickDialog?.prefilledName ?? ''}
      />
    </div>
  );
};

export default AddNewAthlete;

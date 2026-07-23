import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ATHLETE_STATUSES, normalizeStatus, statusLabel } from "@/lib/athleteStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, Eye, AlertCircle, Plus, Trophy, Target, TrendingDown, Upload, Trash2, Share2, Calculator, RotateCcw, Archive, CloudOff } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { CommittedUniversitySelect } from "@/components/CommittedUniversitySelect";
import { getAthleteById, updateAthlete, deleteAthlete } from "@/lib/api/athletes";
import { createTournamentResult, updateTournamentResult, deleteTournamentResult, sortTournamentResults, AuthSessionExpiredError } from "@/lib/api/tournamentResults";
import { useAuth } from '@/context/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { listTournaments, updateTournament } from "@/lib/api/tournaments";
import { supabase } from "@/integrations/supabase/client";
import { Athlete } from "@/types/athlete";
import { Tournament } from "@/types/tournament";
import { parseRoundsToNumbers } from "@/lib/roundsParser";
import { denormalizeWeatherZones, WEATHER_ZONE_LABELS } from "@/lib/divisionNormalizer";
import { Loader2 } from "lucide-react";
import { TournamentResultEditRow } from "@/components/admin/TournamentResultEditRow";
import QuickTournamentDialog from "@/components/admin/QuickTournamentDialog";
import type { TournamentLite } from "@/components/admin/TournamentCombobox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AthleteProfileModal from "@/components/AthleteProfileModal";
import ShareProfileModal from "@/components/ShareProfileModal";
import { useTableNavigation } from "@/hooks/useTableNavigation";
import { TournamentResultsImportModal } from "@/components/admin/TournamentResultsImportModal";
import { AthleteMetricsTable } from "@/components/AthleteMetricsTable";
import { ImageUpload } from "@/components/ImageUpload";
import { CoachScoringPreview } from "@/components/admin/CoachScoringPreview";
import { tournamentResultsDraftStorage, UnsavedTournamentRow } from "@/lib/validation/tournamentResultsDraftStorage";

const AdminAthleteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [tournamentResults, setTournamentResults] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [unsavedRows, setUnsavedRows] = useState<any[]>([]);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<Record<string, boolean>>({});
  const [showCoachPreview, setShowCoachPreview] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [autoCalculatedScoring, setAutoCalculatedScoring] = useState<number | null>(null);
  const [autoCalculatedVsCR, setAutoCalculatedVsCR] = useState<number | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [weatherZones, setWeatherZones] = useState<string[]>([]);
  const [graduationYears, setGraduationYears] = useState<string[]>([]);
  const [scoringPeriodOverride, setScoringPeriodOverride] = useState(false);
  const [selectedOverridePeriod, setSelectedOverridePeriod] = useState<string>('last_5');
  // Reassignment-guard dialog: when an existing result's tournament is changed, block the save
  // until the admin confirms via AlertDialog.
  const [pendingTournamentChange, setPendingTournamentChange] = useState<{
    rowId: string;
    fromId: string;
    toId: string;
    toName: string;
  } | null>(null);

  // QuickTournamentDialog state. Opened when the user clicks "Create new tournament: X" in the
  // combobox. The row's previous `tournamentId` is captured at open time so cancelling the
  // dialog leaves the row state exactly as it was — we never write a `new:<name>` literal into
  // row state. On confirm, we patch the row's `tournament_id` to the newly-created UUID.
  const [quickDialog, setQuickDialog] = useState<{
    open: boolean;
    rowId: string;
    prefilledName: string;
    isExistingRow: boolean;
    previousTournamentId: string;
  } | null>(null);

  // Table navigation hook - 8 columns (tournament not navigable, then round1-4, position, results link, notes)
  const totalRows = unsavedRows.length + tournamentResults.length;
  const { registerField, handleNavigation } = useTableNavigation(totalRows, 8);

  const onNavigate = (rowIndex: number, columnIndex: number, direction: 'up' | 'down' | 'left' | 'right' | 'enter') => {
    if (direction === 'enter') {
      // Trigger save for the current row
      const allRows = [...unsavedRows, ...tournamentResults];
      const row = allRows[rowIndex];
      if (row) {
        const isUnsaved = rowIndex < unsavedRows.length;
        if (isUnsaved) {
          saveNewResult(row.id);
        } else {
          saveExistingResult(row.id);
        }
      }
    } else {
      handleNavigation({ rowIndex, columnIndex, direction });
    }
  };

  const isUUID = (s: string) => 
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

  useEffect(() => {
    const fetchData = async () => {
      if (!id || !isUUID(id)) {
        setIsLoading(false);
        setAthlete(null);
        return;
      }
      
      setIsLoading(true);
      try {
        const [athleteData, resultsResponse, tournamentsList] = await Promise.all([
          getAthleteById(id),
          supabase
            .from('tournament_results')
            .select('*, tournaments(*)')
            .eq('athlete_id', id),
          listTournaments(),
        ]);
        
        if (athleteData) {
          setAthlete(athleteData);
          // Initialize weather zones using centralized denormalization utility
          const zones = denormalizeWeatherZones(athleteData.weatherZone);
          setWeatherZones(zones);
          // Initialize graduation years from athlete data
          const years = athleteData.graduationYear?.toString().split(',').map(y => y.trim()).filter(y => y) || [];
          setGraduationYears(years);
          
          // Initialize scoring period override state
          const hasOverride = athleteData.scoringAverageOverride || athleteData.scoringAvgVsCROverride;
          setScoringPeriodOverride(hasOverride || false);
          if (athleteData.defaultScoringPeriodType === 'last_n' && athleteData.defaultScoringPeriodValue) {
            setSelectedOverridePeriod(`last_${athleteData.defaultScoringPeriodValue}`);
          } else if (athleteData.defaultScoringPeriodType === 'year') {
            setSelectedOverridePeriod('current_year');
          }
        }
        
        if (resultsResponse.error) {
          throw resultsResponse.error;
        }
        
        // Apply shared sorting utility for consistency
        const sortedResults = sortTournamentResults(resultsResponse.data || []);
        // INVARIANT: _originalTournamentId is set once on load; only updated after a successful
        // save (see saveExistingResult). Do NOT touch in edit/cancel paths — it must always
        // reflect the last-persisted DB value so the reassignment guard compares correctly.
        const resultsWithOrigin = sortedResults.map((r: any) => ({
          ...r,
          _originalTournamentId: r.tournament_id,
        }));
        setTournamentResults(resultsWithOrigin);
        setTournaments(tournamentsList);
      } catch (err) {
        console.error('Error fetching data:', err);
        toast({
          title: "Error",
          description: "Failed to load athlete data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [id]);

  // Load saved draft from sessionStorage when athlete changes
  useEffect(() => {
    if (!id) return;
    
    const savedRows = tournamentResultsDraftStorage.loadDraft(id);
    if (savedRows && savedRows.length > 0) {
      setUnsavedRows(savedRows);
      toast({
        title: "Données restaurées",
        description: `${savedRows.length} résultat(s) de tournoi non sauvegardé(s) ont été restaurés.`,
      });
    }
  }, [id]);

  // Auto-save unsavedRows to sessionStorage whenever they change
  useEffect(() => {
    if (!id) return;
    tournamentResultsDraftStorage.saveDraft(id, unsavedRows);
  }, [id, unsavedRows]);

  // Warn user before leaving page with unsaved data
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (unsavedRows.length > 0) {
        e.preventDefault();
        e.returnValue = 'Vous avez des résultats de tournois non sauvegardés. Êtes-vous sûr de vouloir quitter ?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [unsavedRows.length]);

  const handleFieldChange = (field: keyof Athlete, value: any, section: string) => {
    if (!athlete) return;
    setAthlete({ ...athlete, [field]: value });
    setHasUnsavedChanges({ ...hasUnsavedChanges, [section]: true });
  };

  // Get period label for display
  const getPeriodLabel = () => {
    if (!athlete?.defaultScoringPeriodType || !athlete?.defaultScoringPeriodValue) {
      return 'Last 5 tournaments';
    }
    if (athlete.defaultScoringPeriodType === 'year') {
      return `Year ${athlete.defaultScoringPeriodValue}`;
    }
    return `Last ${athlete.defaultScoringPeriodValue} tournaments`;
  };

  // Recalculate metrics based on default period
  const handleRecalculateMetrics = async () => {
    if (!athlete?.id) return;
    
    setIsRecalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke('calculate-athlete-metrics', {
        body: {
          athleteId: athlete.id,
          filterType: athlete.defaultScoringPeriodType || 'last_n',
          filterValue: athlete.defaultScoringPeriodValue || '5'
        }
      });

      if (error) throw error;

      // Update auto-calculated values
      setAutoCalculatedScoring(data.avgScore);
      setAutoCalculatedVsCR(data.metricValue);

      // If no override, update the athlete fields
      if (!athlete.scoringAverageOverride) {
        handleFieldChange('scoringAverage', data.avgScore, 'golf');
      }
      if (!athlete.scoringAvgVsCROverride) {
        handleFieldChange('scoringAverageVsCourseRating', data.metricValue, 'golf');
      }

      toast({
        title: "Metrics Recalculated",
        description: `Updated based on ${getPeriodLabel()}`,
      });
    } catch (error) {
      console.error('Error recalculating metrics:', error);
      toast({
        title: "Error",
        description: "Failed to recalculate metrics",
        variant: "destructive"
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  const refreshAthleteMetrics = useCallback(async () => {
    if (!id || !isUUID(id)) return;
    try {
      const updatedAthlete = await getAthleteById(id);
      if (updatedAthlete) setAthlete(updatedAthlete);
    } catch (error) {
      console.error('Error refreshing athlete after cache update:', error);
    }
  }, [id]);

  // Reset to auto-calculated values
  const handleResetToAutoCalculated = async () => {
    handleFieldChange('scoringAverageOverride', false, 'golf');
    handleFieldChange('scoringAvgVsCROverride', false, 'golf');
    
    if (autoCalculatedScoring !== null) {
      handleFieldChange('scoringAverage', autoCalculatedScoring, 'golf');
    }
    if (autoCalculatedVsCR !== null) {
      handleFieldChange('scoringAverageVsCourseRating', autoCalculatedVsCR, 'golf');
    }
    
    await handleRecalculateMetrics();
  };

  // Load auto-calculated values on mount and when period changes
  useEffect(() => {
    if (athlete?.id) {
      handleRecalculateMetrics();
    }
  }, [athlete?.id, athlete?.defaultScoringPeriodType, athlete?.defaultScoringPeriodValue]);

  const handleSaveSection = async (section: string, fields: Partial<Athlete>) => {
    if (!athlete || !id) return;
    
    setIsSaving(section);
    try {
      await updateAthlete(id, fields);
      setHasUnsavedChanges({ ...hasUnsavedChanges, [section]: false });
      
      // Athlete moved to "in college" (placed / legacy archived) → hidden from coaches
      if (section === 'Status & Visibility' && fields.status === 'in_college') {
        toast({
          title: "Athlete placed",
          description: "The athlete is now marked as in college and hidden from coaches.",
        });
        navigate('/admin/athletes');
        return;
      }
      
      toast({
        title: "Success",
        description: `${section} updated successfully`,
      });
    } catch (err) {
      console.error('Error saving:', err);
      toast({
        title: "Error",
        description: `Failed to update ${section}`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(null);
    }
  };

  // Tournament result handlers
  // Parse position input - field size is now managed separately in tournaments.field_size
  const parsePositionInput = (raw: unknown): { positionText: string; position: number | null } => {
    const positionText = String(raw ?? '').trim();
    if (!positionText) return { positionText: '', position: null };

    // Handle rank/field format: "4/95" - extract position only, ignore field size
    const slashMatch = positionText.match(/^(\d+)\s*\/\s*\d+$/);
    if (slashMatch) {
      return {
        positionText,
        position: parseInt(slashMatch[1], 10),
      };
    }

    // Otherwise take first number found (works for T4, 12, etc.)
    const firstNumberMatch = positionText.match(/\d+/);
    if (firstNumberMatch) {
      return { positionText, position: parseInt(firstNumberMatch[0], 10) };
    }

    // Codes like MC / WD / DQ etc.
    return { positionText, position: null };
  };

  const addNewTournamentRow = () => {
    const newRow = {
      id: `temp-${Date.now()}`,
      tournamentId: '',
      round1: 0,
      round2: 0,
      round3: 0,
      round4: 0,
      position: '',
      resultsLink: '',
      notes: '',
    };
    setUnsavedRows([newRow, ...unsavedRows]);
  };

  // Stable handler — opens QuickTournamentDialog with the typed name pre-filled.
  // CRITICAL: never write `new:<name>` literal into row state. Capture the row's existing
  // tournamentId at open time so cancel restores it exactly. Empty string means a brand-new
  // unsaved row with no prior tournament selection.
  const handleCreateNewTournament = useCallback(
    (rowId: string, name: string, isExistingRow: boolean) => {
      const currentRow = isExistingRow
        ? tournamentResults.find(r => r.id === rowId)
        : unsavedRows.find(r => r.id === rowId);
      const previousTournamentId = (currentRow?.tournament_id ?? currentRow?.tournamentId ?? '') as string;
      setQuickDialog({
        open: true,
        rowId,
        prefilledName: name,
        isExistingRow,
        previousTournamentId,
      });
    },
    [tournamentResults, unsavedRows]
  );

  const updateUnsavedRow = (id: string, field: string, value: any) => {
    // GUARD: do NOT write the `new:<name>` literal into row state. Open the create dialog
    // and let the user confirm. If they cancel, the row's tournamentId stays at whatever it
    // was before — no transient bad state, no chance the literal leaks into a DB write.
    if (field === 'tournamentId' && typeof value === 'string' && value.startsWith('new:')) {
      const name = value.slice(4);
      handleCreateNewTournament(id, name, false);
      return;
    }
    setUnsavedRows(prev =>
      prev.map(row => row.id === id ? { ...row, [field]: value } : row)
    );
  };

  const saveNewResult = async (rowId: string) => {
    const row = unsavedRows.find(r => r.id === rowId);
    if (!row || !row.tournamentId) {
      toast({
        title: "Error",
        description: "Please select a tournament",
        variant: "destructive",
      });
      return;
    }

    setSavingRowId(rowId);
    try {
      let actualTournamentId = row.tournamentId;
      
      // Handle "new:TournamentName" case - create tournament first
      if (row.tournamentId.startsWith('new:')) {
        const newTournamentName = row.tournamentId.substring(4);
        
        // Create the new tournament with sensible defaults
        const { data: newTournament, error: createError } = await supabase
          .from('tournaments')
          .insert({
            name: newTournamentName,
            series_name: newTournamentName,
            sex: athlete?.sex === 'Women' ? 'Women' : 'Men',
            tournament_type: 'Adult',
            category: 'National',
            country: 'France',
            year: new Date().getFullYear().toString(),
          })
          .select()
          .single();
        
        if (createError) {
          throw new Error(`Failed to create tournament: ${createError.message}`);
        }
        
        actualTournamentId = newTournament.id;
        
        // Refresh tournaments list to include the new one
        const tournamentsList = await listTournaments();
        setTournaments(tournamentsList);
        
        // Update the unsaved row to use the real tournament ID
        setUnsavedRows(prev =>
          prev.map(r => r.id === rowId ? { ...r, tournamentId: actualTournamentId } : r)
        );
        
        toast({
          title: "Tournament Created",
          description: `"${newTournamentName}" has been added.`,
        });
      }

      const rounds = [row.round1, row.round2, row.round3, row.round4]
        .filter(r => r > 0)
        .join(',');
      
      const parsedPosition = parsePositionInput(row.position);
      
      // Calculate total score - send null for notes-only entries (no rounds entered)
      const roundScores = [row.round1, row.round2, row.round3, row.round4].filter(r => r > 0);
      const totalScore = roundScores.length > 0 ? roundScores.reduce((a, b) => a + b, 0) : null;
      
      // No-score entries are valid (team/match-play events) — notes are optional

      await createTournamentResult({
        tournamentId: actualTournamentId,
        athleteId: id!,
        position: parsedPosition.position,
        positionText: parsedPosition.positionText,
        totalScore,
        rounds,
        notes: row.notes,
      });

      // Shared-per-tournament results link (single source of truth in tournaments.results_link)
      const desiredLink = normalizeResultsLinkForDb(row.resultsLink);
      const currentLink = tournaments.find(t => t.id === actualTournamentId)?.resultsLink ?? null;
      if (desiredLink !== currentLink) {
        await updateTournament(actualTournamentId, { resultsLink: desiredLink as any });
        syncResultsLinkLocally(actualTournamentId, desiredLink);
      }

      const resultsResponse = await supabase
        .from('tournament_results')
        .select('*, tournaments(*)')
        .eq('athlete_id', id!)
        .order('created_at', { ascending: false });
      
      if (resultsResponse.data) {
        const sortedResults = sortTournamentResults(resultsResponse.data);
        setTournamentResults(sortedResults);
      }
      setUnsavedRows(prev => prev.filter(r => r.id !== rowId));

      toast({
        title: "Success",
        description: "Tournament result saved!",
      });
    } catch (error) {
      console.error("Error saving result:", error);
      
      // Handle session expiration gracefully
      if (error instanceof AuthSessionExpiredError) {
        toast({
          title: "Session Expirée",
          description: "Vos modifications ont été sauvegardées localement. Veuillez vous reconnecter pour continuer.",
          variant: "destructive",
        });
        return; // Keep the unsaved row so user doesn't lose data
      }
      
      toast({
        title: "Erreur",
        description: "Échec de l'enregistrement du résultat de tournoi",
        variant: "destructive",
      });
    } finally {
      setSavingRowId(null);
    }
  };

  const removeUnsavedRow = async (rowId: string) => {
    setUnsavedRows(prev => prev.filter(r => r.id !== rowId));
  };

const mapResultToRow = (result: any) => {
    // Use centralized rounds parser for consistent handling
    const rounds = parseRoundsToNumbers(result.rounds);
    
    // Get tournament field size from tournaments table (single source of truth)
    const tournament = tournaments.find(t => t.id === result.tournament_id);
    const tournamentFieldSize = tournament?.participatingAthletes || null;
    
    return {
      id: result.id,
      tournamentId: result.tournament_id,
      round1: rounds[0] || 0,
      round2: rounds[1] || 0,
      round3: rounds[2] || 0,
      round4: rounds[3] || 0,
      // Prefer locally edited value (positionText) first
      position: result.positionText ?? result.position_text ?? result.position?.toString() ?? '',
      // Prefer local edit buffer first so typing doesn't "snap back"
      resultsLink: (result.resultsLink ?? result.tournaments?.results_link) || '',
      notes: result.notes || '',
      // Field size from tournament (single source of truth)
      tournamentFieldSize,
    };
  };

  const updateExistingRow = (rowId: string, field: string, value: any) => {
    // GUARD: do NOT write the `new:<name>` literal into row state. Open the create dialog
    // and let the user confirm. If they cancel, the row's tournamentId stays at whatever it
    // was before — no transient bad state, no chance the literal leaks into a DB write
    // (which would fail the FK + UUID parse silently).
    if (field === 'tournamentId' && typeof value === 'string' && value.startsWith('new:')) {
      const name = value.slice(4);
      handleCreateNewTournament(rowId, name, true);
      return;
    }
    setTournamentResults(prev =>
      prev.map(result => {
        if (result.id === rowId) {
          const row = mapResultToRow(result);
          const updated = { ...row, [field]: value };
          
          const rounds = [updated.round1, updated.round2, updated.round3, updated.round4]
            .filter(r => r > 0)
            .map((score, idx) => ({ round: idx + 1, score }));
          
          const parsedPosition = parsePositionInput(updated.position);

          // Handle tournamentId edits: mirror value into both tournament_id + tournamentId
          // without touching _originalTournamentId (that's set once on load and only updated
          // after a successful save — see saveExistingResult).
          if (field === 'tournamentId') {
            // Normalise rounds to object-array shape to match every other edit branch — prevents save-path shape-mismatch bugs.
            const normalisedRounds = parseRoundsToNumbers(result.rounds).map((score, idx) => ({ round: idx + 1, score }));
            return {
              ...result,
              tournament_id: value,
              tournamentId: value,
              rounds: normalisedRounds,
            };
          }

          return {
            ...result,
            rounds,
            // Keep both camel + snake fields in sync for the edit session
            positionText: parsedPosition.positionText,
            position_text: parsedPosition.positionText,
            position: parsedPosition.position,
            // Field size is now managed at tournament level, not per-result
            // Local edit buffer for shared-per-tournament results link
            resultsLink: updated.resultsLink,
            tournaments: {
              ...(result.tournaments || {}),
              results_link: updated.resultsLink,
            },
            notes: updated.notes, // FIX: Persist notes to local state
          };
        }
        return result;
      })
    );
  };

  // Merge a tournament picked from the combobox into local `tournaments` state so
  // downstream logic (field size, results_link sync, mapResultToRow) keeps working for
  // tournaments that sit beyond the 1000-row cap of the initial listTournaments() fetch.
  const handleTournamentSelectedMerge = useCallback((tournament: TournamentLite) => {
    setTournaments(prev => {
      if (prev.some(t => t.id === tournament.id)) return prev;
      // Map TournamentLite (DB shape) to our Tournament type-ish object. Only the fields
      // actually consumed by this page matter; others fall back safely.
      const mapped: any = {
        id: tournament.id,
        name: tournament.name,
        series_name: tournament.name,
        year: tournament.year ?? '',
        location: tournament.location ?? '',
        sex: tournament.sex ?? 'Men',
        category: tournament.category ?? 'National',
        resultsLink: tournament.results_link ?? undefined,
        startDate: tournament.start_date ? new Date(tournament.start_date) : undefined,
      };
      return [...prev, mapped];
    });
  }, []);

  const normalizeResultsLinkForDb = (raw: unknown): string | null => {
    const value = String(raw ?? '').trim();
    return value ? value : null;
  };

  const syncResultsLinkLocally = (tournamentId: string, resultsLink: string | null) => {
    const nextLink = resultsLink ?? '';

    setTournaments(prev =>
      prev.map(t => (t.id === tournamentId ? { ...t, resultsLink: nextLink || undefined } : t))
    );

    setTournamentResults(prev =>
      prev.map(r => {
        if (r.tournament_id !== tournamentId) return r;
        return {
          ...r,
          resultsLink: nextLink,
          tournaments: {
            ...(r.tournaments || {}),
            results_link: nextLink,
          },
        };
      })
    );
  };

  // Handler for updating tournament field size (single source of truth)
  const handleFieldSizeUpdate = async (tournamentId: string, newFieldSize: number) => {
    try {
      await updateTournament(tournamentId, { participatingAthletes: newFieldSize });
      
      // Update local tournaments state so all rows reflect the change
      setTournaments(prev =>
        prev.map(t => t.id === tournamentId 
          ? { ...t, participatingAthletes: newFieldSize }
          : t
        )
      );
      
      toast({
        title: "Success",
        description: "Tournament field size updated",
      });
    } catch (error) {
      console.error("Error updating field size:", error);
      toast({
        title: "Error",
        description: "Failed to update field size",
        variant: "destructive",
      });
    }
  };

  const saveExistingResult = async (rowId: string) => {
    const result = tournamentResults.find(r => r.id === rowId);
    if (!result) return;

    // Belt-and-braces guard: should never trigger if the updateExistingRow guard works,
    // but this prevents a silent FK/UUID-parse failure if a `new:<name>` literal ever
    // sneaks into row state (e.g. from a stale draft, future regression, etc.).
    if (typeof result.tournament_id === 'string' && result.tournament_id.startsWith('new:')) {
      toast({
        title: "Erreur",
        description: "Veuillez créer le nouveau tournoi avant d'enregistrer.",
        variant: "destructive",
      });
      return;
    }

    // Reassignment guard: if the tournament id has changed from the originally-loaded DB
    // value, block the save and ask for confirmation via AlertDialog. The comparison is
    // always against _originalTournamentId (set once on load), never against intermediate
    // edit state — so edit → cancel → edit still compares to the last-persisted value.
    const currentTournamentId = result.tournament_id;
    const originalTournamentId = result._originalTournamentId;
    if (
      originalTournamentId &&
      currentTournamentId &&
      currentTournamentId !== originalTournamentId &&
      (!pendingTournamentChange || pendingTournamentChange.rowId !== rowId)
    ) {
      const picked = tournaments.find(t => t.id === currentTournamentId);
      setPendingTournamentChange({
        rowId,
        fromId: originalTournamentId,
        toId: currentTournamentId,
        toName: picked?.name ?? 'Selected tournament',
      });
      return;
    }

    setSavingRowId(rowId);
    try {
      const parsedPosition = parsePositionInput(result.positionText);
      
      // Calculate total score - send null for notes-only entries
      // Defensive parse: rounds may be a string (fresh from DB), number[], or object[] — parseRoundsToNumbers handles all three.
      const roundScores = parseRoundsToNumbers(result.rounds).filter((s: number) => s > 0);
      const totalScore = roundScores.length > 0 ? roundScores.reduce((sum: number, s: number) => sum + s, 0) : null;
      const rounds = roundScores.length > 0 ? roundScores.join(',') : '';
      
      // Require a note if no scores
      if (totalScore === null && !result.notes?.trim()) {
        toast({
          title: "Validation Error",
          description: "Please enter round scores or a note for this result.",
          variant: "destructive",
        });
        setSavingRowId(null);
        return;
      }

      const tournamentIdChanged =
        originalTournamentId && currentTournamentId && currentTournamentId !== originalTournamentId;

      await updateTournamentResult(rowId, {
        // Only include tournamentId when it actually changed (saves an unnecessary write).
        ...(tournamentIdChanged ? { tournamentId: currentTournamentId } : {}),
        position: parsedPosition.position,
        positionText: parsedPosition.positionText,
        totalScore,
        rounds,
        notes: result.notes || '', // FIX: Use result.notes directly
      });

      // INVARIANT update point: after a successful save, advance _originalTournamentId to the
      // newly-persisted value so subsequent edits compare against the correct baseline.
      if (tournamentIdChanged) {
        setTournamentResults(prev =>
          prev.map(r => (r.id === rowId ? { ...r, _originalTournamentId: currentTournamentId } : r))
        );
      }

      // Shared-per-tournament results link
      if (result.tournament_id) {
        const desiredLink = normalizeResultsLinkForDb(result.resultsLink ?? result.tournaments?.results_link);
        const currentLink = tournaments.find(t => t.id === result.tournament_id)?.resultsLink ?? null;
        if (desiredLink !== currentLink) {
          await updateTournament(result.tournament_id, { resultsLink: desiredLink as any });
          syncResultsLinkLocally(result.tournament_id, desiredLink);
        }
      }

      toast({
        title: "Success",
        description: "Tournament result updated!",
      });
    } catch (error) {
      console.error("Error updating result:", error);
      
      // Handle session expiration gracefully
      if (error instanceof AuthSessionExpiredError) {
        toast({
          title: "Session Expirée",
          description: "Vos modifications sont conservées. Veuillez vous reconnecter pour sauvegarder.",
          variant: "destructive",
        });
        return; // Keep the local changes so user doesn't lose data
      }
      
      toast({
        title: "Erreur",
        description: "Échec de la mise à jour du résultat de tournoi",
        variant: "destructive",
      });
    } finally {
      setSavingRowId(null);
    }
  };

  // Confirm pending tournament reassignment → re-enter saveExistingResult which will now
  // bypass the guard (pendingTournamentChange is set for this row) and persist.
  const confirmTournamentChange = async () => {
    const pending = pendingTournamentChange;
    if (!pending) return;
    try {
      await saveExistingResult(pending.rowId);
    } finally {
      setPendingTournamentChange(null);
    }
  };

  const cancelTournamentChange = () => {
    // Do NOT touch _originalTournamentId — cancelling a reassignment leaves the edit-buffer
    // alone; the user can continue editing or revert the change manually. The next save
    // attempt will still trigger the guard because the comparison is against the original
    // DB value, unchanged.
    setPendingTournamentChange(null);
  };

  // QuickTournamentDialog handlers — INSERT the new tournament synchronously, then patch the
  // target row's tournament_id to the real UUID. On cancel/close we do nothing to row state
  // (the row's previous tournamentId was never overwritten — see the `new:` guards above).
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
        title: "Failed to Create Tournament",
        description: error?.message || "Unknown error",
        variant: "destructive",
      });
      return false;
    }

    // Refresh local tournaments cache so par/yardage/results_link auto-fill works for this row.
    try {
      const tournamentsList = await listTournaments();
      setTournaments(tournamentsList);
    } catch {
      // Fall back to merging just the new tournament if listTournaments fails.
      setTournaments(prev => [...prev, data as any]);
    }

    // Patch the target row's tournament_id to the real UUID.
    if (quickDialog.isExistingRow) {
      setTournamentResults(prev =>
        prev.map(r => {
          if (r.id !== quickDialog.rowId) return r;
          const normalisedRounds = parseRoundsToNumbers(r.rounds).map((score: number, idx: number) => ({ round: idx + 1, score }));
          return { ...r, tournament_id: data.id, tournamentId: data.id, rounds: normalisedRounds };
        })
      );
    } else {
      setUnsavedRows(prev =>
        prev.map(r => r.id === quickDialog.rowId ? { ...r, tournamentId: data.id } : r)
      );
    }

    setQuickDialog(null);
    toast({
      title: "Tournament Created",
      description: `"${data.name}" has been added.`,
    });
    return true;
  };

  // Cancel/close — do nothing to row state. Because the `new:` guards never let the literal
  // into row state in the first place, the row's previous tournamentId is already intact.
  const handleQuickDialogOpenChange = (open: boolean) => {
    if (!open) setQuickDialog(null);
  };

  const deleteResult = async (rowId: string) => {
    setSavingRowId(rowId);
    try {
      await deleteTournamentResult(rowId);
      
      const resultsResponse = await supabase
        .from('tournament_results')
        .select('*, tournaments(*)')
        .eq('athlete_id', id!)
        .order('created_at', { ascending: false });
      
      if (resultsResponse.data) {
        const sortedResults = sortTournamentResults(resultsResponse.data);
        setTournamentResults(sortedResults);
      }

      toast({
        title: "Success",
        description: "Tournament result deleted!",
      });
    } catch (error) {
      console.error("Error deleting result:", error);
      
      // Handle session expiration gracefully
      if (error instanceof AuthSessionExpiredError) {
        toast({
          title: "Session Expirée",
          description: "Veuillez vous reconnecter pour effectuer cette action.",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Erreur",
        description: "Échec de la suppression du résultat de tournoi",
        variant: "destructive",
      });
    } finally {
      setSavingRowId(null);
    }
  };

  const handleArchive = async () => {
    if (!athlete || !id) return;
    
    setIsArchiving(true);
    try {
      await updateAthlete(id, { status: 'archived' });
      toast({
        title: "Athlete archived",
        description: "The athlete profile has been archived.",
      });
      navigate('/admin/athletes');
    } catch (error) {
      console.error('Error archiving athlete:', error);
      toast({
        title: "Error",
        description: "Failed to archive athlete",
        variant: "destructive",
      });
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    
    try {
      await deleteAthlete(id);
      toast({
        title: "Athlete deleted",
        description: "The athlete profile has been permanently deleted.",
      });
      navigate('/admin/athletes');
    } catch (error) {
      console.error('Error deleting athlete:', error);
      toast({
        title: "Error",
        description: "Failed to delete athlete",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  // Toggle individual result selection
  const toggleResultSelection = (resultId: string) => {
    const newSelected = new Set(selectedResults);
    if (newSelected.has(resultId)) {
      newSelected.delete(resultId);
    } else {
      newSelected.add(resultId);
    }
    setSelectedResults(newSelected);
  };

  // Toggle select all
  const toggleSelectAll = () => {
    const allResultIds = tournamentResults.map(r => r.id);
    if (selectedResults.size === allResultIds.length) {
      setSelectedResults(new Set());
    } else {
      setSelectedResults(new Set(allResultIds));
    }
  };

  // Bulk delete selected results
  const handleBulkDelete = async () => {
    if (selectedResults.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedResults.size} tournament result(s)?`)) {
      return;
    }
    
    setSavingRowId('bulk-delete');
    try {
      // Delete all selected results
      await Promise.all(
        Array.from(selectedResults).map(resultId => 
          deleteTournamentResult(resultId)
        )
      );
      
      // Refresh results
      const resultsResponse = await supabase
        .from('tournament_results')
        .select('*, tournaments(*)')
        .eq('athlete_id', id!)
        .order('created_at', { ascending: false });
      
      if (resultsResponse.data) {
        setTournamentResults(resultsResponse.data);
      }
      setSelectedResults(new Set());

      toast({
        title: "Success",
        description: `Deleted ${selectedResults.size} tournament result(s)!`,
      });
    } catch (error) {
      console.error("Error deleting results:", error);
      toast({
        title: "Error",
        description: "Failed to delete some tournament results",
        variant: "destructive",
      });
    } finally {
      setSavingRowId(null);
    }
  };

  // Calculate performance analytics
  const tournamentsPlayed = tournamentResults.length;
  
  const top3Finishes = tournamentResults.filter(r => {
    const pos = r.position || 999;
    return pos > 0 && pos <= 3;
  }).length;

  const victories = tournamentResults.filter(r => {
    const pos = r.position || 999;
    return pos === 1;
  }).length;

  // Use the athlete's best recent scoring average from the database
  const avgScore = athlete?.best_recent_scoring_avg_raw 
    ? parseFloat(athlete.best_recent_scoring_avg_raw).toFixed(2)
    : null;
  
  const bestRecentPeriod = athlete?.best_recent_period_raw || null;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!athlete) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Athlete not found</p>
            <Button onClick={() => navigate('/admin/athletes')} className="mt-4">
              Back to Athletes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/admin/athletes')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Athletes
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{athlete.firstName} {athlete.lastName}</h1>
            <Badge variant="secondary" className="mt-1">Admin Edit Mode</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <>
              <Button 
                variant="outline" 
                onClick={handleArchive}
                disabled={isArchiving}
              >
                {isArchiving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Archiving...</>
                ) : (
                  <><Archive className="mr-2 h-4 w-4" /> Archive</>
                )}
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </>
          )}
          <ShareProfileModal 
            athleteName={`${athlete.firstName} ${athlete.lastName}`}
            athleteId={athlete.slug || athlete.id}
            isAdminContext={true}
            trigger={
              <Button variant="outline">
                <Share2 className="mr-2 h-4 w-4" />
                Share Profile
              </Button>
            }
          />
          <Button variant="outline" onClick={() => setShowCoachPreview(true)}>
            <Eye className="mr-2 h-4 w-4" />
            View as Coach
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                Personal Information
                {hasUnsavedChanges.personal && (
                  <span className="h-2 w-2 rounded-full bg-yellow-500" />
                )}
              </CardTitle>
              <Button 
                onClick={() => handleSaveSection('Personal Information', {
                  firstName: athlete.firstName,
                  lastName: athlete.lastName,
                  email: athlete.email,
                  phone: athlete.phone,
                  hometown: athlete.hometown,
                  currentSchool: athlete.currentSchool,
                  sex: athlete.sex,
                  dateOfBirth: athlete.dateOfBirth,
                  graduationYear: athlete.graduationYear,
                  instagramHandle: athlete.instagramHandle,
                  swingCoach: athlete.swingCoach,
                  profileImage: athlete.profileImage,
                  coverImage: athlete.coverImage,
                })}
                disabled={isSaving === 'Personal Information' || !hasUnsavedChanges.personal}
              >
                {isSaving === 'Personal Information' ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> Save</>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name</Label>
                <Input 
                  value={athlete.firstName}
                  onChange={(e) => handleFieldChange('firstName', e.target.value, 'personal')}
                />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input 
                  value={athlete.lastName}
                  onChange={(e) => handleFieldChange('lastName', e.target.value, 'personal')}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={athlete.email || ''}
                  onChange={(e) => handleFieldChange('email', e.target.value, 'personal')}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input 
                  value={athlete.phone || ''}
                  onChange={(e) => handleFieldChange('phone', e.target.value, 'personal')}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Hometown</Label>
                <Input 
                  value={athlete.hometown || ''}
                  onChange={(e) => handleFieldChange('hometown', e.target.value, 'personal')}
                />
              </div>
              <div>
                <Label>Club / Academy</Label>
                <Input 
                  value={athlete.currentSchool || ''}
                  onChange={(e) => handleFieldChange('currentSchool', e.target.value, 'personal')}
                  placeholder="Club or academy name"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Sex</Label>
                <Select 
                  value={athlete.sex || ''}
                  onValueChange={(value) => handleFieldChange('sex', value || undefined, 'personal')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sex" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Men">Men</SelectItem>
                    <SelectItem value="Women">Women</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date of Birth</Label>
                <Input 
                  type="date"
                  value={athlete.dateOfBirth || ''}
                  onChange={(e) => handleFieldChange('dateOfBirth', e.target.value, 'personal')}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Class of (Graduation Year)</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Select multiple years if athlete is deciding between them
                </p>
                <div className="space-y-2">
                  {['2025', '2026', '2027', '2028', '2029', '2030'].map((year) => (
                    <div key={year} className="flex items-center space-x-2">
                      <Checkbox
                        id={`grad-year-${year}`}
                        checked={graduationYears.includes(year)}
                        onCheckedChange={(checked) => {
                          const newYears = checked
                            ? [...graduationYears, year]
                            : graduationYears.filter(y => y !== year);
                          setGraduationYears(newYears);
                          handleFieldChange('graduationYear', newYears.join(', '), 'personal');
                        }}
                      />
                      <label
                        htmlFor={`grad-year-${year}`}
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        {year}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label>Instagram Handle</Label>
                <Input 
                  placeholder="@username"
                  value={athlete.instagramHandle || ''}
                  onChange={(e) => handleFieldChange('instagramHandle', e.target.value, 'personal')}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Swing Coach</Label>
                <Input 
                  value={athlete.swingCoach || ''}
                  onChange={(e) => handleFieldChange('swingCoach', e.target.value, 'personal')}
                />
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <ImageUpload
                  label="Profile Image"
                  value={athlete.profileImage || ''}
                  onChange={(url) => handleFieldChange('profileImage', url, 'personal')}
                  athleteId={athlete.id}
                  type="profile"
                  description="Upload athlete's profile photo"
                />
              </div>
              <div>
                <ImageUpload
                  label="Cover Image"
                  value={athlete.coverImage || ''}
                  onChange={(url) => handleFieldChange('coverImage', url, 'personal')}
                  athleteId={athlete.id}
                  type="cover"
                  description="Upload athlete's cover photo"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status & Visibility */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                Status & Visibility
                {hasUnsavedChanges.status && (
                  <span className="h-2 w-2 rounded-full bg-yellow-500" />
                )}
              </CardTitle>
              <Button 
                onClick={() => handleSaveSection('Status & Visibility', {
                  status: athlete.status,
                  featured: athlete.featured,
                  committedTo: athlete.committedTo ?? null,
                  committedUniversityId: athlete.committedUniversityId ?? null,
                  transferIndividualRanking: athlete.transferIndividualRanking,
                  transferFromSchool: athlete.transferFromSchool,
                  transferFromDivision: athlete.transferFromDivision,
                })}
                disabled={isSaving === 'Status & Visibility' || !hasUnsavedChanges.status}
              >
                {isSaving === 'Status & Visibility' ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> Save</>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select
                  value={normalizeStatus(athlete.status)}
                  onValueChange={(value) => handleFieldChange('status', value, 'status')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ATHLETE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {statusLabel(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="featured"
                  checked={athlete.featured || false}
                  onCheckedChange={(checked) => handleFieldChange('featured', checked, 'status')}
                />
                <Label htmlFor="featured" className="cursor-pointer">
                  Display as featured athlete
                </Label>
              </div>
            </div>

            {/* Committed university — only for placed athletes. Selecting a school sets
                committed_university_id (FK) and committed_to (display cache); division
                is then derived from the FK in athletes_safe. No free text. */}
            {(normalizeStatus(athlete.status) === 'committed' || normalizeStatus(athlete.status) === 'in_college') && (
              <div>
                <Label>Committed to</Label>
                <CommittedUniversitySelect
                  value={athlete.committedUniversityId ?? null}
                  committedToName={athlete.committedTo ?? null}
                  onSelect={(sel) => {
                    setAthlete({
                      ...athlete,
                      committedUniversityId: sel?.id ?? undefined,
                      committedTo: sel?.name ?? undefined,
                      committedDivision: sel?.division ?? undefined,
                    });
                    setHasUnsavedChanges({ ...hasUnsavedChanges, status: true });
                  }}
                />
                {athlete.committedDivision && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Division: <span className="font-medium text-foreground">{athlete.committedDivision}</span>
                  </p>
                )}
              </div>
            )}

            {/* Conditional Transfer Fields */}
            {athlete.studentType === 'transfer' && (
              <div className="border-t pt-4 mt-4 space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Transfer Information
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Scoreboard Individual Ranking</Label>
                    <Input 
                      placeholder="e.g., #2, Top 5"
                      value={athlete.transferIndividualRanking || ''}
                      onChange={(e) => handleFieldChange('transferIndividualRanking', e.target.value, 'status')}
                    />
                  </div>
                  <div>
                    <Label>Current School</Label>
                    <Input 
                      placeholder="School transferring from"
                      value={athlete.transferFromSchool || ''}
                      onChange={(e) => handleFieldChange('transferFromSchool', e.target.value, 'status')}
                    />
                  </div>
                  <div>
                    <Label>School's Current Division</Label>
                    <Select 
                      value={athlete.transferFromDivision || ''}
                      onValueChange={(value) => handleFieldChange('transferFromDivision', value, 'status')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select division" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NCAA D1">NCAA D1</SelectItem>
                        <SelectItem value="NCAA D2">NCAA D2</SelectItem>
                        <SelectItem value="NCAA D3">NCAA D3</SelectItem>
                        <SelectItem value="NAIA">NAIA</SelectItem>
                        <SelectItem value="NJCAA 1">NJCAA 1</SelectItem>
                        <SelectItem value="NJCAA 2">NJCAA 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Academic */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                Academic
                {hasUnsavedChanges.academic && (
                  <span className="h-2 w-2 rounded-full bg-yellow-500" />
                )}
              </CardTitle>
              <Button 
                onClick={() => handleSaveSection('Academic', {
                  gpa: athlete.gpa,
                  satScore: athlete.satScore,
                  duolingoScore: athlete.duolingoScore,
                  intendedMajors: athlete.intendedMajors,
                  highSchoolYear: athlete.highSchoolYear,
                  studentType: athlete.studentType,
                })}
                disabled={isSaving === 'Academic' || !hasUnsavedChanges.academic}
              >
                {isSaving === 'Academic' ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> Save</>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>GPA</Label>
                <Input 
                  type="number"
                  step="0.01"
                  value={athlete.gpa}
                  onChange={(e) => handleFieldChange('gpa', parseFloat(e.target.value), 'academic')}
                />
              </div>
              <div>
                <Label>SAT Score</Label>
                <Input 
                  type="number"
                  value={athlete.satScore || ''}
                  onChange={(e) => handleFieldChange('satScore', e.target.value ? parseInt(e.target.value) : undefined, 'academic')}
                />
              </div>
              <div>
                <Label>Duolingo Score</Label>
                <Input 
                  type="number"
                  value={athlete.duolingoScore || ''}
                  onChange={(e) => handleFieldChange('duolingoScore', e.target.value ? parseInt(e.target.value) : undefined, 'academic')}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>High School Year</Label>
                <Select 
                  value={athlete.highSchoolYear}
                  onValueChange={(value) => handleFieldChange('highSchoolYear', value, 'academic')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Freshman">Freshman</SelectItem>
                    <SelectItem value="Sophomore">Sophomore</SelectItem>
                    <SelectItem value="Junior">Junior</SelectItem>
                    <SelectItem value="Senior">Senior</SelectItem>
                    <SelectItem value="Gap Year">Gap Year</SelectItem>
                    <SelectItem value="Undergraduate in France">Undergraduate in France</SelectItem>
                    <SelectItem value="In College - Freshman">In College - Freshman</SelectItem>
                    <SelectItem value="In College - Sophomore">In College - Sophomore</SelectItem>
                    <SelectItem value="In College - Junior">In College - Junior</SelectItem>
                    <SelectItem value="In College - Senior">In College - Senior</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Student Type</Label>
                <Select 
                  value={athlete.studentType || 'first_year'}
                  onValueChange={(value) => handleFieldChange('studentType', value, 'academic')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first_year">First Year</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Intended Majors</Label>
              <Input 
                value={athlete.intendedMajors || ''}
                onChange={(e) => handleFieldChange('intendedMajors', e.target.value, 'academic')}
                placeholder="e.g., Business, Engineering"
              />
            </div>
          </CardContent>
        </Card>

        {/* Golf Performance */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                Tennis Performance
                {hasUnsavedChanges.golf && (
                  <span className="h-2 w-2 rounded-full bg-yellow-500" />
                )}
              </CardTitle>
              <Button
                onClick={() => handleSaveSection('Golf Performance', {
                  starRating: athlete.starRating,
                  videoLink: athlete.videoLink,
                  tournamentResultsLink: athlete.tournamentResultsLink,
                  // Dual Rise — tennis
                  utr: (athlete as any).utr,
                  wtn: (athlete as any).wtn,
                  nationalRanking: (athlete as any).nationalRanking,
                  nationalRankingCountry: (athlete as any).nationalRankingCountry,
                  itfJuniorRanking: (athlete as any).itfJuniorRanking,
                  dominantHand: (athlete as any).dominantHand,
                  backhandType: (athlete as any).backhandType,
                  preferredSurface: (athlete as any).preferredSurface,
                  playStyle: (athlete as any).playStyle,
                  heightCm: (athlete as any).heightCm,
                  weightKg: (athlete as any).weightKg,
                  clubTeam: (athlete as any).clubTeam,
                  utrProfileLink: (athlete as any).utrProfileLink,
                  wtnProfileLink: (athlete as any).wtnProfileLink,
                } as any)}
                disabled={isSaving === 'Golf Performance' || !hasUnsavedChanges.golf}
              >
                {isSaving === 'Golf Performance' ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> Save</>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Default Scoring Period Configuration */}
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg mb-4">
              <h4 className="text-sm font-semibold mb-3 text-blue-900 dark:text-blue-100">
                Default Scoring Period Configuration
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Period Type</Label>
                  <Select
                    value={athlete.defaultScoringPeriodType || 'last_n'}
                    onValueChange={(value) => handleFieldChange('defaultScoringPeriodType', value, 'golf')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="last_n">Last N Tournaments</SelectItem>
                      <SelectItem value="year">Specific Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>
                    {athlete.defaultScoringPeriodType === 'year' ? 'Year' : 'Number of Tournaments'}
                  </Label>
                  {athlete.defaultScoringPeriodType === 'year' ? (
                    <Input
                      type="number"
                      placeholder="2025"
                      value={athlete.defaultScoringPeriodValue || new Date().getFullYear().toString()}
                      onChange={(e) => handleFieldChange('defaultScoringPeriodValue', e.target.value, 'golf')}
                    />
                  ) : (
                    <Select
                      value={athlete.defaultScoringPeriodValue || '5'}
                      onValueChange={(value) => handleFieldChange('defaultScoringPeriodValue', value, 'golf')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="7">7</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              
              <Button 
                variant="secondary" 
                size="sm" 
                className="mt-3"
                onClick={handleRecalculateMetrics}
                disabled={isRecalculating}
              >
                {isRecalculating ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Recalculating...</>
                ) : (
                  <><Calculator className="h-4 w-4 mr-2" /> Recalculate Metrics Now</>
                )}
              </Button>
            </div>

            {/* Coach View Preview Section */}
            <CoachScoringPreview
              athleteId={athlete.id}
              currentBestPeriod={athlete.best_recent_period_raw || athlete.best_recent_period}
              currentBestAvg={athlete.best_recent_scoring_avg_raw}
              currentBestVsCR={(() => {
                const map: Record<string, string | undefined> = {
                  'Last 3': athlete.scoring_avg_vs_cr_last_3,
                  'Last 5': athlete.scoring_avg_vs_cr_last_5,
                  'Last 7': athlete.scoring_avg_vs_cr_last_7,
                  'Last 10': athlete.scoring_avg_vs_cr_last_10,
                  'Current Year': athlete.scoring_avg_vs_cr_current_year,
                };
                return map[athlete.best_recent_period_raw || ''] ?? athlete.best_recent_scoring_avg;
              })()}
              currentBestVsPar={(() => {
                const map: Record<string, string | undefined> = {
                  'Last 3': athlete.scoring_avg_vs_par_last_3,
                  'Last 5': athlete.scoring_avg_vs_par_last_5,
                  'Last 7': athlete.scoring_avg_vs_par_last_7,
                  'Last 10': athlete.scoring_avg_vs_par_last_10,
                  'Current Year': athlete.scoring_avg_vs_par_current_year,
                };
                return map[athlete.best_recent_period_raw || ''] ?? undefined;
              })()}
              scoringOverrideEnabled={scoringPeriodOverride}
              selectedOverridePeriod={selectedOverridePeriod}
              onOverrideChange={(enabled) => {
                setScoringPeriodOverride(enabled);
                handleFieldChange('scoringAverageOverride', enabled, 'golf');
                handleFieldChange('scoringAvgVsCROverride', enabled, 'golf');
              }}
              onPeriodChange={(period) => {
                setSelectedOverridePeriod(period);
                // Map period to defaultScoringPeriodType/Value
                if (period === 'current_year') {
                  handleFieldChange('defaultScoringPeriodType', 'year', 'golf');
                  handleFieldChange('defaultScoringPeriodValue', new Date().getFullYear().toString(), 'golf');
                } else {
                  const num = period.replace('last_', '');
                  handleFieldChange('defaultScoringPeriodType', 'last_n', 'golf');
                  handleFieldChange('defaultScoringPeriodValue', num, 'golf');
                }
              }}
              onRefresh={refreshAthleteMetrics}
            />

            {/* Scoring Average Fields with Override Support */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center justify-between">
                  <span>Scoring Average</span>
                  {athlete.scoringAverageOverride && (
                    <Badge variant="outline" className="text-xs">Manual Override</Badge>
                  )}
                </Label>
                <Input 
                  type="number"
                  step="0.1"
                  value={athlete.scoringAverage}
                  onChange={(e) => handleFieldChange('scoringAverage', parseFloat(e.target.value), 'golf')}
                  onBlur={() => handleFieldChange('scoringAverageOverride', true, 'golf')}
                />
                {autoCalculatedScoring !== null && !athlete.scoringAverageOverride && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Auto-calculated: {autoCalculatedScoring.toFixed(2)} ({getPeriodLabel()})
                  </p>
                )}
              </div>
              
              <div>
                <Label className="flex items-center justify-between">
                  <span>Avg vs Course Rating</span>
                  {athlete.scoringAvgVsCROverride && (
                    <Badge variant="outline" className="text-xs">Manual Override</Badge>
                  )}
                </Label>
                <Input 
                  type="number"
                  step="0.1"
                  value={athlete.scoringAverageVsCourseRating}
                  onChange={(e) => handleFieldChange('scoringAverageVsCourseRating', parseFloat(e.target.value), 'golf')}
                  onBlur={() => handleFieldChange('scoringAvgVsCROverride', true, 'golf')}
                />
                {autoCalculatedVsCR !== null && !athlete.scoringAvgVsCROverride && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Auto-calculated: {autoCalculatedVsCR > 0 ? '+' : ''}{autoCalculatedVsCR.toFixed(2)} ({getPeriodLabel()})
                  </p>
                )}
              </div>
            </div>

            {/* Reset to Auto-Calculated Button */}
            {(athlete.scoringAverageOverride || athlete.scoringAvgVsCROverride) && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleResetToAutoCalculated}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Auto-Calculated Values
              </Button>
            )}

            {/* Star Rating Field */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Star Rating (0-7)</Label>
                <Input 
                  type="number"
                  min="0"
                  max="7"
                  value={athlete.starRating}
                  onChange={(e) => handleFieldChange('starRating', parseInt(e.target.value), 'golf')}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>UTR</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 11.60"
                  value={(athlete as any).utr ?? ''}
                  onChange={(e) => handleFieldChange('utr' as any, e.target.value ? parseFloat(e.target.value) : undefined, 'golf')}
                />
              </div>
              <div>
                <Label>WTN (lower is better)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 20.50"
                  value={(athlete as any).wtn ?? ''}
                  onChange={(e) => handleFieldChange('wtn' as any, e.target.value ? parseFloat(e.target.value) : undefined, 'golf')}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>National ranking</Label>
                <Input
                  type="number"
                  placeholder="e.g. 11"
                  value={(athlete as any).nationalRanking ?? ''}
                  onChange={(e) => handleFieldChange('nationalRanking' as any, e.target.value ? parseInt(e.target.value) : undefined, 'golf')}
                />
              </div>
              <div>
                <Label>Ranking country</Label>
                <Input
                  placeholder="e.g. Luxembourg"
                  value={(athlete as any).nationalRankingCountry ?? ''}
                  onChange={(e) => handleFieldChange('nationalRankingCountry' as any, e.target.value, 'golf')}
                />
              </div>
              <div>
                <Label>ITF Junior ranking</Label>
                <Input
                  type="number"
                  placeholder="e.g. 818"
                  value={(athlete as any).itfJuniorRanking ?? ''}
                  onChange={(e) => handleFieldChange('itfJuniorRanking' as any, e.target.value ? parseInt(e.target.value) : undefined, 'golf')}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Dominant hand</Label>
                <Input
                  placeholder="Right / Left"
                  value={(athlete as any).dominantHand ?? ''}
                  onChange={(e) => handleFieldChange('dominantHand' as any, e.target.value, 'golf')}
                />
              </div>
              <div>
                <Label>Backhand</Label>
                <Input
                  placeholder="One-handed / Two-handed"
                  value={(athlete as any).backhandType ?? ''}
                  onChange={(e) => handleFieldChange('backhandType' as any, e.target.value, 'golf')}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Preferred surface</Label>
                <Input
                  placeholder="Hard / Clay / Grass"
                  value={(athlete as any).preferredSurface ?? ''}
                  onChange={(e) => handleFieldChange('preferredSurface' as any, e.target.value, 'golf')}
                />
              </div>
              <div>
                <Label>Play style</Label>
                <Input
                  placeholder="e.g. Aggressive baseliner"
                  value={(athlete as any).playStyle ?? ''}
                  onChange={(e) => handleFieldChange('playStyle' as any, e.target.value, 'golf')}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Height (cm)</Label>
                <Input
                  type="number"
                  value={(athlete as any).heightCm ?? ''}
                  onChange={(e) => handleFieldChange('heightCm' as any, e.target.value ? parseInt(e.target.value) : undefined, 'golf')}
                />
              </div>
              <div>
                <Label>Weight (kg)</Label>
                <Input
                  type="number"
                  value={(athlete as any).weightKg ?? ''}
                  onChange={(e) => handleFieldChange('weightKg' as any, e.target.value ? parseInt(e.target.value) : undefined, 'golf')}
                />
              </div>
              <div>
                <Label>Club / Academy</Label>
                <Input
                  placeholder="e.g. Tennis Spora"
                  value={(athlete as any).clubTeam ?? ''}
                  onChange={(e) => handleFieldChange('clubTeam' as any, e.target.value, 'golf')}
                />
              </div>
            </div>
            
            <Separator />
            
            <h4 className="text-sm font-semibold mb-2">External Links</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Video Link</Label>
                <Input 
                  type="url"
                  placeholder="https://youtube.com/..."
                  value={athlete.videoLink || ''}
                  onChange={(e) => handleFieldChange('videoLink', e.target.value, 'golf')}
                />
              </div>
              <div>
                <Label>Tournament Results Link</Label>
                <Input 
                  type="url"
                  placeholder="https://..."
                  value={athlete.tournamentResultsLink || ''}
                  onChange={(e) => handleFieldChange('tournamentResultsLink', e.target.value, 'golf')}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>UTR profile link</Label>
                <Input
                  type="url"
                  placeholder="https://app.utrsports.net/profiles/..."
                  value={(athlete as any).utrProfileLink || ''}
                  onChange={(e) => handleFieldChange('utrProfileLink' as any, e.target.value, 'golf')}
                />
              </div>
              <div>
                <Label>WTN profile link</Label>
                <Input
                  type="url"
                  placeholder="https://worldtennisnumber.com/..."
                  value={(athlete as any).wtnProfileLink || ''}
                  onChange={(e) => handleFieldChange('wtnProfileLink' as any, e.target.value, 'golf')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                Preferences & Notes
                {hasUnsavedChanges.preferences && (
                  <span className="h-2 w-2 rounded-full bg-yellow-500" />
                )}
              </CardTitle>
              <Button 
                onClick={() => handleSaveSection('Preferences', {
                  preferredDivisions: athlete.preferredDivisions,
                  preferredStates: athlete.preferredStates,
                  budget: athlete.budget,
                  weatherZone: athlete.weatherZone,
                  strengths: athlete.strengths,
                  areasOfImprovement: athlete.areasOfImprovement,
                  recruitmentPitch: athlete.recruitmentPitch,
                })}
                disabled={isSaving === 'Preferences' || !hasUnsavedChanges.preferences}
              >
                {isSaving === 'Preferences' ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> Save</>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Preferred Division (select all that apply)</Label>
              <div className="space-y-2 mt-2">
                {['NCAA D1', 'NCAA D2', 'NCAA D3', 'NAIA', 'NJCAA 1', 'NJCAA 2'].map((division) => (
                  <div key={division} className="flex items-center space-x-2">
                    <Checkbox
                      id={`division-${division}`}
                      checked={athlete.preferredDivisions?.includes(division) || false}
                      onCheckedChange={(checked) => {
                        const currentDivisions = athlete.preferredDivisions || [];
                        const newDivisions = checked
                          ? [...currentDivisions, division]
                          : currentDivisions.filter(d => d !== division);
                        handleFieldChange('preferredDivisions', newDivisions, 'preferences');
                      }}
                    />
                    <Label htmlFor={`division-${division}`} className="font-normal cursor-pointer">
                      {division}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label>Budget ($)</Label>
              <Input 
                type="number"
                value={athlete.budget}
                onChange={(e) => handleFieldChange('budget', parseFloat(e.target.value), 'preferences')}
              />
            </div>
            <div>
              <Label>Preferred States</Label>
              <Input 
                placeholder="e.g., California, Texas, Florida (comma-separated)"
                value={athlete.preferredStates?.join(', ') || ''}
                onChange={(e) => handleFieldChange('preferredStates', e.target.value.split(',').map(s => s.trim()).filter(s => s), 'preferences')}
              />
            </div>
            <div>
              <Label>Weather Zone</Label>
              <div className="space-y-2 mt-2">
                {['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4'].map((zone) => (
                  <div key={zone} className="flex items-center space-x-2">
                    <Checkbox
                      id={`weather-${zone}`}
                      checked={weatherZones.includes(zone)}
                      onCheckedChange={(checked) => {
                        const newZones = checked
                          ? [...weatherZones, zone]
                          : weatherZones.filter(z => z !== zone);
                        setWeatherZones(newZones);
                        handleFieldChange('weatherZone', newZones.join(', '), 'preferences');
                      }}
                    />
                    <label htmlFor={`weather-${zone}`} className="text-sm cursor-pointer">
                      {zone} — {WEATHER_ZONE_LABELS[zone]}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label>Strengths</Label>
              <Textarea 
                value={athlete.strengths || ''}
                onChange={(e) => handleFieldChange('strengths', e.target.value, 'preferences')}
                rows={3}
              />
            </div>
            <div>
              <Label>Areas of Improvement</Label>
              <Textarea 
                value={athlete.areasOfImprovement || ''}
                onChange={(e) => handleFieldChange('areasOfImprovement', e.target.value, 'preferences')}
                rows={3}
              />
            </div>
            <div>
              <Label>Recruitment Pitch</Label>
              <Textarea 
                value={athlete.recruitmentPitch || ''}
                onChange={(e) => handleFieldChange('recruitmentPitch', e.target.value, 'preferences')}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Performance Analytics */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-muted rounded-lg">
                <Trophy className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-3xl font-bold">{tournamentsPlayed}</p>
                <p className="text-sm text-muted-foreground">Tournaments Played</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <Target className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-3xl font-bold">{top3Finishes}</p>
                <p className="text-sm text-muted-foreground">Top 3 Finishes</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                <p className="text-3xl font-bold">{victories}</p>
                <p className="text-sm text-muted-foreground">Victories</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <TrendingDown className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-3xl font-bold">{avgScore || "-"}</p>
                <p className="text-sm text-muted-foreground">
                  Best Avg {bestRecentPeriod && `(${bestRecentPeriod})`}
                </p>
              </div>
            </div>

            {/* Refresh All Statistics Button */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-muted-foreground">
                Performance metrics across all periods (Last 3, 5, 7, 10, Current Year, All-time)
              </div>
              <Button
                onClick={async () => {
                  if (!id) return;
                  setIsRecalculating(true);
                  try {
                    const { error } = await supabase.functions.invoke('calculate-athlete-metrics', {
                      body: {
                        athleteId: id,
                        refreshAll: true
                      }
                    });

                    if (error) throw error;

                    // Refresh athlete data
                    const athleteData = await getAthleteById(id);
                    if (athleteData) {
                      setAthlete(athleteData);
                    }

                    toast({
                      title: "Success",
                      description: "All statistics refreshed successfully",
                    });
                  } catch (error) {
                    console.error('Error refreshing statistics:', error);
                    toast({
                      title: "Error",
                      description: "Failed to refresh statistics",
                      variant: "destructive"
                    });
                  } finally {
                    setIsRecalculating(false);
                  }
                }}
                variant="outline"
                size="sm"
                disabled={isRecalculating}
              >
                {isRecalculating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Refresh All Statistics
                  </>
                )}
              </Button>
            </div>

            <AthleteMetricsTable 
              athleteId={id!}
              tournamentResults={tournamentResults}
            />
          </CardContent>
        </Card>

        {/* Tournament Participations */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <CardTitle>Tournament Participations</CardTitle>
                {unsavedRows.length > 0 && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                    <CloudOff className="h-3 w-3 mr-1" />
                    {unsavedRows.length} non sauvegardé(s)
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                {selectedResults.size > 0 && (
                  <Button 
                    onClick={handleBulkDelete} 
                    variant="destructive" 
                    size="sm"
                    disabled={savingRowId === 'bulk-delete'}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected ({selectedResults.size})
                  </Button>
                )}
                <Button onClick={() => setShowImportModal(true)} variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Import Results (CSV)
                </Button>
                <Button onClick={addNewTournamentRow} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Tournament Result
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground mb-4">
              {tournamentResults.length} tournaments recorded
            </div>

            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px] py-2 px-3 text-xs font-medium bg-muted/30">
                      <Checkbox
                        checked={tournamentResults.length > 0 && selectedResults.size === tournamentResults.length}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all tournament results"
                      />
                    </TableHead>
                    <TableHead className="py-2 px-3 text-xs font-medium bg-muted/30 whitespace-nowrap">Tournament</TableHead>
                    <TableHead className="text-center py-2 px-3 text-xs font-medium bg-muted/30 whitespace-nowrap">R1</TableHead>
                    <TableHead className="text-center py-2 px-3 text-xs font-medium bg-muted/30 whitespace-nowrap">R2</TableHead>
                    <TableHead className="text-center py-2 px-3 text-xs font-medium bg-muted/30 whitespace-nowrap">R3</TableHead>
                    <TableHead className="text-center py-2 px-3 text-xs font-medium bg-muted/30 whitespace-nowrap">R4</TableHead>
                    <TableHead className="text-center py-2 px-3 text-xs font-medium bg-muted/30 whitespace-nowrap">Total</TableHead>
                    <TableHead className="text-center py-2 px-3 text-xs font-medium bg-muted/30 whitespace-nowrap">Avg</TableHead>
                    <TableHead className="text-center py-2 px-3 text-xs font-medium bg-muted/30 whitespace-nowrap">Position</TableHead>
                    <TableHead className="text-center py-2 px-3 text-xs font-medium bg-muted/30 whitespace-nowrap">Field</TableHead>
                    <TableHead className="py-2 px-3 text-xs font-medium bg-muted/30 whitespace-nowrap">Results Link</TableHead>
                    <TableHead className="py-2 px-3 text-xs font-medium bg-muted/30 whitespace-nowrap">Notes</TableHead>
                    <TableHead className="w-[100px] py-2 px-3 text-xs font-medium bg-muted/30 whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unsavedRows.length === 0 && tournamentResults.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                        No tournament results recorded yet. Click "Add Tournament Result" to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {unsavedRows.map((row, index) => {
                        // For unsaved rows, get field size from selected tournament
                        const selectedTournament = tournaments.find(t => t.id === row.tournamentId);
                        const rowWithFieldSize = {
                          ...row,
                          tournamentFieldSize: selectedTournament?.participatingAthletes || null,
                        };
                        return (
                          <TournamentResultEditRow
                            key={row.id}
                            row={rowWithFieldSize}
                            onUpdate={updateUnsavedRow}
                            onSave={saveNewResult}
                            onDelete={removeUnsavedRow}
                            onFieldSizeUpdate={handleFieldSizeUpdate}
                            onTournamentSelected={handleTournamentSelectedMerge}
                            onCreateNew={(name) => handleCreateNewTournament(row.id, name, false)}
                            isNew={true}
                            isSaving={savingRowId === row.id}
                            rowIndex={index}
                            onNavigate={onNavigate}
                            onRegisterField={registerField}
                          />
                        );
                      })}
                      
                  {tournamentResults.map((result, index) => (
                    <TournamentResultEditRow
                      key={result.id}
                      row={mapResultToRow(result)}
                      onUpdate={updateExistingRow}
                      onSave={saveExistingResult}
                      onDelete={deleteResult}
                      onFieldSizeUpdate={handleFieldSizeUpdate}
                      onTournamentSelected={handleTournamentSelectedMerge}
                      onCreateNew={(name) => handleCreateNewTournament(result.id, name, true)}
                      isNew={false}
                      isSaving={savingRowId === result.id}
                      rowIndex={unsavedRows.length + index}
                      onNavigate={onNavigate}
                      onRegisterField={registerField}
                      isSelected={selectedResults.has(result.id)}
                      onToggleSelect={() => toggleResultSelection(result.id)}
                    />
                  ))}
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <AthleteProfileModal
        isOpen={showCoachPreview}
        onClose={() => setShowCoachPreview(false)}
        athlete={athlete}
        tournamentResults={tournamentResults}
      />

      <TournamentResultsImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        athleteId={id || ''}
        existingTournaments={tournaments}
        onImportComplete={async () => {
          // Refresh both tournament results and tournaments list after import
          if (id) {
            const [resultsResponse, tournamentsList] = await Promise.all([
              supabase
                .from('tournament_results')
                .select('*, tournaments(*)')
                .eq('athlete_id', id)
                .order('created_at', { ascending: false }),
              listTournaments(),
            ]);
            
            if (resultsResponse.data) {
              const sortedResults = sortTournamentResults(resultsResponse.data);
              setTournamentResults(sortedResults);
            }
            setTournaments(tournamentsList);
          }
        }}
      />
      
      {/* Tournament Reassignment Guard Dialog */}
      <AlertDialog
        open={!!pendingTournamentChange}
        onOpenChange={(open) => { if (!open) cancelTournamentChange(); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change tournament for this result?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reassign the result to a different tournament. Make sure you've picked the right one.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelTournamentChange}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmTournamentChange}>Confirm change</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the athlete profile
              and remove all associated data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

export default AdminAthleteDetail;

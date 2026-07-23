import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { normalizeDivisionsWithDefault, normalizeIntendedMajors, normalizeWeatherZones } from '@/lib/divisionNormalizer';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';

import { 
  Search, User, MessageSquare, MoreVertical, Grid3X3, List, Star, 
  StarOff, Trophy, TrendingUp, AlertCircle, Calendar, MapPin, 
  Target, Activity, FileText, Download, Filter, Tag, Flag,
  ChevronUp, ChevronDown, Eye, Mail, Phone, Clock, Bookmark, Loader2
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ExternalLink } from 'lucide-react';
import { TournamentPerformanceTab } from '@/components/TournamentPerformanceTab';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import AthleteProfileModal from '@/components/AthleteProfileModal';
import PDFExportModal from '@/components/PDFExportModal';
import ContactRequestModal from '@/components/ContactRequestModal';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { AthleteMetricsDisplay } from "@/components/AthleteMetricsDisplay";
import { AverageScoreDisplay } from "@/components/AverageScoreDisplay";
import { isCoachViewable, normalizeStatus, hasUniversityTag } from "@/lib/athleteStatus";

interface FavoriteAthlete {
  id: string;
  athlete_id: string;
  status: string;
  notes: string;
  created_at: string;
  athlete: {
    id: string;
    first_name: string;
    last_name: string;
    graduation_year: string | null;
    academic_gpa: number | null;
    scoring_average: string | null;
    best_recent_scoring_avg_raw: string | null;
    country: string | null;
    committed: boolean;
    committed_to: string | null;
    intended_majors: string | null;
    preferences_budget: string | null;
    preferences_division: string | null;
    french_adult_ranking: string | null;
    french_ranking_in_their_class: string | null;
    wagr_ranking: string | null;
    profile_photo: string | null;
    drive_distance_carry: string | null;
    max_club_head_speed: string | null;
    star_rating: number | null;
    preferences_region: string | null;
  };
}

const Favorites = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_added');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [favoriteAthletes, setFavoriteAthletes] = useState<FavoriteAthlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAthleteForModal, setSelectedAthleteForModal] = useState<any>(null);
  const [editingNotes, setEditingNotes] = useState<{ id: string; notes: string } | null>(null);
  const [contactModalAthlete, setContactModalAthlete] = useState<any>(null);
  const [showPDFExportModal, setShowPDFExportModal] = useState(false);
  const [tournamentResults, setTournamentResults] = useState<any[]>([]);
  
  // Mock categories and tags
  const categories = [
    { id: 'prospects', name: 'Top Prospects', count: 0, color: 'primary' },
    { id: 'interested', name: 'Highly Interested', count: 0, color: 'secondary' },
    { id: 'monitoring', name: 'Monitoring', count: 0, color: 'muted' },
  ];
  
  // Fetch favorite athletes from Supabase
  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Favorites store (coach_id, athlete_id). Do NOT join the base `athletes`
        // table — it is RLS-blocked for coaches, which made this return 0 rows.
        // Fetch the favorite rows, then hydrate athlete info from the coach-safe
        // `athletes_safe` view (same pattern as MyContactRequests).
        const { data, error } = await supabase
          .from('favorites')
          .select('id, athlete_id, status, notes, created_at')
          .eq('coach_id', user.id);

        if (error) {
          console.error('Error fetching favorites:', error);
          toast({
            title: "Error",
            description: "Failed to load favorite athletes",
            variant: "destructive",
          });
        } else {
          const athleteIds = (data ?? []).map((f) => f.athlete_id).filter(Boolean);
          let athleteById = new Map<string, any>();
          if (athleteIds.length > 0) {
            const { data: athletes } = await supabase
              .from('athletes_safe' as any)
              .select('id, first_name, last_name, graduation_year, academic_gpa, scoring_average, best_recent_scoring_avg_raw, country, committed, committed_to, intended_majors, preferences_budget, preferences_division, french_adult_ranking, french_ranking_in_their_class, wagr_ranking, profile_photo, drive_distance_carry, max_club_head_speed, status, star_rating, preferences_region')
              .in('id', athleteIds);
            athleteById = new Map(((athletes ?? []) as any[]).map((a) => [a.id, a]));
          }

          // Merge; keep only coach-viewable athletes (available / committed /
          // in_college — never in_creation / archived).
          const formattedData = (data ?? [])
            .map((item) => ({ ...item, athlete: athleteById.get(item.athlete_id) }))
            .filter((item) => item.athlete && isCoachViewable(item.athlete.status));
          setFavoriteAthletes(formattedData as any);

          // Tournament results only for AVAILABLE favorites (committed / in_college
          // are shown as name + tag only, no metrics).
          const availableIds = formattedData
            .filter((item) => normalizeStatus(item.athlete.status) === 'available')
            .map((item) => item.athlete_id);
          if (availableIds.length > 0) {
            const { data: resultsData, error: resultsError } = await supabase
              .from('tournament_results')
              .select(`
                *,
                tournaments (
                  id,
                  name,
                  year,
                  start_date,
                  end_date,
                  location,
                  country,
                  course_par,
                  course_rating,
                  results_link
                )
              `)
              .in('athlete_id', availableIds)
              .order('created_at', { ascending: false });

            if (!resultsError && resultsData) {
              setTournamentResults(resultsData);
            }
          }
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [user]);

  const filteredAthletes = favoriteAthletes.filter(favorite => {
    const fullName = `${favorite.athlete.first_name} ${favorite.athlete.last_name}`.toLowerCase();
    if (searchQuery && !fullName.includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (statusFilter !== 'all' && favorite.status !== statusFilter) {
      return false;
    }
    // Add filter for recent activity
    if (categoryFilter === 'recent') {
      const date = new Date(favorite.created_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date > weekAgo;
    }
    return true;
  });

  const dashboardStats = {
    totalFavorites: favoriteAthletes.length,
    highlyInterested: favoriteAthletes.filter(f => f.status === 'highly_interested').length,
    contacted: favoriteAthletes.filter(f => f.status === 'contacted').length,
    recentActivity: favoriteAthletes.filter(f => {
      const date = new Date(f.created_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date > weekAgo;
    }).length,
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${
          i < Math.floor(rating) 
            ? 'fill-usap-orange text-usap-orange' 
            : 'fill-transparent text-gray-300'
        }`}
      />
    ));
  };

  const getPriorityColor = (status: string) => {
    switch(status) {
      case 'highly_interested': return 'bg-red-100 text-red-800';
      case 'contacted': return 'bg-yellow-100 text-yellow-800';
      case 'interested': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPerformanceIcon = (trend: string) => {
    switch(trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining': return <ChevronDown className="h-4 w-4 text-red-500" />;
      default: return <ChevronUp className="h-4 w-4 text-gray-500" />;
    }
  };

  const removeFavorite = async (favoriteId: string) => {
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', favoriteId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to remove from favorites",
          variant: "destructive",
        });
      } else {
        setFavoriteAthletes(prev => prev.filter(f => f.id !== favoriteId));
        toast({
          title: "Success",
          description: "Removed from favorites",
        });
      }
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  const updateFavoriteNotes = async (favoriteId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('favorites')
        .update({ notes })
        .eq('id', favoriteId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update notes",
          variant: "destructive",
        });
      } else {
        setFavoriteAthletes(prev => 
          prev.map(f => f.id === favoriteId ? { ...f, notes } : f)
        );
        toast({
          title: "Success",
          description: "Notes updated",
        });
      }
    } catch (error) {
      console.error('Error updating notes:', error);
    }
  };

  const recordContact = async (favoriteId: string, note: string) => {
    try {
      const { error } = await supabase
        .from('favorites')
        .update({ 
          status: 'contacted',
          notes: note || `Contacted on ${new Date().toLocaleDateString()}`
        })
        .eq('id', favoriteId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to record contact",
          variant: "destructive",
        });
      } else {
        setFavoriteAthletes(prev => 
          prev.map(f => f.id === favoriteId ? { 
            ...f, 
            status: 'contacted',
            notes: note || `Contacted on ${new Date().toLocaleDateString()}`
          } : f)
        );
        toast({
          title: "Success",
          description: "Contact recorded",
        });
      }
    } catch (error) {
      console.error('Error recording contact:', error);
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString();
    
    // Title
    doc.setFontSize(20);
    doc.text('Favorite Athletes List', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated on: ${date}`, 14, 28);
    
    // Prepare table data - use the filteredAthletes that are already being displayed
    const tableData = filteredAthletes.map(favorite => {
      const athlete = favorite.athlete;
      const statusLabel = {
        'highly_interested': 'Highly Interested',
        'interested': 'Interested',
        'monitoring': 'Monitoring',
        'contacted': 'Contacted',
      }[favorite.status] || favorite.status;
      
      return [
        `${athlete.first_name} ${athlete.last_name}`,
        athlete.graduation_year?.toString() || 'N/A',
        athlete.academic_gpa?.toFixed(1) || 'N/A',
        athlete.country || 'N/A',
        statusLabel,
        favorite.notes || 'No notes'
      ];
    });
    
    // Add table
    autoTable(doc, {
      head: [['Name', 'Grad Year', 'GPA', 'Country', 'Status', 'Notes']],
      body: tableData,
      startY: 35,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });
    
    // Add summary
    const finalY = (doc as any).lastAutoTable.finalY || 35;
    doc.setFontSize(10);
    doc.text(`Total Athletes: ${filteredAthletes.length}`, 14, finalY + 10);
    
    // Save the PDF
    doc.save(`favorite-athletes-${date.replace(/\//g, '-')}.pdf`);
    
    toast({
      title: "Export Successful",
      description: "Your favorite athletes list has been downloaded as a PDF",
    });
  };

  const bulkUpdateStatus = async (athleteIds: string[], status: string) => {
    try {
      const { error } = await supabase
        .from('favorites')
        .update({ status })
        .in('id', athleteIds);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update status",
          variant: "destructive",
        });
      } else {
        setFavoriteAthletes(prev => 
          prev.map(f => athleteIds.includes(f.id) ? { ...f, status } : f)
        );
        setSelectedAthletes([]);
        toast({
          title: "Success",
          description: `Updated ${athleteIds.length} athletes`,
        });
      }
    } catch (error) {
      console.error('Error bulk updating:', error);
    }
  };

  const bulkRemoveFavorites = async (athleteIds: string[]) => {
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .in('id', athleteIds);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to remove favorites",
          variant: "destructive",
        });
      } else {
        setFavoriteAthletes(prev => prev.filter(f => !athleteIds.includes(f.id)));
        setSelectedAthletes([]);
        toast({
          title: "Success",
          description: `Removed ${athleteIds.length} athletes from favorites`,
        });
      }
    } catch (error) {
      console.error('Error bulk removing:', error);
    }
  };

  const updateFavoriteStatus = async (favoriteId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('favorites')
        .update({ status: newStatus })
        .eq('id', favoriteId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update status",
          variant: "destructive",
        });
      } else {
        setFavoriteAthletes(prev => 
          prev.map(f => f.id === favoriteId ? { ...f, status: newStatus } : f)
        );
        toast({
          title: "Success",
          description: "Status updated",
        });
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // AthleteCard component
  const AthleteCard = ({ favorite }: { favorite: FavoriteAthlete }) => {
    const athlete = favorite.athlete;
    const fullName = `${athlete.first_name} ${athlete.last_name}`;
    // Placed athletes (committed OR in_college): shown as name + tag, non-clickable.
    const isInCollege = normalizeStatus(athlete.status) === 'in_college';
    const isCommitted = hasUniversityTag(athlete.status) || athlete.committed;
    
    return (
      <Card className="relative hover:shadow-lg transition-shadow">
        {/* Checkbox for selection */}
        <div className="absolute top-3 left-3 z-10">
          <Checkbox 
            checked={selectedAthletes.includes(favorite.id)}
            onCheckedChange={(checked) => {
              if (checked) {
                setSelectedAthletes([...selectedAthletes, favorite.id]);
              } else {
                setSelectedAthletes(selectedAthletes.filter(id => id !== favorite.id));
              }
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        
        <div className="absolute top-3 right-3 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => setSelectedAthleteForModal(athlete)}
                disabled={isCommitted}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Profile {isCommitted && <span className="text-xs ml-1">(unavailable - committed)</span>}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setContactModalAthlete(athlete)}
                disabled={isCommitted}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Contact Athlete {isCommitted && <span className="text-xs ml-1">(unavailable - committed)</span>}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => removeFavorite(favorite.id)} className="text-red-600">
                <StarOff className="h-4 w-4 mr-2" />
                Remove from Favorites
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Committed Overlay */}
        {isCommitted && (
          <div className="absolute inset-0 bg-background/30 backdrop-blur-sm z-20 flex items-center justify-center rounded-lg">
            <div className="text-center space-y-2">
              <Badge variant="destructive" className="text-lg px-4 py-2">
                {isInCollege ? 'IN COLLEGE' : 'COMMITTED'}
              </Badge>
              {athlete.committed_to && (
                <p className="text-sm font-medium">
                  {isInCollege ? 'Plays for' : 'Committed to'} {athlete.committed_to}
                </p>
              )}
            </div>
          </div>
        )}

        <CardHeader className="pb-3 pl-12">
          <div className="flex items-start gap-3">
            {athlete.profile_photo ? (
              <img 
                src={athlete.profile_photo} 
                alt={fullName}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
            )}
            <div className="flex-1">
              <CardTitle className="text-lg">{fullName}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {athlete.country || 'N/A'} • Class of {athlete.graduation_year || 'N/A'}
              </p>
              <Badge className={`mt-2 ${getPriorityColor(favorite.status)}`}>
                {favorite.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span>GPA: {athlete.academic_gpa?.toFixed(2) || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>Budget: {athlete.preferences_budget || 'N/A'}</span>
            </div>
          </div>
          
          <div className="p-2 bg-accent/20 rounded-md">
            <p className="text-xs text-muted-foreground mb-1">Average Score:</p>
            <AverageScoreDisplay 
              athleteId={athlete.id}
              compact={true}
            />
          </div>
          
          <div className="p-2 bg-accent/20 rounded-md">
            <p className="text-xs text-muted-foreground mb-1">Avg vs Course Rating:</p>
            <AthleteMetricsDisplay 
              athleteId={athlete.id}
              showTitle={false}
              compact={true}
              defaultPeriod="all_time"
            />
          </div>

          {editingNotes?.id === favorite.id ? (
            <div className="p-3 bg-muted rounded-md space-y-2">
              <Textarea
                value={editingNotes.notes}
                onChange={(e) => setEditingNotes({ ...editingNotes, notes: e.target.value })}
                className="min-h-[60px]"
                placeholder="Add notes..."
              />
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={() => {
                    updateFavoriteNotes(favorite.id, editingNotes.notes);
                    setEditingNotes(null);
                  }}
                >
                  Save
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setEditingNotes(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : favorite.notes ? (
            <div 
              className="p-3 bg-muted rounded-md cursor-pointer hover:bg-muted/80 transition-colors"
              onClick={() => setEditingNotes({ id: favorite.id, notes: favorite.notes })}
            >
              <p className="text-sm text-muted-foreground">{favorite.notes}</p>
              <p className="text-xs text-muted-foreground mt-1">Click to edit</p>
            </div>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => setEditingNotes({ id: favorite.id, notes: '' })}
            >
              <FileText className="h-4 w-4 mr-1" />
              Add Notes
            </Button>
          )}

          <div className="flex gap-2">
            <Button 
              variant="secondary" 
              size="sm" 
              className="flex-1"
              onClick={() => setSelectedAthleteForModal(athlete)}
              disabled={isCommitted}
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => setContactModalAthlete(athlete)}
              disabled={isCommitted}
            >
              <Mail className="h-4 w-4 mr-1" />
              Contact
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-w-0 px-3 sm:px-6 py-4 sm:py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Favorite Athletes</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage your top recruiting prospects
          </p>
        </div>
        <div className="flex gap-2 flex-wrap w-full sm:w-auto sm:flex-nowrap">
          <Button className="w-full sm:w-auto" variant="outline" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            Export List
          </Button>
          <Button className="w-full sm:w-auto" onClick={() => navigate('/athletes')}>
            <Search className="h-4 w-4 mr-2" />
            Find Athletes
          </Button>
        </div>
      </div>

      {/* Dashboard Stats - Clickable Filter Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card 
          className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] hover:border-primary/50"
          onClick={() => setStatusFilter('all')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Favorites
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{dashboardStats.totalFavorites}</div>
            {statusFilter === 'all' && (
              <div className="mt-2 h-1 bg-primary rounded-full" />
            )}
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] hover:border-green-500/50"
          onClick={() => setStatusFilter(statusFilter === 'highly_interested' ? 'all' : 'highly_interested')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Highly Interested
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {dashboardStats.highlyInterested}
            </div>
            {statusFilter === 'highly_interested' && (
              <div className="mt-2 h-1 bg-green-600 rounded-full" />
            )}
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] hover:border-blue-500/50"
          onClick={() => setStatusFilter(statusFilter === 'contacted' ? 'all' : 'contacted')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contacted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {dashboardStats.contacted}
            </div>
            {statusFilter === 'contacted' && (
              <div className="mt-2 h-1 bg-blue-600 rounded-full" />
            )}
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] hover:border-purple-500/50"
          onClick={() => {
            // For recent activity, we'll add a custom filter
            if (categoryFilter === 'recent') {
              setCategoryFilter('all');
            } else {
              setCategoryFilter('recent');
            }
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {dashboardStats.recentActivity}
            </div>
            {categoryFilter === 'recent' && (
              <div className="mt-2 h-1 bg-purple-600 rounded-full" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tournament">Tournament Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Filters Bar */}
          <Card className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[250px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search athletes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="highly_interested">Highly Interested</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="interested">Interested</SelectItem>
                  <SelectItem value="monitoring">Monitoring</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date_added">Date Added</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="ranking">Ranking</SelectItem>
                  <SelectItem value="gpa">GPA</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setViewMode('table')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Bulk Actions Bar */}
            {selectedAthletes.length > 0 && (
              <div className="flex items-center justify-between gap-4 p-2 bg-primary/10 rounded-md mt-4">
                <span className="text-sm font-medium">
                  {selectedAthletes.length} selected
                </span>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => {
                      if (selectedAthletes.length === 0) {
                        toast({
                          title: "No athletes selected",
                          description: "Please select athletes to export",
                          variant: "destructive",
                        });
                        return;
                      }
                      setShowPDFExportModal(true);
                    }}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Export Profiles
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline">
                        Update Status
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => bulkUpdateStatus(selectedAthletes, 'highly_interested')}>
                        Highly Interested
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => bulkUpdateStatus(selectedAthletes, 'contacted')}>
                        Contacted
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => bulkUpdateStatus(selectedAthletes, 'interested')}>
                        Interested
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => bulkUpdateStatus(selectedAthletes, 'monitoring')}>
                        Monitoring
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => {
                      if (confirm(`Remove ${selectedAthletes.length} athletes from favorites?`)) {
                        bulkRemoveFavorites(selectedAthletes);
                      }
                    }}
                  >
                    <StarOff className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Athletes Display */}
          {viewMode === 'grid' ? (
            <div className="grid min-w-0 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAthletes.map((favorite) => (
                <AthleteCard key={favorite.id} favorite={favorite} />
              ))}
            </div>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox 
                        checked={selectedAthletes.length > 0 && selectedAthletes.length === filteredAthletes.length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedAthletes(filteredAthletes.map(f => f.id));
                          } else {
                            setSelectedAthletes([]);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ranking</TableHead>
                    <TableHead>GPA</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAthletes.map((favorite) => {
                    const isInCollege = normalizeStatus(favorite.athlete.status) === 'in_college';
                    const isCommitted = hasUniversityTag(favorite.athlete.status) || favorite.athlete.committed;
                    return (
                      <TableRow key={favorite.id} className={isCommitted ? 'opacity-60' : ''}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedAthletes.includes(favorite.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedAthletes([...selectedAthletes, favorite.id]);
                              } else {
                                setSelectedAthletes(selectedAthletes.filter(id => id !== favorite.id));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {favorite.athlete.profile_photo ? (
                              <img 
                                src={favorite.athlete.profile_photo} 
                                alt={`${favorite.athlete.first_name} ${favorite.athlete.last_name}`}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{favorite.athlete.first_name} {favorite.athlete.last_name}</p>
                              <p className="text-sm text-muted-foreground">
                                Class of {favorite.athlete.graduation_year || 'N/A'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isCommitted ? (
                            <div className="flex flex-col gap-1">
                              <Badge variant="destructive">
                                {isInCollege ? 'IN COLLEGE' : 'COMMITTED'}
                              </Badge>
                              {favorite.athlete.committed_to && (
                                <span className="text-xs text-muted-foreground">
                                  {isInCollege ? 'Plays for' : 'Committed to'} {favorite.athlete.committed_to}
                                </span>
                              )}
                            </div>
                          ) : (
                            <Badge className={getPriorityColor(favorite.status)}>
                              {favorite.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                          )}
                        </TableCell>
                      <TableCell>{favorite.athlete.french_adult_ranking || 'N/A'}</TableCell>
                      <TableCell>{favorite.athlete.academic_gpa?.toFixed(2) || 'N/A'}</TableCell>
                      <TableCell>{favorite.athlete.preferences_budget || 'N/A'}</TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="text-sm text-muted-foreground truncate">
                          {favorite.notes || 'No notes'}
                        </p>
                      </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => setSelectedAthleteForModal(favorite.athlete)}
                                disabled={isCommitted}
                              >
                                View Profile {isCommitted && <span className="text-xs ml-1">(unavailable)</span>}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => setContactModalAthlete(favorite.athlete)}
                                disabled={isCommitted}
                              >
                                Contact Athlete {isCommitted && <span className="text-xs ml-1">(unavailable)</span>}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => removeFavorite(favorite.id)} className="text-red-600">
                                Remove from Favorites
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
        )}
        </TabsContent>

        <TabsContent value="tournament" className="space-y-4">
          <TournamentPerformanceTab 
            favoriteAthletes={favoriteAthletes} 
            tournamentResults={tournamentResults}
          />
        </TabsContent>
      </Tabs>
      
      {/* Athlete Profile Modal */}
      <AthleteProfileModal
        isOpen={!!selectedAthleteForModal}
        onClose={() => setSelectedAthleteForModal(null)}
        athlete={selectedAthleteForModal}
        tournamentResults={tournamentResults.filter(
          tr => tr.athlete_id === selectedAthleteForModal?.athlete?.id
        )}
      />
      
      {/* Contact Request Modal */}
      {contactModalAthlete && (
        <ContactRequestModal
          isOpen={true}
          onClose={() => setContactModalAthlete(null)}
          athlete={{
            id: contactModalAthlete.id,
            firstName: contactModalAthlete.first_name,
            lastName: contactModalAthlete.last_name,
            profileImage: contactModalAthlete.profile_photo || undefined,
            starRating: 4,
            gpa: Number(contactModalAthlete.academic_gpa) || 0,
            preferredDivision: contactModalAthlete.preferences_division || 'NCAA D1',
            highSchoolYear: 'Senior',
            hometown: contactModalAthlete.country,
            scoringAverage: Number(contactModalAthlete.scoring_average) || 0,
            bestRecentScoringAvg: contactModalAthlete.best_recent_scoring_avg_raw ? Number(contactModalAthlete.best_recent_scoring_avg_raw) : undefined,
            nationalRanking: parseInt(contactModalAthlete.french_adult_ranking || '0') || undefined
          }}
          isFavorited={true}
          hasNotes={favoriteAthletes.find(f => f.athlete.id === contactModalAthlete.id)?.notes ? true : false}
        />
      )}

      {/* PDF Export Modal */}
      {showPDFExportModal && (
        <PDFExportModal
          isOpen={showPDFExportModal}
          onClose={() => {
            setShowPDFExportModal(false);
            setSelectedAthletes([]);
          }}
          athletes={filteredAthletes
            .filter(f => selectedAthletes.includes(f.id))
            .map(f => ({
              id: f.athlete.id,
              firstName: f.athlete.first_name,
              lastName: f.athlete.last_name,
              email: `${f.athlete.first_name.toLowerCase()}.${f.athlete.last_name.toLowerCase()}@example.com`,
              gpa: f.athlete.academic_gpa != null ? Number(f.athlete.academic_gpa) : undefined,
              intendedMajors: f.athlete.intended_majors || '',
              highSchoolYear: 'Senior' as const,
              currentSchool: '',
              scoringAverage: f.athlete.scoring_average ? Number(f.athlete.scoring_average) : undefined,
              bestRecentScoringAvg: f.athlete.best_recent_scoring_avg_raw ? Number(f.athlete.best_recent_scoring_avg_raw) : undefined,
              scoringAverageVsCourseRating: 0,
              nationalAdultRanking: parseInt(f.athlete.french_adult_ranking || '0') || 0,
              nationalRankingInClass: parseInt(f.athlete.french_ranking_in_their_class || '0') || 0,
              drivingAverageCarryDistance: Number(f.athlete.drive_distance_carry) || undefined,
              maxDriverClubHeadSpeed: Number(f.athlete.max_club_head_speed) || undefined,
              preferredDivisions: normalizeDivisionsWithDefault(f.athlete.preferences_division),
              starRating: f.athlete.star_rating || 3,
              strengths: '',
              areasOfImprovement: '',
              weatherZone: normalizeWeatherZones(f.athlete.preferences_region),
              budget: (() => {
                const numericBudget = Number(f.athlete.preferences_budget);
                return !isNaN(numericBudget) && numericBudget > 0 ? numericBudget : undefined;
              })(),
              recruitmentPitch: '',
              hometown: f.athlete.country || '',
              createdAt: new Date(f.created_at),
              updatedAt: new Date(f.created_at),
              featured: false,
              status: f.athlete.committed ? 'committed' : 'available',
              graduationYear: f.athlete.graduation_year || '2025',
              preferredMajors: normalizeIntendedMajors(f.athlete.intended_majors),
            }))}
          tournamentResults={[]}
        />
      )}
    </div>
  );
};

export default Favorites;
import { useState, useEffect } from 'react';
import { AUTH_ROUTES } from '@/constants/routes';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Search, 
  Filter, 
  UserPlus, 
  Download,
  Eye,
  Edit,
  Ban,
  Check,
  X,
  MoreHorizontal,
  Mail,
  Activity,
  ChevronUp,
  ChevronDown,
  Key,
  FileText,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Coach {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  university: string;
  division: string;
  registrationDate: Date;
  lastLogin: Date | null;
  status: 'active' | 'pending' | 'suspended' | 'rejected';
  activityScore: number;
  searchCount: number;
  favoritesCount: number;
  contactRequests: number;
  recruitingNeeds?: string;
  daysPending?: number;
  hasIncompleteProfile: boolean;
}

const CoachManagement = () => {
  const navigate = useNavigate();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCoaches, setSelectedCoaches] = useState<string[]>([]);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [coachToSuspend, setCoachToSuspend] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [coachToDelete, setCoachToDelete] = useState<{ id: string; name: string } | null>(null);
  const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{ coachId: string; newStatus: string } | null>(null);
  const [sortField, setSortField] = useState<keyof Coach>('registrationDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // Filter states
  const [divisionFilters, setDivisionFilters] = useState<string[]>([]);
  const [activityFilter, setActivityFilter] = useState<string>('all');
  
  useEffect(() => {
    fetchCoaches();
  }, []);
  
  const fetchCoaches = async () => {
    setLoading(true);
    try {
      // Call the admin RPC function to get coaches with activity stats
      const { data, error } = await supabase.rpc('admin_list_coaches');
      
      if (error) {
        console.error('Error fetching coaches:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to load coaches",
          variant: "destructive",
        });
        return;
      }
      
      if (data && data.length > 0) {
        // Map RPC results to Coach objects
        const coachesData = data.map((row) => {
          // Calculate activity score from pre-computed counts
          const activityScore = Math.min(100, 
            (Number(row.search_count) * 2) + 
            (Number(row.favorites_count) * 3) + 
            (Number(row.contact_count) * 5)
          );
          
          // Calculate days pending
          const daysPending = row.status === 'pending' 
            ? Math.floor((new Date().getTime() - new Date(row.created_at).getTime()) / (1000 * 60 * 60 * 24))
            : undefined;

          const isIncomplete = !row.first_name || !row.last_name || row.full_name === 'New User' || row.full_name === 'Unknown User';
          return {
            id: row.id,
            firstName: row.first_name || '—',
            lastName: row.last_name || '—',
            hasIncompleteProfile: isIncomplete,
            email: row.email,
            university: row.school_name || 'Not specified',
            division: row.division || 'Not specified',
            registrationDate: new Date(row.created_at),
            lastLogin: row.updated_at ? new Date(row.updated_at) : null,
            status: row.status as 'active' | 'pending' | 'suspended' | 'rejected',
            activityScore,
            searchCount: Number(row.search_count),
            favoritesCount: Number(row.favorites_count),
            contactRequests: Number(row.contact_count),
            recruitingNeeds: row.recruiting_needs || undefined,
            daysPending,
          };
        });
        
        setCoaches(coachesData);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load coach data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  
  // Apply all filters
  const filteredCoaches = coaches.filter(coach => {
    const matchesSearch = 
      coach.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coach.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coach.university.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coach.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' 
        ? coach.status !== 'rejected'  // Hide rejected coaches by default
        : coach.status === statusFilter;
    
    const matchesDivision = divisionFilters.length === 0 || divisionFilters.includes(coach.division);
    
    const matchesActivity = 
      activityFilter === 'all' ||
      (activityFilter === 'active' && coach.activityScore >= 80) ||
      (activityFilter === 'moderate' && coach.activityScore >= 50 && coach.activityScore < 80) ||
      (activityFilter === 'inactive' && coach.activityScore < 50);
    
    return matchesSearch && matchesStatus && matchesDivision && matchesActivity;
  });

  // Sort coaches - ALWAYS put pending first
  const sortedCoaches = [...filteredCoaches].sort((a, b) => {
    // Priority 1: Pending coaches always come first
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    
    // Priority 2: Apply normal sorting
    const aVal = a[sortField];
    const bVal = b[sortField];
    
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Paginate
  const totalPages = Math.ceil(sortedCoaches.length / pageSize);
  const paginatedCoaches = sortedCoaches.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const pendingCount = coaches.filter(c => c.status === 'pending').length;

  const handleStatusChange = async (coachId: string, newStatus: string) => {
    // If changing to suspended or rejected, show confirmation
    if (newStatus === 'suspended' || newStatus === 'rejected') {
      setPendingStatusChange({ coachId, newStatus });
      setStatusChangeDialogOpen(true);
      return;
    }
    
    // For other status changes, apply immediately
    await applyStatusChange(coachId, newStatus);
  };

  const applyStatusChange = async (coachId: string, newStatus: string) => {
    try {
      const coach = coaches.find(c => c.id === coachId);
      if (!coach) {
        throw new Error('Coach not found');
      }

      // Update status in database
      const { error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', coachId);
      
      if (error) throw error;

      // If activating a previously pending coach, send approval email
      if (newStatus === 'active' && coach.status === 'pending') {
        try {
          // Fetch fresh coach data before sending email
          const { data: freshCoach } = await supabase
            .from('users')
            .select('email, first_name, last_name, school_name')
            .eq('id', coachId)
            .single();
          
          if (freshCoach) {
            await supabase.functions.invoke('send-coach-approval-email', {
              body: {
                email: freshCoach.email,
                first_name: freshCoach.first_name,
                last_name: freshCoach.last_name,
                school_name: freshCoach.school_name,
              }
            });
          }
        } catch (emailError) {
          console.error('Email error:', emailError);
        }
      }
      
      toast({
        title: "Status updated",
        description: `Coach status changed to ${newStatus}.`,
      });
      
      fetchCoaches();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update coach status",
        variant: "destructive",
      });
    }
  };

  const confirmStatusChange = async () => {
    if (pendingStatusChange) {
      await applyStatusChange(pendingStatusChange.coachId, pendingStatusChange.newStatus);
      setStatusChangeDialogOpen(false);
      setPendingStatusChange(null);
    }
  };

  const handleApprove = async (coachId: string) => {
    await handleStatusChange(coachId, 'active');
  };

  const handleSuspend = (coachId: string) => {
    setCoachToSuspend(coachId);
    setSuspendDialogOpen(true);
  };

  const confirmSuspend = async () => {
    if (coachToSuspend) {
      await applyStatusChange(coachToSuspend, 'suspended');
      setSuspendDialogOpen(false);
      setCoachToSuspend(null);
    }
  };

  const handleDeleteCoach = (coachId: string, coachName: string) => {
    setCoachToDelete({ id: coachId, name: coachName });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!coachToDelete) return;

    try {
      // Import deleteAdminUser function
      const { deleteAdminUser } = await import('@/lib/api/adminUsers');
      
      await deleteAdminUser(coachToDelete.id);
      
      toast({
        title: "Coach deleted",
        description: `${coachToDelete.name} has been permanently removed.`,
      });
      
      setDeleteDialogOpen(false);
      setCoachToDelete(null);
      fetchCoaches();
    } catch (error: any) {
      console.error('Error deleting coach:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete coach",
        variant: "destructive",
      });
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedCoaches.length === 0) {
      toast({
        title: "No coaches selected",
        description: "Please select coaches to perform bulk actions.",
        variant: "destructive"
      });
      return;
    }

    try {
      switch (action) {
        case 'approve':
          // Update database
          const { error: approveError } = await supabase
            .from('users')
            .update({ status: 'active' })
            .in('id', selectedCoaches);
          
          if (approveError) throw approveError;
          
          // Send approval emails to each coach with fresh data
          for (const coachId of selectedCoaches) {
            try {
              // Fetch fresh coach data before sending email
              const { data: freshCoach } = await supabase
                .from('users')
                .select('email, first_name, last_name, school_name')
                .eq('id', coachId)
                .single();
              
              if (freshCoach) {
                await supabase.functions.invoke('send-coach-approval-email', {
                  body: {
                    email: freshCoach.email,
                    first_name: freshCoach.first_name,
                    last_name: freshCoach.last_name,
                    school_name: freshCoach.school_name,
                  }
                });
              }
            } catch (emailError) {
              console.error('Email failed for coach ID:', coachId, emailError);
            }
          }
          
          toast({
            title: "Coaches approved",
            description: `${selectedCoaches.length} coaches activated and notified.`,
          });
          break;
          
        case 'suspend':
          const { error: suspendError } = await supabase
            .from('users')
            .update({ status: 'suspended' })
            .in('id', selectedCoaches);
          
          if (suspendError) throw suspendError;
          
          toast({
            title: "Coaches suspended",
            description: `${selectedCoaches.length} coach accounts suspended.`,
          });
          break;
          
        case 'reject':
          // Silent reject - no email sent
          const { error: rejectError } = await supabase
            .from('users')
            .update({ status: 'rejected' })
            .in('id', selectedCoaches);
          
          if (rejectError) throw rejectError;
          
          toast({
            title: "Coaches rejected",
            description: `${selectedCoaches.length} coaches rejected silently.`,
          });
          break;
          
        case 'export':
          // Export selected coaches to CSV
          const exportData = coaches
            .filter(c => selectedCoaches.includes(c.id))
            .map(c => ({
              Name: `${c.firstName} ${c.lastName}`,
              Email: c.email,
              University: c.university,
              Status: c.status,
              Division: c.division,
              'Registration Date': format(c.registrationDate, 'yyyy-MM-dd'),
            }));
          
          const csv = [
            Object.keys(exportData[0]).join(','),
            ...exportData.map(row => Object.values(row).join(','))
          ].join('\n');
          
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `coaches-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
          a.click();
          
          toast({
            title: "Export complete",
            description: `${selectedCoaches.length} coaches exported to CSV.`,
          });
          break;
      }
      
      // Refresh data and clear selection
      await fetchCoaches();
      setSelectedCoaches([]);
      
    } catch (error) {
      console.error('Bulk action error:', error);
      toast({
        title: "Error",
        description: "Failed to perform bulk action",
        variant: "destructive",
      });
    }
  };

  const getActivityBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-500">High</Badge>;
    if (score >= 50) return <Badge className="bg-yellow-500">Moderate</Badge>;
    if (score > 0) return <Badge className="bg-gray-500">Low</Badge>;
    return <Badge variant="outline">Inactive</Badge>;
  };

  const handleSort = (field: keyof Coach) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handlePasswordReset = async (coach: Coach) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-password-reset-email', {
        body: {
          userEmail: coach.email,
          frontendUrl: window.location.origin,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Password reset sent",
        description: `Reset link sent to ${coach.email}`,
      });
    } catch (error) {
      console.error('Password reset error:', error);
      toast({
        title: "Error",
        description: "Failed to send password reset email",
        variant: "destructive",
      });
    }
  };

  const handleSendCommunication = () => {
    if (selectedCoaches.length === 0) {
      toast({
        title: "No coaches selected",
        description: "Please select coaches to send communications.",
        variant: "destructive"
      });
      return;
    }
    toast({
      title: "Communication sent",
      description: `Message sent to ${selectedCoaches.length} coaches.`,
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Coach Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Total: {coaches.length} coaches
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingCount} pending approval
              </Badge>
            )}
          </p>
        </div>
        <Button onClick={() => navigate('/admin/coaches/new')} className="w-full sm:w-auto">
          <UserPlus className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Add New Coach</span>
          <span className="sm:hidden">Add Coach</span>
        </Button>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search coaches by name, university, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Coaches</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex gap-2">
              {/* Filters Panel Sheet */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="flex-1 sm:flex-none">
                    <Filter className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">More Filters</span>
                  </Button>
                </SheetTrigger>
                <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filter Coaches</SheetTitle>
                  <SheetDescription>
                    Apply advanced filters to narrow down your search
                  </SheetDescription>
                </SheetHeader>
                <div className="space-y-6 py-6">
                  {/* Division Filters */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Division</Label>
                    <div className="space-y-2">
                      {['NCAA D1', 'NCAA D2', 'NCAA D3', 'NAIA', 'NJCAA 1', 'NJCAA 2'].map(division => (
                        <div key={division} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`coach-${division}`}
                            checked={divisionFilters.includes(division)}
                            onCheckedChange={(checked) => {
                              setDivisionFilters(prev => 
                                checked 
                                  ? [...prev, division]
                                  : prev.filter(d => d !== division)
                              );
                            }}
                          />
                          <label htmlFor={`coach-${division}`} className="text-sm">{division}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Activity Level Filter */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Activity Level</Label>
                    <Select value={activityFilter} onValueChange={setActivityFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Activity Levels</SelectItem>
                        <SelectItem value="active">Active (80+)</SelectItem>
                        <SelectItem value="moderate">Moderate (50-79)</SelectItem>
                        <SelectItem value="inactive">Inactive (&lt;50)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      setDivisionFilters([]);
                      setActivityFilter('all');
                      setStatusFilter('all');
                      setSearchQuery('');
                    }}
                  >
                    Clear All Filters
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            
              <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => handleBulkAction('export')}>
                <Download className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </div>
          </div>

          {selectedCoaches.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {selectedCoaches.length} coaches selected
                </span>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => setSelectedCoaches([])}
                >
                  Clear
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleBulkAction('approve')}
                  className="w-full"
                >
                  <Check className="h-3 w-3 md:mr-1" />
                  <span className="hidden md:inline">Approve</span>
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleBulkAction('reject')}
                  className="w-full"
                >
                  <X className="h-3 w-3 md:mr-1" />
                  <span className="hidden md:inline">Reject</span>
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleBulkAction('suspend')}
                  className="w-full"
                >
                  <Ban className="h-3 w-3 md:mr-1" />
                  <span className="hidden md:inline">Suspend</span>
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleBulkAction('export')}
                  className="w-full"
                >
                  <Download className="h-3 w-3 md:mr-1" />
                  <span className="hidden md:inline">Export</span>
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleSendCommunication}
                  className="w-full"
                >
                  <MessageSquare className="h-3 w-3 md:mr-1" />
                  <span className="hidden md:inline">Send</span>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coaches Table */}
      <Card>
        <CardContent className="p-0">
          {/* Desktop Table - Hidden on mobile */}
          <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox 
                    checked={selectedCoaches.length === paginatedCoaches.length && paginatedCoaches.length > 0}
                    onCheckedChange={(checked) => {
                      setSelectedCoaches(checked ? paginatedCoaches.map(c => c.id) : []);
                    }}
                  />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('firstName')}
                >
                  <div className="flex items-center gap-1">
                    Coach
                    {sortField === 'firstName' && (
                      sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('university')}
                >
                  <div className="flex items-center gap-1">
                    University/Division
                    {sortField === 'university' && (
                      sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center gap-1">
                    Email
                    {sortField === 'email' && (
                      sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('registrationDate')}
                >
                  <div className="flex items-center gap-1">
                    Registration Date
                    {sortField === 'registrationDate' && (
                      sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('lastLogin')}
                >
                  <div className="flex items-center gap-1">
                    Last Login
                    {sortField === 'lastLogin' && (
                      sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('activityScore')}
                >
                  <div className="flex items-center gap-1">
                    Activity
                    {sortField === 'activityScore' && (
                      sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    )}
                  </div>
                </TableHead>
                <TableHead>Recruiting Needs</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCoaches.map((coach) => (
                <TableRow key={coach.id}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedCoaches.includes(coach.id)}
                      onCheckedChange={(checked) => {
                        setSelectedCoaches(prev => 
                          checked 
                            ? [...prev, coach.id]
                            : prev.filter(id => id !== coach.id)
                        );
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${coach.firstName} ${coach.lastName}`} />
                        <AvatarFallback>
                          {coach.firstName[0]}{coach.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{coach.firstName} {coach.lastName}</p>
                          {coach.hasIncompleteProfile && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500 text-amber-600">Incomplete Profile</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{coach.university}</p>
                      <Badge variant="outline" className="text-xs">
                        {coach.division}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{coach.email}</p>
                  </TableCell>
                  <TableCell>
                    {format(coach.registrationDate, 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    {coach.lastLogin 
                      ? format(coach.lastLogin, 'MMM dd, yyyy')
                      : <span className="text-muted-foreground">Never</span>
                    }
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getActivityBadge(coach.activityScore)}
                        <span className="text-xs text-muted-foreground">({coach.activityScore})</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {coach.searchCount} searches • {coach.favoritesCount} favorites
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {coach.recruitingNeeds ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="max-w-xs cursor-help">
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {coach.recruitingNeeds}
                              </p>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm">
                            <p className="text-sm whitespace-pre-wrap">
                              {coach.recruitingNeeds}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Not specified</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Select 
                        value={coach.status} 
                        onValueChange={(value) => handleStatusChange(coach.id, value)}
                      >
                        <SelectTrigger className="w-[140px] h-8">
                          <SelectValue>
                            <Badge 
                              variant={
                                coach.status === 'active' ? 'default' : 
                                coach.status === 'pending' ? 'secondary' : 
                                coach.status === 'rejected' ? 'outline' :
                                'destructive'
                              }
                              className="text-xs"
                            >
                              {coach.status}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                              Active
                            </div>
                          </SelectItem>
                          <SelectItem value="pending">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-yellow-500" />
                              Pending
                            </div>
                          </SelectItem>
                          <SelectItem value="suspended">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-red-500" />
                              Suspended
                            </div>
                          </SelectItem>
                          <SelectItem value="rejected">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-gray-500" />
                              Rejected
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {coach.status === 'pending' && coach.daysPending !== undefined && (
                        <p className="text-xs text-orange-600 font-medium">
                          {coach.daysPending} days pending
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate(`/admin/coaches/${coach.id}`)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details & Activity
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/admin/coaches/${coach.id}/edit`)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/admin/coaches/${coach.id}/activity`)}>
                          <Activity className="mr-2 h-4 w-4" />
                          View Activity Log
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {coach.status === 'pending' && (
                          <>
                            <DropdownMenuItem onClick={() => handleApprove(coach.id)}>
                              <Check className="mr-2 h-4 w-4 text-green-500" />
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={async () => {
                                try {
                                  const { error } = await supabase
                                    .from('users')
                                    .update({ status: 'rejected' })
                                    .eq('id', coach.id);
                                  if (error) throw error;
                                  toast({
                                    title: "Coach rejected",
                                    description: "Coach has been rejected silently.",
                                  });
                                  fetchCoaches();
                                } catch (error) {
                                  toast({
                                    title: "Error",
                                    description: "Failed to reject coach",
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              <X className="mr-2 h-4 w-4 text-red-500" />
                              Reject
                            </DropdownMenuItem>
                          </>
                        )}
                        {coach.status !== 'suspended' && coach.status !== 'rejected' && (
                          <DropdownMenuItem onClick={() => handleSuspend(coach.id)}>
                            <Ban className="mr-2 h-4 w-4 text-red-500" />
                            Suspend
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handlePasswordReset(coach)}>
                          <Key className="mr-2 h-4 w-4" />
                          Send Password Reset
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDeleteCoach(coach.id, `${coach.firstName} ${coach.lastName}`)}
                          className="text-destructive focus:text-destructive"
                        >
                          <X className="mr-2 h-4 w-4" />
                          Delete Coach
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
          
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3 p-4">
            {paginatedCoaches.map((coach) => (
              <Card key={coach.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3 flex-1">
                      <Checkbox 
                        checked={selectedCoaches.includes(coach.id)}
                        onCheckedChange={(checked) => {
                          setSelectedCoaches(prev => 
                            checked 
                              ? [...prev, coach.id]
                              : prev.filter(id => id !== coach.id)
                          );
                        }}
                      />
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${coach.firstName} ${coach.lastName}`} />
                        <AvatarFallback>
                          {coach.firstName[0]}{coach.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium truncate">{coach.firstName} {coach.lastName}</p>
                          {coach.hasIncompleteProfile && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-500 text-amber-600 shrink-0">Incomplete</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{coach.university}</p>
                      </div>
                    </div>
                    <Badge 
                      variant={
                        coach.status === 'active' ? 'default' : 
                        coach.status === 'pending' ? 'secondary' : 
                        coach.status === 'rejected' ? 'outline' :
                        'destructive'
                      }
                    >
                      {coach.status}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Activity</p>
                      {getActivityBadge(coach.activityScore)}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Registered</p>
                      <p className="text-xs font-medium">{format(coach.registrationDate, 'MMM dd, yyyy')}</p>
                    </div>
                  </div>
                  
                  {coach.recruitingNeeds && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Recruiting Needs</p>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-sm text-muted-foreground line-clamp-2 cursor-help">
                              {coach.recruitingNeeds}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm">
                            <p className="text-sm whitespace-pre-wrap">
                              {coach.recruitingNeeds}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-2 border-t">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => navigate(`/admin/coaches/${coach.id}`)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    {coach.status === 'pending' && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => handleApprove(coach.id)}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Approve
                      </Button>
                    )}
                    {coach.status === 'active' && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => handleSuspend(coach.id)}
                      >
                        <Ban className="h-3 w-3 mr-1" />
                        Suspend
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Label htmlFor="pageSize" className="hidden sm:inline">Show</Label>
          <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
            <SelectTrigger id="pageSize" className="w-16">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs sm:text-sm text-muted-foreground">
            {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, sortedCoaches.length)} of {sortedCoaches.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm px-2">
            Page {currentPage} of {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Suspension Confirmation Dialog */}
      <AlertDialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend Coach Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately suspend the coach's access to the platform. They will not be able to log in or access any data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSuspend} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Suspend Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status Change Confirmation Dialog */}
      <AlertDialog open={statusChangeDialogOpen} onOpenChange={setStatusChangeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStatusChange?.newStatus === 'suspended' && 
                "This will immediately suspend the coach's access to the platform. They will not be able to log in or access any data."}
              {pendingStatusChange?.newStatus === 'rejected' && 
                "This will reject the coach's application. They will not be able to access the platform."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingStatusChange(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmStatusChange} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Coach Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Coach Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>{coachToDelete?.name}</strong>? 
              This action cannot be undone and will remove all associated data including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>User profile and authentication</li>
                <li>Saved searches and favorites</li>
                <li>Contact requests and notes</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCoachToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CoachManagement;
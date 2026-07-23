import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  Calendar,
  Phone,
  FileText,
  Download,
  Filter,
  ChevronDown,
  ChevronRight,
  User,
  GraduationCap,
  Star,
  TrendingUp,
  Mail,
  BarChart3,
  Activity,
  Timer,
  Target,
  Award,
  BookOpen,
  MessageCircle,
  Loader2,
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ContactRequest {
  id: string;
  requestDate: Date;
  coachName: string;
  coachEmail: string;
  coachPhone: string;
  coachUniversity: string;
  coachDivision: string;
  athleteName: string;
  athleteRating: number;
  priority: 'High' | 'Medium' | 'Low';
  status: 'New' | 'In Progress' | 'Information Sent' | 'Completed' | 'Declined' | 'Awaiting Coach Response' | 'Overdue';
  responseDue: Date;
  message: string;
  previousInteractions: number;
  attachments: string[];
  preferredContact: string | null;
}

const ContactRequestsManagement: React.FC = () => {
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [contactRequests, setContactRequests] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [notesState, setNotesState] = useState<Record<string, string>>({});
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());
  const [metrics, setMetrics] = useState({
    pendingRequests: 0,
    highPriorityCount: 0,
    processedThisWeek: 0,
    avgResponseTime: '0h',
    successRate: 0,
    priorityRequests: 0
  });
  
  useEffect(() => {
    fetchContactRequests();
    fetchMetrics();
  }, []);
  
  const fetchContactRequests = async () => {
    setLoading(true);
    try {
      // Fetch contact requests with coach and athlete details
      const { data: requestsData, error: requestsError } = await supabase
        .from('contact_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Fetch coaches and athletes for mapping
      const { data: coachesData } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, school_name, position, status, phone, whatsapp_number');
        
      const { data: athletesData } = await supabase
        .from('athletes')
        .select('*');
      
      if (requestsError) {
        console.error('Error fetching contact requests:', requestsError);
        toast({
          title: "Error",
          description: "Failed to load contact requests",
          variant: "destructive",
        });
        return;
      }
      
      // Map the database data to our interface
      if (requestsData && requestsData.length > 0) {
        const mappedRequests: ContactRequest[] = requestsData.map(req => {
          const coach = coachesData?.find(c => c.id === req.coach_id);
          const athlete = athletesData?.find(a => a.id === req.athlete_id);
          
          // Calculate priority based on interest level
          let priority: 'High' | 'Medium' | 'Low' = 'Medium';
          if (req.interest_level === 'Very Interested') priority = 'High';
          else if (req.interest_level === 'Not Interested') priority = 'Low';
          
          // Calculate response due date (48 hours from creation)
          const responseDue = new Date(req.created_at);
          responseDue.setHours(responseDue.getHours() + 48);
          
          // Two-state model: New (pending) / Handled (responded).
          let status: ContactRequest['status'] = 'New';
          if (req.status === 'responded') status = 'Completed';
          
          return {
            id: req.id,
            requestDate: new Date(req.created_at),
            coachName: coach ? ([coach.first_name, coach.last_name].filter(Boolean).join(' ') || 'Unknown Coach') : 'Unknown Coach',
            coachEmail: coach?.email || '',
            coachPhone: coach?.phone || coach?.whatsapp_number || req.whatsapp_number || '',
            coachUniversity: coach?.school_name || 'Unknown University',
            coachDivision: 'Division I', // Default, could be enhanced
            athleteName: athlete ? `${athlete.first_name} ${athlete.last_name}` : 'Unknown Athlete',
            athleteRating: 3, // Default rating, could be calculated from tournament performance
            priority,
            status,
            responseDue,
            message: req.message || '',
            previousInteractions: 0,
            attachments: [],
            preferredContact: req.preferred_contact || null,
          };
        });
        
        // Initialize notes state with existing admin notes
        const initialNotes: Record<string, string> = {};
        requestsData.forEach(req => {
          if (req.admin_notes) {
            initialNotes[req.id] = req.admin_notes;
          }
        });
        setNotesState(initialNotes);
        
        setContactRequests(mappedRequests);
        setCoaches(coachesData || []);
        setAthletes(athletesData || []);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);

      // Count pending requests
      const { count: pendingCount } = await supabase
        .from('contact_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Count high priority pending requests (Very Interested)
      const { count: highPriorityCount } = await supabase
        .from('contact_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('interest_level', 'Very Interested');

      // Count requests processed this week
      const { count: processedCount } = await supabase
        .from('contact_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'responded')
        .gte('responded_at', weekStart.toISOString());

      // Calculate average response time
      const { data: respondedRequests } = await supabase
        .from('contact_requests')
        .select('created_at, responded_at')
        .eq('status', 'responded')
        .not('responded_at', 'is', null);

      let avgResponseTimeHours = 0;
      if (respondedRequests && respondedRequests.length > 0) {
        const totalHours = respondedRequests.reduce((sum, req) => {
          const created = new Date(req.created_at);
          const responded = new Date(req.responded_at);
          const hours = (responded.getTime() - created.getTime()) / (1000 * 60 * 60);
          return sum + hours;
        }, 0);
        avgResponseTimeHours = Math.round(totalHours / respondedRequests.length);
      }

      // Calculate success rate
      const { count: totalCount } = await supabase
        .from('contact_requests')
        .select('*', { count: 'exact', head: true });

      const { count: respondedCount } = await supabase
        .from('contact_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'responded');

      const successRate = totalCount > 0 
        ? Math.round((respondedCount / totalCount) * 100) 
        : 0;

      setMetrics({
        pendingRequests: pendingCount || 0,
        highPriorityCount: highPriorityCount || 0,
        processedThisWeek: processedCount || 0,
        avgResponseTime: `${avgResponseTimeHours}h`,
        successRate: successRate,
        priorityRequests: highPriorityCount || 0
      });

    } catch (error) {
      console.error('Error fetching metrics:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard metrics",
        variant: "destructive",
      });
    }
  };

  const handleSelectRequest = (requestId: string) => {
    setSelectedRequests(prev =>
      prev.includes(requestId)
        ? prev.filter(id => id !== requestId)
        : [...prev, requestId]
    );
  };

  const handleSelectAll = () => {
    if (selectedRequests.length === contactRequests.length) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(contactRequests.map(r => r.id));
    }
  };
  
  const handleStatusUpdate = async (requestId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('contact_requests')
        .update({ 
          status: newStatus === 'Completed' ? 'responded' : 'pending',
          responded_at: newStatus === 'Completed' ? new Date().toISOString() : null
        })
        .eq('id', requestId);
      
      if (error) throw error;
      
      toast({
        title: "Status Updated",
        description: `Request status has been updated to ${newStatus}`,
      });
      
      fetchContactRequests();
      fetchMetrics();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    setProcessingRequests(prev => new Set(prev).add(requestId));
    try {
      // Get request details with related data
      const { data: requestData, error: requestError } = await supabase
        .from('contact_requests')
        .select('*, coach_id, athlete_id')
        .eq('id', requestId)
        .single();

      if (requestError) throw requestError;

      // Get coach details
      const { data: coachData } = await supabase
        .from('users')
        .select('email, first_name, last_name')
        .eq('id', requestData.coach_id)
        .single();

      // Get athlete details
      const { data: athleteData } = await supabase
        .from('athletes')
        .select('*')
        .eq('id', requestData.athlete_id)
        .single();

      if (!coachData || !athleteData) {
        throw new Error('Could not find coach or athlete data');
      }

      // Send athlete info via edge function
      const { data: { session } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('send-athlete-info', {
        body: {
          coachEmail: coachData.email,
          coachName: [coachData.first_name, coachData.last_name].filter(Boolean).join(' ') || 'Coach',
          athleteData: {
            firstName: athleteData.first_name,
            lastName: athleteData.last_name,
            graduationYear: athleteData.graduation_year,
            country: athleteData.country,
            rating: athleteData.star_rating,
            scoringAvg: athleteData.scoring_average_vs_course_rating,
            bestRecentScoring: athleteData.best_recent_scoring_avg,
            committedTo: athleteData.committed_to,
            videoLinks: athleteData.video_links,
            gpa: athleteData.academic_gpa,
            sat: athleteData.sat,
          }
        }
      });

      if (response.error) throw response.error;

      // Update request status
      const { error: updateError } = await supabase
        .from('contact_requests')
        .update({ 
          status: 'responded',
          responded_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      toast({
        title: "Request Approved",
        description: "Athlete information has been sent to the coach",
      });

      fetchContactRequests();
      fetchMetrics();
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: "Error",
        description: "Failed to send athlete information",
        variant: "destructive",
      });
    } finally {
      setProcessingRequests(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };


  const handleBulkApprove = async () => {
    if (selectedRequests.length === 0) return;
    
    setLoading(true);
    let successCount = 0;
    let errorCount = 0;
    
    for (const requestId of selectedRequests) {
      try {
        await handleApproveRequest(requestId);
        successCount++;
      } catch (error) {
        console.error(`Error approving request ${requestId}:`, error);
        errorCount++;
      }
    }
    
    setSelectedRequests([]);
    fetchContactRequests();
    fetchMetrics();
    setLoading(false);
    
    toast({
      title: "Bulk Approve Complete",
      description: `${successCount} requests approved${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      variant: errorCount > 0 ? "destructive" : "default",
    });
  };

  const handleBulkDecline = async () => {
    if (selectedRequests.length === 0) return;
    
    setLoading(true);
    let successCount = 0;
    let errorCount = 0;
    
    for (const requestId of selectedRequests) {
      try {
        const { error } = await supabase
          .from('contact_requests')
          .update({ 
            status: 'declined',
            admin_notes: 'Bulk declined by admin'
          })
          .eq('id', requestId);
        
        if (error) throw error;
        successCount++;
      } catch (error) {
        console.error(`Error declining request ${requestId}:`, error);
        errorCount++;
      }
    }
    
    setSelectedRequests([]);
    fetchContactRequests();
    fetchMetrics();
    setLoading(false);
    
    toast({
      title: "Bulk Decline Complete",
      description: `${successCount} requests declined${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      variant: errorCount > 0 ? "destructive" : "default",
    });
  };

  const handleExportSelected = () => {
    if (selectedRequests.length === 0) return;
    
    const selectedData = contactRequests.filter(r => selectedRequests.includes(r.id));
    
    const headers = [
      'Request Date',
      'Coach Name',
      'Coach Email',
      'School',
      'Athlete Name',
      'Interest Level',
      'Status',
      'Message',
      'Admin Notes'
    ];
    
    const escapeCSV = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };
    
    const rows = selectedData.map(request => [
      request.requestDate.toLocaleDateString(),
      request.coachName,
      request.coachEmail,
      request.coachUniversity,
      request.athleteName,
      request.priority,
      request.status,
      request.message || '',
      notesState[request.id] || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => escapeCSV(String(cell))).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `contact_requests_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast({
      title: "Export Complete",
      description: `${selectedData.length} contact requests exported to CSV`,
    });
  };

  const handleSaveNotes = async (requestId: string) => {
    setProcessingRequests(prev => new Set(prev).add(requestId));
    try {
      const notes = notesState[requestId] || '';
      const { error } = await supabase
        .from('contact_requests')
        .update({ admin_notes: notes })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Notes Saved",
        description: "Internal notes have been saved",
      });
    } catch (error) {
      console.error('Error saving notes:', error);
      toast({
        title: "Error",
        description: "Failed to save notes",
        variant: "destructive",
      });
    } finally {
      setProcessingRequests(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'New':
        return 'default';
      case 'In Progress':
        return 'secondary';
      case 'Information Sent':
        return 'outline';
      case 'Completed':
        return 'default';
      case 'Declined':
        return 'destructive';
      case 'Overdue':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'destructive';
      case 'Medium':
        return 'default';
      case 'Low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Contact Requests Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage coach-athlete connection requests
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="flex-1 sm:flex-none">
            <Download className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Export Report</span>
            <span className="sm:hidden">Export</span>
          </Button>
          <Button className="flex-1 sm:flex-none">
            <MessageSquare className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Process Next Urgent</span>
            <span className="sm:hidden">Process</span>
          </Button>
        </div>
      </div>

      {/* Dashboard Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pendingRequests}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-destructive">{metrics.highPriorityCount} high priority</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Processed This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.processedThisWeek}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <TrendingUp className="inline h-3 w-3 text-primary" /> This week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgResponseTime}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Target: 24h
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.successRate}%</div>
            <Progress value={metrics.successRate} className="mt-2 h-1" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Priority Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{metrics.priorityRequests}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Require immediate attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 max-w-full sm:max-w-[600px]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Filters and Search */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Request Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <Input
                    placeholder="Search by coach, athlete, or university..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Requests</SelectItem>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Completed">Handled</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Filter className="mr-2 h-4 w-4" />
                  More Filters
                </Button>
              </div>

              {/* Bulk Operations */}
              {selectedRequests.length > 0 && (
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">
                    {selectedRequests.length} requests selected
                  </span>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={handleBulkApprove}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Bulk Approve
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={handleBulkDecline}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Bulk Decline
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={handleExportSelected}
                  >
                    Export Selected
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedRequests([])}
                  >
                    Clear Selection
                  </Button>
                </div>
              )}

              {/* Requests Table - Desktop */}
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={selectedRequests.length === contactRequests.length}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Request Date</TableHead>
                      <TableHead>Coach</TableHead>
                      <TableHead>Athlete</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : contactRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No contact requests found
                        </TableCell>
                      </TableRow>
                    ) : (
                      contactRequests.map((request) => (
                      <React.Fragment key={request.id}>
                        <TableRow>
                          <TableCell>
                            <Checkbox
                              checked={selectedRequests.includes(request.id)}
                              onCheckedChange={() => handleSelectRequest(request.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedRequest(
                                expandedRequest === request.id ? null : request.id
                              )}
                            >
                              {expandedRequest === request.id ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell>
                            {request.requestDate.toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{request.coachName}</p>
                              <p className="text-xs text-muted-foreground">
                                {request.coachUniversity}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{request.athleteName}</span>
                              <div className="flex">
                                {[...Array(request.athleteRating)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className="h-3 w-3 fill-primary text-primary"
                                  />
                                ))}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getPriorityBadgeVariant(request.priority)}>
                              {request.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(request.status)}>
                              {request.status === 'Completed' ? 'Handled' : request.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {request.responseDue.toLocaleDateString()}
                              {request.status === 'Overdue' && (
                                <AlertCircle className="inline ml-1 h-3 w-3 text-destructive" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {request.status === 'Completed' ? (
                              <span className="text-xs text-muted-foreground">Handled</span>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusUpdate(request.id, 'Completed')}
                              >
                                Mark as Handled
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                        {expandedRequest === request.id && (
                          <TableRow>
                            <TableCell colSpan={9}>
                              <div className="p-4 space-y-4 bg-muted/10">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {/* Coach Information */}
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="text-sm flex items-center gap-2">
                                        <GraduationCap className="h-4 w-4" />
                                        Coach Information
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                      <div className="text-sm">
                                        <span className="text-muted-foreground">Name:</span>{' '}
                                        {request.coachName}
                                      </div>
                                      <div className="text-sm">
                                        <span className="text-muted-foreground">Email:</span>{' '}
                                        <a href={`mailto:${request.coachEmail}`} className="text-primary hover:underline">
                                          {request.coachEmail}
                                        </a>
                                      </div>
                                      <div className="text-sm">
                                        <span className="text-muted-foreground">Phone:</span>{' '}
                                        {request.coachPhone ? (
                                          <a href={`tel:${request.coachPhone}`} className="text-primary hover:underline">
                                            {request.coachPhone}
                                          </a>
                                        ) : (
                                          <span className="text-muted-foreground">Not provided</span>
                                        )}
                                      </div>
                                      <div className="text-sm">
                                        <span className="text-muted-foreground">University:</span>{' '}
                                        {request.coachUniversity}
                                      </div>
                                      <div className="text-sm">
                                        <span className="text-muted-foreground">Division:</span>{' '}
                                        {request.coachDivision}
                                      </div>
                                      <div className="text-sm">
                                        <span className="text-muted-foreground">Previous Interactions:</span>{' '}
                                        {request.previousInteractions}
                                      </div>
                                    </CardContent>
                                  </Card>

                                  {/* Request Details */}
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="text-sm flex items-center gap-2">
                                        <MessageSquare className="h-4 w-4" />
                                        Request Details
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                       {/* Preferred Contact Method */}
                                       {request.preferredContact ? (
                                         <div className="flex items-center gap-2 mb-2">
                                           <span className="text-xs text-muted-foreground">Preferred contact:</span>
                                           {request.preferredContact.split(',').map(method => (
                                             <Badge key={method} variant="secondary" className="text-xs">
                                               {method.trim() === 'whatsapp' ? (
                                                 <><Phone className="h-3 w-3 mr-1" />WhatsApp</>
                                               ) : method.trim() === 'email' ? (
                                                 <><Mail className="h-3 w-3 mr-1" />Email</>
                                               ) : (
                                                 method.trim()
                                               )}
                                             </Badge>
                                           ))}
                                         </div>
                                       ) : (
                                         <p className="text-xs text-muted-foreground italic mb-2">Contact preference not specified</p>
                                       )}
                                       <p className="text-sm">{request.message}</p>
                                       {request.attachments.length > 0 && (
                                        <div className="space-y-1">
                                          <p className="text-xs text-muted-foreground">Attachments:</p>
                                          {request.attachments.map((attachment, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                              <FileText className="h-3 w-3" />
                                              <span className="text-xs">{attachment}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </CardContent>
                                  </Card>

                                   {/* Processing Actions */}
                                   <Card>
                                     <CardHeader>
                                       <CardTitle className="text-sm flex items-center gap-2">
                                         <Activity className="h-4 w-4" />
                                         Processing Actions
                                       </CardTitle>
                                     </CardHeader>
                                     <CardContent className="space-y-2">
                                       {request.status === 'Completed' ? (
                                         <p className="text-sm text-muted-foreground">This request has been handled.</p>
                                       ) : (
                                         <Button
                                           className="w-full"
                                           size="sm"
                                           onClick={() => handleStatusUpdate(request.id, 'Completed')}
                                         >
                                           Mark as Handled
                                         </Button>
                                       )}
                                     </CardContent>
                                   </Card>
                                </div>

                                 {/* Internal Notes */}
                                 <Card>
                                   <CardHeader>
                                     <CardTitle className="text-sm">Internal Notes</CardTitle>
                                   </CardHeader>
                                   <CardContent>
                                     <Textarea
                                       placeholder="Add notes (not visible to coach)..."
                                       className="min-h-[100px]"
                                       value={notesState[request.id] || ''}
                                       onChange={(e) => setNotesState(prev => ({
                                         ...prev,
                                         [request.id]: e.target.value
                                       }))}
                                     />
                                     <Button 
                                       className="mt-2" 
                                       size="sm"
                                       onClick={() => handleSaveNotes(request.id)}
                                       disabled={processingRequests.has(request.id)}
                                     >
                                       {processingRequests.has(request.id) ? (
                                         <>
                                           <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                           Saving...
                                         </>
                                       ) : (
                                         'Save Notes'
                                       )}
                                     </Button>
                                   </CardContent>
                                 </Card>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {loading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </div>
                ) : contactRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No contact requests found
                  </div>
                ) : (
                  contactRequests.map((request) => (
                    <Card key={request.id}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <Checkbox
                              checked={selectedRequests.includes(request.id)}
                              onCheckedChange={() => handleSelectRequest(request.id)}
                              className="mt-1"
                            />
                            <div className="space-y-1 flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{request.coachName}</p>
                              <p className="text-xs text-muted-foreground truncate">{request.coachUniversity}</p>
                              <p className="text-xs text-muted-foreground">
                                {request.requestDate.toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Badge variant={getStatusBadgeVariant(request.status)} className="shrink-0">
                            {request.status === 'Completed' ? 'Handled' : request.status}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{request.athleteName}</p>
                            <div className="flex mt-1">
                              {[...Array(request.athleteRating)].map((_, i) => (
                                <Star key={i} className="h-3 w-3 fill-primary text-primary" />
                              ))}
                            </div>
                          </div>
                          <Badge variant={getPriorityBadgeVariant(request.priority)} className="shrink-0">
                            {request.priority}
                          </Badge>
                        </div>
                        
                        <div className="flex gap-2 pt-2 border-t">
                          {request.status !== 'Completed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => handleStatusUpdate(request.id, 'Completed')}
                            >
                              <span className="text-xs">Mark as Handled</span>
                            </Button>
                          )}
                          <Button
                            size="sm" 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => setExpandedRequest(
                              expandedRequest === request.id ? null : request.id
                            )}
                          >
                            {expandedRequest === request.id ? (
                              <ChevronDown className="h-3 w-3 mr-1" />
                            ) : (
                              <ChevronRight className="h-3 w-3 mr-1" />
                            )}
                            <span className="text-xs">Details</span>
                          </Button>
                        </div>
                        
                        {expandedRequest === request.id && (
                          <div className="pt-3 border-t space-y-3">
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold">Request Message</h4>
                              <p className="text-sm text-muted-foreground">{request.message}</p>
                            </div>
                            
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold">Processing Actions</h4>
                              <div className="space-y-2">
                                {request.status === 'Completed' ? (
                                  <p className="text-sm text-muted-foreground">This request has been handled.</p>
                                ) : (
                                  <Button className="w-full" size="sm" onClick={() => handleStatusUpdate(request.id, 'Completed')}>
                                    Mark as Handled
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                <Button variant="outline" className="justify-start">
                  <Timer className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Process Next Urgent</span>
                  <span className="sm:hidden">Process Urgent</span>
                </Button>
                <Button variant="outline" className="justify-start">
                  <AlertCircle className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Review High Priority</span>
                  <span className="sm:hidden">High Priority</span>
                </Button>
                <Button variant="outline" className="justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Generate Daily Summary</span>
                  <span className="sm:hidden">Daily Summary</span>
                </Button>
                <Button variant="outline" className="justify-start">
                  <Send className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Send Follow-ups</span>
                  <span className="sm:hidden">Follow-ups</span>
                </Button>
                <Button variant="outline" className="justify-start">
                  <Download className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Export Weekly Report</span>
                  <span className="sm:hidden">Weekly Report</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Contact Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Complete request history and advanced filtering options
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {/* Analytics and Reporting */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Request Volume Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-center justify-center border-2 border-dashed rounded-lg">
                  <BarChart3 className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Response Time Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Average Response Time</span>
                    <span className="font-medium">18 hours</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Fastest Response</span>
                    <span className="font-medium">2 hours</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Slowest Response</span>
                    <span className="font-medium">48 hours</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Success Rate by Division</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Division I</span>
                    <div className="flex items-center gap-2">
                      <Progress value={92} className="w-[100px]" />
                      <span className="text-sm">92%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Division II</span>
                    <div className="flex items-center gap-2">
                      <Progress value={85} className="w-[100px]" />
                      <span className="text-sm">85%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Division III</span>
                    <div className="flex items-center gap-2">
                      <Progress value={88} className="w-[100px]" />
                      <span className="text-sm">88%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Most Requested Athletes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {['Sarah Johnson', 'Michael Davis', 'Emma Wilson'].map((name, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span className="text-sm">{name}</span>
                      <Badge variant="outline">{15 - idx * 3} requests</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Conversion Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">68%</div>
                  <p className="text-xs text-muted-foreground">Request to Contact</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">42%</div>
                  <p className="text-xs text-muted-foreground">Contact to Meeting</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">24%</div>
                  <p className="text-xs text-muted-foreground">Meeting to Recruitment</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          {/* Email Template Library */}
          <Card>
            <CardHeader>
              <CardTitle>Email Template Library</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  'Initial Coach Response',
                  'Request for More Information',
                  'Athlete Information Package',
                  'Schedule Call Request',
                  'Decline - Not Eligible',
                  'Decline - Roster Full',
                ].map((template, idx) => (
                  <Card key={idx} className="cursor-pointer hover:bg-muted/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span>{template}</span>
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">
                        Used 24 times this month
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline">Edit</Button>
                        <Button size="sm" variant="outline">Preview</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContactRequestsManagement;
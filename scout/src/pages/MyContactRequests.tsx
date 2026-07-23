import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, CheckCircle, AlertCircle, Phone, XCircle, Search, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ContactRequestDisplay {
  id: string;
  created_at: string;
  status: string;
  interest_level: string;
  message: string;
  whatsapp_number: string;
  responded_at: string | null;
  athletes: {
    id: string;
    first_name: string;
    last_name: string;
    star_rating: number;
    profile_photo: string;
    graduation_year: string;
  } | null;
}

const MyContactRequests = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contactRequests, setContactRequests] = useState<ContactRequestDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchContactRequests();
  }, [user]);

  const fetchContactRequests = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // Load the coach's own contact requests (RLS scopes rows to their coach_id).
      // Do NOT embed the raw `athletes` table: it is RLS-locked to admin/agent, so
      // for coaches the embed returns NULLs (empty name / "Class of ").
      const { data: requests, error } = await supabase
        .from('contact_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const reqs = requests || [];
      const athleteIds = [...new Set(reqs.map((r: any) => r.athlete_id).filter(Boolean))];

      // Player identity comes from the masking view athletes_safe (readable by coaches).
      const athletesById: Record<string, any> = {};
      if (athleteIds.length > 0) {
        const { data: athletes } = await supabase
          .from('athletes_safe' as any)
          .select('id, first_name, last_name, graduation_year, profile_photo, slug, star_rating')
          .in('id', athleteIds);
        for (const a of (athletes || [])) {
          athletesById[a.id] = a;
        }
      }

      const merged = reqs.map((r: any) => ({
        ...r,
        athletes: athletesById[r.athlete_id] || null,
      })) as ContactRequestDisplay[];

      setContactRequests(merged);
    } catch (error) {
      console.error('Error fetching contact requests:', error);
      toast.error('Failed to load contact requests');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    // Coach-facing status is simplified to two states: Requested (pending) until
    // the admin marks it handled, then Handled (responded).
    const config = status === 'responded'
      ? { icon: CheckCircle, label: 'Handled', className: 'bg-green-100 text-green-800 border-green-300' }
      : { icon: Clock, label: 'Requested', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getInterestBadge = (level: string) => {
    const interestConfig = {
      high: { label: 'High Interest', className: 'bg-green-100 text-green-800 border-green-300' },
      medium: { label: 'Medium Interest', className: 'bg-blue-100 text-blue-800 border-blue-300' },
      low: { label: 'Low Interest', className: 'bg-gray-100 text-gray-800 border-gray-300' },
    };

    const config = interestConfig[level as keyof typeof interestConfig] || interestConfig.medium;

    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const filteredRequests = contactRequests.filter(request => {
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesSearch = !searchQuery || 
      (request.athletes && 
        `${request.athletes.first_name} ${request.athletes.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            My Contact Requests
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Track all your athlete contact requests and their status
          </p>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by athlete name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Requested</SelectItem>
                <SelectItem value="responded">Handled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Empty State */}
          {filteredRequests.length === 0 && (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery || statusFilter !== 'all' 
                  ? 'No matching contact requests' 
                  : 'No contact requests yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'Start by browsing athletes and submitting contact requests'}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Button onClick={() => navigate('/athletes')}>
                  Browse Athletes
                </Button>
              )}
            </div>
          )}

          {/* Desktop Table View */}
          {filteredRequests.length > 0 && (
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Athlete</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Interest Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date Submitted</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow 
                      key={request.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => request.athletes && navigate(`/athletes/${request.athletes.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {request.athletes?.profile_photo ? (
                            <img 
                              src={request.athletes.profile_photo} 
                              alt={`${request.athletes.first_name} ${request.athletes.last_name}`}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                              <span className="text-sm font-medium">
                                {request.athletes?.first_name?.[0]}{request.athletes?.last_name?.[0]}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium">
                              {request.athletes?.first_name} {request.athletes?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Class of {request.athletes?.graduation_year}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">
                          {request.athletes?.star_rating || 3}/7
                        </span>
                      </TableCell>
                      <TableCell>
                        {getInterestBadge(request.interest_level)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(request.status)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {format(new Date(request.created_at), 'MMM d, yyyy')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {request.whatsapp_number || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            request.athletes && navigate(`/athletes/${request.athletes.id}`);
                          }}
                        >
                          View Profile
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Mobile Card View */}
          {filteredRequests.length > 0 && (
            <div className="md:hidden space-y-4">
              {filteredRequests.map((request) => (
                <Card 
                  key={request.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => request.athletes && navigate(`/athletes/${request.athletes.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      {request.athletes?.profile_photo ? (
                        <img 
                          src={request.athletes.profile_photo} 
                          alt={`${request.athletes.first_name} ${request.athletes.last_name}`}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {request.athletes?.first_name?.[0]}{request.athletes?.last_name?.[0]}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-semibold">
                          {request.athletes?.first_name} {request.athletes?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Class of {request.athletes?.graduation_year} • {request.athletes?.star_rating || 3}/7 Stars
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {getInterestBadge(request.interest_level)}
                      {getStatusBadge(request.status)}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Submitted: {format(new Date(request.created_at), 'MMM d, yyyy')}</p>
                      {request.whatsapp_number && (
                        <p>WhatsApp: {request.whatsapp_number}</p>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        request.athletes && navigate(`/athletes/${request.athletes.id}`);
                      }}
                    >
                      View Profile
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyContactRequests;

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Check, Clock, Eye, UserCheck, ArrowRight, X } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface PendingCoach {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  school_name: string;
  position?: string;
  created_at: string;
  recruiting_needs?: string;
}

interface PendingCoachRegistrationsProps {
  onCountChange?: (count: number) => void;
}

export default function PendingCoachRegistrations({ onCountChange }: PendingCoachRegistrationsProps) {
  const navigate = useNavigate();
  const [pendingCoaches, setPendingCoaches] = useState<PendingCoach[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingCoaches();
  }, []);

  const fetchPendingCoaches = async () => {
    try {
      const { data, error } = await supabase.rpc('admin_list_coaches');

      if (error) {
        console.error('Error fetching coaches:', error);
        if (error.message?.includes('Access denied')) {
          toast({
            title: "Access Denied",
            description: "You must have admin role to view pending coaches.",
            variant: "destructive",
          });
        }
        throw error;
      }

      // Filter for pending coaches and sort by created date
      const pending = (data || [])
        .filter((c: any) => c.status === 'pending')
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

      setPendingCoaches(pending);
      onCountChange?.(pending.length);
    } catch (error) {
      console.error('Error fetching pending coaches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (coach: PendingCoach, e: React.MouseEvent) => {
    e.stopPropagation();
    setApprovingId(coach.id);

    try {
      // Update status to active
      const { error: updateError } = await supabase
        .from('users')
        .update({ status: 'active' })
        .eq('id', coach.id);

      if (updateError) throw updateError;

      // Send approval email with fresh data
      try {
        // Fetch fresh coach data before sending email
        const { data: freshCoach } = await supabase
          .from('users')
          .select('email, first_name, last_name, school_name')
          .eq('id', coach.id)
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

      toast({
        title: "Coach approved",
        description: `${coach.first_name} ${coach.last_name} has been approved.`,
      });

      // Remove from list
      const updatedCoaches = pendingCoaches.filter(c => c.id !== coach.id);
      setPendingCoaches(updatedCoaches);
      
      // Notify parent to refresh count
      onCountChange?.(updatedCoaches.length);
    } catch (error) {
      console.error('Error approving coach:', error);
      toast({
        title: "Error",
        description: "Failed to approve coach",
        variant: "destructive",
      });
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (coach: PendingCoach, e: React.MouseEvent) => {
    e.stopPropagation();
    setRejectingId(coach.id);

    try {
      // Update status to rejected (silent - no email)
      const { error: updateError } = await supabase
        .from('users')
        .update({ status: 'rejected' })
        .eq('id', coach.id);

      if (updateError) throw updateError;

      toast({
        title: "Coach rejected",
        description: `${coach.first_name} ${coach.last_name} has been rejected silently.`,
      });

      // Remove from list
      const updatedCoaches = pendingCoaches.filter(c => c.id !== coach.id);
      setPendingCoaches(updatedCoaches);
      
      // Notify parent to refresh count
      onCountChange?.(updatedCoaches.length);
    } catch (error) {
      console.error('Error rejecting coach:', error);
      toast({
        title: "Error",
        description: "Failed to reject coach",
        variant: "destructive",
      });
    } finally {
      setRejectingId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Pending Coach Registrations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingCoaches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Pending Coach Registrations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Check className="h-12 w-12 text-green-500 mb-3" />
            <p className="text-muted-foreground">All caught up! No pending registrations.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Pending Coach Registrations
            <Badge variant="destructive" className="ml-2">
              {pendingCoaches.length}
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/coaches?filter=pending')}
          >
            View All
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pendingCoaches.map((coach) => (
            <div
              key={coach.id}
              className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => navigate('/admin/coaches')}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar>
                  <AvatarFallback>
                    {coach.first_name?.[0]}{coach.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold truncate">
                      {coach.first_name} {coach.last_name}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {coach.position || 'Coach'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {coach.school_name}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(coach.created_at), { addSuffix: true })}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/admin/coaches');
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={(e) => handleReject(coach, e)}
                  disabled={rejectingId === coach.id}
                >
                  {rejectingId === coach.id ? (
                    "Rejecting..."
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  onClick={(e) => handleApprove(coach, e)}
                  disabled={approvingId === coach.id}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {approvingId === coach.id ? (
                    "Approving..."
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

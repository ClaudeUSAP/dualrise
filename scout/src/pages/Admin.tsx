import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { Users, UserPlus, FileSpreadsheet, Settings, Download, Upload, Search, Filter, MoreHorizontal, Edit, Trash2, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AthleteFormModal from '@/components/AthleteFormModal';
import { Athlete } from '@/types/athlete';
import { supabase } from '@/integrations/supabase/client';

const Admin = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [isAddingAthlete, setIsAddingAthlete] = useState(false);
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAthletes: 0,
    activeCoaches: 0,
    pendingApprovals: 0,
    recentExports: 3,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [athletesResult, activeCoachesResult, pendingCoachesResult] = await Promise.all([
          supabase.from('athletes').select('*', { count: 'exact', head: true }),
          supabase.from('users')
            .select('*, user_roles!inner(role)', { count: 'exact', head: true })
            .eq('user_roles.role', 'coach')
            .eq('status', 'active'),
          supabase.from('users')
            .select('*, user_roles!inner(role)', { count: 'exact', head: true })
            .eq('user_roles.role', 'coach')
            .eq('status', 'pending')
        ]);
        
        setStats({
          totalAthletes: athletesResult.count || 0,
          activeCoaches: activeCoachesResult.count || 0,
          pendingApprovals: pendingCoachesResult.count || 0,
          recentExports: 3,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const coaches = [
    { id: '1', name: 'John Smith', university: 'University of California', email: 'coach@university.edu', status: 'active', lastLogin: '2024-01-15' },
    { id: '2', name: 'Sarah Johnson', university: 'Texas A&M', email: 'sjohnson@tamu.edu', status: 'active', lastLogin: '2024-01-14' },
    { id: '3', name: 'Mike Wilson', university: 'Florida State', email: 'mwilson@fsu.edu', status: 'pending', lastLogin: null },
  ];

  const handleExportToSheets = () => {
    toast({
      title: "Export started",
      description: "Athlete data is being exported to Google Sheets",
    });
  };

  const handleImportFromSheets = () => {
    toast({
      title: "Import started",
      description: "Importing athlete data from Google Sheets",
    });
  };

  const handleSaveAthlete = (athleteData: Partial<Athlete>) => {
    if (editingAthlete) {
      toast({
        title: "Athlete updated",
        description: "Athlete profile has been updated successfully",
      });
    } else {
      toast({
        title: "Athlete added",
        description: "New athlete profile has been created successfully",
      });
    }
    setIsAddingAthlete(false);
    setEditingAthlete(null);
  };

  const handleEditAthlete = (athlete: Athlete) => {
    setEditingAthlete(athlete);
    setIsAddingAthlete(true);
  };

  const handleToggleAthleteStatus = (athleteId: string) => {
    toast({
      title: "Status updated",
      description: "Athlete visibility has been updated",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage athletes, coaches, and system settings</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Athletes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAthletes}</div>
              <p className="text-xs text-muted-foreground">+12 from last month</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Coaches</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeCoaches}</div>
              <p className="text-xs text-muted-foreground">+3 new this week</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
              <p className="text-xs text-muted-foreground">Requires action</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Exports</CardTitle>
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentExports}</div>
              <p className="text-xs text-muted-foreground">To Google Sheets</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="athletes" className="space-y-4">
          <TabsList>
            <TabsTrigger value="athletes">Athletes</TabsTrigger>
            <TabsTrigger value="coaches">Coaches</TabsTrigger>
            <TabsTrigger value="integration">Google Sheets</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Athletes Tab */}
          <TabsContent value="athletes" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Manage Athletes</CardTitle>
                    <CardDescription>Add, edit, or remove athlete profiles</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => {
                      setEditingAthlete(null);
                      setIsAddingAthlete(true);
                    }}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Athlete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search athletes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    Filters
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Division</TableHead>
                      <TableHead>GPA</TableHead>
                      <TableHead>Handicap</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Navigate to Athlete Management to view athletes
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Coaches Tab */}
          <TabsContent value="coaches" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Manage Coaches</CardTitle>
                <CardDescription>Approve and manage coach accounts</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>University</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coaches.map((coach) => (
                      <TableRow key={coach.id}>
                        <TableCell className="font-medium">{coach.name}</TableCell>
                        <TableCell>{coach.university}</TableCell>
                        <TableCell>{coach.email}</TableCell>
                        <TableCell>
                          <Badge variant={coach.status === 'active' ? 'secondary' : 'outline'}>
                            {coach.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{coach.lastLogin || 'Never'}</TableCell>
                        <TableCell>
                          {coach.status === 'pending' ? (
                            <Button size="sm" variant="default">Approve</Button>
                          ) : (
                            <Button size="sm" variant="outline">Manage</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Google Sheets Integration */}
          <TabsContent value="integration" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Google Sheets Integration</CardTitle>
                <CardDescription>Export and import athlete data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Button onClick={handleExportToSheets}>
                    <Download className="mr-2 h-4 w-4" />
                    Export to Sheets
                  </Button>
                  <Button variant="outline" onClick={handleImportFromSheets}>
                    <Upload className="mr-2 h-4 w-4" />
                    Import from Sheets
                  </Button>
                </div>
                
                <div className="rounded-lg border p-4">
                  <h4 className="font-medium mb-2">Recent Exports</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>athletes_export_2024_01_15.xlsx</span>
                      <span className="text-muted-foreground">2 hours ago</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>athletes_export_2024_01_14.xlsx</span>
                      <span className="text-muted-foreground">Yesterday</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>athletes_export_2024_01_13.xlsx</span>
                      <span className="text-muted-foreground">2 days ago</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>Configure application settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input id="orgName" defaultValue="Union Sportive des Américains de Paris" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input id="contactEmail" type="email" defaultValue="contact@usap.fr" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="maxProfiles">Max Profiles per Coach</Label>
                  <Input id="maxProfiles" type="number" defaultValue="50" />
                </div>
                
                <Button>Save Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Athlete Form Modal */}
      <AthleteFormModal
        isOpen={isAddingAthlete}
        onClose={() => {
          setIsAddingAthlete(false);
          setEditingAthlete(null);
        }}
        athlete={editingAthlete}
        onSave={handleSaveAthlete}
      />
    </div>
  );
};

export default Admin;
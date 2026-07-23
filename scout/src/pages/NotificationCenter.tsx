import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Bell,
  Search,
  Filter,
  Settings,
  Check,
  CheckCheck,
  X,
  Clock,
  Trophy,
  User,
  TrendingUp,
  Star,
  AlertCircle,
  Calendar,
  Target,
  Award,
  Users,
  MessageSquare,
  Mail,
  Archive,
  MoreVertical,
  Eye,
  EyeOff,
  ChevronRight,
  GraduationCap,
  MapPin,
  Zap,
  BookOpen,
  Download,
  Share2,
  BellOff,
  BarChart3,
  Sparkles
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { useNotifications } from '@/hooks/useNotifications';

const NotificationCenter = () => {
  const navigate = useNavigate();
  const { notifications, isLoading, markAsRead, markAllAsRead: markAllAsReadMutation, deleteNotification, bulkDelete } = useNotifications();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [notificationSettings, setNotificationSettings] = useState({
    athleteUpdates: true,
    tournamentAlerts: true,
    systemNotifications: true,
    emailDigest: false,
    pushNotifications: true
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;
  
  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      const category = notification.category || notification.notification_type;
      const matchesTab = activeTab === 'all' || category === activeTab || notification.notification_type === activeTab;
      const matchesSearch = notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            notification.message.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPriority = !filterPriority || notification.is_priority;
      
      return matchesTab && matchesSearch && matchesPriority;
    });
  }, [notifications, activeTab, searchQuery, filterPriority]);

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation();
    toast({
      title: "All notifications marked as read",
      description: "Your notification center has been cleared.",
    });
  };

  const handleDeleteNotification = (id: string) => {
    deleteNotification(id);
    toast({
      title: "Notification removed",
      description: "The notification has been deleted.",
    });
  };

  const handleBulkAction = (action: string) => {
    if (selectedNotifications.length === 0) {
      toast({
        title: "No notifications selected",
        description: "Please select notifications to perform this action.",
        variant: "destructive"
      });
      return;
    }

    switch (action) {
      case 'read':
        selectedNotifications.forEach(id => markAsRead(id));
        break;
      case 'delete':
        bulkDelete(selectedNotifications);
        break;
    }
    
    setSelectedNotifications([]);
    toast({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} completed`,
      description: `${selectedNotifications.length} notifications processed.`,
    });
  };

  const getNotificationIcon = (type: string, isPriority?: boolean) => {
    if (isPriority) {
      return <AlertCircle className="h-4 w-4" />;
    }

    switch (type) {
      case 'result':
      case 'tournament_result':
        return <Trophy className="h-4 w-4" />;
      case 'match':
      case 'new_match':
        return <Users className="h-4 w-4" />;
      case 'milestone':
        return <Award className="h-4 w-4" />;
      case 'update':
      case 'profile_update':
        return <User className="h-4 w-4" />;
      case 'upcoming':
      case 'tournament':
        return <Calendar className="h-4 w-4" />;
      case 'feature':
        return <Sparkles className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const NotificationCard = ({ notification }: { notification: typeof notifications[0] }) => (
    <div
      className={cn(
        "p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer",
        !notification.is_read && "bg-primary/5 border-primary/20"
      )}
      onClick={() => {
        if (!notification.is_read) {
          markAsRead(notification.id);
        }
        if (notification.action_url) {
          navigate(notification.action_url);
        }
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedNotifications.includes(notification.id)}
            onChange={(e) => {
              e.stopPropagation();
              if (e.target.checked) {
                setSelectedNotifications([...selectedNotifications, notification.id]);
              } else {
                setSelectedNotifications(selectedNotifications.filter(id => id !== notification.id));
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="rounded border-gray-300"
          />
          <div className={cn(
            "p-2 rounded-lg",
            notification.notification_type === 'tournament_result' && "bg-primary/10 text-primary",
            notification.notification_type === 'new_match' && "bg-blue-100 text-blue-600",
            notification.notification_type === 'system' && "bg-gray-100 text-gray-600"
          )}>
            {getNotificationIcon(notification.notification_type, notification.is_priority)}
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className={cn(
                  "font-medium",
                  !notification.is_read && "text-primary"
                )}>
                  {notification.title}
                </p>
                {notification.is_priority && (
                  <Badge variant="destructive" className="text-xs">Priority</Badge>
                )}
                {!notification.is_read && (
                  <div className="w-2 h-2 bg-primary rounded-full" />
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {notification.description || notification.message}
              </p>
              
              {notification.metadata && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {notification.category && (
                    <Badge variant="secondary" className="text-xs capitalize">
                      {notification.category}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {getRelativeTime(notification.created_at)}
              </span>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!notification.is_read && (
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(notification.id);
                    }}>
                      <Eye className="h-4 w-4 mr-2" />
                      Mark as read
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNotification(notification.id);
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Analytics data
  const notificationStats = useMemo(() => ({
    total: notifications.length,
    unread: unreadCount,
    priority: notifications.filter(n => n.is_priority).length,
  }), [notifications, unreadCount]);

  return (
    <div className="container mx-auto min-w-0 px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <Badge className="text-sm sm:text-lg px-2 sm:px-3 py-0.5 sm:py-1">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Stay updated with athlete progress and tournament results
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Button variant="outline" onClick={handleMarkAllAsRead} disabled={unreadCount === 0} className="flex-1 sm:flex-none">
            <CheckCheck className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Mark all read</span>
            <span className="sm:hidden">Mark read</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <div className="p-2 space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="athlete-updates" className="text-sm">Athlete Updates</Label>
                  <Switch
                    id="athlete-updates"
                    checked={notificationSettings.athleteUpdates}
                    onCheckedChange={(checked) => 
                      setNotificationSettings({ ...notificationSettings, athleteUpdates: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="tournament-alerts" className="text-sm">Tournament Alerts</Label>
                  <Switch
                    id="tournament-alerts"
                    checked={notificationSettings.tournamentAlerts}
                    onCheckedChange={(checked) => 
                      setNotificationSettings({ ...notificationSettings, tournamentAlerts: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="email-digest" className="text-sm">Email Digest</Label>
                  <Switch
                    id="email-digest"
                    checked={notificationSettings.emailDigest}
                    onCheckedChange={(checked) => 
                      setNotificationSettings({ ...notificationSettings, emailDigest: checked })
                    }
                  />
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 min-w-0">
        <Card className="min-w-0">
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold">{notificationStats.total}</div>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Unread</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold text-primary">{notificationStats.unread}</div>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Priority</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold text-destructive">{notificationStats.priority}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 min-w-0">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-3 sm:space-y-4 min-w-0">
          <Card className="w-full min-w-0">
            <CardHeader className="p-3 sm:p-4">
              <div className="flex flex-col gap-3 min-w-0">
                {/* Search */}
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search notifications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Bulk Actions */}
                {selectedNotifications.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => handleBulkAction('read')} className="flex-1 sm:flex-none">
                      <Check className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Mark Read ({selectedNotifications.length})</span>
                      <span className="sm:hidden">Read ({selectedNotifications.length})</span>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleBulkAction('delete')} className="flex-1 sm:flex-none">
                      <X className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                )}

                {/* Priority Filter */}
                <Button
                  variant={filterPriority ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterPriority(!filterPriority)}
                  className="w-full sm:w-auto"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Priority Only
                </Button>
              </div>
            </CardHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mx-3 sm:mx-6 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="tournament_result">Tournaments</TabsTrigger>
                <TabsTrigger value="new_match">Athletes</TabsTrigger>
                <TabsTrigger value="system">System</TabsTrigger>
              </TabsList>

              <CardContent className="p-0">
                <ScrollArea className="h-[400px] sm:h-[600px]">
                  {isLoading ? (
                    <div className="space-y-4 p-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-3">
                          <Skeleton className="h-5 w-5 rounded" />
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : filteredNotifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                      <Bell className="h-12 w-12 mb-4 opacity-50" />
                      <p className="text-lg font-medium">No notifications</p>
                      <p className="text-sm">You're all caught up!</p>
                    </div>
                  ) : (
                    <div className="p-4 space-y-3">
                      {filteredNotifications.map((notification) => (
                        <NotificationCard key={notification.id} notification={notification} />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Tabs>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Notifications
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <BellOff className="h-4 w-4 mr-2" />
                Snooze All
              </Button>
            </CardContent>
          </Card>

          {/* Notification Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notification Insights</CardTitle>
              <CardDescription>Your notification activity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Read Rate</span>
                  <span className="font-medium">
                    {notifications.length > 0 
                      ? Math.round((notifications.filter(n => n.is_read).length / notifications.length) * 100)
                      : 0}%
                  </span>
                </div>
                <Progress 
                  value={notifications.length > 0 
                    ? (notifications.filter(n => n.is_read).length / notifications.length) * 100
                    : 0} 
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;
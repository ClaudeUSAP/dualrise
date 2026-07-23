import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { 
  Bell,
  Search,
  Users,
  FileText,
  MessageSquare,
  CheckCircle,
  Trash2,
  Archive,
  Mail,
  ChevronRight,
  Settings
} from "lucide-react";

interface Notification {
  id: string;
  type: 'athlete' | 'profile' | 'contact' | 'system';
  title: string;
  message: string;
  sender?: string;
  time: string;
  read: boolean;
  category: string;
}

const Notifications = () => {
  const [selectedTab, setSelectedTab] = useState("all");
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    frequency: "immediate"
  });

  const [notifications] = useState<Notification[]>([
    {
      id: "1",
      type: "athlete",
      title: "New athlete matches your saved search 'Top Male Golfers'",
      message: "Lucie Martin",
      time: "2 hours ago",
      read: false,
      category: "New Athletes"
    },
    {
      id: "2",
      type: "profile",
      title: "Alex Dupont updated their scoring average to 73.2",
      message: "Alex Dupont",
      time: "4 hours ago",
      read: false,
      category: "Profile Updates"
    },
    {
      id: "3",
      type: "contact",
      title: "Coach Smith responded to your contact request for Lucie Martin",
      message: "Coach Smith",
      time: "Yesterday",
      read: true,
      category: "Contact Responses"
    },
    {
      id: "4",
      type: "system",
      title: "System maintenance scheduled for June 10, 2025",
      message: "System",
      time: "2 days ago",
      read: true,
      category: "System"
    },
    {
      id: "5",
      type: "athlete",
      title: "New athlete matches your saved search 'Paris Region All'",
      message: "Mathilde Bonnet",
      time: "6 hours ago",
      read: false,
      category: "New Athletes"
    }
  ]);

  const filteredNotifications = notifications.filter(n => {
    const matchesTab = selectedTab === "all" || 
      (selectedTab === "unread" && !n.read) ||
      (selectedTab === "athletes" && n.type === "athlete") ||
      (selectedTab === "updates" && n.type === "profile") ||
      (selectedTab === "responses" && n.type === "contact") ||
      (selectedTab === "system" && n.type === "system");
    
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesTab && matchesSearch;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleSelectAll = () => {
    if (selectedNotifications.length === filteredNotifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(filteredNotifications.map(n => n.id));
    }
  };

  const handleMarkAsRead = () => {
    toast({
      title: "Notifications marked as read",
      description: `${selectedNotifications.length} notifications marked as read.`,
    });
    setSelectedNotifications([]);
  };

  const handleDelete = () => {
    toast({
      title: "Notifications deleted",
      description: `${selectedNotifications.length} notifications deleted.`,
    });
    setSelectedNotifications([]);
  };

  const handleArchive = () => {
    toast({
      title: "Notifications archived",
      description: `${selectedNotifications.length} notifications archived.`,
    });
    setSelectedNotifications([]);
  };

  const handleSaveSettings = () => {
    toast({
      title: "Settings saved",
      description: "Your notification preferences have been updated.",
    });
    setShowSettings(false);
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'athlete': return <Users className="h-5 w-5" />;
      case 'profile': return <FileText className="h-5 w-5" />;
      case 'contact': return <MessageSquare className="h-5 w-5" />;
      case 'system': return <Bell className="h-5 w-5" />;
      default: return <Bell className="h-5 w-5" />;
    }
  };

  if (showSettings) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <Button 
              variant="ghost" 
              onClick={() => setShowSettings(false)}
              className="mb-4"
            >
              ← Back to Notifications
            </Button>
            <h1 className="text-3xl font-bold">Notification Settings</h1>
            <p className="text-muted-foreground">Manage how you receive notifications</p>
          </div>

          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-base font-medium">Email Notifications</label>
                    <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                  </div>
                  <Switch
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={(checked) => 
                      setNotificationSettings({...notificationSettings, emailNotifications: checked})
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-base font-medium">Push Notifications</label>
                    <p className="text-sm text-muted-foreground">Enable browser push notifications</p>
                  </div>
                  <Switch
                    checked={notificationSettings.pushNotifications}
                    onCheckedChange={(checked) => 
                      setNotificationSettings({...notificationSettings, pushNotifications: checked})
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-base font-medium">Notification Frequency</label>
                  <Select 
                    value={notificationSettings.frequency} 
                    onValueChange={(value) => 
                      setNotificationSettings({...notificationSettings, frequency: value})
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="daily">Daily Digest</SelectItem>
                      <SelectItem value="weekly">Weekly Digest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4">
                  <Button onClick={handleSaveSettings}>Save Settings</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              Notifications 
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-2">{unreadCount}</Badge>
              )}
            </h1>
            <p className="text-muted-foreground">Stay updated with your recruitment activities</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleMarkAsRead()}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark All as Read
            </Button>
            <Button variant="outline" onClick={() => setShowSettings(true)}>
              <Settings className="mr-2 h-4 w-4" />
              Notification Preferences
            </Button>
          </div>
        </div>

        <div className="flex gap-6">
          <div className="flex-1">
            <Tabs defaultValue="all" value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="all">
                  All <Badge variant="secondary" className="ml-1">{notifications.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="unread">
                  Unread <Badge variant="secondary" className="ml-1">{unreadCount}</Badge>
                </TabsTrigger>
                <TabsTrigger value="athletes">New Athletes</TabsTrigger>
                <TabsTrigger value="updates">Profile Updates</TabsTrigger>
                <TabsTrigger value="responses">Contact Responses</TabsTrigger>
                <TabsTrigger value="system">System</TabsTrigger>
              </TabsList>

              <div className="mt-4 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search notifications..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                {selectedNotifications.length > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <span className="text-sm">{selectedNotifications.length} selected</span>
                    <Button size="sm" variant="ghost" onClick={handleMarkAsRead}>
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Mark as Read
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleArchive}>
                      <Archive className="mr-1 h-3 w-3" />
                      Archive
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleDelete}>
                      <Trash2 className="mr-1 h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                )}

                <div className="flex items-center gap-4 pb-2 border-b">
                  <Checkbox 
                    checked={selectedNotifications.length === filteredNotifications.length && filteredNotifications.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">Select All</span>
                </div>

                <TabsContent value={selectedTab} className="space-y-2 mt-0">
                  {filteredNotifications.map((notification) => (
                    <Card 
                      key={notification.id} 
                      className={cn(
                        "cursor-pointer transition-colors",
                        !notification.read && "bg-accent/5 border-accent",
                        selectedNotifications.includes(notification.id) && "bg-muted"
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedNotifications.includes(notification.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedNotifications([...selectedNotifications, notification.id]);
                              } else {
                                setSelectedNotifications(selectedNotifications.filter(id => id !== notification.id));
                              }
                            }}
                          />
                          <div className={cn(
                            "p-2 rounded-lg",
                            notification.type === 'athlete' && "bg-primary/10 text-primary",
                            notification.type === 'profile' && "bg-blue-500/10 text-blue-500",
                            notification.type === 'contact' && "bg-green-500/10 text-green-500",
                            notification.type === 'system' && "bg-muted"
                          )}>
                            {getIcon(notification.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className={cn(
                                  "text-sm",
                                  !notification.read && "font-semibold"
                                )}>
                                  {notification.title}
                                </p>
                                {notification.message && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {notification.message}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-2">
                                  {notification.time}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="ghost">View</Button>
                                {notification.type === 'contact' && (
                                  <Button size="sm" variant="ghost">Contact</Button>
                                )}
                                <Button size="sm" variant="ghost">Dismiss</Button>
                                {!notification.read && (
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <Card className="w-80 h-fit">
            <CardHeader>
              <CardTitle className="text-base">Notification Settings</CardTitle>
              <button 
                onClick={() => setShowSettings(true)}
                className="text-sm text-primary hover:underline"
              >
                Manage Full Settings
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Email Notifications</span>
                <Switch checked={notificationSettings.emailNotifications} disabled />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Push Notifications</span>
                <Switch checked={notificationSettings.pushNotifications} disabled />
              </div>
              <div>
                <span className="text-sm">Notification Frequency</span>
                <p className="text-xs text-muted-foreground capitalize mt-1">
                  {notificationSettings.frequency}
                </p>
              </div>
              <Button 
                variant="link" 
                className="w-full justify-between p-0"
                onClick={() => setShowSettings(true)}
              >
                See All Notification Settings
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Helper function for conditional classes
const cn = (...classes: (string | boolean | undefined)[]) => {
  return classes.filter(Boolean).join(' ');
};

export default Notifications;
import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  User, 
  Bell, 
  Shield, 
  CreditCard,
  Lock,
  Trophy,
  Eye,
  Key,
  Smartphone,
  Monitor,
  Mail,
  MessageSquare,
  Globe,
  Database,
  Download,
  Trash2,
  AlertCircle,
  Check,
  ChevronRight,
  Upload,
  ExternalLink,
  LogOut,
  Activity,
  Clock,
  Crown,
  Zap,
  Laptop,
  UserCheck,
  FileText,
  Settings as SettingsIcon,
  HelpCircle,
  BookOpen,
  Users,
  Palette,
  Languages,
  Volume2,
  Briefcase,
  MapPin,
  GraduationCap,
  Target,
  TrendingUp,
  Calendar,
  MessageCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const Settings = () => {
  const { user, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Profile State
  const [profile, setProfile] = useState({
    firstName: userProfile?.first_name || "",
    lastName: userProfile?.last_name || "",
    email: userProfile?.email || "",
    phone: "+1 555 234 5678",
    university: "Stanford University",
    title: "Head Coach",
    division: "NCAA D1",
    bio: "15 years of college coaching experience specializing in talent development and recruitment.",
    yearsOfExperience: 15,
    specialties: ["Talent Development", "Mental Coaching", "Technical Skills"],
    preferredContact: "email",
    timezone: "America/Los_Angeles",
    language: "en",
    profilePhoto: null as string | null,
    recruitingNeeds: "",
    brochureUrl: ""
  });

  const brochureInputRef = useRef<HTMLInputElement>(null);

  // Notification State
  const [notifications, setNotifications] = useState({
    // Email Notifications
    newAthleteMatches: true,
    profileUpdatesForFavorites: true,
    contactRequestResponses: true,
    savedSearchAlerts: true,
    weeklyDigest: false,
    marketingEmails: false,
    
    // Tournament Alerts
    tournamentResults: true,
    performanceMilestones: true,
    upcomingTournaments: true,
    tournamentTypes: ["National", "International", "Regional"],
    performanceThreshold: 10, // Top 10 finish
    regionalFocus: ["West Coast", "Southwest"],
    
    // Notification Settings
    emailFrequency: "immediate",
    pushEnabled: true,
    smsEnabled: false,
    desktopNotifications: true,
    mobileNotifications: true,
    quietHours: false,
    quietStart: "22:00",
    quietEnd: "08:00"
  });

  // Security State
  const [security, setSecurity] = useState({
    twoFactorEnabled: false,
    lastPasswordChange: new Date("2024-11-14"),
    sessionTimeout: 30,
    loginAlerts: true,
    trustedDevices: 2,
    activeSessionCount: 3
  });

  // Privacy State
  const [privacy, setPrivacy] = useState({
    profileVisibility: "team",
    searchHistoryEnabled: true,
    dataRetentionDays: 90,
    shareWithPartners: false,
    analyticsEnabled: true,
    personalizedAds: false
  });

  // Session data (mock)
  const activeSessions = [
    { id: 1, device: "Chrome on MacBook", location: "Stanford, CA", lastActive: "Active now", current: true },
    { id: 2, device: "Safari on iPhone", location: "Palo Alto, CA", lastActive: "2 hours ago", current: false },
    { id: 3, device: "Chrome on Windows", location: "San Francisco, CA", lastActive: "Yesterday", current: false }
  ];

  const handleSave = async () => {
    setIsSaving(true);
    setTimeout(() => {
      toast({
        title: "Settings saved",
        description: "Your changes have been saved successfully.",
      });
      setIsSaving(false);
    }, 1000);
  };

  const handleExportData = () => {
    toast({
      title: "Data export initiated",
      description: "You'll receive an email with your data within 24 hours.",
    });
  };

  const handleDeleteAccount = () => {
    setIsDeleting(true);
    setTimeout(() => {
      toast({
        title: "Account deletion scheduled",
        description: "Your account will be deleted in 30 days. You can cancel anytime.",
        variant: "destructive"
      });
      setIsDeleting(false);
    }, 2000);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile({ ...profile, profilePhoto: reader.result as string });
        toast({
          title: "Photo uploaded",
          description: "Your profile photo has been updated.",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="container mx-auto min-w-0 px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Manage your profile, preferences, and account security
        </p>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 min-w-0">
        {/* Sidebar Navigation */}
        <div className="w-full lg:w-64 space-y-2 shrink-0">
          <Card className="min-w-0">
            <CardContent className="p-2">
              <nav className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-1">
                <button
                  onClick={() => setActiveTab("profile")}
                  className={cn(
                    "w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm transition-colors",
                    activeTab === "profile" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}
                >
                  <User className="h-4 w-4" />
                  Profile Information
                </button>
                <button
                  onClick={() => setActiveTab("notifications")}
                  className={cn(
                    "w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm transition-colors",
                    activeTab === "notifications" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}
                >
                  <Bell className="h-4 w-4" />
                  Notification Preferences
                </button>
                <button
                  onClick={() => setActiveTab("security")}
                  className={cn(
                    "w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm transition-colors",
                    activeTab === "security" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}
                >
                  <Shield className="h-4 w-4" />
                  Security Settings
                </button>
                <button
                  onClick={() => setActiveTab("privacy")}
                  className={cn(
                    "w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm transition-colors",
                    activeTab === "privacy" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}
                >
                  <Eye className="h-4 w-4" />
                  Privacy Controls
                </button>
              </nav>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="min-w-0">
            <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
              <CardTitle className="text-sm">Account Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Member Since</span>
                <span className="font-medium">Jan 2024</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Role</span>
                <Badge>{userProfile?.role === 'admin' ? 'Administrator' : 'Coach'}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Athletes Tracked</span>
                <span className="font-medium">124</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Active Searches</span>
                <span className="font-medium">18</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {/* Profile Information Tab */}
          {activeTab === "profile" && (
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Manage your personal details and coaching profile
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Photo */}
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                  <div className="relative">
                    {profile.profilePhoto ? (
                      <img 
                        src={profile.profilePhoto} 
                        alt="Profile" 
                        className="w-24 h-24 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                    <label htmlFor="photo-upload" className="absolute bottom-0 right-0 p-1 bg-primary rounded-full cursor-pointer">
                      <Upload className="h-4 w-4 text-primary-foreground" />
                      <input 
                        id="photo-upload" 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handlePhotoUpload}
                      />
                    </label>
                  </div>
                  <div>
                    <h3 className="font-medium">{profile.firstName} {profile.lastName}</h3>
                    <p className="text-sm text-muted-foreground">{profile.title} at {profile.university}</p>
                    <Button variant="outline" size="sm" className="mt-2">
                      <Upload className="h-4 w-4 mr-2" />
                      Change Photo
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Personal Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={profile.firstName}
                      onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={profile.lastName}
                      onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="flex gap-2">
                      <Input
                        id="email"
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      />
                      <Badge variant="secondary" className="shrink-0">Verified</Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      <MessageCircle className="h-4 w-4 inline mr-2" />
                      WhatsApp Number
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      placeholder="+1 234 567 8900"
                    />
                    <p className="text-xs text-muted-foreground">
                      We use WhatsApp for quick communication about athlete connections
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Coaching Information */}
                <div>
                  <h3 className="font-medium mb-4">Coaching Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="university">University/Institution</Label>
                      <Input
                        id="university"
                        value={profile.university}
                        onChange={(e) => setProfile({ ...profile, university: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="title">Position/Title</Label>
                      <Input
                        id="title"
                        value={profile.title}
                        onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="division">Division</Label>
                      <Select value={profile.division} onValueChange={(value) => setProfile({ ...profile, division: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NCAA D1">NCAA Division I</SelectItem>
                          <SelectItem value="NCAA D2">NCAA Division II</SelectItem>
                          <SelectItem value="NCAA D3">NCAA Division III</SelectItem>
                          <SelectItem value="NAIA">NAIA</SelectItem>
                          <SelectItem value="NJCAA 1">NJCAA 1</SelectItem>
                          <SelectItem value="NJCAA 2">NJCAA 2</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="experience">Years of Experience</Label>
                      <Input
                        id="experience"
                        type="number"
                        value={profile.yearsOfExperience}
                        onChange={(e) => setProfile({ ...profile, yearsOfExperience: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio & Recruiting Philosophy</Label>
                  <Textarea
                    id="bio"
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recruitingNeeds">Recruiting Criteria / Needs</Label>
                  <Textarea
                    id="recruitingNeeds"
                    value={profile.recruitingNeeds}
                    onChange={(e) => setProfile({ ...profile, recruitingNeeds: e.target.value })}
                    placeholder="e.g., Looking for strong academic students with low handicaps for D1 program..."
                    className="min-h-[100px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Help us understand what you're looking for in recruits
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Program/Brochure Upload</Label>
                  <div className="flex gap-2">
                    {profile.brochureUrl ? (
                      <div className="flex-1 flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <FileText className="h-5 w-5 text-primary" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Brochure uploaded</p>
                          <p className="text-xs text-muted-foreground">PDF document</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(profile.brochureUrl, '_blank')}
                        >
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setProfile({ ...profile, brochureUrl: "" })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <input
                          ref={brochureInputRef}
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              toast({
                                title: "Brochure uploaded",
                                description: "Your program brochure has been uploaded successfully.",
                              });
                              setProfile({ ...profile, brochureUrl: "temp-url" });
                            }
                          }}
                        />
                        <Button
                          variant="outline"
                          onClick={() => brochureInputRef.current?.click()}
                          className="flex-1"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Program Brochure (PDF)
                        </Button>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Optional: Share your program details with interested athletes
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specialties">Coaching Specialties</Label>
                  <Input
                    id="specialties"
                    value={profile.specialties.join(', ')}
                    onChange={(e) => setProfile({ ...profile, specialties: e.target.value.split(',').map(s => s.trim()).filter(s => s) })}
                    placeholder="e.g., Short Game, Mental Game, Tournament Prep"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground">
                    Separate multiple specialties with commas
                  </p>
                </div>

                <Separator />

                {/* Preferences */}
                <div>
                  <h3 className="font-medium mb-4">Preferences</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Preferred Contact Method</Label>
                      <RadioGroup value={profile.preferredContact} onValueChange={(value) => setProfile({ ...profile, preferredContact: value })}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="email" id="email-contact" />
                          <Label htmlFor="email-contact">Email</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="phone" id="phone-contact" />
                          <Label htmlFor="phone-contact">Phone</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="text" id="text-contact" />
                          <Label htmlFor="text-contact">Text Message</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select value={profile.timezone} onValueChange={(value) => setProfile({ ...profile, timezone: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/New_York">Eastern Time</SelectItem>
                          <SelectItem value="America/Chicago">Central Time</SelectItem>
                          <SelectItem value="America/Denver">Mountain Time</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notification Preferences Tab */}
          {activeTab === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-usap-orange" />
                  Email notifications
                </CardTitle>
                <CardDescription>
                  Choose which email updates you receive. Email is the only channel —
                  SMS and push notifications aren't available.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  {[
                    { key: 'profileUpdatesForFavorites', label: 'Favorite athlete results', desc: "New tournament results for athletes you've favorited" },
                    { key: 'savedSearchAlerts', label: 'Saved-search alerts', desc: 'New athletes matching your saved searches' },
                    { key: 'contactRequestResponses', label: 'Contact requests', desc: 'Updates on your contact requests' },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
                    >
                      <div className="pr-4">
                        <Label className="text-base text-foreground">{item.label}</Label>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                      <Switch
                        checked={(notifications as any)[item.key]}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, [item.key]: checked })
                        }
                      />
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSave}>Save preferences</Button>
                </div>
              </CardContent>
            </Card>
          )}


          {/* Security Settings Tab */}
          {activeTab === "security" && (
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Manage your account security and authentication
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Password */}
                <div>
                  <h3 className="font-medium mb-4">Password</h3>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Password</p>
                        <p className="text-sm text-muted-foreground">
                          Last changed {Math.floor((new Date().getTime() - security.lastPasswordChange.getTime()) / (1000 * 60 * 60 * 24))} days ago
                        </p>
                      </div>
                      <Button variant="outline">
                        <Key className="h-4 w-4 mr-2" />
                        Change Password
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Two-Factor Authentication */}
                <div>
                  <h3 className="font-medium mb-4">Two-Factor Authentication</h3>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">2FA Status</p>
                        <p className="text-sm text-muted-foreground">
                          {security.twoFactorEnabled ? "Enabled - Your account is secured" : "Add an extra layer of security to your account"}
                        </p>
                      </div>
                      {security.twoFactorEnabled ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          <Shield className="h-3 w-3 mr-1" />
                          Enabled
                        </Badge>
                      ) : (
                        <Button variant="outline">
                          <Lock className="h-4 w-4 mr-2" />
                          Enable 2FA
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Active Sessions */}
                <div>
                  <h3 className="font-medium mb-4">Active Sessions ({security.activeSessionCount})</h3>
                  <div className="space-y-3">
                    {activeSessions.map((session) => (
                      <div key={session.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-muted rounded-lg">
                              {session.device.includes("iPhone") ? (
                                <Smartphone className="h-4 w-4" />
                              ) : (
                                <Monitor className="h-4 w-4" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{session.device}</p>
                              <p className="text-sm text-muted-foreground">
                                {session.location} • {session.lastActive}
                              </p>
                            </div>
                          </div>
                          {session.current ? (
                            <Badge variant="secondary">Current</Badge>
                          ) : (
                            <Button variant="ghost" size="sm">
                              <LogOut className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full mt-3">
                    Sign Out All Other Sessions
                  </Button>
                </div>

                <Separator />

                {/* Security Preferences */}
                <div>
                  <h3 className="font-medium mb-4">Security Preferences</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Login Alerts</Label>
                        <p className="text-sm text-muted-foreground">Get notified of new sign-ins</p>
                      </div>
                      <Switch
                        checked={security.loginAlerts}
                        onCheckedChange={(checked) => setSecurity({ ...security, loginAlerts: checked })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Session Timeout</Label>
                      <Select 
                        value={security.sessionTimeout.toString()} 
                        onValueChange={(value) => setSecurity({ ...security, sessionTimeout: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                          <SelectItem value="240">4 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Privacy Controls Tab */}
          {activeTab === "privacy" && (
            <Card>
              <CardHeader>
                <CardTitle>Privacy Controls</CardTitle>
                <CardDescription>
                  Manage your data and privacy preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Visibility */}
                <div>
                  <h3 className="font-medium mb-4">Profile Visibility</h3>
                  <RadioGroup value={privacy.profileVisibility} onValueChange={(value) => setPrivacy({ ...privacy, profileVisibility: value })}>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem value="public" id="public" />
                        <Label htmlFor="public" className="flex-1">
                          <div>
                            <p className="font-medium">Public</p>
                            <p className="text-sm text-muted-foreground">Anyone can view your profile</p>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem value="team" id="team" />
                        <Label htmlFor="team" className="flex-1">
                          <div>
                            <p className="font-medium">Team Only</p>
                            <p className="text-sm text-muted-foreground">Only your team members can view</p>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem value="private" id="private" />
                        <Label htmlFor="private" className="flex-1">
                          <div>
                            <p className="font-medium">Private</p>
                            <p className="text-sm text-muted-foreground">Only you can view your profile</p>
                          </div>
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                <Separator />

                {/* Data Preferences */}
                <div>
                  <h3 className="font-medium mb-4">Data Preferences</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Search History</Label>
                        <p className="text-sm text-muted-foreground">Save your search history for better recommendations</p>
                      </div>
                      <Switch
                        checked={privacy.searchHistoryEnabled}
                        onCheckedChange={(checked) => setPrivacy({ ...privacy, searchHistoryEnabled: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Analytics & Improvements</Label>
                        <p className="text-sm text-muted-foreground">Help improve the platform with usage data</p>
                      </div>
                      <Switch
                        checked={privacy.analyticsEnabled}
                        onCheckedChange={(checked) => setPrivacy({ ...privacy, analyticsEnabled: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Share with Partners</Label>
                        <p className="text-sm text-muted-foreground">Share data with trusted recruitment partners</p>
                      </div>
                      <Switch
                        checked={privacy.shareWithPartners}
                        onCheckedChange={(checked) => setPrivacy({ ...privacy, shareWithPartners: checked })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Data Retention */}
                <div>
                  <h3 className="font-medium mb-4">Data Retention</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Auto-delete old data after</Label>
                      <Select 
                        value={privacy.dataRetentionDays.toString()} 
                        onValueChange={(value) => setPrivacy({ ...privacy, dataRetentionDays: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30 days</SelectItem>
                          <SelectItem value="90">90 days</SelectItem>
                          <SelectItem value="180">180 days</SelectItem>
                          <SelectItem value="365">1 year</SelectItem>
                          <SelectItem value="0">Never</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Data Management */}
                <div>
                  <h3 className="font-medium mb-4">Data Management</h3>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start" onClick={handleExportData}>
                      <Download className="h-4 w-4 mr-2" />
                      Export My Data
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      Request Data Report
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Account
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle className="text-lg sm:text-xl">Delete Account</DialogTitle>
                          <DialogDescription className="text-sm sm:text-base">
                            This action cannot be undone. This will permanently delete your account and remove your data from our servers.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline">Cancel</Button>
                          <Button variant="destructive" onClick={handleDeleteAccount} disabled={isDeleting}>
                            {isDeleting ? "Deleting..." : "Delete Account"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>GDPR Compliance</AlertTitle>
                  <AlertDescription>
                    We comply with GDPR and other privacy regulations. You have the right to access, modify, and delete your personal data at any time.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
};

export default Settings;